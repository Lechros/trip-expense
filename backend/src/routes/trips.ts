import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireAuthOrGuest } from '../lib/auth-middleware.js';
import { requireTripMember, requireTripOwner } from '../lib/trip-member.js';
import { hashPassword, verifyPassword, signGuestSessionToken } from '../lib/auth.js';
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from '../lib/cookie-options.js';

const createTripBody = z
  .object({
    name: z.string().min(1, '여행 이름을 입력해 주세요'),
    startDate: z.string().min(1, '시작일을 입력해 주세요'),
    endDate: z.string().min(1, '종료일을 입력해 주세요'),
    countryCode: z.string().length(2, 'countryCode는 2자리여야 합니다'),
    description: z.string().optional(),
    baseCurrency: z.string().length(3).optional().default('KRW'),
    additionalCurrency: z.string().length(3).optional().nullable(),
    isPublic: z.boolean().optional().default(false),
    password: z.string().optional(),
  })
  .refine((d) => new Date(d.startDate).getTime() <= new Date(d.endDate).getTime(), {
    message: '종료일은 시작일 이후여야 합니다',
    path: ['endDate'],
  })
  .refine(
    (d) => !d.isPublic || (typeof d.password === 'string' && d.password.length >= 1),
    { message: '공개 여행은 비밀번호를 설정해야 합니다', path: ['password'] }
  );

const patchTripBody = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  countryCode: z.string().length(2).optional(),
  description: z.string().optional().nullable(),
  baseCurrency: z.string().length(3).optional(),
  additionalCurrency: z.string().length(3).optional().nullable(),
  isPublic: z.boolean().optional(),
  password: z.string().optional().nullable(),
});

const joinInfoQuery = z.object({
  tripId: z.string().uuid(),
  password: z.string().min(1, '여행 비밀번호를 입력해 주세요'),
});

const joinBodyMember = z.object({
  tripId: z.string().uuid(),
  password: z.string().min(1, '여행 비밀번호를 입력해 주세요'),
});

const joinBodyGuestExisting = z.object({
  tripId: z.string().uuid(),
  password: z.string().min(1),
  guestId: z.string().uuid(),
  guestPassword: z.string().min(1),
});

