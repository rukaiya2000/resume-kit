# Tailor a resume for: {{job}}

You are tailoring Rukaiya's resume to one job using the `resume-ai` MCP server. The resume app must be running (`pnpm dev`); if a tool says it isn't, tell the user and stop.

Read these first (they are MCP resources):

- `resume://knowledge/guardrails`: limits and fact rules the server enforces
- `resume://knowledge/writing-style`: how bullets, skills and projects should read

## Steps

1. **Pick the job.** If `{{job}}` is empty or “list”, call `list_jobs` and ask which one. If the vault has no `Jobs/` folder, call `setup_vault` and say what it created.
2. **Gather context.** Call `get_job_context`. Read the whole job description yourself, not just the keyword list, and write down its 6–15 real requirements, split into must-have and nice-to-have.
3. **Write the three editable sections** using only facts from the context (Base resume, project notes, extra facts):
   - **Technical Skills:** reorder, trim and regroup for this job.
   - **Experience:** for each role, the strongest bullets for this job, reworded toward the job's language, numbers intact.
   - **Projects:** the most relevant 2–4, ordered by relevance.
4. **Save.** Call `save_tailored_resume`. If it's rejected, fix exactly what the error lists. A rejected skill becomes a gap, not a workaround.
5. **Check coverage.** The result includes must-have keyword coverage. If it's below `target_must_have_coverage` **and** the missing items have evidence in the sources, reword and save again, up to `max_retries` times. Missing items without evidence stay missing.
6. **Export.** Call `export_resume`. If it's over one page, cut following the one-page order in the writing style guide, then save and export again.
7. **Review.** Follow the `review_match` prompt (`resume://prompts/review-match`) and call `save_match_report`.
8. **Report back** in a few lines: score and must-have coverage, the PDF path, what you emphasized, and the real gaps.
