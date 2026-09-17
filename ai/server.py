"""resume-ai: MCP server that tailors resumes from Obsidian job notes.

Behaviour lives in markdown next to this file: knowledge/ (guardrails, writing style, skills dictionary),
prompts/ (workflows) and templates/ (Obsidian notes, match report). This file only wires them to MCP,
the Obsidian vault and the resume app's HTTP API.

Run: `uv run server.py` (stdio). `uv run server.py --setup-vault` scaffolds the vault and exits.
"""

import asyncio
import logging
import os
import re
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Annotated, Any, Literal

import frontmatter
import httpx
from mcp.server.mcpserver import Context, Elicit, MCPServer, Resolve
from mcp.server.mcpserver.exceptions import ResourceNotFoundError, ToolError
from mcp.types import ToolAnnotations
from pydantic import BaseModel, Field

from scoring import KeywordMatch, camel, keyword_match, plain, resume_to_text

HERE = Path(__file__).parent
ROOT = HERE.parent
VAULT = Path(os.environ.get("VAULT_DIR", Path.home() / "Documents" / "Obsidian Vault"))
# An explicit API_URL, else `pnpm start` (one port) and then `pnpm dev`.
API_URLS = (
    [os.environ["API_URL"]] if "API_URL" in os.environ else ["http://127.0.0.1:8790/api", "http://127.0.0.1:8797/api"]
)
BLOCK_START, BLOCK_END = "<!-- resume-creator:start -->", "<!-- resume-creator:end -->"
FIXED_STATUSES = {"applied", "interview", "offer", "rejected", "skip"}

type Resume = dict[str, Any]

logging.getLogger("httpx").setLevel(logging.WARNING)  # stderr noise on every API call otherwise


# ---------- markdown ----------


def md(*parts: str) -> str:
    """Reads a markdown file under ai/ fresh on every call, so edits apply without a restart."""
    return HERE.joinpath(*parts).read_text(encoding="utf-8")


def fill(template: str, **values: object) -> str:
    return re.sub(r"\{\{(\w+)\}\}", lambda m: str(values.get(m.group(1), "")), template)


def limits() -> dict[str, int]:
    """Rows like "| `bullet_chars` | 260 | … |" from knowledge/guardrails.md."""
    return {
        m[1]: int(m[2]) for m in re.finditer(r"^\|\s*`(\w+)`\s*\|\s*(\d+)\s*\|", md("knowledge", "guardrails.md"), re.M)
    }


def cell(text: str) -> str:
    """Safe inside a markdown table cell."""
    return text.replace("|", "\\|").replace("\n", " ")


def bullets(items: list[str], empty: str = "_None_") -> str:
    return "\n".join(f"- {i}" for i in items) or empty


# ---------- Obsidian vault ----------


@dataclass(slots=True)
class JobNote:
    path: Path
    meta: dict[str, Any]
    description: str

    @property
    def id(self) -> str:
        return self.path.stem

    @property
    def rel(self) -> str:
        return self.path.relative_to(VAULT).as_posix()

    def get(self, key: str) -> str:
        value = self.meta.get(key)
        return "" if value is None else str(value)

    @property
    def company(self) -> str:
        return self.get("company") or self.id.split(" - ")[0].strip()

    @property
    def role(self) -> str:
        return self.get("role") or " - ".join(self.id.split(" - ")[1:]).strip()


def strip_block(body: str) -> str:
    start, end = body.find(BLOCK_START), body.find(BLOCK_END)
    return body if start < 0 or end < start else (body[:start] + body[end + len(BLOCK_END) :]).strip()


def require_vault() -> None:
    if not VAULT.is_dir():
        raise ToolError(f'Obsidian vault not found at "{VAULT}". Set VAULT_DIR to your vault path.')


def job_notes() -> list[JobNote]:
    require_vault()
    notes = []
    for path in sorted((VAULT / "Jobs").glob("*.md")):
        if path.name.startswith("_"):
            continue
        post = frontmatter.load(path)
        notes.append(JobNote(path, dict(post.metadata), strip_block(post.content).strip()))
    return notes


