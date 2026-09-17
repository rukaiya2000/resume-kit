---
name: tailor-resume
description: Tailor Rukaiya's resume to a job note from Obsidian (Jobs/*.md), export the one-page PDF, and write the match report, gaps and improvements back to the note. Use when asked to make, tailor or update a resume for a job, company or job description, or to list pending jobs.
argument-hint: <company or job note name, or "list">
---

# Tailor resume

Everything this workflow needs is served by the `resume-ai` MCP server (`ai/server.py`, configured in `.mcp.json`). The instructions themselves live in Markdown under `ai/`, so read them from the server instead of relying on memory:

1. Read the MCP resource `resume://prompts/tailor-resume` and follow it step by step, with **job = $ARGUMENTS** (or "list" if empty).
2. It points you to `resume://knowledge/guardrails`, `resume://knowledge/writing-style` and `resume://prompts/review-match`; read those when it says to.

The same workflow is also available as the MCP prompt `tailor_resume` (`/mcp__resume-ai__tailor_resume`).

If the `resume-ai` tools aren't available, the MCP server isn't connected: ask the user to approve it in `/mcp`, and check that `uv` is installed and `pnpm dev` is running.
