# resume-ai

Phase 2 of Resume Creator: an MCP server (Python 3.14, official `mcp` SDK 2.x) that tailors your resume to job notes in Obsidian. Claude Code does the writing; this server gives it the facts, enforces the guardrails, renders PDFs through the app, and writes match reports back to Obsidian.

**Most behavior is Markdown.** Edit these to change how tailoring works; no code changes or restarts needed:

| File | What it controls | Served as |
|---|---|---|
| `knowledge/guardrails.md` | Limits (the table is parsed and enforced) and fact/honesty rules | resource `resume://knowledge/guardrails` |
| `knowledge/writing-style.md` | How bullets, skills and projects should read | resource `resume://knowledge/writing-style` |
| `knowledge/skills-dictionary.md` | Skills and aliases the keyword scorer knows (tables are parsed) | resource `resume://knowledge/skills-dictionary` |
| `prompts/tailor-resume.md` | The end-to-end workflow | prompt `tailor_resume`, resource `resume://prompts/tailor-resume` |
| `prompts/review-match.md` | How to judge requirements, gaps and improvements | prompt `review_match`, resource `resume://prompts/review-match` |
| `prompts/weekly-review.md` | Turning a week's gaps into a focus list and learning plan | prompt `weekly_review`, resource `resume://prompts/weekly-review` |
| `templates/match-report.md` | Layout of the report written into job notes (incl. PDF check and Changes from Base) | used by `save_match_report` |
| `templates/weekly-review.md` | Layout of `Reviews/Week of <Monday>.md` | used by `save_weekly_review` |
| `templates/job-note.md`, `project-note.md`, `extra-facts.md` | Obsidian note templates | used by `setup_vault` |

**Code is two files:**

- `server.py`: MCP tools, resources, prompts; Obsidian vault I/O; guardrail checks; calls to the app's API.
- `scoring.py`: resume analysis with no MCP code: keyword extraction and coverage (ported from `~/Documents/ats-scorer`), edits to the skills-dictionary table, the Base-vs-tailored diff, and the PDF text check (`pypdf`). It's the only scorer: the app's **Re-score** button runs it too (`POST /api/resumes/:id/score` → `uv run scoring.py`).

## MCP surface

| Kind | Name | Purpose |
|---|---|---|
| Tool | `setup_vault` | Create `Jobs/`, templates, `Resume/Extra Facts.md`, starter project notes (never overwrites) |
| Tool | `list_jobs` | Job notes by status (read-only) |
| Tool | `get_job_context` | JD, keyword analysis, editable sections with ids, fixed sections, notes, limits (read-only) |
| Tool | `save_tailored_resume` | Validate against the guardrails, then create or update the tailored resume. Asks before replacing an existing one (elicitation via a `Resolve` resolver) |
| Tool | `export_resume` | Render the PDF (progress notifications) and check its text layer is readable |
| Tool | `add_to_skills_dictionary` | Append JD skills the scorer doesn't know to `knowledge/skills-dictionary.md`, after asking the user (elicitation) |
| Tool | `save_match_report` | Store the review, diff and PDF check in the app and write the report into the job note |
| Tool | `get_weekly_summary` | Roll up a week's job notes: scores, statuses, most common missing keywords and real gaps (read-only) |
| Tool | `save_weekly_review` | Write `Reviews/Week of <Monday>.md` |
| Resource | `resume://knowledge/*`, `resume://prompts/*` | The Markdown above |
| Resource | `resume://vault/jobs`, `resume://vault/jobs/{job}`, `resume://vault/projects`, `resume://vault/extra-facts` | Live vault content |
| Prompt | `tailor_resume(job)`, `review_match(job)`, `weekly_review(week_of)` | Workflows |

Tool arguments and results are snake_case and validated with Pydantic; the server converts to the app's camelCase JSON when saving.

## Run

```bash
uv sync                         # once
uv run server.py                # stdio MCP server (Claude Code starts it via ../.mcp.json)
uv run server.py --setup-vault  # scaffold the Obsidian vault and exit
uv run pytest                   # tests
uv run ruff check . && uv run ruff format --check .
```

Environment: `VAULT_DIR` (default `~/Documents/Obsidian Vault`), `API_PORT` (8797) or `API_URL`, `WEB_ORIGIN` (`http://localhost:5173`). The app must be running (`pnpm dev` in the repo root).
