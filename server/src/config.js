import path from 'node:path';

// Central, validated configuration. Everything that can be configured via the
// environment is read here and nowhere else (see .env.example for the reference).

const INSECURE_SECRETS = new Set(['', 'changeme', 'change-me', 'secret', 'dev-secret']);

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parses process.env into a config object. Throws on configurations that would
 * be unsafe in production (e.g. a missing or weak JWT secret).
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  let jwtSecret = env.JWT_SECRET ?? '';
  if (isProduction) {
    if (INSECURE_SECRETS.has(jwtSecret) || jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to a random value of at least 32 characters in production. ' +
          'Generate one with: openssl rand -hex 32',
      );
    }
  } else if (!jwtSecret) {
    // Development/test only: a fixed secret keeps tokens valid across restarts.
    jwtSecret = 'insecure-development-secret-do-not-use-in-production';
  }

  const clientUrls = (env.CLIENT_URL || (isProduction ? '' : 'http://localhost:5173'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    isProduction,
    port: int(env.PORT, 3000),
    databaseUrl: env.DATABASE_URL || 'postgres://petmanager:petmanager@localhost:5432/petmanager',
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
    clientUrls,
    // Number of reverse-proxy hops to trust for X-Forwarded-For (rate limiting, logs).
    trustProxy: int(env.TRUST_PROXY, 0),
    uploadDir: path.resolve(env.UPLOAD_DIR || new URL('../uploads', import.meta.url).pathname),
    maxUploadBytes: int(env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
    // Directory with the built client (served by the API server in production).
    staticDir: env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : '',
    timezone: env.TZ || 'UTC',
    defaultLocale: env.DEFAULT_LOCALE === 'de' ? 'de' : 'en',
    // Hard safety switch: unless explicitly allowed here, an admin cannot turn off
    // the login requirement from the UI.
    allowAnonymousMode: bool(env.ALLOW_ANONYMOUS_MODE, false),
    remindersEnabled: bool(env.REMINDERS_ENABLED, true),
    reminderIntervalMs: int(env.REMINDER_INTERVAL_SECONDS, 60) * 1000,
    authRateLimit: int(env.AUTH_RATE_LIMIT, 10),
    // Requests per IP and minute for the whole API (protects the database).
    apiRateLimit: int(env.API_RATE_LIMIT, 1000),
  };
}
