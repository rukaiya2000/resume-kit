# Tailor all pending jobs

Run the full tailoring workflow for every job note that still has `status: todo`, one job at a time.

1. Call `list_jobs` (status `todo`). If there are none, say so and stop. Tell the user how many you'll do and in what order (oldest note first).
2. For each job, follow `resume://prompts/tailor-resume` completely (context → write → save → coverage → dictionary → export → review). Don't batch several jobs' writing into one step: each resume gets its own careful pass.
3. If a job fails (too little job description, the app not running, a guardrail you can't satisfy honestly), note why, leave its status as `todo`, and move on.
4. **Ask before adding dictionary skills only once:** collect unknown skills across all jobs and call `add_to_skills_dictionary` a single time at the end, then re-run `save_match_report` only for jobs whose scores those skills affect.
5. Finish with a table: job, score, must-have coverage, PDF file, top real gap. Then offer to run the `weekly_review` prompt.
