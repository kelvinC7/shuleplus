"""
ST MATTHEWS TYAZO: compare LIST 2027 class lists with photo lists
(NURSERY, LOWER PRIMARY, UPPER PRIMARY) and photo/ folder.
Produces GASHONGA-style workbooks plus per-class status files.

Usage:
  python build_list_2027_photo_status.py
"""

from __future__ import annotations

import difflib
import re
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
SCHOOL = "ST MATTHEWS TYAZO"
PHOTO_ID_MIN = 1800
PHOTO_ID_MAX = 4000
USE_FUZZY_MATCH = False
FUZZY_AUTO_THRESHOLD = 0.93
FUZZY_REVIEW_MIN = 0.88

SECTIONS = ("NURSERY", "LOWER PRIMARY", "UPPER PRIMARY")
LIST_2027_SKIP_DIR_NAMES = {
    "Photo Status by Class (2027)",
    "Photo Status by Class",
    "LIST 2027 with photo_id",
}
LIST_2027_SKIP_STEM_PARTS = (
    "upload photo_id",
    "upload manifest",
    "photo status",
)
SKIP_TOKENS = {
    "NO",
    "NAMES",
    "N0",
    "NO.",
    "GENDER",
    "PHOT_ID",
    "PHOTO_ID",
    "NEW",
    "MALE",
    "FEMALE",
    "STATUS",
    "NEWCOMER",
}


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", str(name).upper().strip())


def read_excel_safe(path: Path, sheet: str) -> pd.DataFrame:
    try:
        return pd.read_excel(path, sheet_name=sheet, header=None, engine="openpyxl")
    except Exception:
        return pd.read_excel(path, sheet_name=sheet, header=None, engine="calamine")


def excel_sheet_names(path: Path) -> list[str]:
    try:
        return pd.ExcelFile(path, engine="openpyxl").sheet_names
    except Exception:
        return pd.ExcelFile(path, engine="calamine").sheet_names


def is_banner_row(values: list) -> bool:
    text = " ".join(str(v) for v in values if isinstance(v, str)).upper()
    if not text.strip():
        return False
    banners = (
        "ST MATTHEWS",
        "ANGLICAN CHURCH",
        "P.O.BOX",
        "EMAIL:",
        "DISTRICT:",
        "TWITTER:",
        "TEL:",
    )
    return any(b in text for b in banners)


def is_header_row(values: list) -> bool:
    upper = " ".join(str(v) for v in values if isinstance(v, str)).upper()
    if "NAMES" in upper and ("NO" in upper or "GENDER" in upper):
        return True
    for v in values:
        if isinstance(v, str) and re.search(r"PHOT[_O]?ID", v.upper()):
            return True
    return False


def is_class_title_row(values: list) -> str | None:
    if len(values) != 1 and not (len(values) <= 2 and isinstance(values[0], str)):
        return None
    text = str(values[0] if len(values) == 1 else values[0]).upper()
    text = re.sub(r"\s+", " ", text.strip())
    if is_banner_row([text]):
        return None

    patterns = [
        r"^(P[1-6])\s+(JUPITER|MARS|PLUTO|NEPTUNE)\b",
        r"^PRIMARY\s+(ONE|TWO|THREE|FOUR|FIVE|SIX)\s+(JUPITER|MARS|PLUTO|NEPTUNE)\b",
        r"^(BABY CLASS|MIDDLE CLASS|TOP CLASS)\b",
        r"^(N[123])\b",
    ]
    word_to_p = {
        "ONE": "P1",
        "TWO": "P2",
        "THREE": "P3",
        "FOUR": "P4",
        "FIVE": "P5",
        "SIX": "P6",
    }
    m = re.search(r"^(P[1-6])\s+(JUPITER|MARS|PLUTO|NEPTUNE)", text)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    m = re.search(r"^PRIMARY\s+(ONE|TWO|THREE|FOUR|FIVE|SIX)\s+(JUPITER|MARS|PLUTO|NEPTUNE)", text)
    if m:
        return f"{word_to_p[m.group(1)]} {m.group(2)}"
    if "BABY CLASS" in text:
        return "BABY CLASS"
    if "MIDDLE CLASS" in text or "NURSERY TWO" in text:
        return "MIDDLE CLASS"
    if "TOP CLASS" in text or "N3" in text:
        return "TOP CLASS"
    return None


