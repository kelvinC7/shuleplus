#!/usr/bin/env python3
"""
Rule-based REB lesson plan builder from TG + PB structured intelligence.
No cloud LLM — stdin JSON → stdout JSON (UTF-8).
"""
from __future__ import annotations

import json
import re
import sys
from typing import Any

STAGE_KEYS = [
    "introduction",
    "discovery",
    "presentation",
    "exploitation",
    "summary",
    "assessment",
]


def read_input() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        if len(sys.argv) > 1:
            with open(sys.argv[1], encoding="utf-8") as f:
                raw = f.read()
        else:
            raise ValueError("No input JSON")
    return json.loads(raw)


def sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if len(p.strip()) > 20]


def lines_matching(corpus: str, patterns: list[str], limit: int = 6) -> list[str]:
    found: list[str] = []
    for line in corpus.splitlines():
        line = line.strip()
        if len(line) < 15:
            continue
        low = line.lower()
        for pat in patterns:
            if pat in low:
                found.append(line[:500])
                break
        if len(found) >= limit:
            break
    return found


def list_from_structured(structured: dict[str, Any], key: str, limit: int = 8) -> list[str]:
    val = structured.get(key)
    if not val:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip()][:limit]
    return [str(val).strip()] if str(val).strip() else []


def build_instructional_objective(objectives: list[str], lesson_title: str) -> str:
    if objectives:
        parts = [o.strip().rstrip(".") for o in objectives if o.strip()]
        return "By the end of the lesson, learners should be able to: " + "; ".join(parts) + "."
    return (
        f'By the end of the lesson, learners should achieve the outcomes for "{lesson_title}" '
        "as set out in the Teacher's Guide and Pupil's Book."
    )


def pick_teacher_text(
    corpus: str,
    stage: str,
    lesson_title: str,
    minutes: int,
    structured: dict[str, Any],
) -> str:
    tg_lines = list_from_structured(structured, "teacherActivities", 6)
    if isinstance(structured.get("teacherActivities"), list):
        tg_lines = [str(x) for x in structured["teacherActivities"]][:6]

    stage_patterns: dict[str, list[str]] = {
        "introduction": ["introduc", "recap", "prior", "revise", "warm", "begin", "start the lesson"],
        "discovery": ["discover", "explore", "investigate", "group", "activity", "task", "guide learners"],
        "presentation": ["present", "share", "groups report", "explain", "demonstrate", "display"],
        "exploitation": ["practice", "exercise", "apply", "pairs", "work in", "complete", "consolidat"],
        "summary": ["summar", "conclud", "recap", "review", "exit", "reflect"],
        "assessment": ["assess", "evaluat", "question", "check", "mark", "test", "homework"],
    }

    hits = lines_matching(corpus, stage_patterns.get(stage, ["teacher", "learners"]), limit=4)
    if tg_lines and stage in ("discovery", "exploitation", "introduction"):
        hits = tg_lines[:3] + hits

    tools = list_from_structured(structured, "tools", 5)
    reqs = list_from_structured(structured, "requirements", 4)
    prefix = ""
    if stage == "introduction" and (tools or reqs):
        bits = []
        if tools:
            bits.append("Confirm tools/materials: " + ", ".join(tools[:6]))
        if reqs:
            bits.append("Requirements: " + "; ".join(reqs[:3]))
        prefix = " ".join(bits) + " "

    if hits:
        body = "\n".join(f"• {h}" for h in hits)
        return f"({minutes} min)\n{prefix}{body}".strip()[:1400]

    templates = {
        "introduction": f"Introduce today's lesson on {lesson_title}. Activate prior knowledge and state learning expectations from the Teacher's Guide.",
        "discovery": f"Facilitate the main discovery activity for {lesson_title}. Use guide questions and group work as described in the Teacher's Guide.",
        "presentation": "Invite groups to present findings. Facilitate comparison of strategies and respectful peer feedback.",
        "exploitation": f"Guide guided practice on {lesson_title}. Support learners who need help and extend those who finish early.",
        "summary": "Lead a short recap. Ask learners to state key ideas learned and one question still open.",
        "assessment": f"Use oral or written checks aligned to {lesson_title} and the lesson objectives.",
    }
    return f"({minutes} min) {prefix}{templates.get(stage, 'Follow the Teacher\'s Guide.')}"[:900]


def pick_learner_text(corpus: str, stage: str, structured: dict[str, Any]) -> str:
    learner_lines = list_from_structured(structured, "learnerActivities", 5)
    pb_act = list_from_structured(structured, "pupilActivities", 4)
    pb_ex = list_from_structured(structured, "pupilExercises", 4)

    hits = lines_matching(
        corpus,
        ["learners ", "students ", "pupils ", "in pairs", "in groups", "work in", "discuss", "answer"],
        limit=3,
    )
    if learner_lines:
        hits = learner_lines[:3] + hits
    if stage in ("discovery", "exploitation") and pb_act:
        hits = pb_act[:2] + hits
    if stage == "assessment" and pb_ex:
        hits = pb_ex[:2] + hits

    if hits:
        return "\n".join(f"• {h}" for h in hits)[:900]
    defaults = {
        "introduction": "Respond to opening questions and agree on the lesson focus.",
        "discovery": "Work in pairs or groups, explore the task, and prepare to share.",
        "presentation": "Present group work and listen to other groups.",
        "exploitation": "Complete practice in exercise books and compare with partners.",
        "summary": "Summarise learning and update notes.",
        "assessment": "Answer assessment tasks as directed by the teacher.",
    }
    return defaults.get(stage, "Participate actively as guided by the teacher.")


