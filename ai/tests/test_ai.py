import importlib
import sys

import pytest

import scoring

JD = """About the role
We build agents.

Requirements
- Strong Python and TypeScript
- Experience with PostgreSQL and Docker

Nice to have
- Kubernetes
"""


def entry(**fields):
    base = {"id": "e1", "visible": True, "title": "", "subtitle": "", "location": "", "start": "", "end": "",
            "current": False, "link": "", "meta": "", "description": "", "bullets": [], "items": []}  # fmt: skip
    return base | fields


def resume(skills: list[str], bullets: list[str] = (), project_bullets: list[str] = ()):
    def sec(kind, entries, visible=True):
        return {"id": kind, "type": kind, "title": kind, "visible": visible, "layout": "entries", "paragraph": "",
                "entries": entries}  # fmt: skip

    return {
        "sections": [
            sec("skills", [entry(title="Languages", items=skills)]),
            sec("employment", [entry(id="job1", title="Acme", subtitle="Engineer", bullets=list(bullets))]),
            sec("projects", [entry(id="p1", title="Bot", bullets=list(project_bullets))]),
            sec("awards", [entry(title="Hidden award", bullets=["Used Kubernetes"])], visible=False),
        ]
    }


# ---------- markdown knowledge ----------


def test_dictionary_markdown_parses_every_skill():
    skills = scoring.load_dictionary()
    names = {s.name for s in skills}
    assert len(skills) >= 90  # grows as skills are added from job descriptions
    assert {"Python", "PostgreSQL", "Kubernetes", "CI/CD"} <= names
    sql = next(s for s in skills if s.name == "SQL")
    assert "sqlite" in sql.aliases and not sql.rewrite_safe


def test_term_regex_handles_tech_tokens():
    assert scoring.count("Node.js and C++ work", "Node.js") == 1
    assert scoring.count("Node.js", "js") == 0
    assert scoring.count("C++ developer", "C++") == 1


# ---------- scoring ----------


def test_resume_text_strips_markup_and_hidden_sections():
    text = scoring.resume_to_text(resume(["Python"], ["Built **fast** APIs with [Docker](https://docker.com)"]))
    assert "Built fast APIs with Docker" in text
    assert "Kubernetes" not in text


def test_keyword_match_splits_required_and_preferred():
    m = scoring.keyword_match(JD, "Backend Engineer", resume(["Python", "TypeScript"], ["Shipped services on Docker"]))
    assert "PostgreSQL" in m.missing_required
    assert "Python" in m.matched
    assert "Kubernetes" in m.missing_preferred
    assert m.must_have.matched < m.must_have.total


def test_better_coverage_scores_higher_and_serializes_camel_case():
    weak = scoring.keyword_match(JD, "", resume(["Java"]))
    strong = scoring.keyword_match(JD, "", resume(["Python", "TypeScript", "PostgreSQL", "Docker"]))
    assert strong.score > weak.score
    assert "mustHave" in scoring.camel(strong.model_dump()) and len(set(strong.matched)) == len(strong.matched)


# ---------- server: guardrails, limits, notes ----------


@pytest.fixture
def server(tmp_path, monkeypatch):
    vault = tmp_path / "vault"
    (vault / "Jobs").mkdir(parents=True)
    (vault / "Resume" / "Projects").mkdir(parents=True)
    (vault / "Resume" / "Extra Facts.md").write_text("---\n---\n- Used Terraform for staging infra\n")
    note = vault / "Resume" / "Projects" / "Notes App.md"
    note.write_text("---\ntitle: Notes App\ntech: Svelte\n---\nA notes app.\n")
    monkeypatch.setenv("VAULT_DIR", str(vault))
    sys.modules.pop("server", None)
    module = importlib.import_module("server")
    yield module
    sys.modules.pop("server", None)


def test_limits_come_from_guardrails_markdown(server):
    lim = server.limits()
    assert lim["bullet_chars"] == 260 and lim["max_projects"] == 4


def test_guardrails_reject_invented_skills_and_projects(server):
    base = resume(["Python"], ["Built APIs"], ["Chatbot"])
    problems = server.check_guardrails(
        [server.SkillCategory(category="Cloud", items=["Python", "Terraform", "Kubernetes"])],
        [server.ExperienceEdit(entry_id="nope", bullets=["x"])],
        [server.ProjectPick(name="Made up", subtitle="x", bullets=["y"])],
        base,
    )
    text = " ".join(problems)
    assert "Kubernetes" in text and "Terraform" not in text.split("skills not in")[1].split(".")[0]
    assert 'unknown entry_id "nope"' in text
    assert "can't be invented" in text


def test_gaps_and_improvements_default_to_empty(server):
    assert server.Gaps().real == [] and server.Improvements().application_tips == []


def test_guardrails_accept_sources_and_verbatim_long_bullets(server):
    long_own = "Built " + "a very detailed thing " * 15
    base = resume(["Python"], [long_own], ["Chatbot"])
    problems = server.check_guardrails(
        [server.SkillCategory(category="Languages", items=["Python", "Svelte"])],
        [server.ExperienceEdit(entry_id="job1", bullets=[long_own])],
        [
            server.ProjectPick(source_entry_id="p1", name="Bot", subtitle="Bot (Python)", bullets=["Chatbot"]),
            server.ProjectPick(note_title="notes app", name="Notes App", subtitle="Notes (Svelte)", bullets=["Notes"]),
        ],
        base,
    )
    assert problems == []


