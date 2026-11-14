import { startServer } from './server';

const port = Number(process.env.PORT ?? 8080);
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);

const srv = startServer({ port, ...(allowedOrigins?.length ? { allowedOrigins } : {}) });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    srv.close().then(() => process.exit(0));
  });
}