const joinBodyGuestNew = z
  .object({
    tripId: z.string().uuid(),
    tripPassword: z.string().min(1, '여행 비밀번호를 입력해 주세요'),
    displayName: z.string().min(1, '이름을 입력해 주세요'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
    passwordConfirm: z.string(),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  })
  .refine((d) => d.password === d.passwordConfirm, { message: '비밀번호가 일치하지 않습니다', path: ['passwordConfirm'] });

function parseDate(v: string): Date {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

export async function tripRoutes(app: FastifyInstance) {
  // join-info, join 은 :id 보다 먼저 등록 (경로 충돌 방지)
  app.get('/trips/join-info', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = joinInfoQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { tripId, password } = parsed.data;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { guests: { select: { id: true, displayName: true, colorHex: true } } },
    });
    if (!trip) {
      return reply.status(404).send({ error: '여행을 찾을 수 없습니다' });
    }
    if (!trip.isPublic || !trip.passwordHash) {
      return reply.status(403).send({ error: '이 여행은 링크로 참여할 수 없습니다' });
    }
    const ok = await verifyPassword(password, trip.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: '여행 비밀번호가 올바르지 않습니다' });
    }

    return reply.send({
      trip: {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        countryCode: trip.countryCode,
        baseCurrency: trip.baseCurrency,
        additionalCurrency: trip.additionalCurrency,
      },
      guests: trip.guests.map((g) => ({ id: g.id, displayName: g.displayName, colorHex: g.colorHex })),
    });
  });

  app.post('/trips/join', async (req: FastifyRequest, reply: FastifyReply) => {
    const raw = req.body as Record<string, unknown>;
    const hasGuestId = typeof raw?.guestId === 'string';
    const hasDisplayName = typeof raw?.displayName === 'string';

    if (hasGuestId) {
      const parsed = joinBodyGuestExisting.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const { tripId, password, guestId, guestPassword } = parsed.data;
      const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { guests: true } });
      if (!trip?.isPublic || !trip.passwordHash) {
        return reply.status(403).send({ error: '이 여행은 링크로 참여할 수 없습니다' });
      }
      const okTrip = await verifyPassword(password, trip.passwordHash);
      if (!okTrip) return reply.status(401).send({ error: '여행 비밀번호가 올바르지 않습니다' });
      const guest = trip.guests.find((g) => g.id === guestId);
      if (!guest) return reply.status(404).send({ error: '해당 게스트를 찾을 수 없습니다' });
      const okGuest = await verifyPassword(guestPassword, guest.passwordHash);
      if (!okGuest) return reply.status(401).send({ error: '게스트 비밀번호가 올바르지 않습니다' });
      const existing = await prisma.tripMember.findUnique({ where: { guestId } });
      const member = existing ?? await prisma.tripMember.create({
        data: {
          tripId,
          guestId,
          displayName: guest.displayName,
          colorHex: guest.colorHex,
          role: 'member',
        },
      });
      const guestToken = signGuestSessionToken({
        tripId,
        guestId,
        memberId: member.id,
      });
      reply.setCookie(GUEST_SESSION_COOKIE, guestToken, guestSessionCookieOptions());
      return existing
        ? reply.send({ joined: true, memberId: member.id, tripId, guestId })
        : reply.status(201).send({ joined: true, memberId: member.id, tripId, guestId });
    }

    if (hasDisplayName) {
      const parsed = joinBodyGuestNew.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const { tripId, tripPassword, displayName, password: pwd, colorHex } = parsed.data;
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip?.isPublic || !trip.passwordHash) {
        return reply.status(403).send({ error: '이 여행은 링크로 참여할 수 없습니다' });
      }
      const okTrip = await verifyPassword(tripPassword, trip.passwordHash);
      if (!okTrip) return reply.status(401).send({ error: '여행 비밀번호가 올바르지 않습니다' });
      const guestPasswordHash = await hashPassword(pwd);
      const guest = await prisma.guest.create({
        data: { tripId, displayName, passwordHash: guestPasswordHash, colorHex: colorHex ?? undefined },
      });
      const member = await prisma.tripMember.create({
        data: { tripId, guestId: guest.id, displayName, colorHex: guest.colorHex ?? undefined, role: 'member' },
      });
      const guestToken = signGuestSessionToken({
        tripId,
        guestId: guest.id,
        memberId: member.id,
      });
      reply.setCookie(GUEST_SESSION_COOKIE, guestToken, guestSessionCookieOptions());
      return reply.status(201).send({ joined: true, memberId: member.id, tripId, guestId: guest.id });
    }

    // 회원 참여: tripId + password, JWT
    const parsed = joinBodyMember.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { tripId, password } = parsed.data;
    const userId = (req as FastifyRequest & { userId?: string }).userId;
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다' });
    }
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip?.isPublic || !trip.passwordHash) {
      return reply.status(403).send({ error: '이 여행은 링크로 참여할 수 없습니다' });
    }
    const ok = await verifyPassword(password, trip.passwordHash);
    if (!ok) return reply.status(401).send({ error: '여행 비밀번호가 올바르지 않습니다' });
    const existing = await prisma.tripMember.findFirst({ where: { tripId, userId } });
    if (existing) {
      return reply.send({ joined: true, memberId: existing.id, tripId });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const displayName = user?.email ?? '회원';
    const member = await prisma.tripMember.create({
      data: { tripId, userId, displayName, role: 'member' },
    });
    return reply.status(201).send({ joined: true, memberId: member.id, tripId });
  });

  app.get('/trips', { preHandler: requireAuthOrGuest }, async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.isGuest && req.tripId) {
      const membership = await prisma.tripMember.findUnique({
        where: { id: req.tripMemberId! },
        include: {
          trip: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
              countryCode: true,
              baseCurrency: true,
              additionalCurrency: true,
              isPublic: true,
              createdAt: true,
            },
          },
        },
      });
      if (!membership?.trip) {
        return reply.status(403).send({ error: '이 여행에 대한 접근 권한이 없습니다' });
      }
      return reply.send({ trips: [{ ...membership.trip, role: membership.role, memberId: membership.id }] });
    }
    const userId = req.userId!;
    const memberships = await prisma.tripMember.findMany({
      where: { userId },
      include: {
        trip: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            countryCode: true,
            baseCurrency: true,
            additionalCurrency: true,
            isPublic: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    const trips = memberships.map((m) => ({ ...m.trip, role: m.role, memberId: m.id }));
    return reply.send({ trips });
  });

  app.post('/trips', { preHandler: requireAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = createTripBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const userId = req.userId!;
    const data = parsed.data;
    const startDate = parseDate(data.startDate);
    const endDate = parseDate(data.endDate);
    let passwordHash: string | null = null;
    if (data.isPublic && data.password) {
      passwordHash = await hashPassword(data.password);
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const displayName = user?.email ?? '회원';

    const trip = await prisma.trip.create({
      data: {
        name: data.name,
        description: data.description ?? undefined,
        startDate,
        endDate,
        countryCode: data.countryCode,
        baseCurrency: data.baseCurrency ?? 'KRW',
        additionalCurrency: data.additionalCurrency ?? undefined,
        isPublic: data.isPublic ?? false,
        passwordHash,
        createdByUserId: userId,
      },
    });

    await prisma.tripMember.create({
      data: { tripId: trip.id, userId, displayName, role: 'owner' },
    });

    return reply.status(201).send({
      trip: {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        countryCode: trip.countryCode,
        baseCurrency: trip.baseCurrency,
        additionalCurrency: trip.additionalCurrency,
        isPublic: trip.isPublic,
        createdAt: trip.createdAt,
      },
    });
  });

  app.get(
    '/trips/:id',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const trip = await prisma.trip.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          countryCode: true,
          baseCurrency: true,
          additionalCurrency: true,
          isPublic: true,
          createdAt: true,
        },
      });
      if (!trip) return reply.status(404).send({ error: '여행을 찾을 수 없습니다' });
      return reply.send({ trip });
    }
  );

  app.patch(
    '/trips/:id',
    { preHandler: [requireAuth, requireTripOwner] },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const parsed = patchTripBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const tripId = req.params.id;
      const data = parsed.data;
      const current = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { passwordHash: true, isPublic: true },
      });
      if (!current) return reply.status(404).send({ error: '여행을 찾을 수 없습니다' });
      const willBePublic = data.isPublic !== undefined ? data.isPublic : current.isPublic;
      if (willBePublic && !current.passwordHash && (!data.password || data.password === '')) {
        return reply.status(400).send({ error: '공개 여행은 비밀번호를 설정해야 합니다' });
      }
      const update: Record<string, unknown> = {};
      if (data.name !== undefined) update.name = data.name;
      if (data.description !== undefined) update.description = data.description;
      if (data.startDate !== undefined) update.startDate = parseDate(data.startDate);
      if (data.endDate !== undefined) update.endDate = parseDate(data.endDate);
      if (data.countryCode !== undefined) update.countryCode = data.countryCode;
      if (data.baseCurrency !== undefined) update.baseCurrency = data.baseCurrency;
      if (data.additionalCurrency !== undefined) update.additionalCurrency = data.additionalCurrency;
      if (data.isPublic !== undefined) update.isPublic = data.isPublic;
      if (data.password !== undefined && data.password !== null && data.password !== '') {
        update.passwordHash = await hashPassword(data.password);
      } else if (data.isPublic === false) {
        update.passwordHash = null;
      }

      const trip = await prisma.trip.update({
        where: { id: tripId },
        data: update as Parameters<typeof prisma.trip.update>[0]['data'],
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          countryCode: true,
          baseCurrency: true,
          additionalCurrency: true,
          isPublic: true,
          createdAt: true,
        },
      });
      return reply.send({ trip });
    }
  );

  // Members
  app.get(
    '/trips/:tripId/members',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { tripId: string } }>, reply: FastifyReply) => {
      const members = await prisma.tripMember.findMany({
        where: { tripId: req.params.tripId },
        select: { id: true, displayName: true, colorHex: true, role: true, joinedAt: true, userId: true, guestId: true },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      });
      return reply.send({ members });
    }
  );

  const patchMemberBody = z.object({
    displayName: z.string().min(1).optional(),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  });

  app.patch(
    '/trips/:tripId/members/:memberId',
    { preHandler: [requireAuth, requireTripOwner] },
    async (req: FastifyRequest<{ Params: { tripId: string; memberId: string } }>, reply: FastifyReply) => {
      const parsed = patchMemberBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const { tripId, memberId } = req.params;
      const member = await prisma.tripMember.findFirst({
        where: { id: memberId, tripId },
      });
      if (!member) return reply.status(404).send({ error: '멤버를 찾을 수 없습니다' });
      if (member.role === 'owner') {
        return reply.status(403).send({ error: 'owner 프로필은 이 경로로 수정할 수 없습니다' });
      }
      const data = parsed.data;
      const updated = await prisma.tripMember.update({
        where: { id: memberId },
        data: {
          ...(data.displayName !== undefined && { displayName: data.displayName }),
          ...(data.colorHex !== undefined && { colorHex: data.colorHex }),
        },
        select: { id: true, displayName: true, colorHex: true, role: true, joinedAt: true },
      });
      return reply.send({ member: updated });
    }
  );

  app.delete(
    '/trips/:tripId/members/:memberId',
    { preHandler: [requireAuth, requireTripOwner] },
    async (req: FastifyRequest<{ Params: { tripId: string; memberId: string } }>, reply: FastifyReply) => {
      const { tripId, memberId } = req.params;
      const member = await prisma.tripMember.findFirst({
        where: { id: memberId, tripId },
      });
      if (!member) return reply.status(404).send({ error: '멤버를 찾을 수 없습니다' });
      if (member.role === 'owner') {
        return reply.status(403).send({ error: 'owner는 멤버에서 제거할 수 없습니다. owner 이전 후 진행해 주세요.' });
      }
      await prisma.tripMember.delete({ where: { id: memberId } });
      return reply.status(204).send();
    }
  );
}
