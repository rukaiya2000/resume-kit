import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root (code, committed templates). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** `pnpm start` serves the built UI and the API from one port; `pnpm dev` runs the API alone next to Vite. */
export const SERVE_WEB = process.env.SERVE_WEB === '1';
export const PORT = Number(process.env.API_PORT ?? (SERVE_WEB ? 8790 : 8797));

/** Where the page that becomes the PDF is served: this server in `start` mode, Vite in dev. */
export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? (SERVE_WEB ? `http://127.0.0.1:${PORT}` : 'http://localhost:5173');

/** Where data lives. Defaults to the repo; tests point it at a temp folder. */
export const HOME = path.resolve(process.env.RC_HOME ?? ROOT);

export const WEB_DIST = path.join(ROOT, 'apps', 'web', 'dist');