def find_job(query: str) -> JobNote:
    notes = job_notes()
    q = query.strip().removesuffix(".md").lower()
    if exact := next((n for n in notes if n.id.lower() == q), None):
        return exact
    matches = [n for n in notes if q in f"{n.id} {n.company} {n.role}".lower()]
    match matches:
        case [one]:
            return one
        case []:
            raise ToolError(
                f'No job note matches "{query}" in {VAULT / "Jobs"}. Jobs: {", ".join(n.id for n in notes) or "(none)"}'
            )
        case _:
            raise ToolError(f'"{query}" matches several jobs: {", ".join(n.id for n in matches)}. Use the full name.')


def project_notes() -> list[dict[str, str]]:
    folder = VAULT / "Resume" / "Projects"
    out = []
    for path in sorted(folder.glob("*.md")) if folder.is_dir() else []:
        post = frontmatter.load(path)
        tech = post.metadata.get("tech", "")
        out.append(
            {
                "title": str(post.metadata.get("title") or path.stem),
                "tech": ", ".join(tech) if isinstance(tech, list) else str(tech or ""),
                "link": str(post.metadata.get("link") or ""),
                "body": post.content.strip(),
            }
        )
    return out


def extra_facts() -> str:
    path = VAULT / "Resume" / "Extra Facts.md"
    return frontmatter.load(path).content.strip() if path.is_file() else ""


def write_note(note: JobNote, meta: dict[str, Any], block: str | None = None) -> Path:
    post = frontmatter.load(note.path)
    post.metadata.update(meta)
    if block is not None:
        post.content = f"{strip_block(post.content).rstrip()}\n\n{BLOCK_START}\n{block.strip()}\n{BLOCK_END}\n"
    note.path.write_text(frontmatter.dumps(post) + "\n", encoding="utf-8")
    return note.path


# ---------- resume app API ----------


@dataclass(slots=True)
class App:
    """The running resume app, found on first use (and again after it restarts in another mode)."""

    http: httpx.AsyncClient
    base: str = ""
    web: str = ""
    output: Path = ROOT / "resumes"

    async def connect(self) -> None:
        if self.base:
            return
        for url in API_URLS:
            try:
                info = (await self.http.get(f"{url}/info", timeout=2)).raise_for_status().json()
            except httpx.HTTPError:
                continue
            self.base, self.output = url, Path(info["output"])
            self.web = os.environ.get("WEB_ORIGIN", info["webOrigin"])
            return
        raise ToolError("The resume app isn't running. Start it with `pnpm start` (or `pnpm dev`), then try again.")

    def pdf_url(self, rel: str) -> str:
        return (self.output / rel).as_uri()


@asynccontextmanager
async def lifespan(_: MCPServer) -> AsyncIterator[App]:
    async with httpx.AsyncClient(timeout=90) as http:
        yield App(http)


def app(ctx: Context) -> App:
    return ctx.request_context.lifespan_context


async def call(state: App, method: str, path: str, body: Any = None) -> Any:
    await state.connect()
    # The API treats absent and null differently; send absent.
    payload = {k: v for k, v in body.items() if v is not None} if isinstance(body, dict) else body
    try:
        res = await state.http.request(method, f"{state.base}{path}", json=payload)
    except httpx.ConnectError as err:
        state.base = ""
        raise ToolError(
            "Lost the connection to the resume app. Is `pnpm start` (or `pnpm dev`) still running?"
        ) from err
    if res.is_error:
        raise ToolError(f"API {method} {path} failed ({res.status_code}): {res.json().get('error', res.text)}")
    return res.json() if res.content else None


async def api(ctx: Context, method: str, path: str, body: Any = None) -> Any:
    return await call(app(ctx), method, path, body)


async def base_resume(ctx: Context) -> Resume:
    resumes = (await api(ctx, "GET", "/resumes"))["items"]
    if base := next((r for r in resumes if r["isBase"]), None):
        return base
    raise ToolError("No Base resume found. Create one in the app first.")


def section(resume: Resume, kind: str) -> dict[str, Any] | None:
    return next((s for s in resume["sections"] if s["type"] == kind), None)


