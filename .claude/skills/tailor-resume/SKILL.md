---
name: tailor-resume
description: Tailor Rukaiya's resume to job notes from Obsidian (Jobs/*.md), export one-page PDFs, and write match reports back. Also writes matching cover letters, tailors all pending jobs at once, marks jobs applied (with follow-up dates), and writes the weekly job-search review. Use for any request about tailoring resumes, job notes, applications, follow-ups or the weekly review.
argument-hint: <company or job note name, or "list">
---

# Tailor resume

Everything this workflow needs is served by the `resume-ai` MCP server (`ai/server.py`, configured in `.mcp.json`). The instructions themselves live in Markdown under `ai/`, so read them from the server instead of relying on memory:

1. Pick the workflow resource that matches the request and follow it step by step:
   - one job: `resume://prompts/tailor-resume` with **job = $ARGUMENTS** (or "list" if empty)
   - every `todo` job: `resume://prompts/tailor-all-pending`
   - cover letter: `resume://prompts/write-cover-letter`
   - weekly review: `resume://prompts/weekly-review`
   - "I applied / got an interview / was rejected": call `mark_job_applied` directly
2. It points you to `resume://knowledge/guardrails`, `resume://knowledge/writing-style` and `resume://prompts/review-match`; read those when it says to.

The same workflows are MCP prompts too: `/mcp__resume-ai__tailor_resume`, `/mcp__resume-ai__tailor_all_pending`, `/mcp__resume-ai__write_cover_letter`, `/mcp__resume-ai__weekly_review`.

If the `resume-ai` tools aren't available, the MCP server isn't connected: ask the user to approve it in `/mcp`, and check that `uv` is installed and the app is running (`pnpm start` or `pnpm dev`).