def class_key_from_filename(path: Path) -> str | None:
    stem = path.stem.upper()
    stem = re.sub(r"\s+", " ", stem)
    m = re.search(r"^(P[1-6])\s+(JUPITER|MARS|PLUTO|NEPTUNE)", stem)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    if "BABY CLASS" in stem:
        return "BABY CLASS"
    if stem in {"MIDDLE CLASS", "MIDDLE  CLASS"} or stem.startswith("MIDDLE CLASS"):
        return "MIDDLE CLASS"
    if stem in {"TOP CLASS"} or stem.startswith("TOP CLASS"):
        return "TOP CLASS"
    if "PRIMARY SIX" in stem or "P6" in stem:
        return "P6"
    if stem.startswith("P4 LIST"):
        return "P4"
    if stem.startswith("P5 LIST"):
        return "P5"
    return None


def class_key_from_list_context(filename: str, sheet_name: str, title_hint: str | None) -> str:
    if title_hint:
        return title_hint
    file_key = class_key_from_filename(Path(filename))
    sh = sheet_name.upper().replace("_", " ").strip()
    sh = re.sub(r"\s+", " ", sh)

    m = re.search(r"^(P[1-6])\s*(JUPITER|MARS|PLUTO|NEPTUNE)", sh)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    m = re.search(r"^P([1-6])(JUPITER|MARS|PLUTO|NEPTUNE)", sh.replace(" ", ""))
    if m:
        return f"P{m.group(1)} {m.group(2)}"

    if sh in {"JUPITER", "MARS", "PLUTO", "NEPTUNE"}:
        if file_key == "P6" or "PRIMARY SIX" in filename.upper():
            return f"P6 {sh}"
        if file_key == "P5" or "P5 LIST" in filename.upper():
            return f"P5 {sh}"

    if file_key and file_key not in {"P4", "P5", "P6"}:
        return file_key
    if file_key == "P4" and sh.startswith("P4"):
        return sh.replace("  ", " ")
    return file_key or sh or "Unknown"


def parse_student_row(values: list) -> dict | None:
    if is_header_row(values) or is_banner_row(values):
        return None

    number = None
    photo_id = None
    gender = None
    name_candidates: list[str] = []

    for value in values:
        if isinstance(value, (int, float)):
            v = float(value)
            if v.is_integer():
                iv = int(v)
                if PHOTO_ID_MIN <= iv <= PHOTO_ID_MAX:
                    photo_id = iv
                elif 0 < iv < 500:
                    number = iv
        elif isinstance(value, str):
            text = value.strip()
            if not text:
                continue
            upper = text.upper()
            if upper in SKIP_TOKENS:
                continue
            if upper in {"MALE", "FEMALE"}:
                gender = upper.title()
                continue
            if is_header_row([text]) or is_banner_row([text]):
                continue
            if text.replace(".", "").replace(",", "").isdigit():
                continue
            if "NAMES" in upper and ("202" in upper or "CLASS" in upper):
                continue
            name_candidates.append(text)

    if not name_candidates:
        return None
    name = max(name_candidates, key=len)
    if len(name) < 3:
        return None

    return {
        "number": number,
        "name": name,
        "gender": gender,
        "photo_id": photo_id,
    }


def resolve_photo_lists_root(school_dir: Path) -> Path:
    """class lists with photoes/ or nested class lists with photoes/class lists with photoes/."""
    root = school_dir / "class lists with photoes"
    if not root.is_dir():
        return root

    def section_has_xlsx(base: Path) -> bool:
        for section in SECTIONS:
            section_dir = base / section
            if section_dir.is_dir() and any(section_dir.glob("*.xlsx")):
                return True
        return False

    if section_has_xlsx(root):
        return root
    nested = root / "class lists with photoes"
    if nested.is_dir() and section_has_xlsx(nested):
        return nested
    return root


def resolve_list_2027_root(school_dir: Path) -> Path | None:
    base = school_dir / "LIST 2027"
    return base if base.is_dir() else None


