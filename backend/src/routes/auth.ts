import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../lib/auth.js';

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshBody = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: '이미 사용 중인 이메일입니다' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return reply.status(201).send({
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15m in seconds
    });
  });

  // POST /auth/login
  app.post('/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return reply.status(401).send({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return reply.send({
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  });

  // POST /auth/refresh
  app.post('/auth/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = refreshBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { refreshToken } = parsed.data;

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

    return reply.send({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    });
  });

  // GET /me — 인증 필요
  app.get('/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return reply.status(401).send({ error: '인증이 필요합니다' });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return reply.status(401).send({ error: '유효하지 않거나 만료된 토큰입니다' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, createdAt: true },
    });
    if (!user) {
      return reply.status(401).send({ error: '사용자를 찾을 수 없습니다' });
    }

    return reply.send({ user });
  });

  // PATCH /me — 인증 필요 (추후 프로필 수정용)
  app.patch('/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return reply.status(401).send({ error: '인증이 필요합니다' });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return reply.status(401).send({ error: '유효하지 않거나 만료된 토큰입니다' });
    }

    // 현재는 body 무시하고 사용자만 반환 (추후 비밀번호 변경 등 확장)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, createdAt: true },
    });
    if (!user) {
      return reply.status(401).send({ error: '사용자를 찾을 수 없습니다' });
    }

    return reply.send({ user });
  });
}
