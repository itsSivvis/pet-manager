import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { ApiError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { checkPasswordPolicy, hashPassword, verifyPassword, dummyHash } from '../lib/password.js';
import { signToken, isAnonymousModeActive } from '../middleware/auth.js';

const email = z.string().trim().toLowerCase().email().max(254);
const registerSchema = z.object({
  email,
  password: z.string(),
  display_name: z.string().trim().min(1).max(100),
  locale: z.enum(['en', 'de']).optional(),
});
const loginSchema = z.object({ email, password: z.string().min(1).max(1000) });
const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  locale: z.enum(['en', 'de']).optional(),
});
const passwordSchema = z.object({
  current_password: z.string().min(1).max(1000),
  new_password: z.string(),
});

const publicUser = ({ id, email, display_name, role, locale }) => ({
  id,
  email,
  display_name,
  role,
  locale,
});

export function authRouter({ pool, config, settings, auth }) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) =>
      next(new ApiError(429, 'RATE_LIMITED', 'Too many attempts, try again later')),
  });

  async function userCount() {
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    return rows[0].n;
  }

  // Public: tells the client which screens to show (setup, login, register).
  router.get('/status', async (_req, res) => {
    const count = await userCount();
    res.json({
      setupRequired: count === 0,
      registrationOpen: count === 0 || (await settings.get('allowRegistration')) === true,
      anonymousMode: await isAnonymousModeActive(config, settings),
      anonymousModeAllowed: config.allowAnonymousMode,
    });
  });

  router.post('/register', limiter, async (req, res) => {
    const data = parse(registerSchema, req.body);
    const policyError = checkPasswordPolicy(data.password, { email: data.email });
    if (policyError)
      throw new ApiError(400, policyError, 'Password does not meet the requirements');

    const count = await userCount();
    if (count > 0 && (await settings.get('allowRegistration')) !== true) {
      throw new ApiError(403, 'REGISTRATION_CLOSED', 'Registration is disabled');
    }
    // The very first account becomes the administrator.
    const role = count === 0 ? 'admin' : 'user';
    const hash = await hashPassword(data.password);
    let rows;
    try {
      ({ rows } = await pool.query(
        `INSERT INTO users (email, display_name, password_hash, role, locale)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.email, data.display_name, hash, role, data.locale ?? config.defaultLocale],
      ));
    } catch (err) {
      if (err.code === '23505') throw new ApiError(409, 'EMAIL_TAKEN', 'E-mail already registered');
      throw err;
    }
    res.status(201).json({ token: signToken(config, rows[0]), user: publicUser(rows[0]) });
  });

  router.post('/login', limiter, async (req, res) => {
    const data = parse(loginSchema, req.body);
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = $1', [data.email]);
    const user = rows[0];
    const ok = await verifyPassword(data.password, user?.password_hash ?? (await dummyHash()));
    if (!user || !ok)
      throw new ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid e-mail or password');
    res.json({ token: signToken(config, user), user: publicUser(user) });
  });

  router.get('/me', auth.authenticate({ allowAnonymous: true }), (req, res) => {
    res.json(req.user.anonymous ? { anonymous: true, role: 'user' } : publicUser(req.user));
  });

  router.patch('/me', auth.authenticate(), async (req, res) => {
    const data = parse(profileSchema, req.body);
    const { rows } = await pool.query(
      `UPDATE users SET display_name = COALESCE($2, display_name), locale = COALESCE($3, locale), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.user.id, data.display_name ?? null, data.locale ?? null],
    );
    res.json(publicUser(rows[0]));
  });

  router.post('/password', limiter, auth.authenticate(), async (req, res) => {
    const data = parse(passwordSchema, req.body);
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
      req.user.id,
    ]);
    if (!(await verifyPassword(data.current_password, rows[0].password_hash))) {
      throw new ApiError(400, 'AUTH_WRONG_PASSWORD', 'Current password is wrong');
    }
    const policyError = checkPasswordPolicy(data.new_password, { email: req.user.email });
    if (policyError)
      throw new ApiError(400, policyError, 'Password does not meet the requirements');
    // Truncate to whole seconds: JWT "iat" has second precision.
    const { rows: updated } = await pool.query(
      `UPDATE users SET password_hash = $2, password_changed_at = date_trunc('second', now()), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.user.id, await hashPassword(data.new_password)],
    );
    // Other sessions are logged out; this one gets a fresh token.
    res.json({ token: signToken(config, updated[0]) });
  });

  return router;
}
