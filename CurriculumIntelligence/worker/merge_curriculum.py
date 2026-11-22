#!/usr/bin/env python3
"""
Merge Teacher's Guide + Pupil's Book lesson intelligence (stdin JSON → stdout JSON).
"""
from __future__ import annotations

import json
import re
import sys
from typing import Any


def dedupe(items: list[str], limit: int = 24) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in items:
        t = re.sub(r"\s+", " ", (raw or "").strip())
        if len(t) < 3:
            continue
        key = t.lower()[:120]
        if key in seen:
            continue
        seen.add(key)
        out.append(t[:500])
        if len(out) >= limit:
            break
    return out


def merge_lesson(tg: dict[str, Any], pb: dict[str, Any] | None) -> dict[str, Any]:
    tools = dedupe((tg.get("tools") or []) + (pb.get("tools") if pb else []))
    materials = dedupe((tg.get("materials") or []) + (pb.get("materials") if pb else []))
    requirements = dedupe((tg.get("requirements") or []) + (pb.get("requirements") if pb else []))
    objectives = dedupe((tg.get("objectives") or []) + (pb.get("objectives") if pb else []), limit=12)

    tg_teacher = tg.get("teacher_activities") or []
    pb_act = (pb or {}).get("pupil_activities") or (pb or {}).get("activities") or []
    pb_ex = (pb or {}).get("exercises") or []

    merged_corpus_parts = [
        tg.get("body_excerpt") or "",
        (pb or {}).get("body_excerpt") or "",
    ]
    merged_corpus = "\n".join(p for p in merged_corpus_parts if p.strip())[:8000]

    intelligence_notes = []
    if tools:
        intelligence_notes.append("Required tools/resources: " + "; ".join(tools[:8]))
    if requirements:
        intelligence_notes.append("Lesson requirements: " + "; ".join(requirements[:6]))
    if pb_act:
        intelligence_notes.append("Pupil book activities to align with TG: " + "; ".join(pb_act[:4]))
    if pb_ex:
        intelligence_notes.append("Practice from pupil book: " + "; ".join(pb_ex[:4]))

    return {
        "lesson_number": tg.get("lesson_number"),
        "unit_number": tg.get("unit_number"),
        "objectives": objectives,
        "materials": materials,
        "tools": tools,
        "requirements": requirements,
        "teachersGuide": {
            "teacherActivities": dedupe(tg_teacher if isinstance(tg_teacher, list) else [str(tg_teacher)], limit=10),
            "learnerActivities": dedupe(tg.get("learner_activities") or [], limit=10),
            "assessmentHints": dedupe(tg.get("assessment_hints") or [], limit=8),
            "pages": sorted(set(tg.get("source_pages") or [tg.get("source_page")])),
        },
        "pupilsBook": {
            "activities": dedupe(pb_act, limit=12),
            "exercises": dedupe(pb_ex, limit=12),
            "pages": sorted(set((pb or {}).get("source_pages") or [(pb or {}).get("source_page")])),
        }
        if pb
        else None,
        "mergedCorpus": merged_corpus,
        "intelligenceNotes": intelligence_notes,
        "materialsUnified": dedupe(materials + tools, limit=20),
    }


def main() -> None:
    raw = sys.stdin.read()
    data = json.loads(raw)
    tg_lessons = {str(l.get("lesson_number")): l for l in (data.get("teachersGuideLessons") or [])}
    pb_lessons = {str(l.get("lesson_number")): l for l in (data.get("pupilsBookLessons") or [])}

    merged = []
    for num, tg in sorted(tg_lessons.items(), key=lambda x: x[0]):
        pb = pb_lessons.get(num)
        merged.append(merge_lesson(tg, pb))

    # PB-only lessons (TG missing) — surface for admin
    pb_only = [n for n in pb_lessons if n not in tg_lessons]

    out = {
        "engine": "shuleplus-merge-v1",
        "mergedLessons": merged,
        "stats": {
            "tgCount": len(tg_lessons),
            "pbCount": len(pb_lessons),
            "mergedCount": len(merged),
            "pbOnlyLessonNumbers": pb_only[:50],
        },
    }
    sys.stdout.write(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
