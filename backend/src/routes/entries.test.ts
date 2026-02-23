import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma } from '../lib/db.js';
import { signAccessToken } from '../lib/auth.js';

async function createTestUserAndToken(email: string): Promise<string> {
  const user = await prisma.user.create({
    data: { email, oauthId: `test:${Date.now()}-${Math.random().toString(36).slice(2)}` },
    select: { id: true, email: true },
  });
  return signAccessToken(user);
}

describe('Entries API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /trips/:tripId/entries without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      path: '/trips/00000000-0000-0000-0000-000000000000/entries',
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /trips/:tripId/entries without auth returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      path: '/trips/00000000-0000-0000-0000-000000000000/entries',
      payload: {
        amount: 1000,
        currency: 'KRW',
        paidAt: new Date().toISOString(),
        paidByMemberId: '00000000-0000-0000-0000-000000000000',
        beneficiaryMemberIds: ['00000000-0000-0000-0000-000000000000'],
      },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Entries API (DB)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let accessToken: string;
  let tripId: string;
  let memberId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    if (process.env.RUN_DB_TESTS !== '1') return;
    const email = `entries-${Date.now()}@example.com`;
    accessToken = await createTestUserAndToken(email);
    const create = await app.inject({
      method: 'POST',
      path: '/trips',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'Entry Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-10',
        countryCode: 'JP',
      },
    });
    if (create.statusCode === 201) {
      tripId = (create.json() as { trip: { id: string } }).trip.id;
      const list = await app.inject({
        method: 'GET',
        path: '/trips',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const trips = (list.json() as { trips: { memberId: string }[] }).trips;
      memberId = trips[0]?.memberId ?? '';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /trips/:tripId/entries returns empty then created entry', async () => {
    if (process.env.RUN_DB_TESTS !== '1' || !tripId) return;
    const empty = await app.inject({
      method: 'GET',
      path: `/trips/${tripId}/entries`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(empty.statusCode).toBe(200);
    const emptyData = empty.json() as { entries: unknown[] };
    expect(emptyData.entries).toHaveLength(0);

    const post = await app.inject({
      method: 'POST',
      path: `/trips/${tripId}/entries`,
      headers: { authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      payload: {
        amount: 5000,
        currency: 'KRW',
        paidAt: '2025-02-15T12:00:00.000Z',
        memo: '점심',
        paidByMemberId: memberId,
        beneficiaryMemberIds: [memberId],
      },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json() as { entry: { id: string; amount: number; memo: string | null } };
    expect(created.entry.amount).toBe(5000);
    expect(created.entry.memo).toBe('점심');

    const list = await app.inject({
      method: 'GET',
      path: `/trips/${tripId}/entries`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(list.statusCode).toBe(200);
    const listData = list.json() as { entries: { id: string }[] };
    expect(listData.entries).toHaveLength(1);
    expect(listData.entries[0].id).toBe(created.entry.id);
  });
});