def iter_list_2027_workbooks(school_dir: Path) -> list[Path]:
    """All LIST 2027 class workbooks (flat, nested LIST 2027/, or per-class subfolders)."""
    base = resolve_list_2027_root(school_dir)
    if not base:
        return []

    def is_source_workbook(path: Path) -> bool:
        if path.name.startswith("~$"):
            return False
        stem_lower = path.stem.lower()
        if "with photo_id" in stem_lower:
            return False
        if any(part in stem_lower for part in LIST_2027_SKIP_STEM_PARTS):
            return False
        if any(part in LIST_2027_SKIP_DIR_NAMES for part in path.parts):
            return False
        return True

    direct = sorted(p for p in base.glob("*.xlsx") if is_source_workbook(p))
    if direct:
        return direct

    nested = base / "LIST 2027"
    nested_files = sorted(p for p in nested.glob("*.xlsx") if nested.is_dir() and is_source_workbook(p))
    if nested_files:
        return nested_files

    deep = sorted(p for p in base.rglob("*.xlsx") if is_source_workbook(p))
    return deep


def load_photos_on_disk(photo_dir: Path) -> set[int]:
    ids: set[int] = set()
    if not photo_dir.is_dir():
        return ids
    for path in photo_dir.iterdir():
        if path.is_file():
            m = re.match(r"^2L7A(\d+)$", path.stem, re.I)
            if m:
                ids.add(int(m.group(1)))
    return ids


def iter_workbook_rows(path: Path):
    for sheet in excel_sheet_names(path):
        df = read_excel_safe(path, sheet)
        title_hint: str | None = None
        for _, row in df.iterrows():
            values = [row[c] for c in df.columns if pd.notna(row[c])]
            if not values:
                continue
            title = is_class_title_row(values)
            if title:
                title_hint = title
                continue
            if is_header_row(values):
                continue
            student = parse_student_row(values)
            if student:
                yield sheet, title_hint, student


def load_photo_list_registry(school_dir: Path) -> tuple[list[dict], dict[tuple[str, str], dict], dict[str, dict]]:
    """All students from NURSERY / LOWER / UPPER photo workbooks."""
    records: list[dict] = []
    by_class_name: dict[tuple[str, str], dict] = {}
    by_name: dict[str, dict] = {}

    root = resolve_photo_lists_root(school_dir)
    for section in SECTIONS:
        section_dir = root / section
        if not section_dir.is_dir():
            continue
        for path in sorted(p for p in section_dir.glob("*.xlsx") if not p.name.startswith("~$")):
            file_class = class_key_from_filename(path)
            for sheet, title_hint, student in iter_workbook_rows(path):
                class_key = class_key_from_list_context(path.name, sheet, title_hint or file_class)
                pid = student["photo_id"]
                if pid is None:
                    continue
                name_key = normalize_name(student["name"])
                rec = {
                    "section": section,
                    "class_key": class_key,
                    "number": student.get("number"),
                    "name": student["name"],
                    "gender": student.get("gender") or "",
                    "photo_id": pid,
                    "photo_file": f"2L7A{pid}.JPG",
                    "source_file": f"{section}/{path.name}",
                    "sheet": sheet,
                }
                records.append(rec)
                by_class_name[(class_key, name_key)] = rec
                by_name[name_key] = rec

    return records, by_class_name, by_name


def load_list_2027_students(school_dir: Path) -> list[dict]:
    list_root = resolve_list_2027_root(school_dir)
    students: list[dict] = []
    if not list_root:
        return students

    for path in iter_list_2027_workbooks(school_dir):
        try:
            list_rel = path.relative_to(list_root).as_posix()
        except ValueError:
            list_rel = path.name
        file_class = class_key_from_filename(path)
        for sheet, title_hint, student in iter_workbook_rows(path):
            class_key = class_key_from_list_context(path.name, sheet, title_hint or file_class)
            students.append(
                {
                    "class_2026_2027": class_key,
                    "list_file": path.name,
                    "list_rel": list_rel,
                    "sheet": sheet,
                    "number": student.get("number"),
                    "name": student["name"],
                    "gender": student.get("gender") or "",
                    "name_key": normalize_name(student["name"]),
                    "photo_id_in_row": student.get("photo_id"),
                }
            )
    return students


