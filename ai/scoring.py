"""Resume analysis: keyword scoring against a job description, Base-vs-tailored diff, and PDF text checks.

Keyword scoring is ported from ~/Documents/ats-scorer (Rizzume) @ 476e61d. The skills dictionary lives in
knowledge/skills-dictionary.md so it can be edited without touching code.

CLI (used by the app's Re-score button): JSON {jobDescription, jobTitle, resume} on stdin → KeywordMatch JSON.
"""

import io
import json
import re
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from pypdf import PdfReader

DICTIONARY = Path(__file__).with_name("knowledge") / "skills-dictionary.md"

type Resume = dict[str, Any]


def camel(value: Any) -> Any:
    """snake_case keys → camelCase, recursively: the shape the TypeScript app stores."""
    match value:
        case dict():
            return {to_camel(k): camel(v) for k, v in value.items()}
        case list():
            return [camel(v) for v in value]
        case _:
            return value


@dataclass(frozen=True, slots=True)
class Skill:
    name: str
    aliases: tuple[str, ...]
    rewrite_safe: bool
    category: str

    @property
    def forms(self) -> tuple[str, ...]:
        return (self.name, *self.aliases)


@dataclass(frozen=True, slots=True)
class JdKeyword:
    skill: str
    surface: str  # the JD's own wording, e.g. "k8s"
    weight: int
    in_requirements: bool


class Coverage(BaseModel):
    matched: int = 0
    total: int = 0


class KeywordMatch(BaseModel):
    score: int
    must_have: Coverage
    nice_to_have: Coverage
    matched: list[str]
    alias_only: list[str]  # present under another name: reword to match the JD
    missing_required: list[str]
    missing_preferred: list[str]


# ---------- dictionary (markdown) ----------


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


@cache
def load_dictionary(path: Path = DICTIONARY) -> tuple[Skill, ...]:
    """Reads every `| Skill | Aliases | Rewrite-safe |` table row; `## Heading` is the category."""
    skills: list[Skill] = []
    category = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            category = line[3:].strip()
        elif line.startswith("|"):
            name, aliases, safe, *_ = [*_cells(line), "", ""]
            if not name or name == "Skill" or set(name) <= set("-: "):
                continue
            alias_list = tuple(a.strip() for a in aliases.split(",") if a.strip())
            skills.append(Skill(name, alias_list, safe.lower() != "no", category))
    return tuple(skills)


# ---------- matching ----------

REQUIREMENT_HEADINGS = re.compile(
    r"(minimum |basic |required )?(qualifications|requirements)|must have|what you('ll)? need|who you are", re.I
)
PREFERRED_HEADINGS = re.compile(r"preferred|nice to have|bonus|plus", re.I)
RESUME_HEADINGS = {
    "summary": re.compile(r"^(summary|about|profile|objective)", re.I),
    "skills": re.compile(r"^(skills|technical skills|technologies)", re.I),
    "experience": re.compile(r"^(work experience|experience|employment)", re.I),
    "projects": re.compile(r"^projects", re.I),
    "education": re.compile(r"^education", re.I),
    "awards": re.compile(r"^(awards|activities|awards and activities|achievements|certifications)", re.I),
}


@cache
def term_regex(term: str) -> re.Pattern[str]:
    """Whole word/phrase match that survives tech tokens like C++, Node.js, .NET."""
    body = r"[\s-]+".join(re.escape(part) for part in term.split())
    return re.compile(rf"(?<![A-Za-z0-9+#.]){body}(?![A-Za-z0-9+#])", re.I)


def count(text: str, term: str) -> int:
    return len(term_regex(term).findall(text)) if text else 0


def _slice_sections(text: str, heading: re.Pattern[str]) -> str:
    out: list[str] = []
    inside = False
    for raw in text.splitlines():
        line = raw.strip()
        is_heading = (
            0 < len(line) <= 60 and not line.endswith(".") and not line.startswith(("-", "•", "*", "●", "▪", "◦"))
        )
        if is_heading:
            inside = bool(heading.search(line)) and not PREFERRED_HEADINGS.search(line)
        elif inside:
            out.append(line)
    return "\n".join(out)


def extract_keywords(jd: str, title: str = "") -> list[JdKeyword]:
    required_text = _slice_sections(jd, REQUIREMENT_HEADINGS)
    found: list[JdKeyword] = []
    for skill in load_dictionary():
        counts = {form: count(jd, form) for form in skill.forms}
        total = sum(counts.values())
        if total == 0:
            continue
        best = max(skill.forms, key=lambda f: counts[f])
        surface = re.sub(r"[\s-]+", " ", m.group(0)) if (m := term_regex(best).search(jd)) else best
        in_req = any(count(required_text, f) for f in skill.forms)
        in_title = any(count(title, f) for f in skill.forms)
        # Capped frequency so keyword-stuffed JDs don't dominate; placement matters more.
        weight = min(total, 3) + (3 if in_req else 0) + (2 if in_title else 0)
        found.append(JdKeyword(skill.name, surface, weight, in_req))
    return sorted(found, key=lambda k: -k.weight)


