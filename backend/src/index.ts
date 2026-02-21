// .env 로드는 앱 진입점에서 한 번만 수행 (Prisma CLI는 prisma.config.ts에서 로드)
import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth.js';

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);

  const port = Number(process.env.PORT) || 3001;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Backend listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
