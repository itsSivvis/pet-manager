import { mkdir } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { createApp } from './app.js';
import { createSettingsStore } from './services/settings.js';
import { startReminderLoop } from './services/reminders.js';

const log = {
  info: (...a) => console.log(new Date().toISOString(), ...a),
  warn: (...a) => console.warn(new Date().toISOString(), ...a),
  error: (...a) => console.error(new Date().toISOString(), ...a),
};

let config;
try {
  config = loadConfig();
} catch (err) {
  log.error(`Configuration error: ${err.message}`);
  process.exit(1);
}

const pool = createPool(config.databaseUrl);
await mkdir(config.uploadDir, { recursive: true });
await migrate(pool, { log: log.info });

const settings = createSettingsStore(pool);
const app = createApp({ config, pool, settings, log });
const server = app.listen(config.port, () =>
  log.info(`Pet Manager listening on port ${config.port}`),
);

if (config.isProduction && config.allowAnonymousMode) {
  log.warn(
    'ALLOW_ANONYMOUS_MODE is enabled: an admin can turn off the login requirement. Never do this on an instance reachable from the internet.',
  );
}

const stopReminders = config.remindersEnabled
  ? startReminderLoop({ pool, settings, config, log })
  : () => {};

function shutdown(signal) {
  log.info(`${signal} received, shutting down`);
  stopReminders();
  server.close(() => pool.end().then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