def fuzzy_find_prior_name(
    name_key: str,
    by_name: dict[str, dict],
) -> tuple[dict | None, float, str | None]:
    """Match LIST 2027 name to 2025-2026 photo list when spelling differs slightly."""
    keys = list(by_name.keys())
    if not keys:
        return None, 0.0, None

    scored: list[tuple[float, str]] = []
    for pk in keys:
        score = difflib.SequenceMatcher(None, name_key, pk).ratio()
        if score >= FUZZY_REVIEW_MIN:
            scored.append((score, pk))

    if not scored:
        return None, 0.0, None

    scored.sort(reverse=True)
    best_score, best_key = scored[0]
    runners = [s for s in scored if s[0] >= best_score - 0.01]
    if len(runners) > 1:
        return None, best_score, best_key

    return by_name[best_key], best_score, best_key


def match_student_to_prior_year(
    student: dict,
    by_class_name: dict[tuple[str, str], dict],
    by_name: dict[str, dict],
) -> dict:
    """Carry photo_id from 2025-2026 (class lists with photoes) onto LIST 2027 student."""
    base = {
        **student,
        "photo_id": None,
        "match_type": "none",
        "match_score": "",
        "name_in_2025_2026": "",
        "class_in_photo_list": "",
        "section_2025_2026": "",
        "photo_id_source": "",
        "suggested_photo_id": "",
    }

    if student.get("photo_id_in_row"):
        base.update(
            {
                "photo_id": student["photo_id_in_row"],
                "match_type": "list_2027_row",
                "photo_id_source": "LIST 2027 row",
                "name_in_2025_2026": student["name"],
                "class_in_photo_list": "",
                "section_2025_2026": "",
            }
        )
        return base

    class_key = student["class_2026_2027"]
    name_key = student["name_key"]

    hit = by_class_name.get((class_key, name_key))
    if hit:
        base.update(
            {
                "photo_id": hit["photo_id"],
                "match_type": "exact_same_name_same_class",
                "match_score": 100,
                "photo_id_source": hit["source_file"],
                "name_in_2025_2026": hit["name"],
                "class_in_photo_list": hit["class_key"],
                "section_2025_2026": hit["section"],
            }
        )
        return base

    for (ck, nk), rec in by_class_name.items():
        if nk == name_key and ck.replace(" ", "") == class_key.replace(" ", ""):
            base.update(
                {
                    "photo_id": rec["photo_id"],
                    "match_type": "exact_same_name_same_class",
                    "match_score": 100,
                    "photo_id_source": rec["source_file"],
                    "name_in_2025_2026": rec["name"],
                    "class_in_photo_list": rec["class_key"],
                    "section_2025_2026": rec["section"],
                }
            )
            return base

    hit = by_name.get(name_key)
    if hit:
        base.update(
            {
                "photo_id": hit["photo_id"],
                "match_type": "exact_same_name",
                "match_score": 100,
                "photo_id_source": hit["source_file"],
                "name_in_2025_2026": hit["name"],
                "class_in_photo_list": hit["class_key"],
                "section_2025_2026": hit["section"],
            }
        )
        return base

    if USE_FUZZY_MATCH:
        rec, score, matched_key = fuzzy_find_prior_name(name_key, by_name)
        if rec and score >= FUZZY_AUTO_THRESHOLD:
            base.update(
                {
                    "photo_id": rec["photo_id"],
                    "match_type": "fuzzy_same_person",
                    "match_score": round(score * 100, 1),
                    "photo_id_source": rec["source_file"],
                    "name_in_2025_2026": rec["name"],
                    "class_in_photo_list": rec["class_key"],
                    "section_2025_2026": rec["section"],
                }
            )
            return base

        if rec and score >= FUZZY_REVIEW_MIN:
            base.update(
                {
                    "match_type": "fuzzy_needs_review",
                    "match_score": round(score * 100, 1),
                    "photo_id_source": rec["source_file"],
                    "name_in_2025_2026": rec["name"],
                    "class_in_photo_list": rec["class_key"],
                    "section_2025_2026": rec["section"],
                    "suggested_photo_id": rec["photo_id"],
                }
            )
    return base


