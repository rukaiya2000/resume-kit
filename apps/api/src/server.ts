import { serve } from '@hono/node-server';
import { app } from './app';
import { closeBrowser } from './pdf';
import { ensureSeed } from './store';

const port = Number(process.env.API_PORT ?? 8797);

await ensureSeed();
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.log(`API ready on http://127.0.0.1:${port}/api`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await closeBrowser().catch(() => {});
    process.exit(0);
  });
}
