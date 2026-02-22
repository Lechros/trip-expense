import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma } from '../lib/db.js';
import { signAccessToken } from '../lib/auth.js';

/** DB 테스트용: 사용자 생성 후 accessToken 반환 (Google 로그인 대체) */
async function createTestUserAndToken(email: string): Promise<string> {
  const user = await prisma.user.create({
    data: { email, oauthId: `test:${Date.now()}-${Math.random().toString(36).slice(2)}` },
    select: { id: true, email: true },
  });
  return signAccessToken(user);
}

describe('Trips API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /trips without auth returns 401', async () => {
    const res = await app.inject({ method: 'GET', path: '/trips' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /trips without auth returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      path: '/trips',
      payload: {
        name: 'Test',
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        countryCode: 'KR',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /trips/join-info without tripId returns 400', async () => {
    const res = await app.inject({ method: 'GET', path: '/trips/join-info' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /trips/join-info with non-existent tripId returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      path: '/trips/join-info?tripId=00000000-0000-0000-0000-000000000000&password=any',
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /trips/:id without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      path: '/trips/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /trips/:tripId/members without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      path: '/trips/00000000-0000-0000-0000-000000000000/members',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Trips API (DB)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let accessToken: string;
  let tripId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    if (process.env.RUN_DB_TESTS !== '1') return;
    const email = `trips-${Date.now()}@example.com`;
    accessToken = await createTestUserAndToken(email);
    const create = await app.inject({
      method: 'POST',
      path: '/trips',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'My Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-10',
        countryCode: 'JP',
        isPublic: true,
        password: 'trip-secret',
      },
    });
    if (create.statusCode === 201) {
      tripId = (create.json() as { trip: { id: string } }).trip.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'GET /trips returns list including created trip',
    async () => {
      const list = await app.inject({
        method: 'GET',
        path: '/trips',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(list.statusCode).toBe(200);
      const listBody = list.json() as { trips: { id: string }[] };
      expect(listBody.trips.some((t) => t.id === tripId)).toBe(true);
    }
  );

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'GET /trips/:id returns trip for member',
    async () => {
      const getOne = await app.inject({
        method: 'GET',
        path: `/trips/${tripId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(getOne.statusCode).toBe(200);
      expect((getOne.json() as { trip: { name: string } }).trip.name).toBe('My Trip');
    }
  );

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'GET /trips/join-info with valid password returns trip and guests',
    async () => {
      const joinInfo = await app.inject({
        method: 'GET',
        path: `/trips/join-info?tripId=${tripId}&password=trip-secret`,
      });
      expect(joinInfo.statusCode).toBe(200);
      expect((joinInfo.json() as { trip: { id: string } }).trip.id).toBe(tripId);
    }
  );

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'GET /trips/join-info with wrong password returns 401',
    async () => {
      const res = await app.inject({
        method: 'GET',
        path: `/trips/join-info?tripId=${tripId}&password=wrong`,
      });
      expect(res.statusCode).toBe(401);
    }
  );

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'GET /trips/:tripId/members returns members',
    async () => {
      const members = await app.inject({
        method: 'GET',
        path: `/trips/${tripId}/members`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(members.statusCode).toBe(200);
      const membersBody = members.json() as { members: unknown[] };
      expect(membersBody.members.length).toBe(1);
    }
  );

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'second user joins trip then GET /trips and GET /trips/:id succeed',
    async () => {
      const email2 = `trips2-${Date.now()}@example.com`;
      const token2 = await createTestUserAndToken(email2);

      const join = await app.inject({
        method: 'POST',
        path: '/trips/join',
        headers: { authorization: `Bearer ${token2}` },
        payload: { tripId, password: 'trip-secret' },
      });
      expect(join.statusCode).toBe(201);

      const list2 = await app.inject({
        method: 'GET',
        path: '/trips',
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(list2.statusCode).toBe(200);
      expect((list2.json() as { trips: { id: string }[] }).trips.some((t) => t.id === tripId)).toBe(true);

      const getOne2 = await app.inject({
        method: 'GET',
        path: `/trips/${tripId}`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(getOne2.statusCode).toBe(200);
    }
  );

  it.skipIf(process.env.RUN_DB_TESTS !== '1')(
    'non-member GET /trips/:id returns 403',
    async () => {
      const email3 = `trips3-${Date.now()}@example.com`;
      const token3 = await createTestUserAndToken(email3);

      const getOne = await app.inject({
        method: 'GET',
        path: `/trips/${tripId}`,
        headers: { authorization: `Bearer ${token3}` },
      });
      expect(getOne.statusCode).toBe(403);
    }
  );
});