def entries(resume: Resume, kind: str) -> list[dict[str, Any]]:
    return (section(resume, kind) or {"entries": []})["entries"]


# ---------- tool models ----------


class SkillCategory(BaseModel):
    category: str
    items: list[str]


class ExperienceEdit(BaseModel):
    entry_id: Annotated[str, Field(description="Experience entry_id from get_job_context")]
    bullets: list[str]
    visible: bool = True


class ProjectPick(BaseModel):
    source_entry_id: Annotated[str | None, Field(description="Base resume project entry_id this is based on")] = None
    note_title: Annotated[str | None, Field(description="Obsidian project note title, if not on the Base resume")] = (
        None
    )
    name: str
    subtitle: Annotated[str, Field(description='Short description + stack, e.g. "AI Voice Agent (Python, FastAPI)"')]
    link: str | None = None
    bullets: list[str]


class Requirement(BaseModel):
    requirement: str
    strength: Literal["strong", "weak", "missing"]
    evidence: str = ""


# A plain alias (not `type`): pydantic only honours default_factory on assignment-style Annotated aliases.
Items = Annotated[list[str], Field(default_factory=list)]


class Gaps(BaseModel):
    real: Items
    weak: Items


class Improvements(BaseModel):
    add_to_notes: Items
    strengthen: Items
    upskill: Items
    application_tips: Items


class JobSummary(BaseModel):
    job: str
    company: str
    role: str
    status: str
    resume_id: str | None
    match_score: int | None
    description_words: int


class SaveResult(BaseModel):
    resume_id: str
    updated_existing: bool
    editor: str
    keywords: KeywordMatch
    must_have_coverage: int
    next_step: str


class ExportResult(BaseModel):
    path: str
    pages: int
    fits_one_page: bool
    file_url: str
    next_step: str


class ReportResult(BaseModel):
    note: str
    score: int
    must_have: str
    pdf: str | None


class ConfirmUpdate(BaseModel):
    update: bool = Field(description="Replace the tailored sections of the existing resume (including manual edits)?")


# ---------- guardrails (rules: knowledge/guardrails.md) ----------


def _norm(text: str) -> str:
    text = re.sub(r"\.(?![a-z0-9])", " ", plain(text).lower())  # sentence dots, keep "node.js"
    return " " + re.sub(r"[^a-z0-9+#.]+", " ", text).strip() + " "


def check_guardrails(
    skills: list[SkillCategory], experience: list[ExperienceEdit], projects: list[ProjectPick], base: Resume
) -> list[str]:
    lim, problems = limits(), []
    notes = project_notes()
    vocab = _norm(
        "\n".join([resume_to_text(base), extra_facts(), *(f"{p['title']} {p['tech']} {p['body']}" for p in notes)])
    )

    if not skills or len(skills) > lim["skill_categories"]:
        problems.append(f"skills: 1–{lim['skill_categories']} categories.")
    for cat in skills:
        if len(cat.items) > lim["skills_per_category"]:
            problems.append(f'skills "{cat.category}": at most {lim["skills_per_category"]} items.')
    unknown = [
        item
        for cat in skills
        for item in cat.items
        if (n := _norm(item)) not in vocab and not all(len(w) < 2 or f" {w} " in vocab for w in n.split())
    ]
    if unknown:
        problems.append(
            f"skills not in the Base resume or Obsidian notes: {', '.join(unknown)}. "
            "Report them as gaps, or ask the user to add them to Resume/Extra Facts.md."
        )

    base_jobs = {e["id"] for e in entries(base, "employment")}
    for exp in experience:
        if exp.entry_id not in base_jobs:
            problems.append(f'experience: unknown entry_id "{exp.entry_id}".')
        if len(exp.bullets) > lim["bullets_per_role"]:
            problems.append(f"experience {exp.entry_id}: at most {lim['bullets_per_role']} bullets.")

    base_projects = {e["id"] for e in entries(base, "projects")}
    note_titles = {p["title"].lower() for p in notes}
    if not lim["min_projects"] <= len(projects) <= lim["max_projects"]:
        problems.append(f"projects: pick {lim['min_projects']}–{lim['max_projects']}.")
    for p in projects:
        if p.source_entry_id and p.source_entry_id not in base_projects:
            problems.append(f'projects "{p.name}": unknown source_entry_id "{p.source_entry_id}".')
        if not p.source_entry_id and (p.note_title or "").lower() not in note_titles:
            problems.append(
                f'projects "{p.name}": needs source_entry_id (Base resume) or note_title (Obsidian note); '
                "projects can't be invented."
            )
        if not 1 <= len(p.bullets) <= lim["bullets_per_project"]:
            problems.append(f'projects "{p.name}": 1–{lim["bullets_per_project"]} bullets.')

    own = {plain(b).strip() for s in base["sections"] for e in s["entries"] for b in e["bullets"]}
    new_bullets = [b for e in experience for b in e.bullets] + [b for p in projects for b in p.bullets]
    if any(not b.strip() for b in new_bullets):
        problems.append("bullets must not be empty.")
    if long := [b for b in new_bullets if len(plain(b)) > lim["bullet_chars"] and plain(b).strip() not in own]:
        problems.append(f"{len(long)} new bullet(s) exceed {lim['bullet_chars']} characters.")
    return problems