def extract_materials(corpus: str, structured: dict[str, Any], fallback: str) -> str:
    mats = list_from_structured(structured, "materials", 12)
    tools = list_from_structured(structured, "tools", 12)
    combined = dedupe_str(mats + tools)
    if combined:
        return "; ".join(combined)[:800]

    hits = lines_matching(
        corpus,
        ["material", "resource", "equipment", "bring", "prepare", "you need", "tools"],
        limit=5,
    )
    if hits:
        return "; ".join(hits)[:600]
    return fallback or "Exercise books, pencils, and materials listed in the Teacher's Guide."


def dedupe_str(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        k = x.lower()[:80]
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    return out


def build_assessment_questions(objectives: list[str], lesson_title: str, structured: dict[str, Any]) -> list[str]:
    notes = list_from_structured(structured, "intelligenceNotes", 3)
    pb_ex = list_from_structured(structured, "pupilExercises", 3)
    if objectives:
        qs = [f"Demonstrate: {o.strip().rstrip('.')}" for o in objectives[:5]]
        if pb_ex:
            qs.append(f"Pupil book practice: {pb_ex[0][:200]}")
        return qs
    qs = [
        f"Explain the main idea of {lesson_title} in your own words.",
        "Complete one practice task from the lesson activity.",
        "Answer a short check question from the teacher.",
    ]
    if pb_ex:
        qs[1] = pb_ex[0][:220]
    if notes:
        qs.append(notes[0][:220])
    return qs


def build_intelligence_summary(structured: dict[str, Any], has_pb: bool) -> str:
    parts: list[str] = []
    if structured.get("tools"):
        parts.append("Tools: " + ", ".join(structured["tools"][:8]))
    if structured.get("requirements"):
        parts.append("Requirements: " + "; ".join(structured["requirements"][:4]))
    if has_pb:
        parts.append("Lesson plan aligned with Teacher's Guide + Pupil's Book.")
    return " | ".join(parts)[:500]


def main() -> None:
    data = read_input()
    lesson = data.get("lesson") or {}
    book = data.get("book") or {}
    unit = data.get("unit") or {}
    objectives = data.get("objectives") or []
    corpus = str(data.get("corpus") or "")
    structured = data.get("structured") or {}
    duration = int(data.get("durationMinutes") or 40)
    stage_minutes: dict[str, int] = data.get("stageMinutes") or {}
    materials_in = str(data.get("materialsHint") or "")
    has_pb = bool(data.get("companionBookId"))

    lesson_title = str(lesson.get("title") or "the lesson")
    subject = str(book.get("subject") or "")
    grade = str(book.get("grade") or "")

    instructional_objective = build_instructional_objective(objectives, lesson_title)
    learning_materials = extract_materials(corpus, structured, materials_in)
    intelligence_summary = build_intelligence_summary(structured, has_pb)

    stages = []
    for key in STAGE_KEYS:
        mins = int(stage_minutes.get(key) or max(1, duration // len(STAGE_KEYS)))
        title_map = {
            "introduction": "Introduction",
            "discovery": "Lesson Development — Discovery Activity",
            "presentation": "Presentation of Learners’ Productions",
            "exploitation": "Exploitation of Learners’ Productions",
            "summary": "Summary / Conclusion",
            "assessment": "Assessment",
        }
        stages.append(
            {
                "key": key,
                "title": title_map[key],
                "minutes": mins,
                "teacherActivities": pick_teacher_text(corpus, key, lesson_title, mins, structured),
                "learnerActivities": pick_learner_text(corpus, key, structured),
                "genericCompetences": "Critical thinking, communication, and collaboration.",
                "crossCuttingIssues": "Gender education and inclusive participation."
                if key != "summary"
                else "",
            }
        )

    questions = build_assessment_questions(objectives, lesson_title, structured)

    out = {
        "engine": "shuleplus-python-v2",
        "instructionalObjective": instructional_objective,
        "learningMaterials": learning_materials,
        "intelligenceSummary": intelligence_summary,
        "stages": stages,
        "assessmentQuestions": questions,
        "homework": [
            f"Review today's lesson on {lesson_title} using the Teacher's Guide and Pupil's Book.",
            "Complete any unfinished exercises from class.",
        ],
        "meta": {
            "subject": subject,
            "grade": grade,
            "unitNumber": unit.get("unitNumber"),
            "corpusChars": len(corpus),
            "objectiveCount": len(objectives),
            "hasPupilsBook": has_pb,
            "toolCount": len(structured.get("tools") or []),
        },
    }
    sys.stdout.write(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc) + "\n")
        sys.exit(1)
