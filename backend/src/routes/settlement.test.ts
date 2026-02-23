/**
 * 정산 API 테스트.
 * 설계 시나리오: docs/SETTLEMENT_TEST_DESIGN.md
 * RUN_DB_TESTS=1 일 때만 DB 사용 테스트 실행.
 */

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

describe('Settlement API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('S1: GET /trips/:tripId/settlement without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      path: '/trips/00000000-0000-0000-0000-000000000000/settlement',
    });
    expect(res.statusCode).toBe(401);
  });

  it('S3: GET /trips/:tripId/settlement with non-existent tripId returns 404', async () => {
    const token = await createTestUserAndToken(`settlement-404-${Date.now()}@example.com`);
    const res = await app.inject({
      method: 'GET',
      path: '/trips/00000000-0000-0000-0000-000000000000/settlement',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('Settlement API (DB)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let accessToken: string;
  let tripId: string;
  let memberId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    if (process.env.RUN_DB_TESTS !== '1') return;
    const email = `settlement-${Date.now()}@example.com`;
    accessToken = await createTestUserAndToken(email);
    const create = await app.inject({
      method: 'POST',
      path: '/trips',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'Settlement Trip',
        startDate: '2025-02-01',
        endDate: '2025-02-10',
        countryCode: 'KR',
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

  it('S4: GET /trips/:tripId/settlement as member returns 200 and structure', async () => {
    if (process.env.RUN_DB_TESTS !== '1' || !tripId) return;
    const res = await app.inject({
      method: 'GET',
      path: `/trips/${tripId}/settlement`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json() as {
      exchangeWarning: boolean;
      excludedMessages: string[];
      memberSummaries: { memberId: string; displayName: string; paidKrw: number; usedKrw: number; diffKrw: number }[];
      transfers: { fromName: string; toName: string; amountKrw: number }[];
      myReceive: { from: string; amountKrw: number }[];
      mySend: { to: string; amountKrw: number }[];
      mySummary: { paidKrw: number; usedKrw: number; diffKrw: number } | null;
    };
    expect(typeof data.exchangeWarning).toBe('boolean');
    expect(Array.isArray(data.excludedMessages)).toBe(true);
    expect(Array.isArray(data.memberSummaries)).toBe(true);
    expect(Array.isArray(data.transfers)).toBe(true);
    expect(Array.isArray(data.myReceive)).toBe(true);
    expect(Array.isArray(data.mySend)).toBe(true);
    expect(data.memberSummaries.length).toBeGreaterThanOrEqual(1);
    if (data.mySummary) {
      expect(typeof data.mySummary.paidKrw).toBe('number');
      expect(typeof data.mySummary.usedKrw).toBe('number');
      expect(typeof data.mySummary.diffKrw).toBe('number');
    }
  });

  it('M1: No entries → all members paidKrw=0, usedKrw=0, diffKrw=0', async () => {
    if (process.env.RUN_DB_TESTS !== '1' || !tripId) return;
    const res = await app.inject({
      method: 'GET',
      path: `/trips/${tripId}/settlement`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json() as { memberSummaries: { paidKrw: number; usedKrw: number; diffKrw: number }[] };
    for (const m of data.memberSummaries) {
      expect(m.paidKrw).toBe(0);
      expect(m.usedKrw).toBe(0);
      expect(m.diffKrw).toBe(0);
    }
    expect(data.memberSummaries.length).toBe(1);
  });

  // --- 아래는 설계 문서 시나리오에 맞춰 기대값을 정한 뒤 검증하는 테스트 자리 ---
  // M2: A 30,000원 결제 / 수혜자 A,B,C → paid/used/diff 기대값
  // E1: 항목 모두 KRW → 환산 없이 반영
  // E2, E5: JPY + 환전 유/무 → 제외 메시지 및 합계
  // T2, T3: 이체 목록 조합
  // 필요 시 추가 describe('정산 - 환율 적용'), describe('정산 - 이체 목록') 등으로 확장
});
