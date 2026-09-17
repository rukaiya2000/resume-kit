# Review the match for: {{job}}

Compare the tailored resume (`resume_id` from `save_tailored_resume`) with the job description and write an honest review. Then call `save_match_report` with exactly these fields.

## `requirements`

The job's 6–15 real requirements, each with:

- `requirement`: short, in the job's words (“2+ years building production backends”).
- `strength`:
  - `strong`: a resume bullet or skill clearly proves it.
  - `weak`: related evidence exists but is indirect or thin.
  - `missing`: nothing on the resume supports it.
- `evidence`: the bullet or skill that proves it (shortened is fine), or empty when missing.

## `gaps`

- `real`: requirements with **no evidence in any fact source** (Base resume, project notes, extra facts).
- `weak`: evidence exists in the sources but is thin or buried on the resume.

## `improvements`

Concrete and honest; never suggest claiming something untrue.

- `addToNotes`: facts worth adding to Obsidian *if true*, phrased “If you've done X, add it to Resume/Extra Facts.md with a number”.
- `strengthen`: specific bullets to sharpen (add a metric, name the tool the job asks for).
- `upskill`: small, realistic projects or learning that would close a real gap (a weekend-sized scope).
- `applicationTips`: what to highlight in a cover letter, recruiter message or interview.

Keep each item to one sentence.

## `not_in_dictionary`

JD skills and tools the skills dictionary doesn't know and the user chose not to add. They can't be keyword-scored, so judge them in `requirements` instead.

## Automatic

You don't pass these; `save_match_report` computes them: the keyword score, a **Changes from Base** diff (skills, projects and bullets added, removed or rewritten), and a **PDF text check**. Skim the diff before reporting back: every rewritten bullet must still say only what the original fact says.
