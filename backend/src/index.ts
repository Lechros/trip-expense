import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  const port = Number(process.env.PORT) || 3001;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Backend listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
