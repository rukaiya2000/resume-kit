# Write a cover letter for: {{job}}

Draft a cover letter that matches the job's tailored resume, using the `resume-ai` MCP server.

1. **Check the resume exists.** Call `get_job_context` for the job. If `job.existing_resume_id` is empty, tailor the resume first (`resume://prompts/tailor-resume`), since the letter reuses its header and design.
2. **Read the rules:** `resume://knowledge/cover-letter-style` and the cover letter limits and fact rules in `resume://knowledge/guardrails`.
3. **Plan before writing.** From the job description pick the 2–3 requirements that matter most. For each, find the strongest fact in the Base resume, project notes or extra facts. Note any user `notes` on the job (what to emphasize).
4. **Write** 3–5 paragraphs following the style guide. Use a recipient name only if the job note or description gives one.
5. **Save.** Call `save_cover_letter`. It rejects letters over the limits or with numbers not found in the fact sources; fix exactly what it lists. It saves the letter in the app (same header and design as the resume) and exports `Khan_Rukaiya_<Company>_CoverLetter_<date>.pdf`.
6. **Report back:** the PDF path, the two stories you used, and a link to edit it in the app.
