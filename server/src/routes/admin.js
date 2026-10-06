import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { parse, idParam } from '../lib/validate.js';
import { sendNtfy } from '../services/ntfy.js';
import { t } from '../i18n/messages.js';

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) URLs are allowed');

const settingsSchema = z.object({
  requireLogin: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
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

export function adminRouter({ pool, config, settings, send = sendNtfy }) {
  const router = Router();

  router.get('/settings', async (_req, res) => {
    res.json({ ...redact(await settings.all()), anonymousModeAllowed: config.allowAnonymousMode });
  });

  router.put('/settings', async (req, res) => {
    const data = parse(settingsSchema, req.body);
    if (data.requireLogin === false && !config.allowAnonymousMode) {
      throw new ApiError(
        400,
        'ANONYMOUS_MODE_NOT_ALLOWED',
        'Set ALLOW_ANONYMOUS_MODE=true on the server first',
      );
    }
    if (data.ntfy) {
      const current = await settings.get('ntfy');
      data.ntfy = {
        ...data.ntfy,
        token: data.ntfy.token === undefined ? (current?.token ?? '') : data.ntfy.token,
      };
    }
    res.json({
      ...redact(await settings.set(data)),
      anonymousModeAllowed: config.allowAnonymousMode,
    });
  });

  router.post('/ntfy/test', async (_req, res) => {
    const ntfy = await settings.get('ntfy');
    if (!ntfy?.topic) throw new ApiError(400, 'NTFY_NOT_CONFIGURED', 'ntfy is not configured');
    const locale = (await settings.get('notificationLocale')) || config.defaultLocale;
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

  router.get('/users', async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, role, locale, created_at FROM users ORDER BY created_at',
    );
    res.json(rows);
  });

  router.patch('/users/:id', async (req, res) => {
    const id = parse(idParam, req.params.id);
    const { role } = parse(z.object({ role: z.enum(['admin', 'user']) }), req.body);
    if (id === req.user.id && role !== 'admin')
      throw new ApiError(400, 'CANNOT_DEMOTE_SELF', 'You cannot remove your own admin rights');
    const { rows } = await pool.query(
      'UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING id, email, display_name, role, locale, created_at',
      [id, role],
    );
    if (!rows[0]) throw new ApiError(404, 'USER_NOT_FOUND', 'user not found');
    res.json(rows[0]);
  });

  router.delete('/users/:id', async (req, res) => {
    const id = parse(idParam, req.params.id);
    if (id === req.user.id)
      throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (!rowCount) throw new ApiError(404, 'USER_NOT_FOUND', 'user not found');
    res.status(204).end();
  });

  return router;
}