def new_entry(**fields: Any) -> dict[str, Any]:
    entry = {
        "id": f"e_{os.urandom(4).hex()}",
        "visible": True,
        "title": "",
        "subtitle": "",
        "location": "",
        "start": "",
        "end": "",
        "current": False,
        "link": "",
        "meta": "",
        "description": "",
        "bullets": [],
        "items": [],
    }
    return entry | fields


def apply_tailoring(
    target: Resume,
    base: Resume,
    skills: list[SkillCategory],
    experience: list[ExperienceEdit],
    projects: list[ProjectPick],
) -> Resume:
    if s := section(target, "skills"):
        s["entries"] = [new_entry(title=c.category, items=c.items) for c in skills]
    if (jobs := section(target, "employment")) and (base_jobs := section(base, "employment")):
        edits = {e.entry_id: e for e in experience}
        jobs["entries"] = [
            entry | {"bullets": edit.bullets, "visible": edit.visible} if (edit := edits.get(entry["id"])) else entry
            for entry in base_jobs["entries"]
        ]
    if proj := section(target, "projects"):
        by_id = {e["id"]: e for e in entries(base, "projects")}
        by_title = {n["title"].lower(): n for n in project_notes()}
        proj["entries"] = []
        for p in projects:
            src = by_id.get(p.source_entry_id or "", {})
            note = by_title.get((p.note_title or "").lower(), {})
            dates = {k: src[k] for k in ("start", "end", "current") if k in src}
            proj["entries"].append(
                new_entry(
                    title=p.name,
                    subtitle=p.subtitle,
                    link=p.link or src.get("link") or note.get("link", ""),
                    bullets=p.bullets,
                    **dates,
                )
            )
    return target


# ---------- server ----------

mcp = MCPServer(
    "resume-ai",
    title="Resume tailoring",
    version="0.3.0",
    instructions=md("prompts", "tailor-resume.md").split("## Steps")[0],
    lifespan=lifespan,
)


def _markdown_resources(folder: str) -> None:
    """Every .md file in the folder becomes a static resource, read fresh on each request."""

    def reader(path: Path):
        def read() -> str:
            return path.read_text(encoding="utf-8")

        return read

    for path in sorted((HERE / folder).glob("*.md")):
        heading = path.read_text(encoding="utf-8").partition("\n")[0].lstrip("# ")
        mcp.resource(f"resume://{folder}/{path.stem}", name=path.stem, title=heading, mime_type="text/markdown")(
            reader(path)
        )


_markdown_resources("knowledge")
_markdown_resources("prompts")


@mcp.resource("resume://vault/jobs", title="Job notes", mime_type="application/json")
def jobs_resource() -> list[dict[str, Any]]:
    return [{"job": n.id, "status": n.get("status") or "todo", "note": n.rel} for n in job_notes()]


@mcp.resource("resume://vault/jobs/{job}", title="Job note", mime_type="text/markdown")
def job_resource(job: str) -> str:
    try:
        return find_job(job).path.read_text(encoding="utf-8")
    except ToolError as err:
        raise ResourceNotFoundError(str(err)) from err


