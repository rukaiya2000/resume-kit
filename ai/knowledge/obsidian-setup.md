# Obsidian setup for the job search

How job notes get into the vault and how to track them. `setup_vault` creates these files; it never overwrites existing ones.

## Job notes (`Jobs/`)

One note per job, named `Company - Role`, with the full job description as the body. Properties:

| Property | Set by | Meaning |
|---|---|---|
| `company`, `role`, `url`, `location` | you / Web Clipper | Used for the PDF name, scoring and links |
| `status` | you and the tools | `todo` → `generated` (after tailoring) → `applied` → `interview` / `offer` / `rejected`, or `skip` |
| `applied_on`, `follow_up` | `mark_job_applied` or you | Dates; follow-up defaults to 7 days after applying |
| `notes`, `template` | you | What to emphasize; a non-default resume template |
| `resume_id`, `match_score`, `must_have_coverage`, `missing_keywords`, `score_history`, `generated_at` | tools | Filled in by tailoring; don't edit |

Tools never change `status` once it is `applied`, `interview`, `offer`, `rejected` or `skip`.

## Clip jobs from the browser

1. Install **Obsidian Web Clipper** (browser extension) and open its settings.
2. Import `Templates/Web Clipper - Job posting.json` from the vault (or `ai/templates/web-clipper-job.json` in the repo).
3. On a job page (LinkedIn, Greenhouse, Lever, Ashby, or any site with job-posting schema data), click the clipper; the **Job posting** template is chosen automatically and saves to `Jobs/`.
4. Check the note name and `company` / `role` before saving: sites without schema data leave them blank.

## Track applications

Open **`Job Tracker.base`** (vault root):

- **Pipeline:** every job grouped by status, with score, must-have coverage and dates.
- **To tailor:** `status: todo` jobs, ready for “tailor all pending jobs”.
- **Follow-ups due:** applied jobs whose `follow_up` date has arrived.

Bases is a core Obsidian plugin; enable it under Settings → Core plugins if the file doesn't open as a table.
