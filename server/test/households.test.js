import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { runReminders } from '../src/services/reminders.js';
import { createTestContext, PASSWORD, TEST_DATABASE_URL } from './helpers.js';

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex',
);

describe('multiple households', () => {
  let ctx;
  const api = () => request(ctx.app);
  const auth = (token) => ({ Authorization: `Bearer ${token}` });
  // Two families: A (admin + invited member) and B (self-registered).
  let adminA;
  let memberA;
  let userB;
  let petA;
  let medA;
  let illnessA;

  const register = (body) =>
    api()
      .post('/api/auth/register')
      .send({ password: PASSWORD, ...body });

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => ctx.pool.end());

  it('creates a named household for the first account', async () => {
    const res = await register({
      email: 'a@example.com',
      display_name: 'Alice',
      household_name: 'Family A',
    });
    expect(res.status).toBe(201);
    adminA = res.body.token;
    expect(res.body.user.household_id).toEqual(expect.any(Number));
    const household = await api().get('/api/household').set(auth(adminA));
    expect(household.body).toMatchObject({ name: 'Family A', invite_code: null });
    expect(household.body.members.map((m) => m.display_name)).toEqual(['Alice']);
  });

  it('gives self-registered accounts their own, separate household', async () => {
    await api()
      .put('/api/admin/settings')
      .set(auth(adminA))
      .send({ allowRegistration: true })
      .expect(200);
    const res = await register({
      email: 'b@example.com',
      display_name: 'Bob',
      household_name: 'Family B',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    userB = res.body.token;
    const household = await api().get('/api/household').set(auth(userB));
    expect(household.body.name).toBe('Family B');
    expect(household.body.members.map((m) => m.display_name)).toEqual(['Bob']);
    await api()
      .put('/api/admin/settings')
      .set(auth(adminA))
      .send({ allowRegistration: false })
      .expect(200);
  });

  it('lets members invite others even when registration is closed', async () => {
    const invite = await api().post('/api/household/invite').set(auth(adminA));
    expect(invite.body.invite_code).toMatch(/^[\w-]{20,}$/);

    const bad = await register({
      email: 'x@example.com',
      display_name: 'X',
      invite_code: 'not-a-valid-code',
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVITE_INVALID');

    const closed = await register({ email: 'y@example.com', display_name: 'Y' });
    expect(closed.body.error.code).toBe('REGISTRATION_CLOSED');

    const res = await register({
      email: 'a2@example.com',
      display_name: 'Anna',
      invite_code: invite.body.invite_code,
    });
    expect(res.status).toBe(201);
    memberA = res.body.token;
    const household = await api().get('/api/household').set(auth(memberA));
    expect(household.body.name).toBe('Family A');
    expect(household.body.members).toHaveLength(2);
  });

  it('can revoke an invite', async () => {
    const before = await api().get('/api/household').set(auth(adminA));
    const revoked = await api().delete('/api/household/invite').set(auth(adminA));
    expect(revoked.body.invite_code).toBeNull();
    const res = await register({
      email: 'late@example.com',
      display_name: 'Late',
      invite_code: before.body.invite_code,
    });
    expect(res.body.error.code).toBe('INVITE_INVALID');
  });

  it('shares pets within a household', async () => {
    const pet = await api().post('/api/pets').set(auth(adminA)).send({ name: 'Rex' });
    petA = pet.body.id;
    const list = await api().get('/api/pets').set(auth(memberA));
    expect(list.body.map((p) => p.name)).toEqual(['Rex']);
    const med = await api()
      .post(`/api/pets/${petA}/medications`)
      .set(auth(memberA))
      .send({ name: 'Drops', times: ['08:00'], start_date: '2026-01-01', stock: 10, dose: 1 });
    medA = med.body.id;
    const illness = await api()
      .post(`/api/pets/${petA}/illnesses`)
      .set(auth(adminA))
      .send({ title: 'Cough', started_on: '2026-01-01' });
    illnessA = illness.body.id;
    await api()
      .post(`/api/pets/${petA}/illnesses/${illnessA}/entries`)
      .set(auth(adminA))
      .send({ date: '2026-01-02', severity: 2 })
      .expect(201);
  });

  it('hides pets and all their data from other households', async () => {
    const b = auth(userB);
    expect((await api().get('/api/pets').set(b)).body).toEqual([]);
    expect((await api().get('/api/pets?archived=true').set(b)).body).toEqual([]);

    const notFound = [
      api().get(`/api/pets/${petA}`).set(b),
      api().patch(`/api/pets/${petA}`).set(b).send({ name: 'Stolen' }),
      api().delete(`/api/pets/${petA}`).set(b),
      api().delete(`/api/pets/${petA}/photo`).set(b),
      api().post(`/api/pets/${petA}/photo`).set(b).attach('photo', PNG, 'x.png'),
      api().get(`/api/pets/${petA}/health`).set(b),
      api().post(`/api/pets/${petA}/health`).set(b).send({ date: '2026-01-01', type: 'other' }),
      api().get(`/api/pets/${petA}/medications`).set(b),
      api().get(`/api/pets/${petA}/medications/${medA}`).set(b),
      api().patch(`/api/pets/${petA}/medications/${medA}`).set(b).send({ name: 'x' }),
      api().delete(`/api/pets/${petA}/medications/${medA}`).set(b),
      api().get(`/api/pets/${petA}/medications/${medA}/doses`).set(b),
      api().post(`/api/pets/${petA}/medications/${medA}/doses`).set(b).send({}),
      api().get(`/api/pets/${petA}/appointments`).set(b),
      api().get(`/api/pets/${petA}/feeding`).set(b),
      api().get(`/api/pets/${petA}/prevention`).set(b),
      api().get(`/api/pets/${petA}/illnesses`).set(b),
      api().get(`/api/pets/${petA}/illnesses/${illnessA}/entries`).set(b),
      api()
        .post(`/api/pets/${petA}/illnesses/${illnessA}/entries`)
        .set(b)
        .send({ date: '2026-01-03' }),
    ];
    for (const res of await Promise.all(notFound)) {
      expect(res.status, `${res.req.method} ${res.req.path}`).toBe(404);
      expect(res.body.error.code).toBe('PET_NOT_FOUND');
    }

    // Nothing was changed by the attempts above.
    const pet = await api().get(`/api/pets/${petA}`).set(auth(adminA));
    expect(pet.body).toMatchObject({ name: 'Rex', photo: null });
    const meds = await api().get(`/api/pets/${petA}/medications`).set(auth(adminA));
    expect(meds.body[0]).toMatchObject({ name: 'Drops', stock: 10 });
  });

  it('keeps the dashboard separate', async () => {
    const a = await api().get('/api/dashboard').set(auth(memberA));
    expect(a.body.pets.map((p) => p.name)).toEqual(['Rex']);
    expect(a.body.illnesses).toHaveLength(1);
    const b = await api().get('/api/dashboard').set(auth(userB));
    expect(b.body).toMatchObject({
      pets: [],
      doses: [],
      appointments: [],
      prevention: [],
      lowStock: [],
      illnesses: [],
    });
  });

  it('lets members rename their household and keeps settings per household', async () => {
    const renamed = await api().patch('/api/household').set(auth(memberA)).send({ name: 'The As' });
    expect(renamed.body.name).toBe('The As');
    await api()
      .put('/api/household/settings')
      .set(auth(memberA))
      .send({
        notificationLocale: 'de',
        ntfy: { enabled: true, url: 'https://ntfy.example.com', topic: 'family-a', token: 'tk' },
      })
      .expect(200);
    const a = await api().get('/api/household/settings').set(auth(adminA));
    expect(a.body.ntfy).toMatchObject({ topic: 'family-a', hasToken: true });
    expect(a.body.ntfy.token).toBeUndefined();
    const b = await api().get('/api/household/settings').set(auth(userB));
    expect(b.body).toMatchObject({ notificationLocale: null, ntfy: { enabled: false, topic: '' } });
  });

  it("sends reminders only to the pet's own household", async () => {
    await api()
      .put('/api/household/settings')
      .set(auth(userB))
      .send({ ntfy: { enabled: true, url: 'https://ntfy.example.com', topic: 'family-b' } })
      .expect(200);
    const sent = [];
    const send = async (ntfy, msg) => sent.push({ topic: ntfy.topic, ...msg });
    await runReminders({
      pool: ctx.pool,
      config: { timezone: 'UTC', defaultLocale: 'en' },
      now: new Date('2026-06-01T08:05:00Z'),
      send,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ topic: 'family-a', title: 'Medikament fällig: Rex' });
  });

  describe('administration', () => {
    let households;

    it('lists households with member and pet counts', async () => {
      const res = await api().get('/api/admin/households').set(auth(adminA));
      households = Object.fromEntries(res.body.map((h) => [h.name, h]));
      expect(households['The As']).toMatchObject({ member_count: 2, pet_count: 1 });
      expect(households['Family B']).toMatchObject({ member_count: 1, pet_count: 0 });
      const users = await api().get('/api/admin/users').set(auth(adminA));
      expect(users.body.find((u) => u.email === 'b@example.com').household_name).toBe('Family B');
    });

    it('is for admins only', async () => {
      expect((await api().get('/api/admin/households').set(auth(memberA))).status).toBe(403);
      expect(
        (await api().post('/api/admin/households').set(auth(userB)).send({ name: 'x' })).status,
      ).toBe(403);
    });

    it('creates households with an invite code', async () => {
      const res = await api()
        .post('/api/admin/households')
        .set(auth(adminA))
        .send({ name: 'Family C' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Family C', member_count: 0 });
      expect(res.body.invite_code).toBeTruthy();
      households['Family C'] = res.body;
    });

    it('moves users between households', async () => {
      const { rows } = await ctx.pool.query("SELECT id FROM users WHERE email = 'b@example.com'");
      const res = await api()
        .patch(`/api/admin/users/${rows[0].id}`)
        .set(auth(adminA))
        .send({ household_id: households['The As'].id });
      expect(res.body).toMatchObject({ household_name: 'The As', role: 'user' });
      // Takes effect immediately, without a new login.
      const pets = await api().get('/api/pets').set(auth(userB));
      expect(pets.body.map((p) => p.name)).toEqual(['Rex']);

      const missing = await api()
        .patch(`/api/admin/users/${rows[0].id}`)
        .set(auth(adminA))
        .send({ household_id: 999999 });
      expect(missing.body.error.code).toBe('HOUSEHOLD_NOT_FOUND');
    });

    it('renames households', async () => {
      const res = await api()
        .patch(`/api/admin/households/${households['Family C'].id}`)
        .set(auth(adminA))
        .send({ name: 'Family C.' });
      expect(res.body.name).toBe('Family C.');
    });

    it('deletes only households without members, together with their pets', async () => {
      const busy = await api()
        .delete(`/api/admin/households/${households['The As'].id}`)
        .set(auth(adminA));
      expect(busy.status).toBe(409);
      expect(busy.body.error.code).toBe('HOUSEHOLD_NOT_EMPTY');

      // Family B is empty now (Bob moved), give it a pet first.
      const hid = households['Family B'].id;
      await ctx.pool.query("INSERT INTO pets (household_id, name) VALUES ($1, 'Orphan')", [hid]);
      await api().delete(`/api/admin/households/${hid}`).set(auth(adminA)).expect(204);
      const { rows } = await ctx.pool.query("SELECT 1 FROM pets WHERE name = 'Orphan'");
      expect(rows).toHaveLength(0);
      expect(
        (await api().delete(`/api/admin/households/${hid}`).set(auth(adminA))).body.error.code,
      ).toBe('HOUSEHOLD_NOT_FOUND');
    });
  });
});

describe('migration of an existing single-household instance', () => {
  let pool;
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/db/migrations');

  beforeAll(async () => {
    pool = createPool(TEST_DATABASE_URL);
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    // State of an instance before households existed.
    await pool.query(`CREATE TABLE schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    for (const file of ['001_initial_schema.sql', '002_password_changed_at.sql']) {
      await pool.query(await readFile(path.join(dir, file), 'utf8'));
      await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    }
    await pool.query(`INSERT INTO users (email, display_name, password_hash, role)
      VALUES ('old@example.com', 'Old', 'x', 'admin'), ('old2@example.com', 'Old 2', 'x', 'user')`);
    await pool.query("INSERT INTO pets (name) VALUES ('Old pet')");
    await pool.query(`INSERT INTO settings (key, value) VALUES
      ('ntfy', '{"enabled": true, "url": "https://ntfy.sh", "topic": "old", "token": ""}'),
      ('notificationLocale', '"de"'), ('requireLogin', 'true')`);
  });
  afterAll(() => pool.end());

  it('moves all users, pets and notification settings into one household', async () => {
    expect(await migrate(pool)).toContain('003_households.sql');
    const { rows: households } = await pool.query('SELECT * FROM households');
    expect(households).toHaveLength(1);
    expect(households[0].settings).toMatchObject({
      ntfy: { topic: 'old', enabled: true },
      notificationLocale: 'de',
    });
    const id = households[0].id;
    const { rows: users } = await pool.query('SELECT DISTINCT household_id FROM users');
    expect(users).toEqual([{ household_id: id }]);
    const { rows: pets } = await pool.query('SELECT household_id FROM pets');
    expect(pets).toEqual([{ household_id: id }]);
    const { rows: settings } = await pool.query('SELECT key, value FROM settings ORDER BY key');
    expect(settings).toEqual([
      { key: 'anonymousHouseholdId', value: id },
      { key: 'requireLogin', value: true },
    ]);
  });
});