@mcp.resource("resume://vault/projects", title="Obsidian project notes", mime_type="application/json")
def projects_resource() -> list[dict[str, str]]:
    return project_notes()


@mcp.resource("resume://vault/extra-facts", title="Extra facts", mime_type="text/markdown")
def extra_facts_resource() -> str:
    return extra_facts() or "_No Resume/Extra Facts.md yet._"


@mcp.prompt(title="Tailor resume to a job")
def tailor_resume(job: str = "") -> str:
    """Full workflow: job note → tailored resume → PDF → match report in Obsidian."""
    return fill(md("prompts", "tailor-resume.md"), job=job or "list")


@mcp.prompt(title="Review job match")
def review_match(job: str) -> str:
    """How to judge requirements, gaps and improvements for save_match_report."""
    return fill(md("prompts", "review-match.md"), job=job)


READ_ONLY = ToolAnnotations(readOnlyHint=True, openWorldHint=False)


@mcp.tool(annotations=ToolAnnotations(idempotentHint=True, destructiveHint=False))
async def setup_vault(ctx: Context) -> list[str]:
    """Create Jobs/, Templates/Job.md, Resume/Extra Facts.md and a Resume/Projects note per Base resume project.

    Never overwrites existing files."""
    return await _setup_vault(await base_resume(ctx))


async def _setup_vault(base: Resume) -> list[str]:
    require_vault()
    created: list[str] = []

    def write(rel: str, content: str) -> None:
        path = VAULT / rel
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            created.append(rel)

    (VAULT / "Jobs").mkdir(exist_ok=True)
    write("Templates/Job.md", md("templates", "job-note.md"))
    write("Resume/Extra Facts.md", md("templates", "extra-facts.md"))
    projects_dir = VAULT / "Resume" / "Projects"
    if not any(projects_dir.glob("*.md")):
        for p in entries(base, "projects"):
            post = frontmatter.Post(
                fill(md("templates", "project-note.md"), bullets=bullets(p["bullets"], "")),
                title=p["title"],
                tech=p["subtitle"],
                link=p["link"],
                dates="",
            )
            filename = re.sub(r'[\\/:*?"<>|]', "-", p["title"])
            write(f"Resume/Projects/{filename}.md", frontmatter.dumps(post) + "\n")
    return created


@mcp.tool(annotations=READ_ONLY)
def list_jobs(
    status: Annotated[str, Field(description="todo | generated | applied | skip | all")] = "todo",
) -> list[JobSummary]:
    """List job notes in the vault's Jobs/ folder."""
    return [
        JobSummary(
            job=n.id,
            company=n.company,
            role=n.role,
            status=n.get("status") or "todo",
            resume_id=n.get("resume_id") or None,
            match_score=n.meta.get("match_score"),
            description_words=len(n.description.split()),
        )
        for n in job_notes()
        if status == "all" or (n.get("status") or "todo") == status
    ]


@mcp.tool(annotations=READ_ONLY)
async def get_job_context(job: str, ctx: Context) -> dict[str, Any]:
    """Everything needed to tailor: job description, keyword analysis of the Base resume, editable sections with ids,
    fixed sections, Obsidian project notes, extra facts and limits. Call first."""
    note = find_job(job)
    if len(note.description.split()) < limits()["min_jd_words"]:
        raise ToolError(f'"{note.id}" has almost no job description. Paste the full JD into the note body first.')
    base = await base_resume(ctx)
    kw = keyword_match(note.description, note.role, base)
    return {
        "job": {
            "id": note.id,
            "company": note.company,
            "role": note.role,
            "url": note.get("url"),
            "user_notes": note.get("notes"),
            "existing_resume_id": note.get("resume_id") or None,
            "description": note.description,
        },
        "base_keyword_match": kw.model_dump(),
        "fixed_sections": resume_to_text(base, only={"basics", "education", "awards"}),
        "editable": {
            "skills": [{"category": e["title"], "items": e["items"]} for e in entries(base, "skills") if e["visible"]],
            "experience": [
                {"entry_id": e["id"], "company": e["title"], "title": e["subtitle"], "bullets": e["bullets"]}
                for e in entries(base, "employment")
            ],
            "projects": [
                {
                    "entry_id": e["id"],
                    "name": e["title"],
                    "subtitle": e["subtitle"],
                    "link": e["link"],
                    "bullets": e["bullets"],
                }
                for e in entries(base, "projects")
            ],
        },
        "obsidian": {"projects": project_notes(), "extra_facts": extra_facts()},
        "limits": limits(),
        "rules": ["resume://knowledge/guardrails", "resume://knowledge/writing-style"],
    }


