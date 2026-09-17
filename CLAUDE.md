# Resume Creator

Local Creddle-style resume builder (Phase 1) plus AI tailoring from Obsidian job notes (Phase 2). Spec: `PRD.md`.

## Commands

- `pnpm dev`: UI on http://localhost:5173, API on 127.0.0.1:8797 (both needed for PDF export and the MCP tools)
- `pnpm test`, `pnpm typecheck`, `pnpm build`
- Tailoring: `tailor-resume` skill / MCP prompt `tailor_resume` (Python server in `ai/`, see `ai/README.md`)
- `cd ai && uv run pytest && uv run ruff check .`

## Layout

- `packages/core`: zod schemas, naming/week folders, `<ResumeDocument/>` renderer with fit-to-page
- `apps/api`: Hono API over JSON files in `data/` and `templates/`; PDF export via Playwright printing `/print/:id`
- `apps/web`: React editor
- `ai/`: Python 3.14 MCP server (`mcp` 2.x, uv) for Claude Code (`.mcp.json`): `server.py` + `scoring.py`; behavior in Markdown (`knowledge/`, `prompts/`, `templates/`). Reads the Obsidian vault (`VAULT_DIR`) and talks to the API over HTTP. The API's Re-score runs `ai/scoring.py`

## Conventions

- The API owns `id`, `isBase`, `exports`, `job`, `match`; `PUT /resumes/:id` ignores them from clients.
- Tailored resumes only change Technical Skills, Experience bullets and Projects; `ai/server.py` enforces `ai/knowledge/guardrails.md`.
- AI changes: prefer editing the Markdown in `ai/` over adding Python; keep Python to `server.py` and `scoring.py`.
- `data/`, `resumes/` and root-level PDFs are personal and git-ignored.
