# Resume Creator

A local, Creddle-style resume builder. Edit content and design in the browser, keep it to one page automatically, and export upload-ready PDFs named `Khan_Rukaiya_<Company>_<date>.pdf` into weekly folders. See [PRD.md](PRD.md).

## Run it

```bash
pnpm setup      # once: install dependencies, Chromium for PDF export, and the Python env (uv)
pnpm start      # everything on one port: http://127.0.0.1:8790
pnpm dev        # while developing: UI with hot reload on http://localhost:5173, API on 127.0.0.1:8797
```

On first start the API creates the `classic` template and a sample Base resume.

**Start at login (macOS):** `pnpm login-item:install` runs `pnpm start` in the background at every login. Because the project is in `~/Documents`, macOS requires one manual step: give the Node binary it prints **Full Disk Access** (System Settings → Privacy & Security → Full Disk Access). `pnpm login-item:remove` undoes it; `bash scripts/login-item.sh status` shows whether it's running.

## Tailor a resume to a job (AI, Phase 2)

1. Keep `pnpm dev` running (and have [uv](https://docs.astral.sh/uv/) installed).
2. In Obsidian, create `Jobs/<Company> - <Role>.md` from `Templates/Job.md` and paste the job description into the body.
3. In Claude Code in this folder, ask “tailor my resume for <Company>” (the `tailor-resume` skill) or run the MCP prompt `/mcp__resume-ai__tailor_resume`. Approve the `resume-ai` server the first time.

Claude reads the job, your Base resume, `Resume/Projects/*.md` and `Resume/Extra Facts.md`, rewrites Technical Skills, Experience bullets and Projects, exports the PDF, and writes a Match Report (score, gaps, how to improve) into the job note. Tailored resumes get an AI badge on the dashboard; **Match** in the editor shows the report and re-scores after edits.

The AI side is the Python MCP server in [`ai/`](ai/README.md). Its workflow, guardrails, writing style, skills dictionary and report layout are Markdown files you can edit. `pnpm setup-vault` scaffolds the Obsidian folders.

## Where things live

| Path | What | Git |
|---|---|---|
| `resumes/week-of-YYYY-MM-DD/*.pdf` | Exported PDFs, ready to upload | ignored |
| `data/resumes/*.json` | Resume content (one file per resume) | ignored |
| `templates/*.json`, `templates/index.json` | Designs and the default template | committed |

## Workspace

- `packages/core` – zod schemas, design defaults/overrides, naming rules, and the shared `<ResumeDocument/>` renderer with fit-to-one-page.
- `apps/api` – Hono API over the JSON files; renders PDFs by opening `/print/:id` in headless Chromium (Playwright), then sets metadata with pdf-lib.
- `apps/web` – React + Vite UI: dashboard, templates, editor (Edit view / Resume view), print and web views.
- `ai/` – Python MCP server (Phase 2): Obsidian vault, guardrails, keyword scoring, match reports. Behavior lives in Markdown under `ai/knowledge`, `ai/prompts`, `ai/templates`.

The preview and the PDF use the same component and bundled fonts, so what you see is what gets exported.

## Scripts

```bash
pnpm test        # TypeScript unit tests + Python tests (ai/)
pnpm test:e2e    # browser tests on an isolated server (port 8890, data in e2e/.home)
pnpm lint:py     # ruff
pnpm typecheck   # all packages
pnpm build       # production build of the UI
```

`API_PORT`, `WEB_ORIGIN` and `RC_HOME` (data folder) override the defaults. CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit and browser tests.

## Editor shortcuts

⌘Z / ⇧⌘Z undo/redo · ⌘S save now · ⌘E download PDF · ⌘P print · in bullets: Enter new bullet, ⌘B bold, ⌘I italic, ⌘K link
