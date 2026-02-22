import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuthOrGuest } from '../lib/auth-middleware.js';
import { requireTripMember } from '../lib/trip-member.js';

const createExchangeBody = z.object({
  sourceCurrency: z.string().length(3, '통화 코드 3자리'),
  targetCurrency: z.string().length(3, '통화 코드 3자리'),
  rate: z.number().positive('환율은 0보다 커야 합니다'),
  sourceAmount: z.number().positive('금액은 0보다 커야 합니다'),
  exchangedAt: z.string().min(1, '환전 일시가 필요합니다'),
});

const patchExchangeBody = z.object({
  rate: z.number().positive().optional(),
  sourceAmount: z.number().positive().optional(),
  exchangedAt: z.string().min(1).optional(),
});

/** ExchangeRecord + exchangedBy displayName 직렬화 */
async function exchangeToResponse(
  record: {
    id: string;
    tripId: string;
    userId: string | null;
    guestId: string | null;
    sourceCurrency: string;
    targetCurrency: string;
    rate: unknown;
    sourceAmount: unknown;
    targetAmount: unknown;
    exchangedAt: Date;
    recordedAt: Date;
  },
  members: { id: string; displayName: string; userId: string | null; guestId: string | null }[]
) {
  const byUser = (userId: string | null) => members.find((m) => m.userId === userId);
  const byGuest = (guestId: string | null) => members.find((m) => m.guestId === guestId);
  const member = record.userId
    ? byUser(record.userId)
    : record.guestId
      ? byGuest(record.guestId)
      : null;
  return {
    id: record.id,
    tripId: record.tripId,
    exchangedBy: member
      ? { memberId: member.id, displayName: member.displayName }
      : { memberId: '', displayName: '(알 수 없음)' },
    sourceCurrency: record.sourceCurrency,
    targetCurrency: record.targetCurrency,
    rate: Number(record.rate),
    sourceAmount: Number(record.sourceAmount),
    targetAmount: Number(record.targetAmount),
    exchangedAt: (record.exchangedAt as Date).toISOString(),
    recordedAt: (record.recordedAt as Date).toISOString(),
  };
}

