# PRD: Resume Creator

**Status:** Phase 1 and Phase 2 built, plus cover letters; peer review open · **Owner:** Rukaiya Khan · **Date:** 2026-09-16

| Phase | Scope |
|---|---|
| **Phase 1 (this build)** | A local **Creddle clone** (~95% feature parity) + my own additions: multiple templates, upload-ready file naming, week folders |
| **Phase 2 (next)** | **AI tailoring**: Obsidian JD + notes → Claude Code (MCP) fills a resume in the builder → match score, gaps, how to improve in Obsidian |

Phase 1 is built so Phase 2 only **adds** things: AI writes the same resume JSON the editor uses.


## Implementation notes (Phase 1 as built, 2026-09-16)
- **Built:** everything marked Must in §3/§8, plus the local web view (F13).
- **Not built yet:** peer review (F14, Later). Cover letters (F12) were added later: one per resume, sharing its header and design, with AI drafting.
- **Changed from the plan:**
  - Bullet formatting uses Markdown-style markers (`**bold**`, `*italic*`, `[text](url)`) with ⌘B/⌘I/⌘K and toolbar buttons, instead of Tiptap. It's lighter and the stored text stays plain.
  - React Router instead of TanStack Router.
  - The API runs on port **8797** (8787 was taken on this machine).
  - Skill chips reorder with ‹ › arrows on hover, not drag and drop.
  - Section style overrides apply per section *type* (e.g. all Experience sections), stored on the resume or template.

---

# PHASE 1: Creddle-style Resume Builder

