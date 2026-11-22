#!/usr/bin/env python3
"""
REB curriculum PDF extraction — TG / PB, units, lessons, materials, tools, objectives.
Output: JSON on stdout for Curriculum Intelligence API.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


def write_json(payload: object) -> None:
    sys.stdout.buffer.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    sys.stdout.buffer.write(b"\n")
    sys.stdout.buffer.flush()


try:
    import fitz  # PyMuPDF
except ImportError:
    write_json(
        {
            "page_count": 0,
            "pages": [],
            "error": "PyMuPDF not installed. Run: pip install pymupdf",
        }
    )
    sys.exit(0)

UNIT_RE = re.compile(r"^\s*UNIT\s+(\d+)\s*:?\s*(.+)$", re.IGNORECASE)
LESSON_RE = re.compile(r"^\s*(\d+\.\d+)\.?\s+(.+)$")
PERIODS_RE = re.compile(r"(\d+)\s*periods?", re.IGNORECASE)
LEADER_DOTS = re.compile(r"\s*\.{2,}.*$")
TRAILING_PAGE = re.compile(r"\s+\d{1,4}\s*$")

SKIP_LESSON_TITLES = re.compile(
    r"^(\d+\.\d+\s*)?(list of lessons|sample lesson|lesson plan template|content map)\b",
    re.IGNORECASE,
)

SECTION_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("objectives", re.compile(r"^(learning\s+)?objectives?\b", re.I)),
    ("materials", re.compile(r"^(teaching\s+and\s+learning\s+)?materials?\b|^resources?\b", re.I)),
    ("tools", re.compile(r"^tools?\b|^equipment\b|^apparatus\b", re.I)),
    ("requirements", re.compile(r"^requirements?\b|^pre[- ]?requisites?\b|^prior\s+knowledge\b", re.I)),
    ("teacher", re.compile(r"^teacher'?s?\s+(activities|actions|roles?)\b|^procedure\b", re.I)),
    ("learner", re.compile(r"^learner'?s?\s+(activities|actions|roles?)\b|^pupils?\b", re.I)),
    ("assessment", re.compile(r"^assessment\b|^evaluation\b|^checking\b", re.I)),
    ("competence", re.compile(r"^key\s+competence\b|^competence\b", re.I)),
    ("cross_cutting", re.compile(r"^cross[- ]cutting\b", re.I)),
    ("activity", re.compile(r"^activity\b|^exercise\b|^practice\b|^task\b", re.I)),
]

BULLET_RE = re.compile(r"^[\u2022\u2023\u25E6\u2043\-–—•]\s*|\(?[a-d]\)\s*|\(?\d+\)\s*", re.I)


def ocr_page(page) -> str:
    try:
        import pytesseract
        from PIL import Image
        import io

        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        return pytesseract.image_to_string(img) or ""
    except Exception:
        return ""


def parse_periods(line: str) -> int | None:
    m = PERIODS_RE.search(line)
    return int(m.group(1)) if m else None


def clean_toc_line(text: str) -> str:
    text = LEADER_DOTS.sub("", text)
    text = TRAILING_PAGE.sub("", text)
    return re.sub(r"\s+", " ", text).strip(" .:\u2012\u2013\u2014-")


def parse_args(argv: list[str]) -> tuple[Path | None, bool, str]:
    use_ocr = "--no-ocr" not in argv
    doc_type = "teachers_guide"
    for a in argv:
        if a.startswith("--doc-type="):
            doc_type = a.split("=", 1)[1].strip().lower()
    paths = [a for a in argv if not a.startswith("--")]
    if not paths:
        return None, use_ocr, doc_type
    return Path(paths[0]), use_ocr, doc_type


def merge_lesson(existing: dict, incoming: dict) -> dict:
    ex_dots = "..." in existing.get("title", "") or "…" in existing.get("title", "")
    in_dots = "..." in incoming.get("title", "") or "…" in incoming.get("title", "")
    if ex_dots and not in_dots:
        return incoming
    if not ex_dots and in_dots:
        return existing
    if incoming.get("source_page", 0) >= existing.get("source_page", 0):
        return incoming
    return existing


def unit_title_score(title: str) -> int:
    t = clean_toc_line(title)
    if len(t) < 4:
        return 0
    score = len(t)
    if re.search(r"[A-Z]{3,}", t):
        score += 20
    if re.search(r"\d", t):
        score += 5
    return score


def merge_unit(existing: dict, incoming: dict) -> dict:
    ex_score = unit_title_score(existing.get("title", ""))
    in_score = unit_title_score(incoming.get("title", ""))
    if in_score > ex_score:
        return {
            **existing,
            "title": clean_toc_line(incoming["title"]),
            "source_page_start": min(
                existing.get("source_page_start", 9999),
                incoming.get("source_page_start", 9999),
            ),
        }
    return existing


def normalize_bullet_line(line: str) -> str:
    line = BULLET_RE.sub("", line.strip())
    return re.sub(r"\s+", " ", line).strip()


def is_objective_line(line: str) -> bool:
    low = line.lower()
    if len(line) < 12:
        return False
    return bool(
        re.search(
            r"\b(should be able|learners will|by the end|identify|describe|explain|demonstrate|compare|solve|use)\b",
            low,
        )
    )


def parse_sections_from_text(text: str, document_type: str) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {
        "objectives": [],
        "materials": [],
        "tools": [],
        "requirements": [],
        "teacher_activities": [],
        "learner_activities": [],
        "assessment_hints": [],
        "activities": [],
        "exercises": [],
        "key_competence": [],
        "cross_cutting": [],
    }
    current: str | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or len(line) < 3:
            continue
        if re.fullmatch(r"[ivxlcIVXLC]+|\d+", line):
            continue

        matched_section = None
        for key, pat in SECTION_PATTERNS:
            if pat.match(line):
                matched_section = key
                rest = pat.sub("", line).strip(" :.-")
                if rest and len(rest) > 8:
                    if key == "objectives":
                        buckets["objectives"].append(normalize_bullet_line(rest))
                    elif key == "competence":
                        buckets["key_competence"].append(normalize_bullet_line(rest))
                    elif key == "activity":
                        buckets["activities"].append(normalize_bullet_line(rest))
                break

        if matched_section:
            if matched_section == "teacher":
                current = "teacher_activities"
            elif matched_section == "learner":
                current = "learner_activities"
            elif matched_section == "objectives":
                current = "objectives"
            elif matched_section == "materials":
                current = "materials"
            elif matched_section == "tools":
                current = "tools"
            elif matched_section == "requirements":
                current = "requirements"
            elif matched_section == "assessment":
                current = "assessment_hints"
            elif matched_section == "competence":
                current = "key_competence"
            elif matched_section == "cross_cutting":
                current = "cross_cutting"
            elif matched_section == "activity":
                current = "activities"
            continue

        cleaned = normalize_bullet_line(line)
        if len(cleaned) < 8:
            continue

        if current and current in buckets:
            buckets[current].append(cleaned)
        elif is_objective_line(cleaned):
            buckets["objectives"].append(cleaned)
        elif document_type == "pupils_book":
            low = cleaned.lower()
            if "exercise" in low or "answer" in low or re.match(r"^\d+\.", cleaned):
                buckets["exercises"].append(cleaned)
            elif "activity" in low or "work in" in low or "discuss" in low:
                buckets["activities"].append(cleaned)

    for k in buckets:
        seen: set[str] = set()
        uniq: list[str] = []
        for item in buckets[k]:
            key = item.lower()[:100]
            if key in seen:
                continue
            seen.add(key)
            uniq.append(item[:600])
        buckets[k] = uniq[:20]
    return buckets


def collect_page_range_text(pages: list[dict], start: int, end: int) -> str:
    parts: list[str] = []
    for p in pages:
        n = p["page_number"]
        if n < start or n > end:
            continue
        t = (p.get("text") or "").strip()
        if t:
            parts.append(t)
    return "\n".join(parts)


def enrich_lessons_and_units(
    pages: list[dict],
    proposed_units: list[dict],
    proposed_lessons: list[dict],
    document_type: str,
) -> tuple[list[dict], list[dict]]:
    if not proposed_lessons:
        return proposed_units, proposed_lessons

    sorted_lessons = sorted(
        proposed_lessons,
        key=lambda l: (int(l["unit_number"]), l["lesson_number"]),
    )
    page_count = len(pages) or max(p["page_number"] for p in pages) if pages else 0

    for i, lesson in enumerate(sorted_lessons):
        start = int(lesson.get("source_page") or 1)
        if i + 1 < len(sorted_lessons):
            next_start = int(sorted_lessons[i + 1].get("source_page") or start)
            end = max(start, next_start - 1)
        else:
            end = min(page_count, start + 12) if page_count else start + 12

        body = collect_page_range_text(pages, start, end)
        sections = parse_sections_from_text(body, document_type)

        lesson["source_page_end"] = end
        lesson["source_pages"] = list(range(start, end + 1))
        lesson["body_excerpt"] = body[:6000]
        lesson["objectives"] = sections["objectives"]
        lesson["materials"] = sections["materials"]
        lesson["tools"] = sections["tools"]
        lesson["requirements"] = sections["requirements"]
        lesson["teacher_activities"] = sections["teacher_activities"]
        lesson["learner_activities"] = sections["learner_activities"]
        lesson["assessment_hints"] = sections["assessment_hints"]
        if document_type == "pupils_book":
            lesson["pupil_activities"] = sections["activities"]
            lesson["activities"] = sections["activities"]
            lesson["exercises"] = sections["exercises"]

    units_by_num = {u["unit_number"]: dict(u) for u in proposed_units}
    for lesson in sorted_lessons:
        un = lesson["unit_number"]
        if un not in units_by_num:
            units_by_num[un] = {
                "unit_number": un,
                "title": f"Unit {un}",
                "source_page_start": lesson.get("source_page"),
            }
        unit = units_by_num[un]
        start_u = int(unit.get("source_page_start") or lesson.get("source_page") or 1)
        unit_lessons = [l for l in sorted_lessons if l["unit_number"] == un]
        end_u = max(int(l.get("source_page_end") or l.get("source_page") or start_u) for l in unit_lessons)
        unit_body = collect_page_range_text(pages, start_u, min(end_u + 2, page_count or end_u + 2))
        u_sections = parse_sections_from_text(unit_body, document_type)
        if u_sections["key_competence"]:
            unit["key_competence"] = " ".join(u_sections["key_competence"])[:1200]
        if u_sections["materials"]:
            unit["unit_materials"] = u_sections["materials"]
        if u_sections["tools"]:
            unit["unit_tools"] = u_sections["tools"]
        if u_sections["requirements"]:
            unit["unit_requirements"] = u_sections["requirements"]
        unit["source_page_end"] = end_u

    return list(units_by_num.values()), sorted_lessons


def extract(pdf_path: str, use_ocr: bool = True, document_type: str = "teachers_guide") -> dict:
    doc = fitz.open(pdf_path)
    pages = []
    units_by_num: dict[str, dict] = {}
    lessons_by_key: dict[tuple[str, str], dict] = {}
    ocr_pages = 0

    for i in range(len(doc)):
        page = doc.load_page(i)
        text = page.get_text("text") or ""
        text_len = len(text.strip())
        is_scanned = text_len < 40
        ocr_text = ""

        if is_scanned and use_ocr:
            ocr_text = ocr_page(page)
            if len(ocr_text.strip()) > text_len:
                text = ocr_text
                ocr_pages += 1
                is_scanned = len(text.strip()) < 40

        text_len = len(text.strip())
        confidence = 0.35 if is_scanned else min(0.98, 0.55 + text_len / 2500)
        if ocr_text and not is_scanned:
            confidence = min(confidence, 0.75)

        pages.append(
            {
                "page_number": i + 1,
                "text": text,
                "is_scanned": is_scanned,
                "ocr_applied": bool(ocr_text),
                "confidence": round(confidence, 3),
            }
        )

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or len(line) < 4:
                continue
            if re.fullmatch(r"[ivxlcIVXLC]+", line):
                continue

            um = UNIT_RE.match(line)
            if um:
                num = um.group(1)
                raw_title = um.group(2).strip()
                title = clean_toc_line(raw_title) or f"Unit {num}"
                if unit_title_score(title) < 8:
                    continue
                entry = {
                    "unit_number": num,
                    "title": title,
                    "source_page_start": i + 1,
                }
                if num in units_by_num:
                    units_by_num[num] = merge_unit(units_by_num[num], entry)
                else:
                    units_by_num[num] = entry
                continue

            lm = LESSON_RE.match(line)
            if not lm:
                continue

            lesson_number = lm.group(1)
            unit_num = lesson_number.split(".")[0]
            raw_title = lm.group(2).strip()
            title = clean_toc_line(raw_title)
            if len(title) < 3:
                continue
            if SKIP_LESSON_TITLES.search(title):
                continue

            periods = parse_periods(title) or parse_periods(line)
            title = re.sub(r"\s*\(?\d+\s*periods?\)?", "", title, flags=re.IGNORECASE).strip()
            entry = {
                "unit_number": unit_num,
                "lesson_number": lesson_number,
                "title": title or lesson_number,
                "source_page": i + 1,
                "suggested_periods": periods,
            }
            key = (unit_num, lesson_number)
            if key in lessons_by_key:
                lessons_by_key[key] = merge_lesson(lessons_by_key[key], entry)
            else:
                lessons_by_key[key] = entry

    doc.close()

    for (unit_num, _), lesson in lessons_by_key.items():
        if unit_num not in units_by_num:
            units_by_num[unit_num] = {
                "unit_number": unit_num,
                "title": f"Unit {unit_num} (verify title in PDF)",
                "source_page_start": lesson["source_page"],
            }

    proposed_units = sorted(units_by_num.values(), key=lambda u: int(u["unit_number"]))
    proposed_lessons = sorted(
        lessons_by_key.values(),
        key=lambda l: (int(l["unit_number"]), l["lesson_number"]),
    )

    proposed_units, proposed_lessons = enrich_lessons_and_units(
        pages, proposed_units, proposed_lessons, document_type
    )

    return {
        "page_count": len(pages),
        "pages": pages,
        "document_type": document_type,
        "proposed_units": proposed_units,
        "proposed_lessons": proposed_lessons,
        "ocr_pages": ocr_pages,
        "extraction_engine": "shuleplus-extract-v2",
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except (OSError, ValueError):
            pass

    path, use_ocr, doc_type = parse_args(sys.argv[1:])
    if not path:
        write_json(
            {
                "page_count": 0,
                "pages": [],
                "error": "Usage: extract_pdf.py <file.pdf> [--no-ocr] [--doc-type=teachers_guide|pupils_book]",
            }
        )
        sys.exit(1)

    if not path.is_file():
        write_json({"page_count": 0, "pages": [], "error": f"File not found: {path}"})
        sys.exit(1)

    result = extract(str(path), use_ocr=use_ocr, document_type=doc_type)

    sidecar = path.with_name(path.name + ".extract.json")
    sidecar.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    write_json(
        {
            "page_count": result["page_count"],
            "pages_file": str(sidecar.resolve()),
            "document_type": doc_type,
            "proposed_units": result.get("proposed_units", []),
            "proposed_lessons": result.get("proposed_lessons", []),
            "ocr_pages": result.get("ocr_pages", 0),
            "extraction_engine": result.get("extraction_engine"),
        }
    )


if __name__ == "__main__":
    main()