export async function exchangeRoutes(app: FastifyInstance) {
  // GET /trips/:tripId/exchanges — 목록은 요청자(자기 자신)의 환전 기록만
  app.get(
    '/exchanges',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { tripId: string } }>, reply: FastifyReply) => {
      const { tripId } = req.params;
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      const guestId = (req as FastifyRequest & { guestId?: string }).guestId;

      const records = await prisma.exchangeRecord.findMany({
        where: {
          tripId,
          ...(userId ? { userId } : { guestId: guestId ?? undefined }),
        },
        orderBy: { exchangedAt: 'desc' },
      });

      const members = await prisma.tripMember.findMany({
        where: { tripId },
        select: { id: true, displayName: true, userId: true, guestId: true },
      });

      const list = await Promise.all(
        records.map((r) => exchangeToResponse(r, members))
      );
      return reply.send({ exchanges: list });
    }
  );

  // POST /trips/:tripId/exchanges
  app.post(
    '/exchanges',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { tripId: string } }>, reply: FastifyReply) => {
      const { tripId } = req.params;
      const isGuest = (req as FastifyRequest & { isGuest?: boolean }).isGuest;
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      const guestId = (req as FastifyRequest & { guestId?: string }).guestId;
      if (!userId && !guestId) return reply.status(401).send({ error: '인증이 필요합니다' });

      const parsed = createExchangeBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const body = parsed.data;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { baseCurrency: true, additionalCurrency: true },
      });
      if (!trip) return reply.status(404).send({ error: '여행을 찾을 수 없습니다' });
      const allowed = [trip.baseCurrency, trip.additionalCurrency].filter(Boolean) as string[];
      if (!allowed.includes(body.sourceCurrency) || !allowed.includes(body.targetCurrency)) {
        return reply.status(400).send({ error: '허용된 통화가 아닙니다' });
      }
      if (body.sourceCurrency === body.targetCurrency) {
        return reply.status(400).send({ error: '출발 통화와 도착 통화가 같을 수 없습니다' });
      }

      const exchangedAt = new Date(body.exchangedAt);
      if (Number.isNaN(exchangedAt.getTime())) {
        return reply.status(400).send({ error: 'exchangedAt 형식이 올바르지 않습니다' });
      }

      // rate = 1 target = rate source (e.g. 1 JPY = 9.4 KRW) → targetAmount = sourceAmount / rate (소수 2자리)
      const targetAmount = Math.round((body.sourceAmount / body.rate) * 100) / 100;

      const record = await prisma.exchangeRecord.create({
        data: {
          tripId,
          userId: isGuest ? null : userId ?? null,
          guestId: isGuest && guestId ? guestId : null,
          sourceCurrency: body.sourceCurrency,
          targetCurrency: body.targetCurrency,
          rate: body.rate,
          sourceAmount: body.sourceAmount,
          targetAmount,
          exchangedAt,
        },
      });

      const members = await prisma.tripMember.findMany({
        where: { tripId },
        select: { id: true, displayName: true, userId: true, guestId: true },
      });
      const response = await exchangeToResponse(record, members);
      return reply.status(201).send({ exchange: response });
    }
  );

  // GET /trips/:tripId/exchanges/:id
  app.get(
    '/exchanges/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (
      req: FastifyRequest<{ Params: { tripId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { tripId, id } = req.params;
      const record = await prisma.exchangeRecord.findFirst({
        where: { id, tripId },
      });
      if (!record) return reply.status(404).send({ error: '환전 기록을 찾을 수 없습니다' });
      const members = await prisma.tripMember.findMany({
        where: { tripId },
        select: { id: true, displayName: true, userId: true, guestId: true },
      });
      const response = await exchangeToResponse(record, members);
      return reply.send({ exchange: response });
    }
  );

  // PATCH /trips/:tripId/exchanges/:id — 본인 기록만 수정 가능
  app.patch(
    '/exchanges/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (
      req: FastifyRequest<{ Params: { tripId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { tripId, id } = req.params;
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      const guestId = (req as FastifyRequest & { guestId?: string }).guestId;

      const existing = await prisma.exchangeRecord.findFirst({
        where: { id, tripId },
      });
      if (!existing) return reply.status(404).send({ error: '환전 기록을 찾을 수 없습니다' });
      const isOwner =
        (userId && existing.userId === userId) || (guestId && existing.guestId === guestId);
      if (!isOwner) return reply.status(403).send({ error: '본인 기록만 수정할 수 있습니다' });

      const parsed = patchExchangeBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const body = parsed.data;

      const updates: {
        rate?: number;
        sourceAmount?: number;
        targetAmount?: number;
        exchangedAt?: Date;
      } = {};
      if (body.rate !== undefined) updates.rate = body.rate;
      if (body.sourceAmount !== undefined) {
        updates.sourceAmount = body.sourceAmount;
        const rate = body.rate !== undefined ? body.rate : Number(existing.rate);
        updates.targetAmount = Math.round((body.sourceAmount / rate) * 100) / 100;
      } else if (body.rate !== undefined) {
        updates.targetAmount =
          Math.round((Number(existing.sourceAmount) / body.rate) * 100) / 100;
      }
      if (body.exchangedAt !== undefined) {
        const d = new Date(body.exchangedAt);
        if (Number.isNaN(d.getTime())) {
          return reply.status(400).send({ error: 'exchangedAt 형식이 올바르지 않습니다' });
        }
        updates.exchangedAt = d;
      }
      if (Object.keys(updates).length === 0) {
        const members = await prisma.tripMember.findMany({
          where: { tripId },
          select: { id: true, displayName: true, userId: true, guestId: true },
        });
        const response = await exchangeToResponse(existing, members);
        return reply.send({ exchange: response });
      }

      const record = await prisma.exchangeRecord.update({
        where: { id },
        data: updates,
      });
      const members = await prisma.tripMember.findMany({
        where: { tripId },
        select: { id: true, displayName: true, userId: true, guestId: true },
      });
      const response = await exchangeToResponse(record, members);
      return reply.send({ exchange: response });
    }
  );

  // DELETE /trips/:tripId/exchanges/:id — 본인 기록만 삭제 가능
  app.delete(
    '/exchanges/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (
      req: FastifyRequest<{ Params: { tripId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { tripId, id } = req.params;
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      const guestId = (req as FastifyRequest & { guestId?: string }).guestId;

      const existing = await prisma.exchangeRecord.findFirst({
        where: { id, tripId },
      });
      if (!existing) return reply.status(404).send({ error: '환전 기록을 찾을 수 없습니다' });
      const isOwner =
        (userId && existing.userId === userId) || (guestId && existing.guestId === guestId);
      if (!isOwner) return reply.status(403).send({ error: '본인 기록만 삭제할 수 있습니다' });

      await prisma.exchangeRecord.delete({ where: { id } });
      return reply.status(204).send();
    }
  );
}