def test_write_note_replaces_generated_block(server):
    note_path = server.VAULT / "Jobs" / "Acme - Engineer.md"
    note_path.write_text("---\ncompany: Acme\nstatus: todo\n---\nThe job description.\n")
    note = server.find_job("acme")
    server.write_note(note, {"status": "generated"}, "## Match Report\nfirst")
    server.write_note(server.find_job("acme"), {"match_score": 90}, "## Match Report\nsecond")
    text = note_path.read_text()
    assert text.count(server.BLOCK_START) == 1 and "second" in text and "first" not in text
    again = server.find_job("Acme - Engineer")
    assert again.description == "The job description." and again.meta["match_score"] == 90


# ---------- dictionary edits, diff, PDF check, weekly ----------


def test_add_skills_appends_to_category_table_and_skips_known(tmp_path):
    # A copy of the real dictionary: the test must not edit ai/knowledge.
    dictionary = tmp_path / "skills.md"
    dictionary.write_text(scoring.DICTIONARY.read_text())
    new = [
        scoring.NewSkill(name="Dagster", aliases=["dagster cloud"], category="Cloud & DevOps"),
        scoring.NewSkill(name="python", category="Languages"),  # already known (case-insensitive)
        scoring.NewSkill(name="Zzbenchmarkdb", category="Test Section"),  # new section
    ]
    added = scoring.add_skills(new, path=dictionary)
    assert added == ["Dagster", "Zzbenchmarkdb"]
    text = dictionary.read_text()
    cloud = text.split("## Cloud & DevOps")[1].split("## ")[0]
    assert "| Dagster | dagster cloud | yes |" in cloud
    assert "## Test Section" in text and "| Zzbenchmarkdb |  | yes |" in text
    skills = {s.name: s for s in scoring.load_dictionary(dictionary)}
    assert "dagster cloud" in skills["Dagster"].aliases and skills["Zzbenchmarkdb"].category == "Test Section"
    assert scoring.add_skills(new, path=dictionary) == []  # idempotent


def test_diff_resumes_pairs_rewritten_bullets():
    base = resume(
        ["Python", "Java"], ["Built REST APIs serving 20k users", "Cut latency by 90% with Redis"], ["Chatbot"]
    )
    tailored = resume(
        ["Python", "Docker"], ["Built REST APIs in Python serving 20k users", "Mentored two interns"], ["Chatbot"]
    )
    changes = scoring.diff_resumes(base, tailored)
    assert changes.skills_added == ["Docker"] and changes.skills_removed == ["Java"]
    kinds = {c.kind: c for c in changes.bullets}
    assert kinds["rewritten"].before.startswith("Built REST APIs serving")
    assert kinds["added"].after == "Mentored two interns"
    assert kinds["removed"].before.startswith("Cut latency")
    assert changes.unchanged_bullets == 1  # the project bullet


def test_check_pdf_flags_unreadable_pdf():
    from io import BytesIO

    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(612, 792)
    buffer = BytesIO()
    writer.write(buffer)
    check = scoring.check_pdf(buffer.getvalue(), resume(["Python"], ["Built APIs"]), JD, "Engineer")
    assert check.pages == 1 and not check.extractable
    assert check.missing_bullets == ["Built APIs"]


def test_week_start_is_monday(server):
    assert server.week_start("2026-09-16").isoformat() == "2026-09-14"
    assert server.week_start("2026-09-20").isoformat() == "2026-09-14"


def test_mark_job_applied_sets_dates_and_tracker_template_is_valid_yaml(server):
    import yaml

    (server.VAULT / "Jobs" / "Acme - Engineer.md").write_text("---\ncompany: Acme\nstatus: generated\n---\nJD text.\n")
    result = server.mark_job_applied("acme", applied_on="2026-09-16", follow_up_days=5)
    assert (result.status, result.applied_on, result.follow_up) == ("applied", "2026-09-16", "2026-09-21")
    assert server.mark_job_applied("acme", status="interview").applied_on == "2026-09-16"

    tracker = yaml.safe_load(server.md("templates", "job-tracker.base"))
    assert [v["name"] for v in tracker["views"]] == ["Pipeline", "To tailor", "Follow-ups due"]
    clipper = __import__("json").loads(server.md("templates", "web-clipper-job.json"))
    assert clipper["behavior"] == "create" and clipper["path"] == "Jobs"
    assert {p["type"] for p in clipper["properties"]} <= {"text", "multitext", "number", "checkbox", "date", "datetime"}


def test_cover_letter_guardrails_check_length_and_numbers(server):
    base = resume(["Python"], ["Cut API response times by 90% for 30+ tenants"])
    ok = [
        "I build backend platforms and would like to do that at Acme.",
        "At my last company I cut API response times by 90% for 30+ tenants.",
        "I'd love to talk about how that experience fits your team.",
    ]
    assert server.check_cover_letter(ok, base) == []
    invented = [*ok[:2], "I also grew revenue by 45% and led 12 engineers."]
    problems = " ".join(server.check_cover_letter(invented, base))
    assert "45%" in problems and "12" in problems and "90%" not in problems
    assert "paragraphs" in " ".join(server.check_cover_letter(ok[:2], base))
    assert "words" in " ".join(server.check_cover_letter([*ok, "word " * 400], base))