def enrich_image_status(rows: list[dict], photos_on_disk: set[int]) -> None:
    for row in rows:
        pid = row.get("photo_id")
        if pid:
            row["photo_file"] = f"2L7A{pid}.JPG"
            row["has_photo_id"] = "Y"
            row["has_image"] = "Y" if pid in photos_on_disk else "N"
        else:
            row["photo_file"] = ""
            row["has_photo_id"] = "N"
            row["has_image"] = "N"


def class_sort_key(name: str) -> tuple:
    order = [
        "BABY CLASS",
        "MIDDLE CLASS",
        "TOP CLASS",
        "P1",
        "P2",
        "P3",
        "P4",
        "P5",
        "P6",
    ]
    u = name.upper()
    for i, token in enumerate(order):
        if u.startswith(token):
            return (i, u)
    return (99, u)


def sanitize_sheet_name(name: str, used: set[str]) -> str:
    cleaned = re.sub(r"[\\/*?:\[\]]", "-", name.strip())[:31] or "Class"
    candidate = cleaned
    n = 2
    while candidate in used:
        suffix = f" {n}"
        candidate = f"{cleaned[: 31 - len(suffix)]}{suffix}"
        n += 1
    used.add(candidate)
    return candidate


def write_gashonga_style_2027(
    school_dir: Path,
    matched: list[dict],
    unmatched: list[dict],
    total_students: int,
) -> Path:
    output_path = school_dir / f"{SCHOOL} - 2026-2027 By Class With Photo ID.xlsx"

    matched_cols = [
        "number",
        "name",
        "gender",
        "class_2026_2027",
        "photo_id",
        "photo_file",
        "has_image",
        "match_type",
        "match_score",
        "name_in_2025_2026",
        "class_in_photo_list",
        "section_2025_2026",
        "photo_id_source",
        "list_file",
    ]
    unmatched_cols = [
        "number",
        "name",
        "gender",
        "list_file",
        "class_2026_2027",
        "match_type",
        "match_score",
        "name_in_2025_2026",
        "suggested_photo_id",
    ]

    def group(records: list[dict]) -> dict[str, list[dict]]:
        grouped: dict[str, list[dict]] = {}
        for r in records:
            grouped.setdefault(r["class_2026_2027"], []).append(r)
        return grouped

    matched_by = group(matched)
    unmatched_by = group(unmatched)
    all_classes = sorted(set(matched_by) | set(unmatched_by), key=class_sort_key)

    summary_rows = []
    for class_name in all_classes:
        m = matched_by.get(class_name, [])
        u = unmatched_by.get(class_name, [])
        summary_rows.append(
            {
                "Class": class_name,
                "Students in LIST 2027": len(m) + len(u),
                "With photo_id": len(m),
                "With image file": sum(1 for x in m if x.get("has_image") == "Y"),
                "Without photo_id": len(u),
            }
        )

    overview = pd.DataFrame(
        [
            {"Metric": "School", "Value": SCHOOL},
            {"Metric": "Academic year list", "Value": "LIST 2027 (2026-2027)"},
            {"Metric": "Total students in LIST 2027", "Value": total_students},
            {"Metric": "With photo_id", "Value": len(matched)},
            {"Metric": "With image on disk", "Value": sum(1 for x in matched if x.get("has_image") == "Y")},
            {"Metric": "Without photo_id", "Value": len(unmatched)},
            {"Metric": "Classes", "Value": len(all_classes)},
        ]
    )

    used: set[str] = set()
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        overview.to_excel(writer, sheet_name="Summary", index=False)
        pd.DataFrame(summary_rows).to_excel(writer, sheet_name="By Class Summary", index=False)

        for class_name in all_classes:
            m = matched_by.get(class_name, [])
            if m:
                df = pd.DataFrame(m)[matched_cols]
                if "number" in df.columns:
                    df = df.sort_values(by="number", kind="stable", na_position="last")
                df.to_excel(writer, sheet_name=sanitize_sheet_name(class_name, used), index=False)

        without_used: set[str] = set()
        for class_name in all_classes:
            u = unmatched_by.get(class_name, [])
            if u:
                df = pd.DataFrame(u)[unmatched_cols]
                if "number" in df.columns:
                    df = df.sort_values(by="number", kind="stable", na_position="last")
                df.to_excel(
                    writer,
                    sheet_name=sanitize_sheet_name(f"{class_name} - No Photo", without_used),
                    index=False,
                )

    return output_path


