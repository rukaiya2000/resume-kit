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
6. **Skills the scorer doesn't know.** The keyword analysis only covers skills in `resume://knowledge/skills-dictionary`. List the JD's skills and tools that aren't in it (not soft skills or generic words). Offer to add them with `add_to_skills_dictionary` (it asks the user to confirm; pick the closest existing category and useful aliases). Keep any the user declines for `not_in_dictionary` in the report.
7. **Export.** Call `export_resume`. If it's over one page, cut following the one-page order in the writing style guide, then save and export again. If `pdf_check` reports unreadable text, tell the user.
8. **Review.** Follow the `review_match` prompt (`resume://prompts/review-match`) and call `save_match_report`. The report also records a Base-vs-tailored diff and the PDF check automatically.
9. **Report back** in a few lines: score and must-have coverage, the PDF path, what you emphasized, the real gaps, and any skills added to the dictionary.
10. **Offer a cover letter** if the job asks for one or the user wants it: follow `resume://prompts/write-cover-letter`.
