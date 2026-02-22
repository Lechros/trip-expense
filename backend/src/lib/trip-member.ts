import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from './db.js';

export type TripMemberRole = 'owner' | 'member';

/**
 * tripId에 대한 요청자(userId)의 멤버십을 조회.
 * 회원만 지원 (userId 기준). 반환: { memberId, role } 또는 null.
 */
export async function getTripMemberByUserId(
  tripId: string,
  userId: string
): Promise<{ memberId: string; role: TripMemberRole } | null> {
  const member = await prisma.tripMember.findFirst({
    where: { tripId, userId },
    select: { id: true, role: true },
  });
  if (!member) return null;
  return {
    memberId: member.id,
    role: member.role as TripMemberRole,
  };
}

export async function isTripOwner(tripId: string, userId: string): Promise<boolean> {
  const m = await getTripMemberByUserId(tripId, userId);
  return m?.role === 'owner';
}

/** params에서 tripId 추출 (경로가 /trips/:id 이면 id, /trips/:tripId/... 이면 tripId) */
function getTripIdFromParams(params: Record<string, string | undefined>): string | null {
  return params.tripId ?? params.id ?? null;
}

/**
 * 해당 trip의 멤버(회원)인지 검증. requireAuth 이후 사용.
 * request.params에 tripId 또는 id 필요. 미멤버면 403.
 */
export async function requireTripMember(
  request: FastifyRequest<{ Params: Record<string, string> }>,
  reply: FastifyReply
): Promise<void> {
  const tripId = getTripIdFromParams(request.params as Record<string, string | undefined>);
  if (!tripId) {
    return reply.status(400).send({ error: 'tripId가 필요합니다' });
  }
  const userId = request.userId;
  if (!userId) {
    return reply.status(401).send({ error: '인증이 필요합니다' });
  }
  const member = await getTripMemberByUserId(tripId, userId);
  if (!member) {
    return reply.status(403).send({ error: '이 여행에 대한 접근 권한이 없습니다' });
  }
  request.tripMember = member;
}

/**
 * 해당 trip의 owner인지 검증. requireTripMember 이후 사용하거나, 동일하게 멤버 조회 후 owner 여부만 검사.
 */
export async function requireTripOwner(
  request: FastifyRequest<{ Params: Record<string, string> }>,
  reply: FastifyReply
): Promise<void> {
  const tripId = getTripIdFromParams(request.params as Record<string, string | undefined>);
  if (!tripId) {
    return reply.status(400).send({ error: 'tripId가 필요합니다' });
  }
  const userId = request.userId;
  if (!userId) {
    return reply.status(401).send({ error: '인증이 필요합니다' });
  }
  const member = await getTripMemberByUserId(tripId, userId);
  if (!member) {
    return reply.status(403).send({ error: '이 여행에 대한 접근 권한이 없습니다' });
  }
  if (member.role !== 'owner') {
    return reply.status(403).send({ error: '여행 생성자만 수행할 수 있습니다' });
  }
  request.tripMember = member;
}
