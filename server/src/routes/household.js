import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { sendNtfy } from '../services/ntfy.js';
import {
  getHouseholdSettings,
  setHouseholdSettings,
  newInviteCode,
} from '../services/households.js';
import { t } from '../i18n/messages.js';

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) URLs are allowed');

export const householdName = z.string().trim().min(1).max(100);

const settingsSchema = z.object({
  notificationLocale: z.enum(['en', 'de']).nullable().optional(),
  ntfy: z
    .object({
      enabled: z.boolean(),
      url: httpUrl,
      topic: z
        .string()
        .trim()
        .max(64)
        .regex(/^[\w-]*$/, 'Letters, digits, - and _ only'),
      // undefined = keep the stored token, '' = remove it
      token: z.string().max(200).optional(),
    })
    .optional(),
});

/** Never send the ntfy token back to the browser. */
function redact(all) {
  const { token, ...ntfy } = all.ntfy ?? {};
  return { ...all, ntfy: { ...ntfy, hasToken: Boolean(token) } };
}

/**
 * The caller's own household: name, members, invite code and notification
 * settings. All members of a household have the same rights here.
 */
export function householdRouter({ pool, config, send = sendNtfy }) {
  const router = Router();

  async function load(id) {
    const { rows } = await pool.query(
      'SELECT id, name, invite_code, created_at FROM households WHERE id = $1',
      [id],
    );
    const { rows: members } = await pool.query(
      'SELECT id, email, display_name, role, created_at FROM users WHERE household_id = $1 ORDER BY created_at',
      [id],
    );
    return { ...rows[0], members };
  }

  router.get('/', async (req, res) => {
    res.json(await load(req.user.household_id));
  });

  router.patch('/', async (req, res) => {
    const { name } = parse(z.object({ name: householdName }), req.body);
    await pool.query('UPDATE households SET name = $2, updated_at = now() WHERE id = $1', [
      req.user.household_id,
      name,
    ]);
    res.json(await load(req.user.household_id));
  });

  // Creates (or replaces) the invite code. Anyone with the code can register
  // an account in this household, even when open registration is disabled.
  router.post('/invite', async (req, res) => {
    await pool.query('UPDATE households SET invite_code = $2, updated_at = now() WHERE id = $1', [
      req.user.household_id,
      newInviteCode(),
    ]);
    res.json(await load(req.user.household_id));
  });

  router.delete('/invite', async (req, res) => {
    await pool.query('UPDATE households SET invite_code = NULL, updated_at = now() WHERE id = $1', [
      req.user.household_id,
    ]);
    res.json(await load(req.user.household_id));
  });

  router.get('/settings', async (req, res) => {
    res.json(redact(await getHouseholdSettings(pool, req.user.household_id)));
  });

  router.put('/settings', async (req, res) => {
    const data = parse(settingsSchema, req.body);
    if (data.ntfy) {
      const current = await getHouseholdSettings(pool, req.user.household_id);
      data.ntfy = {
        ...data.ntfy,
        token: data.ntfy.token === undefined ? (current.ntfy?.token ?? '') : data.ntfy.token,
      };
    }
    res.json(redact(await setHouseholdSettings(pool, req.user.household_id, data)));
  });

  router.post('/ntfy/test', async (req, res) => {
    const { ntfy, notificationLocale } = await getHouseholdSettings(pool, req.user.household_id);
    if (!ntfy?.topic) throw new ApiError(400, 'NTFY_NOT_CONFIGURED', 'ntfy is not configured');
    const locale = notificationLocale || config.defaultLocale;
    try {
      await send(ntfy, {
        title: t(locale, 'test.title'),
        message: t(locale, 'test.body'),
        tags: ['tada'],
      });
    } catch (err) {
      throw new ApiError(502, 'NTFY_FAILED', err.message);
    }
    res.json({ ok: true });
  });

  return router;
}
