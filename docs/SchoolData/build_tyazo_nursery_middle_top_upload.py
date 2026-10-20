"""
Build upload-ready photo_id workbook for ST MATTHEWS TYAZO MIDDLE CLASS and TOP CLASS.

Includes:
  - Students with confirmed image (exact name match)
  - Students with likely image (fuzzy name match from 2025-2026 nursery lists)

Output (under LIST 2027/):
  - MIDDLE TOP CLASS - upload photo_id.xlsx   (for upload-school-photos.mjs)
  - MIDDLE TOP CLASS - upload manifest.xlsx   (full audit trail)

Usage:
  python build_tyazo_nursery_middle_top_upload.py

Then upload to server (dry-run first):
  node scripts/upload-school-photos.mjs upload \\
    --school "ST MATTHEWS TYAZO" \\
    --workbook "LIST 2027/MIDDLE TOP CLASS - upload photo_id.xlsx" \\
    --email admin@school.rw \\
    --password 'YourPassword' \\
    --type students \\
    --dry-run

Real upload:
  node scripts/upload-school-photos.mjs upload \\
    --school "ST MATTHEWS TYAZO" \\
    --workbook "LIST 2027/MIDDLE TOP CLASS - upload photo_id.xlsx" \\
    --token "<JWT>" \\
    --type students \\
    --force
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import build_list_2027_photo_status as ty
from build_tyazo_nursery_middle_top_analysis import TARGET_CLASSES, build_class_rows

SCHOOL = ty.SCHOOL
SCHOOL_DIR = BASE / SCHOOL
LIST_2027_DIR = SCHOOL_DIR / "LIST 2027"
UPLOAD_WORKBOOK = LIST_2027_DIR / "MIDDLE TOP CLASS - upload photo_id.xlsx"
MANIFEST_WORKBOOK = LIST_2027_DIR / "MIDDLE TOP CLASS - upload manifest.xlsx"


def sanitize_sheet_name(name: str, used: set[str]) -> str:
    cleaned = re.sub(r"[\\/*?:\[\]]", "-", name.strip())[:31] or "Class"
    candidate = cleaned
    suffix = 2
    while candidate in used:
        tail = f" {suffix}"
        candidate = f"{cleaned[: 31 - len(tail)]}{tail}"
        suffix += 1
    used.add(candidate)
    return candidate


def resolve_upload_photo_id(row: dict) -> tuple[int | None, str, str]:
    """Return (photo_id, photo_file, match_kind) for upload."""
    if row.get("has_image") == "Y" and row.get("photo_id"):
        return int(row["photo_id"]), str(row["photo_file"]), "exact"

    if row.get("status") == "Likely has image (name spelling differs)":
        pid = row.get("fuzzy_suggested_photo_id")
        if pid:
            pid_int = int(float(pid))
            return pid_int, f"2L7A{pid_int}.JPG", "fuzzy"

    return None, "", ""


def build_upload_rows(all_rows: list[dict]) -> list[dict]:
    upload_rows: list[dict] = []
    for row in all_rows:
        photo_id, photo_file, match_kind = resolve_upload_photo_id(row)
        if not photo_id:
            continue
        upload_rows.append(
            {
                "class_2026_2027": row["class_2026_2027"],
                "number": row.get("number"),
                "name": row["name"],
                "gender": row.get("gender") or "",
                "photo_id": photo_id,
                "photo_file": photo_file,
                "match_kind": match_kind,
                "status": row.get("status") or "",
                "name_in_2025_2026": row.get("name_in_2025_2026") or row.get("fuzzy_match_name") or "",
                "fuzzy_match_name": row.get("fuzzy_match_name") or "",
                "fuzzy_score_pct": row.get("fuzzy_score_pct") or "",
                "list_file": row.get("list_file") or "",
            }
        )
    return upload_rows


def write_upload_workbook(upload_rows: list[dict], output_path: Path) -> None:
    by_class: dict[str, list[dict]] = {}
    for row in upload_rows:
        by_class.setdefault(row["class_2026_2027"], []).append(row)

    used: set[str] = set()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        for class_name in TARGET_CLASSES:
            rows = by_class.get(class_name, [])
            if not rows:
                continue
            rows = sorted(rows, key=lambda r: (r.get("number") is None, r.get("number") or 999))
            matrix = [["NO", "NAMES", "photo_id"]]
            for row in rows:
                matrix.append([row.get("number") or "", row["name"], row["photo_id"]])
            sheet = sanitize_sheet_name(class_name, used)
            pd.DataFrame(matrix).to_excel(writer, sheet_name=sheet, index=False, header=False)


def write_manifest(upload_rows: list[dict], skipped_rows: list[dict], output_path: Path) -> None:
    cols = [
        "match_kind",
        "class_2026_2027",
        "number",
        "name",
        "photo_id",
        "photo_file",
        "name_in_2025_2026",
        "fuzzy_match_name",
        "fuzzy_score_pct",
        "status",
        "list_file",
    ]
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(upload_rows)[cols].to_excel(writer, sheet_name="To Upload", index=False)
        if skipped_rows:
            pd.DataFrame(skipped_rows).to_excel(writer, sheet_name="Skipped No Photo", index=False)

        summary = []
        for class_name in TARGET_CLASSES:
            class_upload = [r for r in upload_rows if r["class_2026_2027"] == class_name]
            class_skip = [r for r in skipped_rows if r.get("class_2026_2027") == class_name]
            summary.append(
                {
                    "Class": class_name,
                    "To upload": len(class_upload),
                    "Exact": sum(1 for r in class_upload if r["match_kind"] == "exact"),
                    "Fuzzy": sum(1 for r in class_upload if r["match_kind"] == "fuzzy"),
                    "Skipped (no photo)": len(class_skip),
                }
            )
        pd.DataFrame(summary).to_excel(writer, sheet_name="Summary", index=False)


def load_middle_top_list_2027(school_dir: Path) -> list[dict]:
    """Load ONLY the two nursery LIST 2027 workbooks (avoid manifest/photo-status duplicates)."""
    list_root = school_dir / "LIST 2027"
    students: list[dict] = []
    for class_name in TARGET_CLASSES:
        path = list_root / f"{class_name}.xlsx"
        if not path.exists():
            continue
        for sheet, title_hint, student in ty.iter_workbook_rows(path):
            students.append(
                {
                    "class_2026_2027": class_name,
                    "list_file": path.name,
                    "list_rel": path.relative_to(list_root).as_posix(),
                    "sheet": sheet,
                    "number": student.get("number"),
                    "name": student["name"],
                    "gender": student.get("gender") or "",
                    "name_key": ty.normalize_name(student["name"]),
                    "photo_id_in_row": student.get("photo_id"),
                }
            )
    return students


def dedupe_upload_rows(upload_rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for row in upload_rows:
        key = ty.normalize_name(row["name"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def main() -> None:
    photos_on_disk = ty.load_photos_on_disk(SCHOOL_DIR / "photo")
    photo_records, by_class_name, by_name = ty.load_photo_list_registry(SCHOOL_DIR)
    nursery_by_name = {
        ty.normalize_name(r["name"]): r for r in photo_records if r["section"] == "NURSERY"
    }

    target_students = load_middle_top_list_2027(SCHOOL_DIR)
    all_rows = build_class_rows(target_students, by_class_name, by_name, photos_on_disk, nursery_by_name)
    upload_rows = dedupe_upload_rows(build_upload_rows(all_rows))
    upload_name_keys = {ty.normalize_name(r["name"]) for r in upload_rows}
    skipped_rows = [r for r in all_rows if ty.normalize_name(r["name"]) not in upload_name_keys]

    write_upload_workbook(upload_rows, UPLOAD_WORKBOOK)
    write_manifest(upload_rows, skipped_rows, MANIFEST_WORKBOOK)

    print(SCHOOL)
    print("  MIDDLE CLASS + TOP CLASS — upload workbook ready")
    print(f"  To upload: {len(upload_rows)} students")
    print(f"    Exact match: {sum(1 for r in upload_rows if r['match_kind'] == 'exact')}")
    print(f"    Fuzzy (likely image): {sum(1 for r in upload_rows if r['match_kind'] == 'fuzzy')}")
    print(f"    Skipped (no photo): {len(skipped_rows)}")
    print(f"  Saved: {UPLOAD_WORKBOOK.relative_to(SCHOOL_DIR)}")
    print(f"  Saved: {MANIFEST_WORKBOOK.relative_to(SCHOOL_DIR)}")
    print()
    print("Upload to server (dry-run first):")
    rel = UPLOAD_WORKBOOK.relative_to(SCHOOL_DIR).as_posix()
    print(f'  node scripts/upload-school-photos.mjs upload --school "{SCHOOL}" \\')
    print(f'    --workbook "{rel}" \\')
    print("    --email admin@school.rw --password 'YourPassword' \\")
    print("    --type students --dry-run")
    print()
    print("Real upload:")
    print(f'  node scripts/upload-school-photos.mjs upload --school "{SCHOOL}" \\')
    print(f'    --workbook "{rel}" \\')
    print("    --token \"<JWT>\" --type students")


if __name__ == "__main__":
    main()
