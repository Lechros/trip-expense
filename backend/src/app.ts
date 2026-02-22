import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth.js';
import { tripRoutes } from './routes/trips.js';
import { entryRoutes } from './routes/entries.js';

export type BuildAppOptions = {
  logger?: boolean;
};

/**
 * 테스트·서버 공용: Fastify 앱을 생성하고 라우트를 등록합니다. listen은 호출하지 않습니다.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { logger = true } = options;
  const app = Fastify({ logger });

  await app.register(cookie, { hook: 'onRequest' });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(tripRoutes);
  await app.register(entryRoutes, { prefix: '/trips/:tripId' });

  return app;
}
