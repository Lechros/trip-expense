import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, verifyGuestSessionToken } from './auth.js';
import { ACCESS_TOKEN_COOKIE, GUEST_SESSION_COOKIE } from './cookie-options.js';

/**
 * 요청에서 access token 추출: 쿠키(전략 B) 우선, 없으면 Authorization: Bearer.
 */
export function getAccessTokenFromRequest(request: FastifyRequest): string | null {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[ACCESS_TOKEN_COOKIE];
  if (fromCookie) return fromCookie;
  const authHeader = request.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

/**
 * 요청에서 guest_session 쿠키 추출.
 */
export function getGuestSessionFromRequest(request: FastifyRequest): string | null {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[GUEST_SESSION_COOKIE] ?? null;
}

/**
 * 인증 필수: JWT를 검증하고 request.userId를 설정.
 * 쿠키 accessToken 또는 Authorization: Bearer 사용.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return reply.status(401).send({ error: '인증이 필요합니다' });
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return reply.status(401).send({ error: '유효하지 않거나 만료된 토큰입니다' });
  }
  request.userId = payload.sub;
}

/**
 * 회원(JWT) 또는 게스트(guest_session) 인증. 둘 다 없거나 무효면 401.
 * JWT 성공 시 request.userId 설정. 게스트 성공 시 request.guestId, tripId, tripMemberId, isGuest 설정.
 */
export async function requireAuthOrGuest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const accessToken = getAccessTokenFromRequest(request);
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      request.userId = payload.sub;
      return;
    }
  }
  const guestToken = getGuestSessionFromRequest(request);
  if (guestToken) {
    const payload = verifyGuestSessionToken(guestToken);
    if (payload) {
      request.guestId = payload.guestId;
      request.tripId = payload.tripId;
      request.tripMemberId = payload.memberId;
      request.isGuest = true;
      return;
    }
  }
  return reply.status(401).send({ error: '인증이 필요합니다' });
}