def _split_resume(text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for line in text.splitlines():
        name = next(
            (n for n, rx in RESUME_HEADINGS.items() if len(line.strip()) <= 40 and rx.search(line.strip())), None
        )
        if name:
            current = name
            sections.setdefault(name, [])
        else:
            sections.setdefault(current, []).append(line)
    return {k: "\n".join(v) for k, v in sections.items()}


_INLINE = [
    (re.compile(r"\*\*([^*]+)\*\*"), r"\1"),
    (re.compile(r"\*([^*]+)\*"), r"\1"),
    (re.compile(r"\[([^\]]+)\]\([^)]+\)"), r"\1"),
]


def plain(text: str) -> str:
    for rx, repl in _INLINE:
        text = rx.sub(repl, text)
    return text


SCORER_HEADING = {
    "summary": "Summary",
    "skills": "Skills",
    "employment": "Experience",
    "projects": "Projects",
    "education": "Education",
    "awards": "Awards",
}


def resume_to_text(resume: Resume, only: set[str] | None = None) -> str:
    """The visible resume as plain text with one heading per section: what an ATS reads."""
    lines: list[str] = []
    for section in resume["sections"]:
        if not section["visible"] or (only and section["type"] not in only):
            continue
        match section:
            case {"type": "basics", "basics": dict(b)}:
                links = [link["label"] for link in b["links"]]
                lines += [
                    b["name"],
                    b["headline"],
                    " | ".join(filter(None, [b["email"], b["phone"], b["location"], b["workAuth"], *links])),
                ]
            case {"layout": "paragraph"}:
                lines += ["", SCORER_HEADING.get(section["type"], section["title"]), plain(section["paragraph"])]
            case _:
                lines += ["", SCORER_HEADING.get(section["type"], section["title"])]
                for e in (e for e in section["entries"] if e["visible"]):
                    dates = " – ".join(filter(None, [e["start"], "Present" if e["current"] else e["end"]]))
                    lines.append(" | ".join(filter(None, [e["title"], e["subtitle"], e["location"], dates])))
                    if e["items"]:
                        lines.append(", ".join(e["items"]))
                    lines += [plain(x) for x in (e["meta"], e["description"]) if x]
                    lines += [f"- {plain(b)}" for b in e["bullets"] if b.strip()]
    return "\n".join(lines).strip()


def keyword_match(jd: str, title: str, resume: Resume) -> KeywordMatch:
    keywords = extract_keywords(jd, title)
    text = resume_to_text(resume)
    sections = _split_resume(text)
    dictionary = {s.name: s for s in load_dictionary()}

    # Two skills can share a surface form ("PostgreSQL" is also SQL evidence): keep one, preferring the canonical skill.
    chosen: dict[str, JdKeyword] = {}
    for kw in keywords:
        key = kw.surface.lower()
        if key not in chosen or (kw.skill.lower() == key and chosen[key].skill.lower() != key):
            chosen[key] = kw

    total_weight = sum(k.weight for k in chosen.values()) or 1
    exact_w = alias_w = 0
    result = KeywordMatch(
        score=0,
        must_have=Coverage(),
        nice_to_have=Coverage(),
        matched=[],
        alias_only=[],
        missing_required=[],
        missing_preferred=[],
    )
    for kw in chosen.values():
        forms = dictionary[kw.skill].forms
        bucket = result.must_have if kw.in_requirements else result.nice_to_have
        bucket.total += 1
        if count(text, kw.surface):
            exact_w += kw.weight
            bucket.matched += 1
            result.matched.append(kw.surface)
        elif any(count(body, f) for body in sections.values() for f in forms):
            alias_w += kw.weight
            bucket.matched += 1
            result.alias_only.append(kw.surface)
        else:
            (result.missing_required if kw.in_requirements else result.missing_preferred).append(kw.surface)

    # Alias matches earn 60%: the skill is there, but ATS search wouldn't find it until reworded.
    result.score = round(100 * min(1.0, exact_w / total_weight + 0.6 * alias_w / total_weight))
    return result


# ---------- dictionary edits ----------


class NewSkill(BaseModel):
    name: str
    aliases: list[str] = []
    category: str = "Added from job descriptions"
    rewrite_safe: bool = True


def known_skill(name: str, path: Path = DICTIONARY) -> bool:
    lowered = name.strip().lower()
    return any(lowered == form.lower() for skill in load_dictionary(path) for form in skill.forms)


def add_skills(new: list[NewSkill], path: Path = DICTIONARY) -> list[str]:
    """Appends rows to the category's table in the markdown (creating the section if needed). Returns names added."""
    lines = path.read_text(encoding="utf-8").splitlines()
    added: list[str] = []
    for skill in new:
        if known_skill(skill.name, path) or skill.name.lower() in (a.lower() for a in added):
            continue
        row = f"| {skill.name} | {', '.join(skill.aliases)} | {'yes' if skill.rewrite_safe else 'no'} |"
        heading = next(
            (i for i, line in enumerate(lines) if line.strip().lower() == f"## {skill.category}".lower()), None
        )
        if heading is None:
            lines += ["", f"## {skill.category}", "", "| Skill | Aliases | Rewrite-safe |", "|---|---|---|", row]
        else:
            end = heading + 1
            while end < len(lines) and not lines[end].startswith("## "):
                end += 1
            last_row = max((i for i in range(heading, end) if lines[i].startswith("|")), default=end - 1)
            lines.insert(last_row + 1, row)
        added.append(skill.name)
    if added:
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        load_dictionary.cache_clear()
    return added


# ---------- Base vs tailored ----------


class BulletChange(BaseModel):
    section: str
    entry: str
    kind: Literal["rewritten", "added", "removed"]
    before: str = ""
    after: str = ""


class Changes(BaseModel):
    skills_added: list[str] = []
    skills_removed: list[str] = []
    projects_added: list[str] = []
    projects_removed: list[str] = []
    bullets: list[BulletChange] = []
    unchanged_bullets: int = 0


def _visible_entries(resume: Resume, kind: str) -> list[dict[str, Any]]:
    section = next((s for s in resume["sections"] if s["type"] == kind), None)
    return [e for e in section["entries"] if e["visible"]] if section and section["visible"] else []


def _diff_bullets(label: str, entry: str, before: list[str], after: list[str], out: Changes) -> None:
    remaining = [plain(b) for b in before if b.strip()]
    for new in (plain(b) for b in after if b.strip()):
        scored = [(SequenceMatcher(None, old, new).ratio(), old) for old in remaining]
        ratio, best = max(scored, default=(0.0, ""))
        if ratio >= 0.97:
            out.unchanged_bullets += 1
            remaining.remove(best)
        elif ratio >= 0.45:
            out.bullets.append(BulletChange(section=label, entry=entry, kind="rewritten", before=best, after=new))
            remaining.remove(best)
        else:
            out.bullets.append(BulletChange(section=label, entry=entry, kind="added", after=new))
    out.bullets += [BulletChange(section=label, entry=entry, kind="removed", before=old) for old in remaining]


def _skills(resume: Resume) -> list[str]:
    return list(dict.fromkeys(i.strip() for e in _visible_entries(resume, "skills") for i in e["items"]))


def diff_resumes(base: Resume, tailored: Resume) -> Changes:
    """What tailoring changed in Technical Skills, Experience and Projects (bullets are paired by similarity)."""
    out = Changes()
    base_skills, new_skills = _skills(base), _skills(tailored)
    out.skills_added = [s for s in new_skills if s.lower() not in {b.lower() for b in base_skills}]
    out.skills_removed = [s for s in base_skills if s.lower() not in {n.lower() for n in new_skills}]

    base_jobs = {e["id"]: e for e in _visible_entries(base, "employment")}
    for job in _visible_entries(tailored, "employment"):
        _diff_bullets("Experience", job["title"], base_jobs.pop(job["id"], {}).get("bullets", []), job["bullets"], out)
    for job in base_jobs.values():  # hidden on the tailored resume
        _diff_bullets("Experience", job["title"], job["bullets"], [], out)

    base_projects = {e["title"].lower(): e for e in _visible_entries(base, "projects")}
    for project in _visible_entries(tailored, "projects"):
        if (old := base_projects.pop(project["title"].lower(), None)) is None:
            out.projects_added.append(project["title"])
        else:
            _diff_bullets("Projects", project["title"], old["bullets"], project["bullets"], out)
    out.projects_removed = [p["title"] for p in base_projects.values()]
    return out


# ---------- PDF text check ----------


class PdfCheck(BaseModel):
    pages: int
    extractable: bool
    missing_keywords: list[str] = []  # on the resume, but not readable in the PDF text
    missing_bullets: list[str] = []


def _squash(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def check_pdf(pdf: bytes, resume: Resume, jd: str = "", title: str = "") -> PdfCheck:
    """Reads the PDF the way an ATS would and reports resume content that doesn't come through as text."""
    reader = PdfReader(io.BytesIO(pdf))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    squashed = _squash(text)
    result = PdfCheck(pages=len(reader.pages), extractable=len(squashed) > 200)
    if jd:
        result.missing_keywords = [k for k in keyword_match(jd, title, resume).matched if _squash(k) not in squashed]
    all_bullets = [
        plain(b) for s in resume["sections"] if s["visible"] for e in s["entries"] if e["visible"] for b in e["bullets"]
    ]
    result.missing_bullets = [b for b in all_bullets if b.strip() and _squash(b) not in squashed]
    return result


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    match = keyword_match(payload["jobDescription"], payload.get("jobTitle", ""), payload["resume"])
    json.dump(camel(match.model_dump()), sys.stdout)
