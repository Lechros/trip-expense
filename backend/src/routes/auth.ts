import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/auth.js';
import { requireAuth } from '../lib/auth-middleware.js';
import { getGoogleAuthUrl, exchangeCodeForUser } from '../lib/google-oauth.js';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  clearCookieOptions,
} from '../lib/cookie-options.js';

const refreshBody = z.object({
  refreshToken: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/google — Google 로그인 시작. callback은 프론트 오리진(/api/auth/google/callback)으로 해서 쿠키가 프론트 도메인에 저장되도록 함.
  app.get('/auth/google', async (req: FastifyRequest, reply: FastifyReply) => {
    const frontendUrl = (process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
    const callbackUri = `${frontendUrl}/api/auth/google/callback`;
    const state = (req.query as { state?: string }).state ?? '';
    const url = getGoogleAuthUrl(callbackUri, state || undefined);
    return reply.redirect(url, 302);
  });

  // GET /auth/google/callback — Google에서 code 수신 후 우리 JWT 발급, 프론트 리다이렉트
  app.get('/auth/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    const frontendUrl = (process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000').replace(
      /\/$/,
      ''
    );
    const callbackPath = '/auth/callback';

    if (query.error) {
      const err = encodeURIComponent(query.error);
      return reply.redirect(`${frontendUrl}${callbackPath}?error=${err}`, 302);
    }

    const code = query.code;
    if (!code) {
      return reply.redirect(`${frontendUrl}${callbackPath}?error=missing_code`, 302);
    }

    const callbackUri = `${frontendUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    const googleUser = await exchangeCodeForUser(code, callbackUri);
    if (!googleUser) {
      return reply.redirect(`${frontendUrl}${callbackPath}?error=exchange_failed`, 302);
    }

    const oauthId = `google:${googleUser.sub}`;
    let tokenUser: { id: string; email: string } | null = null;
    const byOauth = await prisma.user.findUnique({ where: { oauthId }, select: { id: true, email: true } });
    if (byOauth) {
      tokenUser = byOauth;
    } else {
      const existingByEmail = await prisma.user.findUnique({ where: { email: googleUser.email }, select: { id: true, email: true } });
      if (existingByEmail) {
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { oauthId },
        });
        tokenUser = existingByEmail;
      } else {
        const created = await prisma.user.create({
          data: { email: googleUser.email, oauthId },
          select: { id: true, email: true },
        });
        tokenUser = created;
      }
    }

    if (!tokenUser) {
      return reply.redirect(`${frontendUrl}${callbackPath}?error=user_failed`, 302);
    }

    const accessToken = signAccessToken(tokenUser);
    const refreshToken = signRefreshToken(tokenUser);

    reply.setCookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());
    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions());
    return reply.redirect(`${frontendUrl}${callbackPath}`, 302);
  });

  // POST /auth/refresh — 쿠키 또는 body에서 refreshToken. 새 토큰은 쿠키로 설정.
  app.post('/auth/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const fromCookie = cookies?.[REFRESH_TOKEN_COOKIE];
    const parsed = refreshBody.safeParse(req.body ?? {});
    const fromBody = parsed.success ? parsed.data.refreshToken : undefined;
    const refreshToken = fromCookie ?? fromBody;

    if (!refreshToken) {
      return reply.status(401).send({ error: '유효하지 않거나 만료된 토큰입니다' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return reply.status(401).send({ error: '유효하지 않거나 만료된 토큰입니다' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return reply.status(401).send({ error: '사용자를 찾을 수 없습니다' });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    reply.setCookie(ACCESS_TOKEN_COOKIE, newAccessToken, accessTokenCookieOptions());
    reply.setCookie(REFRESH_TOKEN_COOKIE, newRefreshToken, refreshTokenCookieOptions());
    return reply.send({ expiresIn: 900 });
  });

  // POST /auth/logout — 쿠키 삭제
  app.post('/auth/logout', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
    reply.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());
    return reply.send({ ok: true });
  });

  // GET /me — 인증 필요
  app.get('/me', { preHandler: requireAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
    if (!user) {
      return reply.status(401).send({ error: '사용자를 찾을 수 없습니다' });
    }
    return reply.send({ user });
  });

  // PATCH /me — 인증 필요 (추후 프로필 수정용)
  app.patch('/me', { preHandler: requireAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
    if (!user) {
      return reply.status(401).send({ error: '사용자를 찾을 수 없습니다' });
    }
    return reply.send({ user });
  });
}