async def confirm_replace(
    job: str, skills: list[SkillCategory], experience: list[ExperienceEdit], projects: list[ProjectPick], ctx: Context
) -> Elicit[ConfirmUpdate] | ConfirmUpdate:
    """Resolver: ask before overwriting an existing tailored resume, only if the save would pass the guardrails
    and the client can be asked."""
    caps = ctx.client_capabilities
    if not find_job(job).get("resume_id") or caps is None or caps.elicitation is None:
        return ConfirmUpdate(update=True)
    if check_guardrails(skills, experience, projects, await base_resume(ctx)):
        return ConfirmUpdate(update=True)  # the tool body reports the problems; no point asking first
    return Elicit(f'"{job}" already has a tailored resume. Replace its skills, experience and projects?', ConfirmUpdate)


@mcp.tool(annotations=ToolAnnotations(destructiveHint=False, idempotentHint=True))
async def save_tailored_resume(
    job: str,
    skills: list[SkillCategory],
    experience: list[ExperienceEdit],
    projects: list[ProjectPick],
    confirm: Annotated[ConfirmUpdate, Resolve(confirm_replace)],
    ctx: Context,
) -> SaveResult:
    """Create or update the job's tailored resume.

    Technical Skills, Experience bullets and Projects come from you; everything else is copied from the Base resume.
    Rejects anything that breaks resume://knowledge/guardrails."""
    note = find_job(job)
    base = await base_resume(ctx)
    if problems := check_guardrails(skills, experience, projects, base):
        raise ToolError("Not saved. Fix and call again:\n- " + "\n- ".join(problems))

    if not confirm.update:
        raise ToolError("Cancelled by the user; the existing resume was not changed.")
    target: Resume | None = None
    if existing_id := note.get("resume_id"):
        try:
            target = await api(ctx, "GET", f"/resumes/{existing_id}")
        except ToolError:
            target = None
    if not target:
        templates = await api(ctx, "GET", "/templates")
        template_id = next((t["id"] for t in templates["items"] if note.get("template") in (t["id"], t["name"])), None)
        job_link = {"note": note.rel, "title": note.role, "url": note.get("url"), "description": note.description}
        target = await api(
            ctx,
            "POST",
            f"/resumes/{base['id']}/duplicate",
            {
                "company": note.company,
                "role": note.role,
                "jobUrl": note.get("url"),
                "templateId": template_id,
                "job": job_link,
            },
        )

    saved = await api(
        ctx, "PUT", f"/resumes/{target['id']}", apply_tailoring(target, base, skills, experience, projects)
    )
    write_note(note, {"resume_id": saved["id"]})
    kw = keyword_match(note.description, note.role, saved)
    coverage = round(100 * kw.must_have.matched / kw.must_have.total) if kw.must_have.total else 100
    return SaveResult(
        resume_id=saved["id"],
        updated_existing=bool(existing_id and existing_id == saved["id"]),
        editor=f"{app(ctx).web}/resumes/{saved['id']}",
        keywords=kw,
        must_have_coverage=coverage,
        next_step="Call export_resume to render the PDF and check it fits one page.",
    )