def write_photo_sections_workbook(school_dir: Path, photo_records: list[dict], photos_on_disk: set[int]) -> Path:
    output_path = school_dir / f"{SCHOOL} - Photo Lists Nursery Lower Upper.xlsx"

    rows = []
    for rec in photo_records:
        pid = rec["photo_id"]
        rows.append(
            {
                **rec,
                "has_image": "Y" if pid in photos_on_disk else "N",
            }
        )

    df = pd.DataFrame(rows)
    section_summary = (
        df.groupby("section", dropna=False)
        .agg(
            students=("name", "count"),
            with_image=("has_image", lambda s: (s == "Y").sum()),
            missing_image=("has_image", lambda s: (s == "N").sum()),
        )
        .reset_index()
    )

    used: set[str] = {"Summary", "All Photo Lists"}
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(
            [
                {"Metric": "School", "Value": SCHOOL},
                {"Metric": "Source folders", "Value": "NURSERY, LOWER PRIMARY, UPPER PRIMARY"},
                {"Metric": "Students with PHOTO_ID in lists", "Value": len(rows)},
                {"Metric": "Image files in photo/", "Value": len(photos_on_disk)},
                {"Metric": "With matching JPG", "Value": int((df["has_image"] == "Y").sum())},
                {"Metric": "Missing JPG", "Value": int((df["has_image"] == "N").sum())},
            ]
        ).to_excel(writer, sheet_name="Summary", index=False)
        section_summary.to_excel(writer, sheet_name="By Section Summary", index=False)
        df.sort_values(by=["section", "class_key", "number"], kind="stable").to_excel(
            writer, sheet_name="All Photo Lists", index=False
        )

        for section in SECTIONS:
            part = df[df["section"] == section]
            if part.empty:
                continue
            part.to_excel(writer, sheet_name=sanitize_sheet_name(section, used), index=False)

        used_ids = {int(r["photo_id"]) for r in photo_records}
        orphan_ids = sorted(photos_on_disk - used_ids)
        if orphan_ids:
            pd.DataFrame(
                [{"photo_id": pid, "photo_file": f"2L7A{pid}.JPG"} for pid in orphan_ids]
            ).to_excel(writer, sheet_name=sanitize_sheet_name("Orphan Photos", used), index=False)

    return output_path


def write_carryover_analysis(school_dir: Path, all_rows: list[dict]) -> Path:
    output_path = school_dir / f"{SCHOOL} - Same Name 2025-2026 to LIST 2027.xlsx"

    exact = [r for r in all_rows if r.get("match_type") in {"exact_same_name", "exact_same_name_same_class"}]
    fuzzy_ok = [r for r in all_rows if r.get("match_type") == "fuzzy_same_person"]
    fuzzy_review = [r for r in all_rows if r.get("match_type") == "fuzzy_needs_review"]
    no_match = [r for r in all_rows if r.get("match_type") == "none"]
    assigned = [r for r in all_rows if r.get("photo_id")]

    cols = [
        "class_2026_2027",
        "number",
        "name",
        "gender",
        "photo_id",
        "photo_file",
        "has_image",
        "match_type",
        "match_score",
        "name_in_2025_2026",
        "class_in_photo_list",
        "section_2025_2026",
        "list_file",
    ]
    review_cols = cols + ["suggested_photo_id"]

    def sheet(rows: list[dict], columns: list[str]) -> pd.DataFrame:
        if not rows:
            return pd.DataFrame(columns=columns)
        df = pd.DataFrame(rows)
        keep = [c for c in columns if c in df.columns]
        return df[keep]

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(
            [
                {"Metric": "LIST 2027 students", "Value": len(all_rows)},
                {"Metric": "Exact same name (2025-2026 → 2027)", "Value": len(exact)},
                {"Metric": "Fuzzy auto-assigned (≥93%)", "Value": len(fuzzy_ok)},
                {"Metric": "Fuzzy suggest review (88–92%)", "Value": len(fuzzy_review)},
                {"Metric": "Photo_id assigned total", "Value": len(assigned)},
                {"Metric": "No match (new / different name)", "Value": len(no_match)},
            ]
        ).to_excel(writer, sheet_name="Summary", index=False)
        sheet(exact, cols).to_excel(writer, sheet_name="Exact Same Name", index=False)
        sheet(fuzzy_ok, cols).to_excel(writer, sheet_name="Fuzzy Assigned", index=False)
        sheet(fuzzy_review, review_cols).to_excel(writer, sheet_name="Fuzzy Review", index=False)
        sheet(assigned, cols).to_excel(writer, sheet_name="All With Photo ID", index=False)
        sheet(no_match, cols).to_excel(writer, sheet_name="No Match", index=False)

    return output_path


