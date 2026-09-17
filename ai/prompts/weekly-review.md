# Weekly review: {{week_of}}

Turn this week's applications into a short, honest review saved in Obsidian.

1. Call `get_weekly_summary` (pass `week_of` as a date in the week if it isn't the current one).
2. If no resumes were generated, say so and stop. Don't write an empty review.
3. Read the patterns:
   - **Missing keywords** that repeat across jobs are the strongest signal, especially required ones.
   - **Real gaps** mean no evidence anywhere in the notes. Separate them from keywords that are just missing from the dictionary or worded differently.
   - Note which statuses dominate (lots of `generated` but few `applied` means applications are stalling after tailoring).
4. Write:
   - `focus`: 2–4 themes, most frequent first (e.g. "Container orchestration: Kubernetes asked in 5 of 7 jobs").
   - `learning_plan`: concrete, weekend-sized actions that produce **real evidence** for a project note, such as “Deploy SETTLE-WISE on a small k3s cluster and write it up in Resume/Projects”. Never suggest adding claims without doing the work.
   - `notes` (optional): anything notable, e.g. a job type scoring consistently low.
5. Call `save_weekly_review`, then tell the user the file path and the top two focus areas.
