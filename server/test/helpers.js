import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createSettingsStore } from '../src/services/settings.js';

// Integration tests need a disposable PostgreSQL database. The schema is
// dropped and recreated, so never point TEST_DATABASE_URL at real data.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgres://petmanager:petmanager@localhost:5432/petmanager_test';

export async function resetDatabase(pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool);
}

export async function createTestContext(env = {}) {
  const uploadDir = await mkdtemp(path.join(tmpdir(), 'pm-uploads-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    UPLOAD_DIR: uploadDir,
    AUTH_RATE_LIMIT: '1000',
    ...env,
  });
  const pool = createPool(config.databaseUrl);
  await resetDatabase(pool);
  const settings = createSettingsStore(pool);
  const app = createApp({ config, pool, settings, log: { error: () => {} } });
  return { config, pool, settings, app, uploadDir };
}

export const PASSWORD = 'a-long-test-password';