def write_list_2027_with_photo_id_workbooks(school_dir: Path, all_rows: list[dict]) -> Path:
    """
    Mirror each LIST 2027 class file under LIST 2027 with photo_id/ with PHOTO_ID
    filled for students who exist in 2025-2026 photo lists (exact name match).
    """
    out_root = school_dir / "LIST 2027 with photo_id"
    out_root.mkdir(parents=True, exist_ok=True)

    by_file: dict[str, dict[str, list[dict]]] = {}
    for row in all_rows:
        file_key = row.get("list_rel") or row["list_file"]
        by_file.setdefault(file_key, {}).setdefault(row["sheet"], []).append(row)

    for list_rel, sheets in sorted(by_file.items()):
        out_path = out_root.joinpath(*Path(list_rel).parts)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        used_sheets: set[str] = set()
        with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
            for sheet_name in sorted(sheets.keys()):
                rows = sorted(
                    sheets[sheet_name],
                    key=lambda r: (r.get("number") is None, r.get("number") or 999),
                )
                class_title = rows[0]["class_2026_2027"] if rows else sheet_name
                matrix: list[list] = [[class_title], ["NO", "NAMES", "GENDER", "PHOTO_ID"]]
                for r in rows:
                    pid = r.get("photo_id")
                    matrix.append(
                        [
                            r.get("number") or "",
                            r["name"],
                            r.get("gender") or "",
                            pid if pid else "",
                        ]
                    )
                safe = sanitize_sheet_name(str(sheet_name), used_sheets)
                pd.DataFrame(matrix).to_excel(writer, sheet_name=safe, index=False, header=False)

    return out_root


def write_classes_with_photo_id_xlsx(school_dir: Path, assigned: list[dict]) -> Path:
    """Upload-ready workbook for scripts/upload-school-photos.mjs (--source photo-id)."""
    output_path = school_dir / "classes with photo_id.xlsx"
    by_class: dict[str, list[dict]] = {}
    for row in assigned:
        if not row.get("photo_id"):
            continue
        by_class.setdefault(row["class_2026_2027"], []).append(row)

    used: set[str] = set()
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        for class_name in sorted(by_class.keys(), key=class_sort_key):
            rows = sorted(by_class[class_name], key=lambda r: (r.get("number") is None, r.get("number") or 999))
            matrix = [["NO", "NAMES", "photo_id"]]
            for r in rows:
                matrix.append([r.get("number") or "", r["name"], r["photo_id"]])
            sheet = sanitize_sheet_name(class_name, used)
            pd.DataFrame(matrix).to_excel(writer, sheet_name=sheet, index=False, header=False)

    return output_path


def write_per_class_status(school_dir: Path, students_2027: list[dict], photos_on_disk: set[int]) -> Path:
    out_dir = school_dir / "LIST 2027" / "Photo Status by Class (2027)"
    out_dir.mkdir(parents=True, exist_ok=True)

    by_class: dict[str, list[dict]] = {}
    for st in students_2027:
        by_class.setdefault(st["class_2026_2027"], []).append(st)

    for class_name, rows in by_class.items():
        out_rows = []
        for r in rows:
            out_rows.append(
                {
                    "number": r.get("number"),
                    "name": r["name"],
                    "gender": r.get("gender"),
                    "photo_id": r.get("photo_id") or r.get("suggested_photo_id") or "",
                    "photo_file": r.get("photo_file") or "",
                    "has_photo_id": "Y" if r.get("photo_id") else "N",
                    "has_image": r.get("has_image"),
                    "match_type": r.get("match_type"),
                    "match_score": r.get("match_score"),
                    "name_in_2025_2026": r.get("name_in_2025_2026") or "",
                    "list_file": r.get("list_file"),
                }
            )
        summary = pd.DataFrame(
            [
                {"metric": "Class", "value": class_name},
                {"metric": "Students", "value": len(out_rows)},
                {"metric": "With photo_id", "value": sum(1 for x in out_rows if x["has_photo_id"] == "Y")},
                {"metric": "With image", "value": sum(1 for x in out_rows if x["has_image"] == "Y")},
            ]
        )
        students_df = pd.DataFrame(out_rows)
        if "number" in students_df.columns:
            students_df = students_df.sort_values(by="number", kind="stable", na_position="last")
        safe = re.sub(r'[<>:"/\\|?*]', "-", class_name)[:100]
        with pd.ExcelWriter(out_dir / f"{safe} - Photo Status.xlsx", engine="openpyxl") as writer:
            summary.to_excel(writer, sheet_name="Summary", index=False)
            students_df.to_excel(writer, sheet_name="Students", index=False)

    return out_dir


