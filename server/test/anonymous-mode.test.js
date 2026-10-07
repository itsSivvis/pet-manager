import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestContext, PASSWORD } from './helpers.js';

describe('anonymous mode (login requirement disabled)', () => {
  let ctx;
  let token;

  beforeAll(async () => {
    ctx = await createTestContext({ ALLOW_ANONYMOUS_MODE: 'true' });
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ email: 'admin@example.com', password: PASSWORD, display_name: 'Admin' });
    token = res.body.token;
  });
  afterAll(() => ctx.pool.end());

  it('is off by default even when the server allows it', async () => {
    expect((await request(ctx.app).get('/api/pets')).status).toBe(401);
  });

  it('grants data access without login once the admin disables the requirement', async () => {
    await request(ctx.app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ requireLogin: false })
      .expect(200);
    const status = await request(ctx.app).get('/api/auth/status');
    expect(status.body.anonymousMode).toBe(true);
    expect((await request(ctx.app).get('/api/pets')).status).toBe(200);
    expect((await request(ctx.app).post('/api/pets').send({ name: 'Anon pet' })).status).toBe(201);
  });

  it('never grants admin rights to anonymous visitors', async () => {
    expect((await request(ctx.app).get('/api/admin/settings')).status).toBe(401);
    expect(
      (await request(ctx.app).put('/api/admin/settings').send({ requireLogin: true })).status,
    ).toBe(401);
    expect((await request(ctx.app).post('/api/catalog/foods').send({ name: 'x' })).status).toBe(
      403,
    );
  });

  it('keeps household settings and invites away from anonymous visitors', async () => {
    expect((await request(ctx.app).get('/api/household')).status).toBe(401);
    expect((await request(ctx.app).get('/api/household/settings')).status).toBe(401);
    expect((await request(ctx.app).post('/api/household/invite')).status).toBe(401);
  });

  it("shows anonymous visitors only the admin's household", async () => {
    const admin = { Authorization: `Bearer ${token}` };
    const other = await request(ctx.app)
      .post('/api/admin/households')
      .set(admin)
      .send({ name: 'Neighbours' });
    const res = await request(ctx.app).post('/api/auth/register').send({
      email: 'neighbour@example.com',
      password: PASSWORD,
      display_name: 'Neighbour',
      invite_code: other.body.invite_code,
    });
    await request(ctx.app)
      .post('/api/pets')
      .set({ Authorization: `Bearer ${res.body.token}` })
      .send({ name: 'Private pet' })
      .expect(201);
    const pets = await request(ctx.app).get('/api/pets');
    expect(pets.body.map((p) => p.name)).toEqual(['Anon pet']);
  });

  it('turns anonymous mode off when its household is deleted', async () => {
    const admin = { Authorization: `Bearer ${token}` };
    const { rows } = await ctx.pool.query(
      "SELECT id, household_id FROM users WHERE email = 'admin@example.com'",
    );
    const move = (household_id) =>
      request(ctx.app)
        .patch(`/api/admin/users/${rows[0].id}`)
        .set(admin)
        .send({ household_id })
        .expect(200);
    const spare = await request(ctx.app)
      .post('/api/admin/households')
      .set(admin)
      .send({ name: 'Spare' });
    await move(spare.body.id);
    await request(ctx.app).put('/api/admin/settings').set(admin).send({ requireLogin: false });
    await move(rows[0].household_id);
    await request(ctx.app).delete(`/api/admin/households/${spare.body.id}`).set(admin).expect(204);
    expect((await request(ctx.app).get('/api/auth/status')).body.anonymousMode).toBe(false);
    expect((await request(ctx.app).get('/api/pets')).status).toBe(401);
  });

  it('never returns the ntfy token', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app)
      .put('/api/household/settings')
      .set(auth)
      .send({
        ntfy: { enabled: true, url: 'https://ntfy.example.com', topic: 'pets', token: 'tk_secret' },
      })
      .expect(200);
    const res = await request(ctx.app).get('/api/household/settings').set(auth);
    expect(JSON.stringify(res.body)).not.toContain('tk_secret');
    expect(res.body.ntfy.hasToken).toBe(true);
  });
});
