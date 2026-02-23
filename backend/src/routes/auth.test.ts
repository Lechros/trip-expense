import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma } from '../lib/db.js';
import { signRefreshToken } from '../lib/auth.js';
import { REFRESH_TOKEN_COOKIE } from '../lib/cookie-options.js';

describe('Auth API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/refresh without token returns 401', async () => {
    const res = await app.inject({ method: 'POST', path: '/auth/refresh' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: '유효하지 않거나 만료된 토큰입니다' });
  });

  it('POST /auth/refresh with invalid token returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      path: '/auth/refresh',
      payload: { refreshToken: 'invalid-refresh-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: '유효하지 않거나 만료된 토큰입니다' });
  });
});

describe('Auth API (DB)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/refresh with valid refresh token in body returns 200 and new cookies', async () => {
    if (process.env.RUN_DB_TESTS !== '1') return;
    const email = `refresh-body-${Date.now()}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, oauthId: `google:${Date.now()}` },
      update: {},
      select: { id: true, email: true },
    });
    const refreshToken = signRefreshToken(user);

    const res = await app.inject({
      method: 'POST',
      path: '/auth/refresh',
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ expiresIn: 900 });
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieHeader).toMatch(/accessToken=/);
    expect(cookieHeader).toMatch(/refreshToken=/);
  });

  it('POST /auth/refresh with valid refresh token in cookie returns 200 and new cookies', async () => {
    if (process.env.RUN_DB_TESTS !== '1') return;
    const email = `refresh-cookie-${Date.now()}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, oauthId: `google:${Date.now()}` },
      update: {},
      select: { id: true, email: true },
    });
    const refreshToken = signRefreshToken(user);

    const res = await app.inject({
      method: 'POST',
      path: '/auth/refresh',
      headers: { cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ expiresIn: 900 });
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieHeader).toMatch(/accessToken=/);
    expect(cookieHeader).toMatch(/refreshToken=/);
  });

  it('After refresh, new access token works for GET /me', async () => {
    if (process.env.RUN_DB_TESTS !== '1') return;
    const email = `refresh-me-${Date.now()}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, oauthId: `google:${Date.now()}` },
      update: {},
      select: { id: true, email: true },
    });
    const refreshToken = signRefreshToken(user);

    const refreshRes = await app.inject({
      method: 'POST',
      path: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);

    const setCookie = refreshRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie : [setCookie];
    const cookieParts = cookieHeader.flatMap((s: string) => s.split(';').map((p) => p.trim()));
    const accessCookie = cookieParts.find((p: string) => p.startsWith('accessToken='));
    expect(accessCookie).toBeDefined();
    const cookieForMe = accessCookie!.split(';')[0];

    const meRes = await app.inject({
      method: 'GET',
      path: '/me',
      headers: { cookie: cookieForMe },
    });
    expect(meRes.statusCode).toBe(200);
    const body = meRes.json() as { user?: { id: string; email: string } };
    expect(body.user).toBeDefined();
    expect(body.user!.id).toBe(user.id);
    expect(body.user!.email).toBe(user.email);
  });
});
