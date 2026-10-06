import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { createSettingsStore } from '../src/services/settings.js';
import { runReminders } from '../src/services/reminders.js';
import { seed } from '../src/db/seed.js';
import { TEST_DATABASE_URL } from './helpers.js';

let pool;
beforeAll(async () => {
  pool = createPool(TEST_DATABASE_URL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
});
afterAll(() => pool.end());

describe('migrations', () => {
  it('run from scratch on an empty database and are idempotent', async () => {
    const first = await migrate(pool);
    expect(first.length).toBeGreaterThan(0);
    const second = await migrate(pool);
    expect(second).toEqual([]);
    const { rows } = await pool.query("SELECT to_regclass('public.pets') AS t");
    expect(rows[0].t).toBe('pets');
  });

  it('survive concurrent runs (advisory lock)', async () => {
    const results = await Promise.all([migrate(pool), migrate(pool)]);
    expect(results.flat()).toEqual([]);
  });

  it('seed creates demo data once', async () => {
    expect((await seed(pool)).seeded).toBe(true);
    expect((await seed(pool)).skipped).toBe(true);
  });
});

describe('reminders', () => {
  it('sends each due reminder exactly once, localized', async () => {
    const settings = createSettingsStore(pool);
    await settings.set({
      ntfy: { enabled: true, url: 'https://ntfy.example.com', topic: 'pets', token: '' },
      notificationLocale: 'de',
    });
    const { rows } = await pool.query("SELECT id FROM pets WHERE name = 'Biscuit'");
    await pool.query(
      `INSERT INTO medications (pet_id, name, dose, unit, times, start_date)
       VALUES ($1, 'Testmed', 1, 'tablet', '{12:00}', '2026-01-01')`,
      [rows[0].id],
    );
    const sent = [];
    const send = async (_ntfy, msg) => sent.push(msg);
    const config = { timezone: 'UTC', defaultLocale: 'en' };
    const now = new Date('2026-06-01T12:05:00Z');
    await runReminders({ pool, settings, config, now, send });
    const med = sent.find((m) => m.message.includes('Testmed'));
    expect(med.title).toBe('Medikament fällig: Biscuit');
    const count = sent.length;
    await runReminders({ pool, settings, config, now, send });
    expect(sent.length).toBe(count);
  });

  it('retries a reminder if sending failed', async () => {
    const settings = createSettingsStore(pool);
    const config = { timezone: 'UTC', defaultLocale: 'en' };
    const now = new Date('2026-06-02T12:05:00Z');
    let fail = true;
    const sent = [];
    const send = async (_n, msg) => {
      if (fail) throw new Error('offline');
      sent.push(msg);
    };
    await runReminders({ pool, settings, config, now, send, log: { warn: () => {} } });
    fail = false;
    await runReminders({ pool, settings, config, now, send });
    expect(sent.some((m) => m.message.includes('Testmed'))).toBe(true);
  });
});
