import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { app } from './app';
import { PORT, SERVE_WEB, WEB_DIST } from './config';
import { closeBrowser } from './pdf';
import { ensureSeed } from './store';

await ensureSeed();

const root = new Hono();
root.route('/', app);

if (SERVE_WEB) {
  if (!existsSync(path.join(WEB_DIST, 'index.html'))) {
    console.error('SERVE_WEB=1 but apps/web/dist is missing. Run `pnpm --filter @rc/web build` first.');
    process.exit(1);
  }
  const indexHtml = await readFile(path.join(WEB_DIST, 'index.html'), 'utf8');
  root.use('/*', serveStatic({ root: path.relative(process.cwd(), WEB_DIST) }));
  // Client-side routes (/resumes/:id, /print/:id …) all load the SPA.
  root.get('*', (c) => c.html(indexHtml));
}

serve({ fetch: root.fetch, port: PORT, hostname: '127.0.0.1' }, () => {
  console.log(SERVE_WEB ? `Resume Creator on http://127.0.0.1:${PORT}` : `API ready on http://127.0.0.1:${PORT}/api`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await closeBrowser().catch(() => {});
    process.exit(0);
  });
}
