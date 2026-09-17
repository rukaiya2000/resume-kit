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
    assert len(skills) == 90
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
