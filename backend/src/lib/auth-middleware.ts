import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from './auth.js';
import { ACCESS_TOKEN_COOKIE } from './cookie-options.js';

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