## 1. Background
[Creddle](https://creddle.io) was a free resume builder that ran for 10 years and **shut down on Dec 1, 2024**. People loved it because:
- **"Fit to one page" automatically:** it shrank font sizes and spacing *proportionally* as content grew
- **Full control over design:** font, text sizes, color, spacing, padding, section order, hiding sections
- **Easy content entry:** fill in forms per section, with bullets and hyperlinks; reorder / rename / delete sections
- **Two views:** an Edit view (content) and a Resume view (design + print/PDF)
- **Web page + PDF from the same content:** share by URL, download a PDF, or print
- **Peer review:** share with friends for feedback, like Google Docs
- **Multiple resumes + cover letters with matching headers** (paid tier)

Since it's gone, I'm rebuilding it locally for myself, with my own additions.

## 2. Goal
Recreate Creddle's workflow and editing experience as a local web app, then add:
1. **Multiple templates** (Creddle had one flexible design; I want to save designs as templates)
2. **Upload-ready export:** `resumes/week-of-<Monday>/Khan_Rukaiya_<Company>_<date>.pdf`
3. **Plain JSON data** I own, ready for Phase 2 AI

### Non-goals (Phase 1)
- AI, Obsidian, MCP, JD matching (Phase 2)
- Cloud hosting, accounts, payments/paywall, a public share URL on the internet
- Photos, icons, two-column graphic layouts (hurt ATS parsing)
- DOCX export

## 3. Creddle feature parity
| # | Creddle feature | Phase 1 | Notes |
|---|---|---|---|
| 1 | Form-based content editor per section | ✅ Must | §6.1 |
| 2 | Sections: Basic Info, Summary, Employment, Education, Skills, Projects, Awards, Volunteering, Activities, Custom | ✅ Must | §5 |
| 3 | Bullets + hyperlinks in content | ✅ Must | |
| 4 | Reorder, rename, delete, hide sections | ✅ Must | also for entries |
| 5 | Design controls: font, text sizes, color, spacing, padding | ✅ Must | §6.2 |
| 6 | **Auto fit to one page** (scale proportionally) | ✅ Must | §6.3, the key feature |
| 7 | Edit view ↔ Resume view | ✅ Must | §6 |
| 8 | Download PDF | ✅ Must | + my naming/week folders §7 |
| 9 | Print | ✅ Must | browser print of the same page |
| 10 | Multiple resumes | ✅ Must | unlimited, no paywall |
| 11 | Web page version of the resume | ✅ Should | local read-only page `/r/:id`, no public hosting |
| 12 | Cover letters with a matching header | ✅ Should | §5.3 |
| 13 | Peer review / share for feedback | ⏸ Later | would need hosting; for now, share the PDF |
| 14 | Paid tier (1 free resume, $5 unlocks more) | ❌ Drop | personal tool |
| ➕ | **Mine:** multiple saved templates, per-resume overrides | ✅ Must | §6.2 |
| ➕ | **Mine:** Base resume + "Duplicate for job" (company, role) | ✅ Must | §4 |
| ➕ | **Mine:** export naming + week folders | ✅ Must | §7 |
| ➕ | **Mine:** autosave, undo/redo, JSON import/export | ✅ Must | §6.4 |

## 4. Workflow
1. **Once:** create the **Base resume** in Edit view with every section filled in → Resume view → adjust the design (or pick a template) → turn on **Fit to one page**.
2. **For each job:** Dashboard → **Duplicate for job** (company, role) → Edit view: tweak bullets/skills/projects, hide entries that don't fit → Resume view: check the page → **Download PDF**.
3. **Upload** from `resumes/week-of-<Monday>/Khan_Rukaiya_<Company>_<date>.pdf`.
4. **Optional:** create a matching cover letter for the same job.

## 5. Content

### 5.1 Sections (Creddle's set)
| Section | Entry fields | Default |
|---|---|---|
| **Basic Info** (header) | name, headline (optional), email, phone, location, website, LinkedIn, GitHub, other links (label + URL), work authorization | on, always first |
| **Summary** | paragraph | off |
| **Education** | school, degree, field, location, GPA, start–end, coursework, bullets | on |
| **Skills** | categories → skills | on (my title: "Technical Skills") |
| **Employment** | company, title, location, start–end / "Present", bullets | on (my title: "Experience") |
| **Projects** | name, role, tech stack, link, start–end, bullets | on |
| **Awards** | name, issuer, date, description | on (my title: "Awards & Activities") |
| **Volunteering** | organization, role, location, start–end, bullets | off |
| **Activities** | name, role, start–end, bullets | off |
| **Custom** (any number) | any title; entries = title, subtitle, location, date, bullets, **or** a paragraph | off |

**My default order:** Basic Info → Education → Technical Skills → Experience → Projects → Awards & Activities.

### 5.2 Content editing
- **Sections:** add (from the list above or custom), rename the title, drag to reorder, hide, delete (with undo)
- **Entries:** add, duplicate, drag to reorder, hide (kept but not printed), delete
- **Bullets:** add with Enter, reorder by dragging, delete with Backspace on an empty bullet; inline **bold**, *italic*, links (small toolbar + ⌘B/⌘I/⌘K)
- **Dates:** month + year picker, "Present" checkbox; display format set by the template
- Spell check on; character count shown on bullets

### 5.3 Cover letters (Should)
- Belong to a resume; reuse its **Basic Info header and design** so they match
- Fields: date, recipient (name, company, address), greeting, body (paragraphs), sign-off
- Same page view, fit to one page, PDF export: `Khan_Rukaiya_<Company>_CoverLetter_<date>.pdf` in the same week folder

## 6. Editor (Creddle's two views)
Top bar: resume name · company/role · **Edit | Resume** toggle · template dropdown · Fit to one page toggle · **Download PDF** · Print · save status.

### 6.1 Edit view (content)
- Left: section list (drag to reorder, eye icon to hide, + Add section)
- Center: forms for the selected section's entries
- Right (collapsible): live mini preview

### 6.2 Resume view (design)
- Center: the page at real size (Letter/A4), zoom, dashed page-end line
- Right: **Design sidebar**
  - **Template:** pick / save current design as a new template / update template / reset to template
  - **Page:** size, margins (top/right/bottom/left)
  - **Font:** family (ATS-safe list, bundled), base size, name size, headline size, section title size, date/location size
  - **Spacing:** line height, letter spacing, space between sections, between entries, between bullets, section padding, bullet indent, header spacing
  - **Color:** text, accent (name, section titles, links), dividers; preset palettes + color picker
  - **Headers:** name alignment (left/center), contact separator (`|` `•` `·`), contacts on one line or wrapped, header divider
  - **Section titles:** case (UPPERCASE / Title), bold, underline/border (width, style, color, gap), background band (off by default)
  - **Entries:** date position (right / below title), what's bold/italic (company, title, dates), bullet symbol, date format (`May 2024` / `05/2024` / `2024`)
  - **Per-section overrides:** margin, padding, border, title style for one section
- Design changes save as **resume overrides**; "Save as template" promotes them

### 6.3 Auto fit to one page (Creddle's signature feature)
- Toggle **Fit to one page** (on by default)
- When on: measure the rendered content height; if it overflows (or underfills with too much empty space), **scale font sizes and all spacing by one factor** so proportions stay the same, using a binary search to fit the page exactly
- Limits: scale 0.80–1.15 and base font ≥ 9 pt; if it still overflows at the floor → red badge **"Doesn't fit: remove ~N lines"** and highlight the longest entries
- Scale shown in the toolbar (e.g. "Fitted at 94%"); the same scale is used in the PDF
- When off: design values are used as-is, with an overflow badge if the content spills to a second page

### 6.4 Behavior
- Autosave (debounced) + "Saved" indicator; survives a refresh
- Undo/redo for content and design (⌘Z / ⇧⌘Z); ⌘S save, ⌘P print, ⌘E download PDF
- Preview updates in under ~100 ms while typing
- JSON import/export of a resume or template

## 7. Dashboard, export & naming

### 7.1 Dashboard
- Cards/list: Base resume pinned; others grouped by **week**, showing company, role, template, last edited, last export
- Actions: New · **Duplicate for job** · Rename · Delete (confirm) · Open PDF · Show in Finder · Web view · New cover letter
- Search by company/role
- **Templates** tab: thumbnails, new/duplicate/rename/delete, **set default**

### 7.2 Export
```
resume-creator/
  resumes/
    week-of-2026-09-14/                            # Monday of the export week
      Khan_Rukaiya_Google_2026-09-16.pdf
      Khan_Rukaiya_Google_CoverLetter_2026-09-16.pdf
      Khan_Rukaiya_JaneStreet_2026-09-17.pdf
  data/resumes/*.json  data/letters/*.json        # content (git-ignored)
  templates/*.json                                 # designs (committed)
```
- **Name:** `<Last>_<First>_<Company>_<YYYY-MM-DD>.pdf` (name from Basic Info); no company (Base) → `Khan_Rukaiya_Resume_<date>.pdf`
- **Company:** PascalCase, no symbols (`Jane Street` → `JaneStreet`, `AT&T` → `ATT`)
- **Week folder:** `week-of-<Monday's date>` based on the export date
- Same resume, same day → overwrite · different day → new file · same company twice on the same day → add the role (`Khan_Rukaiya_Google_MLE_2026-09-16.pdf`)
- PDF: selectable text, clickable links, embedded fonts, title/author metadata "Rukaiya Khan – Resume", exactly matches Resume view (same renderer + fit scale)
- After export: toast with **Open PDF** / **Show in Finder**
- **Print:** browser print of the Resume view with print CSS (same output)
- **Web view:** read-only page at `http://localhost:5173/r/:id` (responsive, same content)

## 8. Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| F1 | Unlimited resumes; Base resume; Duplicate for job asks for company + role | Must |
| F2 | All sections in §5.1 with the entry fields listed; custom sections | Must |
| F3 | Section and entry add / rename / reorder / hide / delete; bullets with bold, italic, links | Must |
| F4 | Edit view and Resume view with a live preview | Must |
| F5 | All design controls in §6.2; changes are resume overrides; save/update/reset template | Must |
| F6 | Auto fit to one page with a proportional scale, limits and a "doesn't fit" hint (§6.3) | Must |
| F7 | Multiple templates, set default; switching template keeps content | Must |
| F8 | PDF export identical to Resume view; naming and week folders (§7.2) | Must |
| F9 | Print | Must |
| F10 | Autosave, undo/redo, shortcuts, JSON import/export | Must |
| F11 | Dashboard with week grouping, search, open/reveal PDF | Must |
| F12 | Cover letters with a matching header + PDF export | Should |
| F13 | Local web view of a resume | Should |
| F14 | Peer review / share link | Later |
| F15 | Shared zod schemas validate every file; clear errors on bad data | Must |
| F16 | `pnpm dev` starts everything; works offline after install | Must |
| F17 | Ships with `classic` template + a sample Base resume | Must |

## 9. Data formats (sketch)

**Template** `templates/classic.json`
```jsonc
{
  "id": "classic", "name": "Classic ATS", "schemaVersion": 1,
  "page": { "size": "Letter", "margin": { "top": 0.5, "right": 0.6, "bottom": 0.5, "left": 0.6 } },   // in
  "font": { "family": "Inter", "base": 10.5, "name": 20, "headline": 11, "sectionTitle": 11.5, "meta": 10 }, // pt
  "spacing": { "lineHeight": 1.25, "letterSpacing": 0, "section": 10, "entry": 6, "bullet": 2,
               "sectionPadding": 0, "bulletIndent": 12, "header": 6 },
  "colors": { "text": "#111111", "accent": "#1a3d6d", "divider": "#333333" },
  "header": { "align": "center", "separator": "|", "contactsWrap": false, "divider": false },
  "sectionTitle": { "case": "upper", "bold": true, "border": { "width": 0.75, "style": "solid", "color": "#333", "gap": 2 }, "band": null },
  "entry": { "datePosition": "right", "bold": ["company"], "italic": ["title"], "bullet": "•", "dateFormat": "MMM yyyy" },
  "sectionOverrides": {},
  "fit": { "enabled": true, "minScale": 0.8, "maxScale": 1.15, "minBaseFont": 9 },
  "defaultSections": ["basics", "education", "skills", "employment", "projects", "awards"]
}
```

**Resume** `data/resumes/<id>.json`
```jsonc
{
  "id": "r_8f2k", "schemaVersion": 1, "isBase": false, "name": "Google MLE",
  "company": "Google", "role": "Machine Learning Engineer", "jobUrl": null,
  "templateId": "classic", "designOverrides": {}, "fitScale": 0.94,
  "sections": [
    { "id": "s1", "type": "basics", "visible": true, "data": { "name": "Rukaiya Khan", "email": "…", "links": [] } },
    { "id": "s4", "type": "employment", "title": "Experience", "visible": true,
      "entries": [ { "id": "e1", "visible": true, "company": "…", "title": "…", "location": "…",
                     "start": "2024-05", "end": null, "bullets": ["Built **…** with [link](…)"] } ] }
  ],
  "exports": [ { "path": "resumes/week-of-2026-09-14/Khan_Rukaiya_Google_2026-09-16.pdf", "at": "…", "pages": 1 } ],
  "createdAt": "…", "updatedAt": "…",
  "source": "manual"            // Phase 2 adds "ai" + jobNote + match
}
```

**Cover letter** `data/letters/<id>.json`: `{ id, resumeId, date, recipient{…}, greeting, paragraphs[], signOff, exports[] }`

## 10. Architecture & tech (TypeScript, pnpm workspace)
```
apps/web (React: Dashboard · Edit view · Resume view · Templates · Web view)
   │  HTTP localhost
apps/api (Hono) ──► packages/core
                     ├ zod schemas (template, resume, letter)
                     ├ <ResumeDocument/> + <CoverLetterDocument/> renderer (shared with web)
                     ├ fit-to-page (measure + binary-search scale)
                     ├ Playwright PDF + pdf-lib (page count, metadata)
                     ├ file store (data/, templates/)
                     └ naming + week folders
```

| Area | Libraries |
|---|---|
| UI | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix), TanStack Router, TanStack Query, sonner, lucide-react |
| Editor | dnd-kit, Zustand + zundo (undo/redo), react-hook-form + zod, Tiptap (bullet rich text: bold/italic/link), react-colorful, react-day-picker (month picker), react-hotkeys-hook, use-debounce, react-zoom-pan-pinch |
| Fit to page | ResizeObserver + a small binary-search helper (no library needed) |
| Fonts | @fontsource/* (bundled so the preview, print and PDF match) |
| API | Hono, @hono/node-server, @hono/zod-validator |
| Rendering | react-dom/server, Playwright (Chromium), pdf-lib |
| Utils | date-fns, change-case, nanoid, fs-extra, open |
| Dev | pnpm workspaces, Vitest, Playwright Test, ESLint + Prettier, concurrently |

**Repo layout**
```
resume-creator/
  PRD.md  package.json  pnpm-workspace.yaml
  apps/web/  apps/api/
  packages/core/
  templates/classic.json
  sample/base-resume.json
  resumes/  data/        # git-ignored
```

**API:** `/resumes` (GET, POST) · `/resumes/:id` (GET, PUT, DELETE) · `/resumes/:id/duplicate` · `/resumes/:id/export` · `/letters` CRUD + `/letters/:id/export` · `/templates` CRUD + `/templates/:id/default` · `/files/open` · `/files/reveal`

**Setup:** `pnpm install && pnpm exec playwright install chromium && pnpm dev` → http://localhost:5173

## 11. Acceptance criteria
- [ ] Every ✅ Must row in §3 works
- [ ] Base resume with all default sections + a custom section; reorder, rename, hide, delete sections and entries; bullets with bold/italic/link
- [ ] Every design control in §6.2 visibly changes the page; overrides don't change the template; "Save as template" creates one
- [ ] **Fit to one page:** adding content shrinks it proportionally and removing content grows it back, within limits; below the floor shows "Doesn't fit"
- [ ] Switching template keeps all content
- [ ] PDF matches Resume view (same fit scale, fonts, spacing); text is selectable, links work, metadata set
- [ ] Duplicate for job → export → `resumes/week-of-<Monday>/Khan_Rukaiya_<Company>_<date>.pdf`
- [ ] Print output matches the PDF
- [ ] Autosave survives refresh; undo/redo works for content and design
- [ ] Cover letter uses the resume header/design and exports with the naming rules (Should)
- [ ] `pnpm test` passes: schemas, naming/week folders, fit algorithm, store, render → 1-page PDF, UI smoke test (create → edit → fit → export)

## 12. Milestones
1. **Foundation:** workspace, zod schemas, file store, `classic.json`, sample Base resume
2. **Renderer:** `<ResumeDocument/>` driven by template + overrides; print CSS
3. **Fit to one page:** measure + proportional scale + limits + hint
4. **Export:** Playwright PDF (same scale), pdf-lib metadata, naming + week folders, open/reveal
5. **Edit view:** all section forms, drag and drop, hide, Tiptap bullets, autosave, undo
6. **Resume view:** design sidebar, overrides, save/update/reset template
7. **Dashboard + Templates:** duplicate for job, week grouping, search, set default, JSON import/export
8. **Should items:** cover letters, local web view
9. **Polish + tests:** shortcuts, toasts, full run on my real resume

---

# PHASE 2: AI tailoring

**Built 2026-09-16.** Changes from the summary below:
- **Runtime:** the AI side is a Python 3.14 MCP server (`ai/`, official `mcp` SDK 2.x, uv) with only two Python files (`server.py`, `scoring.py`). Workflow, guardrails, writing style, skills dictionary and report layout are Markdown, served as MCP resources and prompts.
- **Facts:** come from the Base resume plus Obsidian `Resume/Projects/*.md` and `Resume/Extra Facts.md` (no Profile.md).
- **Scoring:** ported from `~/Documents/ats-scorer` to Python. It's the single scorer: the app's Re-score calls it.
- **MCP:**
  - Tools: `setup_vault`, `list_jobs`, `get_job_context`, `save_tailored_resume`, `export_resume`, `save_match_report`.
  - Resources: knowledge, prompts and vault content.
  - Prompts: `tailor_resume`, `review_match`.
  - Elicitation (via a resolver) before replacing an existing tailored resume, and progress notifications on export.
- **Guardrails:** the limits table and fact rules in `ai/knowledge/guardrails.md` are enforced by the server. Awards stay fixed.
- **Job notes:** generated content sits between `<!-- resume-creator:start/end -->` markers and is replaced on re-run.

(Original summary follows.)


**Goal:** from a JD in Obsidian, Claude Code creates a tailored resume in the builder automatically, then writes a match report back to Obsidian.

**Flow:** `Jobs/<Company - Role>.md` (JD) → `/resume <job>` in Claude Code → MCP reads the JD + Obsidian notes (profile facts, `Resume/Projects/*.md` 200–400 words each) → **Duplicate for job** from Base → Claude rewrites **Technical Skills, Experience, Projects** (Basic Info, Education, Awards stay as in Base) → fit to one page → export (§7.2 naming) → the resume opens in the builder for review.

**Additions (no rework of Phase 1):**
- `apps/mcp` (@modelcontextprotocol/sdk): `list_jobs`, `get_job_context`, `create_tailored_resume`, `export_resume`, `score_match`, `save_to_obsidian`
- Vault I/O: gray-matter, remark; resume JSON gets `source: "ai"`, `jobNote`, `match`
- **Matching:** keyword coverage on the text pulled from the PDF (must-have vs nice-to-have, synonyms) + Claude's requirement-by-requirement check; if must-have coverage is <80%, rewrite from real facts, max 2 retries
- **Job note output:** frontmatter (`status`, `resume` link, `resume_file`, `match_score`, `must_have_coverage`, `missing_keywords`) + `## Match Report`, `### Gaps` (real vs weakly shown), `### How to Improve`, `## Generated Resume`; replaced on re-run
- **Rules:** only facts from my notes; gaps labeled, never quietly filled in
- **Builder:** AI badge + match score on the dashboard; Match Report panel in the editor; optional AI cover letter

**Phase 2 open questions:** Awards fixed or picked to fit each job · fail vs report when coverage stays low · reuse `~/Documents/ats-scorer`?

---

## Open questions (Phase 1)
- Fonts: ATS-safe list only, or any Google Font? (Currently: ATS-safe, bundled)
- Fit to one page: should it also **grow** content to fill a page with lots of empty space, or only shrink? (Currently: both, max 115%)
- Did Creddle have a LinkedIn import? Sources don't mention it, so it's not included; add a "paste LinkedIn PDF" import later if wanted

## Sources (Creddle research)
- [Dan D Kim: Use Creddle for your resume](https://dandkim.com/creddle-resume-builder/)
- [Text2Resume: Creddle closed its doors](https://www.text2resume.com/blog/creddle-shutdown-text2resume-alternative)
- [BadCredit.org: Creddle feature overview](https://www.badcredit.org/news/creddle-allows-job-seekers-to-craft-custom-resumes/)
