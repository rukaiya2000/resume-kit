# Resume Creator

Local Creddle-style resume builder (Phase 1) plus AI tailoring from Obsidian job notes (Phase 2). Spec: `PRD.md`.

## Commands

- `pnpm start`: built UI + API on http://127.0.0.1:8790 (login item: `scripts/login-item.sh`)
- `pnpm dev`: UI on http://localhost:5173, API on 127.0.0.1:8797
- `pnpm test`, `pnpm test:e2e` (isolated server on 8890, `RC_HOME=e2e/.home`), `pnpm typecheck`, `pnpm lint:py`
- Tailoring: `tailor-resume` skill / MCP prompt `tailor_resume` (Python server in `ai/`, see `ai/README.md`)
- `cd ai && uv run pytest && uv run ruff check .`

## Layout

- `packages/core`: zod schemas, naming/week folders, `<ResumeDocument/>` renderer with fit-to-page
- `apps/api`: Hono API over JSON files in `$RC_HOME/data` and `$RC_HOME/templates` (default: repo); PDF export via Playwright printing `/print/:id`; serves the built UI when `SERVE_WEB=1`; `GET /api/info` tells other tools the UI origin and output folder
- `apps/web`: React editor (resumes, templates, cover letters at `/letters/:id`; PDFs print `/print/:id` and `/print/letter/:id`)
- `ai/`: Python 3.14 MCP server (`mcp` 2.x, uv) for Claude Code (`.mcp.json`): `server.py` + `scoring.py`; behavior in Markdown (`knowledge/`, `prompts/`, `templates/`). Reads the Obsidian vault (`VAULT_DIR`) and talks to the API over HTTP. The API's Re-score runs `ai/scoring.py`

## Conventions

- The API owns `id`, `isBase`, `exports`, `job`, `match`, `matchHistory`; `PUT /resumes/:id` ignores them from clients. Letters: `id`, `resumeId`, `exports`.
- Cover letters reuse the resume's `DocumentHeader` and resolved design, and never scale above 100%.
- New design fields need a zod `.default()` so saved template files stay valid.
- Tailored resumes only change Technical Skills, Experience bullets and Projects; `ai/server.py` enforces `ai/knowledge/guardrails.md`.
- AI changes: prefer editing the Markdown in `ai/` over adding Python; keep Python to `server.py` and `scoring.py`.
- `data/`, `resumes/` and root-level PDFs are personal and git-ignored.
