import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';

describe('App', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 and status ok', async () => {
    const res = await app.inject({ method: 'GET', path: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /me without Authorization returns 401', async () => {
    const res = await app.inject({ method: 'GET', path: '/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: '인증이 필요합니다' });
  });

  it('GET /me with invalid token returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      path: '/me',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: '유효하지 않거나 만료된 토큰입니다' });
  });
});
