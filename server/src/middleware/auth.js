import jwt from 'jsonwebtoken';
import { ApiError } from '../lib/errors.js';

export function signToken(config, user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/**
 * Whether anonymous (no-login) access is currently in effect. Both the
 * environment switch ALLOW_ANONYMOUS_MODE and the admin setting must agree.
 */
export async function isAnonymousModeActive(config, settings) {
  return config.allowAnonymousMode && (await settings.get('requireLogin')) === false;
}

/**
 * Authentication middleware factory.
 *
 * - A valid Bearer token always authenticates as that user.
 * - Without a token, requests are rejected with 401 AUTH_REQUIRED, unless
 *   `allowAnonymous` is set for the route group AND anonymous mode is active.
 *   Anonymous requests get a synthetic user without admin rights, so the admin
 *   area always requires a real login, even in anonymous mode.
 */
export function createAuth({ config, pool, settings }) {
  async function resolveUser(req) {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    let payload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new ApiError(401, 'AUTH_INVALID_TOKEN', 'Invalid or expired token');
    }
    const { rows } = await pool.query(
      'SELECT id, email, display_name, role, locale, password_changed_at FROM users WHERE id = $1',
      [Number(payload.sub)],
    );
    const user = rows[0];
    if (!user) throw new ApiError(401, 'AUTH_INVALID_TOKEN', 'User no longer exists');
    // Changing the password invalidates all previously issued tokens.
    if (
      user.password_changed_at &&
      payload.iat < Math.floor(user.password_changed_at.getTime() / 1000)
    ) {
      throw new ApiError(
        401,
        'AUTH_INVALID_TOKEN',
        'Token was issued before the last password change',
      );
    }
    delete user.password_changed_at;
    return user;
  }

  const authenticate =
    ({ allowAnonymous = false } = {}) =>
    async (req, _res, next) => {
      const user = await resolveUser(req);
      if (user) {
        req.user = user;
        return next();
      }
      if (allowAnonymous && (await isAnonymousModeActive(config, settings))) {
        req.user = { id: null, role: 'user', anonymous: true, display_name: 'Guest' };
        return next();
      }
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required');
    };

  const requireAdmin = (req, _res, next) => {
    if (!req.user || req.user.anonymous || req.user.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Administrator rights required');
    }
    next();
  };

  return { authenticate, requireAdmin, resolveUser };
}
