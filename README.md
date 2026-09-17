# Resume Creator

A local, Creddle-style resume builder. Edit content and design in the browser, keep it to one page automatically, and export upload-ready PDFs named `Khan_Rukaiya_<Company>_<date>.pdf` into weekly folders. See [PRD.md](PRD.md).

## Run it

```bash
pnpm setup      # once: install dependencies + download Chromium for PDF export
pnpm dev        # UI on http://localhost:5173, API on 127.0.0.1:8797
```

On first start the API creates the `classic` template and a sample Base resume.

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

The preview and the PDF use the same component and bundled fonts, so what you see is what gets exported.

## Scripts

```bash
pnpm test        # unit tests (naming, week folders, overrides, schemas)
pnpm typecheck   # all packages
pnpm build       # production build of the UI
```

`API_PORT` and `WEB_ORIGIN` env vars override the defaults if those ports are taken.

## Editor shortcuts

⌘Z / ⇧⌘Z undo/redo · ⌘S save now · ⌘E download PDF · ⌘P print · in bullets: Enter new bullet, ⌘B bold, ⌘I italic, ⌘K link
