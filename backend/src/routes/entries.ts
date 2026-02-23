import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuthOrGuest } from '../lib/auth-middleware.js';
import { requireTripMember } from '../lib/trip-member.js';

const entriesQuery = z.object({
  paidByMemberId: z.string().uuid().optional(),
  beneficiaryMemberId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  currency: z.string().length(3).optional(),
  includeDeleted: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

const createEntryBody = z.object({
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  currency: z.string().length(3, '통화 코드 3자리'),
  paidAt: z.string().min(1, '결제 일시가 필요합니다'),
  memo: z.string().max(500).optional().nullable(),
  paidByMemberId: z.string().uuid('결제자 멤버 ID가 필요합니다'),
  beneficiaryMemberIds: z.array(z.string().uuid()).min(1, '수혜자 1명 이상 필요'),
});

const patchEntryBody = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  paidAt: z.string().min(1).optional(),
  memo: z.string().max(500).optional().nullable(),
  paidByMemberId: z.string().uuid().optional(),
  beneficiaryMemberIds: z.array(z.string().uuid()).optional(),
});

function parseDateSafe(v: string): Date | null {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** TripMember id로 해당 멤버의 userId/guestId 반환. tripId 일치 검증. */
async function getMemberUserOrGuestIds(
  tripId: string,
  memberId: string
): Promise<{ userId: string | null; guestId: string | null } | null> {
  const m = await prisma.tripMember.findFirst({
    where: { id: memberId, tripId },
    select: { userId: true, guestId: true },
  });
  return m ? { userId: m.userId ?? null, guestId: m.guestId ?? null } : null;
}

/** Entry + paidBy displayName, beneficiaries displayNames 로 직렬화용 객체 생성 */
async function entryToResponse(entry: {
  id: string;
  tripId: string;
  amount: unknown;
  currency: string;
  paidAt: Date;
  memo: string | null;
  deletedAt: Date | null;
  recordedAt: Date;
  paidByUserId: string | null;
  paidByGuestId: string | null;
  beneficiaries: { userId: string | null; guestId: string | null }[];
}) {
  const { tripId } = entry;

  const members = await prisma.tripMember.findMany({
    where: { tripId },
    select: { id: true, displayName: true, userId: true, guestId: true },
  });
  const byUser = (userId: string | null) => members.find((m) => m.userId === userId);
  const byGuest = (guestId: string | null) => members.find((m) => m.guestId === guestId);

  const paidByMember = entry.paidByUserId
    ? byUser(entry.paidByUserId)
    : entry.paidByGuestId
      ? byGuest(entry.paidByGuestId)
      : null;
  const beneficiaryMembers = entry.beneficiaries.map((b) =>
    b.userId ? byUser(b.userId) : b.guestId ? byGuest(b.guestId) : null
  );

  return {
    id: entry.id,
    tripId,
    amount: Number(entry.amount),
    currency: entry.currency,
    paidAt: (entry.paidAt as Date).toISOString(),
    memo: entry.memo,
    deletedAt: entry.deletedAt ? (entry.deletedAt as Date).toISOString() : null,
    recordedAt: (entry.recordedAt as Date).toISOString(),
    paidBy: paidByMember
      ? { memberId: paidByMember.id, displayName: paidByMember.displayName }
      : { memberId: '', displayName: '(알 수 없음)' },
    beneficiaries: beneficiaryMembers
      .filter(Boolean)
      .map((m) => ({ memberId: m!.id, displayName: m!.displayName })),
  };
}

export async function entryRoutes(app: FastifyInstance) {
  // GET /trips/:tripId/entries
  app.get(
    '/entries',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { tripId: string } }>, reply: FastifyReply) => {
      const { tripId } = req.params;
      const parsed = entriesQuery.safeParse(req.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
      }
      const q = parsed.data;

      const dateFrom = q.dateFrom ? parseDateSafe(q.dateFrom) : null;
      const dateTo = q.dateTo ? parseDateSafe(q.dateTo) : null;

      let paidByFilter: { paidByUserId?: string; paidByGuestId?: string } = {};
      if (q.paidByMemberId) {
        const pair = await getMemberUserOrGuestIds(tripId, q.paidByMemberId);
        if (!pair) {
          return reply.status(400).send({ error: '결제자 멤버를 찾을 수 없습니다' });
        }
        if (pair.userId) paidByFilter.paidByUserId = pair.userId;
        else if (pair.guestId) paidByFilter.paidByGuestId = pair.guestId;
      }

      let beneficiaryFilter:
        | { some: { OR: [{ userId: string }] | [{ guestId: string }] } }
        | undefined;
      if (q.beneficiaryMemberId) {
        const pair = await getMemberUserOrGuestIds(tripId, q.beneficiaryMemberId);
        if (!pair) {
          return reply.status(400).send({ error: '수혜자 멤버를 찾을 수 없습니다' });
        }
        const or: { userId?: string; guestId?: string }[] = [];
        if (pair.userId) or.push({ userId: pair.userId });
        if (pair.guestId) or.push({ guestId: pair.guestId });
        if (or.length) beneficiaryFilter = { some: { OR: or as [{ userId: string }] | [{ guestId: string }] } };
      }

      const paidAtRange: { gte?: Date; lte?: Date } = {};
      if (dateFrom) paidAtRange.gte = dateFrom;
      if (dateTo) paidAtRange.lte = dateTo;

      const where: Record<string, unknown> = {
        tripId,
        ...(q.includeDeleted ? {} : { deletedAt: null }),
        ...paidByFilter,
        ...(Object.keys(paidAtRange).length ? { paidAt: paidAtRange } : {}),
        ...(q.currency ? { currency: q.currency } : {}),
        ...(beneficiaryFilter ? { beneficiaries: beneficiaryFilter } : {}),
      };

      const entries = await prisma.settlementEntry.findMany({
        where: where as { tripId: string; deletedAt?: null; paidByUserId?: string; paidByGuestId?: string; paidAt?: { gte?: Date; lte?: Date }; currency?: string; beneficiaries?: { some: { OR: { userId?: string; guestId?: string }[] } } },
        include: {
          beneficiaries: { select: { userId: true, guestId: true } },
        },
        orderBy: { paidAt: 'desc' },
      });

      const result = await Promise.all(
        entries.map((e) =>
          entryToResponse({
            id: e.id,
            tripId: e.tripId,
            amount: e.amount,
            currency: e.currency,
            paidAt: e.paidAt,
            memo: e.memo,
            deletedAt: e.deletedAt,
            recordedAt: e.recordedAt,
            paidByUserId: e.paidByUserId,
            paidByGuestId: e.paidByGuestId,
            beneficiaries: e.beneficiaries,
          })
        )
      );
      return reply.send({ entries: result });
    }
  );

  // POST /trips/:tripId/entries
  app.post(
    '/entries',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { tripId: string } }>, reply: FastifyReply) => {
      const { tripId } = req.params;
      const isGuest = (req as FastifyRequest & { isGuest?: boolean }).isGuest;
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      const guestId = (req as FastifyRequest & { guestId?: string }).guestId;
      if (!userId && !guestId) return reply.status(401).send({ error: '인증이 필요합니다' });
      const parsed = createEntryBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const body = parsed.data;

      const payer = await getMemberUserOrGuestIds(tripId, body.paidByMemberId);
      if (!payer) {
        return reply.status(400).send({ error: '결제자 멤버를 찾을 수 없습니다' });
      }
      const paidByUserId = payer.userId ?? undefined;
      const paidByGuestId = payer.guestId ?? undefined;

      for (const mid of body.beneficiaryMemberIds) {
        const b = await getMemberUserOrGuestIds(tripId, mid);
        if (!b) {
          return reply.status(400).send({ error: `수혜자 멤버를 찾을 수 없습니다: ${mid}` });
        }
      }

      const paidAt = new Date(body.paidAt);
      if (Number.isNaN(paidAt.getTime())) {
        return reply.status(400).send({ error: 'paidAt 형식이 올바르지 않습니다' });
      }

      const beneficiaryPairs = await Promise.all(
        body.beneficiaryMemberIds.map(async (memberId) => {
          const b = await getMemberUserOrGuestIds(tripId, memberId);
          if (!b) throw new Error(`Member ${memberId} not found`);
          return { userId: b.userId ?? null, guestId: b.guestId ?? null };
        })
      );

      const entry = await prisma.settlementEntry.create({
        data: {
          tripId,
          amount: body.amount,
          currency: body.currency,
          paidAt,
          memo: body.memo ?? null,
          paidByUserId: paidByUserId || null,
          paidByGuestId: paidByGuestId || null,
          recordedByUserId: isGuest ? null : userId ?? null,
          recordedByGuestId: isGuest && guestId ? guestId : null,
          beneficiaries: {
            create: beneficiaryPairs,
          },
        },
        include: {
          beneficiaries: { select: { userId: true, guestId: true } },
        },
      });

      const response = await entryToResponse({
        id: entry.id,
        tripId: entry.tripId,
        amount: entry.amount,
        currency: entry.currency,
        paidAt: entry.paidAt,
        memo: entry.memo,
        deletedAt: entry.deletedAt,
        recordedAt: entry.recordedAt,
        paidByUserId: entry.paidByUserId,
        paidByGuestId: entry.paidByGuestId,
        beneficiaries: entry.beneficiaries,
      });
      return reply.status(201).send({ entry: response });
    }
  );

  // GET /trips/:tripId/entries/:id
  app.get(
    '/entries/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (
      req: FastifyRequest<{ Params: { tripId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { tripId, id } = req.params;
      const entry = await prisma.settlementEntry.findFirst({
        where: { id, tripId },
        include: { beneficiaries: { select: { userId: true, guestId: true } } },
      });
      if (!entry) return reply.status(404).send({ error: '항목을 찾을 수 없습니다' });
      const response = await entryToResponse({
        id: entry.id,
        tripId: entry.tripId,
        amount: entry.amount,
        currency: entry.currency,
        paidAt: entry.paidAt,
        memo: entry.memo,
        deletedAt: entry.deletedAt,
        recordedAt: entry.recordedAt,
        paidByUserId: entry.paidByUserId,
        paidByGuestId: entry.paidByGuestId,
        beneficiaries: entry.beneficiaries,
      });
      return reply.send({ entry: response });
    }
  );

  // PATCH /trips/:tripId/entries/:id
  app.patch(
    '/entries/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (
      req: FastifyRequest<{ Params: { tripId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { tripId, id } = req.params;
      const parsed = patchEntryBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const body = parsed.data;

      const existing = await prisma.settlementEntry.findFirst({
        where: { id, tripId },
        include: { beneficiaries: true },
      });
      if (!existing) return reply.status(404).send({ error: '항목을 찾을 수 없습니다' });
      if (existing.deletedAt) return reply.status(410).send({ error: '삭제된 항목은 수정할 수 없습니다' });

      let paidByUserId: string | null = existing.paidByUserId;
      let paidByGuestId: string | null = existing.paidByGuestId;
      if (body.paidByMemberId !== undefined) {
        const payer = await getMemberUserOrGuestIds(tripId, body.paidByMemberId);
        if (!payer) return reply.status(400).send({ error: '결제자 멤버를 찾을 수 없습니다' });
        paidByUserId = payer.userId;
        paidByGuestId = payer.guestId;
      }

      const updateData: Parameters<typeof prisma.settlementEntry.update>[0]['data'] = {
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.paidAt !== undefined && { paidAt: new Date(body.paidAt) }),
        ...(body.memo !== undefined && { memo: body.memo }),
        paidByUserId,
        paidByGuestId,
      };

      if (body.beneficiaryMemberIds !== undefined) {
        if (body.beneficiaryMemberIds.length === 0) {
          return reply.status(400).send({ error: '수혜자 1명 이상 필요' });
        }
        for (const mid of body.beneficiaryMemberIds) {
          const b = await getMemberUserOrGuestIds(tripId, mid);
          if (!b) return reply.status(400).send({ error: `수혜자 멤버를 찾을 수 없습니다: ${mid}` });
        }
        await prisma.settlementBeneficiary.deleteMany({ where: { entryId: id } });
        const newBeneficiaries = await Promise.all(
          body.beneficiaryMemberIds.map(async (memberId) => {
            const b = await getMemberUserOrGuestIds(tripId, memberId);
            if (!b) throw new Error('Member not found');
            return { userId: b.userId ?? null, guestId: b.guestId ?? null };
          })
        );
        await prisma.settlementBeneficiary.createMany({
          data: newBeneficiaries.map((b) => ({ entryId: id, userId: b.userId, guestId: b.guestId })),
        });
      }

      const updated = await prisma.settlementEntry.update({
        where: { id },
        data: updateData,
        include: { beneficiaries: { select: { userId: true, guestId: true } } },
      });
      const response = await entryToResponse({
        id: updated.id,
        tripId: updated.tripId,
        amount: updated.amount,
        currency: updated.currency,
        paidAt: updated.paidAt,
        memo: updated.memo,
        deletedAt: updated.deletedAt,
        recordedAt: updated.recordedAt,
        paidByUserId: updated.paidByUserId,
        paidByGuestId: updated.paidByGuestId,
        beneficiaries: updated.beneficiaries,
      });
      return reply.send({ entry: response });
    }
  );

  // DELETE /trips/:tripId/entries/:id (soft delete)
  app.delete(
    '/entries/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (
      req: FastifyRequest<{ Params: { tripId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { tripId, id } = req.params;
      const existing = await prisma.settlementEntry.findFirst({
        where: { id, tripId },
      });
      if (!existing) return reply.status(404).send({ error: '항목을 찾을 수 없습니다' });
      await prisma.settlementEntry.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return reply.status(204).send();
    }
  );
}