def main() -> None:
    school_dir = BASE / SCHOOL
    photos_on_disk = load_photos_on_disk(school_dir / "photo")
    photo_records, by_class_name, by_name = load_photo_list_registry(school_dir)
    list_2027 = load_list_2027_students(school_dir)

    matched: list[dict] = []
    unmatched: list[dict] = []
    all_rows: list[dict] = []

    for student in list_2027:
        row = match_student_to_prior_year(student, by_class_name, by_name)
        enrich_image_status([row], photos_on_disk)
        all_rows.append(row)
        if row.get("photo_id"):
            matched.append(row)
        else:
            unmatched.append(row)

    for rec in photo_records:
        rec["has_image"] = "Y" if rec["photo_id"] in photos_on_disk else "N"

    path1 = write_gashonga_style_2027(school_dir, matched, unmatched, len(list_2027))
    path2 = write_photo_sections_workbook(school_dir, photo_records, photos_on_disk)
    path3 = write_carryover_analysis(school_dir, all_rows)
    path4 = write_classes_with_photo_id_xlsx(school_dir, matched)
    list_2027_out = write_list_2027_with_photo_id_workbooks(school_dir, all_rows)
    per_class_dir = write_per_class_status(school_dir, all_rows, photos_on_disk)

    exact_n = sum(
        1
        for r in matched
        if r.get("match_type") in {"exact_same_name", "exact_same_name_same_class", "list_2027_row"}
    )
    fuzzy_n = sum(1 for r in matched if r.get("match_type") == "fuzzy_same_person")
    review_n = sum(1 for r in all_rows if r.get("match_type") == "fuzzy_needs_review")

    print(SCHOOL)
    print(f"  Photo lists (Nursery/Lower/Upper): {len(photo_records)} students with PHOTO_ID")
    print(f"  JPG files in photo/: {len(photos_on_disk)}")
    print(f"  LIST 2027 students: {len(list_2027)}")
    print(f"  Photo_id assigned: {len(matched)} (exact/name carry-over: {exact_n}, fuzzy auto: {fuzzy_n})")
    print(f"  Fuzzy needs review (not assigned): {review_n}")
    print(f"  With image file: {sum(1 for x in matched if x.get('has_image') == 'Y')}")
    print(f"  Still no photo_id: {len(unmatched)}")
    print(f"  Saved: {path1.name}")
    print(f"  Saved: {path2.name}")
    print(f"  Saved: {path3.name}")
    print(f"  Saved: {path4.name}")
    print(f"  LIST 2027 class files with PHOTO_ID: {list_2027_out}")
    print(f"  Per-class folder: {per_class_dir}")
    list_files = iter_list_2027_workbooks(school_dir)
    print(f"  LIST 2027 source workbooks: {len(list_files)}")
    if list_files:
        classes = sorted({s["class_2026_2027"] for s in list_2027}, key=class_sort_key)
        print(f"  Classes (differentiated): {len(classes)} — {', '.join(classes[:12])}{'…' if len(classes) > 12 else ''}")

    try:
        from build_photo_dashboard import generate_dashboard

        dash = generate_dashboard(SCHOOL, school_dir=school_dir)
        print(f"  Photo dashboard: {dash.name}")
    except Exception as exc:
        print(f"  Photo dashboard skipped: {exc}")


if __name__ == "__main__":
    main()