@mcp.tool(annotations=ToolAnnotations(destructiveHint=False, idempotentHint=True))
async def export_resume(resume_id: str, ctx: Context) -> ExportResult:
    """Render the PDF into resumes/week-of-<Monday>/ (fit-to-one-page applies) and report the page count."""
    await ctx.report_progress(0, 1, "Rendering PDF")
    result = await api(ctx, "POST", f"/resumes/{resume_id}/export")
    await ctx.report_progress(1, 1, "Done")
    fits = result["pages"] == 1
    return ExportResult(
        path=result["path"],
        pages=result["pages"],
        fits_one_page=fits,
        file_url=app(ctx).pdf_url(result["path"]),
        next_step="Call save_match_report."
        if fits
        else "Over one page even at minimum scale: cut per the writing style guide, save and export again.",
    )


@mcp.tool(annotations=ToolAnnotations(destructiveHint=False, idempotentHint=True))
async def save_match_report(
    job: str, resume_id: str, requirements: list[Requirement], gaps: Gaps, improvements: Improvements, ctx: Context
) -> ReportResult:
    """Store the review on the resume (shown in the app) and write it into the Obsidian job note.

    Writes Match Report, Gaps, How to Improve and Generated Resume, replacing any previous run.
    See the review_match prompt for how to fill the fields."""
    note = find_job(job)
    resume = await api(ctx, "GET", f"/resumes/{resume_id}")
    kw = keyword_match(note.description, note.role, resume)
    match = camel(
        {
            "keywords": kw.model_dump(),
            "requirements": [r.model_dump() for r in requirements],
            "gaps": gaps.model_dump(),
            "improvements": improvements.model_dump(),
            "scored_at": datetime.now(UTC).isoformat(),
        }
    )
    resume = await api(ctx, "PUT", f"/resumes/{resume_id}/match", match)
    state = app(ctx)
    last = resume["exports"][-1]["path"] if resume["exports"] else None

    links = " · ".join(
        filter(
            None, [last and f"[Open PDF]({state.pdf_url(last)})", f"[Open in editor]({state.web}/resumes/{resume_id})"]
        )
    )
    table = (
        "\n".join(
            [
                "| Requirement | Strength | Evidence |",
                "|---|---|---|",
                *(f"| {cell(r.requirement)} | {r.strength} | {cell(r.evidence) or '—'} |" for r in requirements),
            ]
        )
        if requirements
        else ""
    )
    block = fill(
        md("templates", "match-report.md"),
        score=kw.score,
        must_have=f"{kw.must_have.matched}/{kw.must_have.total}",
        nice_to_have=f"{kw.nice_to_have.matched}/{kw.nice_to_have.total}",
        links=links,
        requirements_table=table,
        matched=", ".join(kw.matched) or "—",
        alias_only=", ".join(kw.alias_only) or "—",
        missing_required=", ".join(kw.missing_required) or "—",
        missing_preferred=", ".join(kw.missing_preferred) or "—",
        gaps_real=bullets(gaps.real),
        gaps_weak=bullets(gaps.weak),
        add_to_notes=bullets(improvements.add_to_notes),
        strengthen=bullets(improvements.strengthen),
        upskill=bullets(improvements.upskill),
        application_tips=bullets(improvements.application_tips),
        resume_text=resume_to_text(resume, only={"skills", "employment", "projects"}),
    )
    status = note.get("status") if note.get("status") in FIXED_STATUSES else "generated"
    path = write_note(
        note,
        {
            "status": status,
            "resume_id": resume_id,
            "resume_file": last and Path(last).name,
            "resume_pdf": last and state.pdf_url(last),
            "generated_at": date.today().isoformat(),
            "match_score": kw.score,
            "must_have_coverage": f"{kw.must_have.matched}/{kw.must_have.total}",
            "missing_keywords": kw.missing_required,
            "score_history": [e["score"] for e in resume.get("matchHistory", [])],
        },
        block,
    )
    return ReportResult(
        note=str(path), score=kw.score, must_have=f"{kw.must_have.matched}/{kw.must_have.total}", pdf=last
    )


if __name__ == "__main__":
    if "--setup-vault" in sys.argv:

        async def _main() -> None:
            async with httpx.AsyncClient(timeout=30) as http:
                resumes = await call(App(http), "GET", "/resumes")
            base = next(r for r in resumes["items"] if r["isBase"])
            print("\n".join(await _setup_vault(base)) or "Everything already existed.")

        asyncio.run(_main())
    else:
        mcp.run()
