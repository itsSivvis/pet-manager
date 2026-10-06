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

  it('never returns the ntfy token', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app)
      .put('/api/admin/settings')
      .set(auth)
      .send({
        ntfy: { enabled: true, url: 'https://ntfy.example.com', topic: 'pets', token: 'tk_secret' },
      })
      .expect(200);
    const res = await request(ctx.app).get('/api/admin/settings').set(auth);
    expect(JSON.stringify(res.body)).not.toContain('tk_secret');
    expect(res.body.ntfy.hasToken).toBe(true);
  });
});
