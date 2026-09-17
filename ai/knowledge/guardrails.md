# Guardrails

Rules for tailoring a resume. The MCP server **enforces** everything in the Limits table and the Fact rules below; it rejects a `save_tailored_resume` call that breaks them, with the reason.

## Limits

Change a value here and the server uses it after a restart. Keys are read from the first column.

| Key | Value | Meaning |
|---|---|---|
| `skill_categories` | 8 | Most skill categories on a tailored resume |
| `skills_per_category` | 16 | Most skills in one category |
| `bullets_per_role` | 5 | Most bullets for one job |
| `bullets_per_project` | 3 | Most bullets for one project |
| `min_projects` | 2 | Fewest projects |
| `max_projects` | 4 | Most projects |
| `bullet_chars` | 260 | Longest new bullet (bullets copied unchanged from the Base resume are exempt) |
| `min_jd_words` | 30 | A job note needs at least this many words of job description |
| `target_must_have_coverage` | 80 | Aim for this % of must-have keywords before stopping |
| `max_retries` | 2 | Rewrite attempts to raise coverage before accepting gaps |

## Fact rules (enforced)

1. **Skills** must already appear in a fact source: the Base resume, an Obsidian project note (`Resume/Projects/*.md`), or `Resume/Extra Facts.md`.
2. **Projects** must come from the Base resume (by entry id) or an Obsidian project note (by title). No new projects.
3. **Experience** entries are the Base resume's; company, title, location and dates can't change, only bullets and visibility.
4. **Fixed sections** (Basic Info, Education, Awards & Activities) are copied from the Base resume and never edited.

## Honesty rules (followed by Claude, checked in review)

- Never add a tool, number, scope, employer, date or outcome that isn't in a fact source.
- Merging, splitting and rewording facts is fine; changing what they claim is not.
- A requirement without evidence is a **gap**. Report it; don't hint at it in bullets.
- Use a job description's exact term only when it means the same thing as the source fact (see “Rewrite-safe” in the skills dictionary).
