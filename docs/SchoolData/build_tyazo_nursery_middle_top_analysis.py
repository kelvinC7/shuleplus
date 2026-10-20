"""
Analyze ST MATTHEWS TYAZO MIDDLE CLASS and TOP CLASS (LIST 2027):
compare with 2025-2026 nursery photo lists and photo/ folder.

Usage:
  python build_tyazo_nursery_middle_top_analysis.py
"""

from __future__ import annotations

import difflib
import re
import sys
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

import build_list_2027_photo_status as ty

SCHOOL = ty.SCHOOL
SCHOOL_DIR = BASE / SCHOOL
TARGET_CLASSES = ("MIDDLE CLASS", "TOP CLASS")
FUZZY_MIN = 0.82


def fuzzy_nursery_match(name_key: str, nursery_by_name: dict[str, dict]) -> tuple[dict | None, float]:
    best_score = 0.0
    best_rec: dict | None = None
    for key, rec in nursery_by_name.items():
        score = difflib.SequenceMatcher(None, name_key, key).ratio()
        if score > best_score:
            best_score = score
            best_rec = rec
    if best_score >= FUZZY_MIN:
        return best_rec, best_score
    return None, best_score


def build_class_rows(
    students: list[dict],
    by_class_name: dict,
    by_name: dict,
    photos_on_disk: set[int],
    nursery_by_name: dict[str, dict],
) -> list[dict]:
    rows: list[dict] = []
    for student in students:
        row = ty.match_student_to_prior_year(student, by_class_name, by_name)
        ty.enrich_image_status([row], photos_on_disk)

        fuzzy_rec, fuzzy_score = (None, 0.0)
        if not row.get("photo_id"):
            fuzzy_rec, fuzzy_score = fuzzy_nursery_match(student["name_key"], nursery_by_name)

        if row.get("has_image") == "Y":
            status = "Has image"
        elif row.get("photo_id"):
            status = "Has photo_id but missing JPG"
        elif fuzzy_rec and fuzzy_rec["photo_id"] in photos_on_disk:
            status = "Likely has image (name spelling differs)"
        elif fuzzy_rec:
            status = "Likely match but JPG missing"
        else:
            status = "No photo (new student)"

        rows.append(
            {
                "class_2026_2027": student["class_2026_2027"],
                "number": student.get("number"),
                "name": student["name"],
                "gender": student.get("gender") or "",
                "photo_id": row.get("photo_id") or "",
                "photo_file": row.get("photo_file") or "",
                "has_image": row.get("has_image") or "N",
                "match_type": row.get("match_type") or "",
                "name_in_2025_2026": row.get("name_in_2025_2026") or "",
                "class_in_photo_list": row.get("class_in_photo_list") or "",
                "photo_id_source": row.get("photo_id_source") or "",
                "fuzzy_match_name": fuzzy_rec["name"] if fuzzy_rec else "",
                "fuzzy_match_class": fuzzy_rec["class_key"] if fuzzy_rec else "",
                "fuzzy_suggested_photo_id": fuzzy_rec["photo_id"] if fuzzy_rec else "",
                "fuzzy_score_pct": round(fuzzy_score * 100, 1) if fuzzy_score else "",
                "status": status,
                "list_file": student.get("list_file") or "",
            }
        )
    return rows


def write_report(all_rows: list[dict], photo_records: list[dict], photos_on_disk: set[int]) -> Path:
    output_path = SCHOOL_DIR / f"{SCHOOL} - MIDDLE TOP CLASS Photo Analysis.xlsx"

    summary_rows = []
    for class_name in TARGET_CLASSES:
        class_rows = [r for r in all_rows if r["class_2026_2027"] == class_name]
        prior = [r for r in photo_records if r["class_key"] == class_name]
        summary_rows.append(
            {
                "Class": class_name,
                "LIST 2027 students": len(class_rows),
                "With photo_id (exact match)": sum(1 for r in class_rows if r["photo_id"]),
                "With image on disk": sum(1 for r in class_rows if r["has_image"] == "Y"),
                "Likely has image (spelling diff)": sum(
                    1 for r in class_rows if r["status"] == "Likely has image (name spelling differs)"
                ),
                "No photo (new student)": sum(1 for r in class_rows if r["status"] == "No photo (new student)"),
                "2025-2026 photo list students": len(prior),
                "2025-2026 with JPG on disk": sum(1 for r in prior if r["photo_id"] in photos_on_disk),
            }
        )

    cols = [
        "status",
        "number",
        "name",
        "gender",
        "photo_id",
        "photo_file",
        "has_image",
        "match_type",
        "name_in_2025_2026",
        "class_in_photo_list",
        "fuzzy_match_name",
        "fuzzy_suggested_photo_id",
        "fuzzy_score_pct",
        "list_file",
    ]

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(summary_rows).to_excel(writer, sheet_name="Summary", index=False)
        pd.DataFrame(
            [
                {"Metric": "School", "Value": SCHOOL},
                {"Metric": "LIST 2027 folder", "Value": "LIST 2027/MIDDLE CLASS.xlsx, TOP CLASS.xlsx"},
                {"Metric": "Photo lists source", "Value": "class lists with photoes/NURSERY/"},
                {"Metric": "Photo folder", "Value": "photo/ (2L7A####.JPG)"},
                {"Metric": "Total JPG files", "Value": len(photos_on_disk)},
            ]
        ).to_excel(writer, sheet_name="Overview", index=False)

        for class_name in TARGET_CLASSES:
            class_rows = [r for r in all_rows if r["class_2026_2027"] == class_name]
            df = pd.DataFrame(class_rows)
            if "number" in df.columns:
                df = df.sort_values(by="number", kind="stable", na_position="last")
            safe = class_name.replace(" ", "_")[:31]
            df[cols].to_excel(writer, sheet_name=safe, index=False)

            has_img = df[df["has_image"] == "Y"][cols]
            has_img.to_excel(writer, sheet_name=f"{safe} - Has Photo"[:31], index=False)

            no_img = df[df["has_image"] != "Y"][cols]
            no_img.to_excel(writer, sheet_name=f"{safe} - No Photo"[:31], index=False)

    return output_path


def main() -> None:
    photos_on_disk = ty.load_photos_on_disk(SCHOOL_DIR / "photo")
    photo_records, by_class_name, by_name = ty.load_photo_list_registry(SCHOOL_DIR)
    list_2027 = ty.load_list_2027_students(SCHOOL_DIR)
    nursery_by_name = {
        ty.normalize_name(r["name"]): r for r in photo_records if r["section"] == "NURSERY"
    }

    target_students = [s for s in list_2027 if s["class_2026_2027"] in TARGET_CLASSES]
    all_rows = build_class_rows(target_students, by_class_name, by_name, photos_on_disk, nursery_by_name)
    output_path = write_report(all_rows, photo_records, photos_on_disk)

    print(SCHOOL)
    print("  MIDDLE CLASS + TOP CLASS photo analysis")
    for class_name in TARGET_CLASSES:
        class_rows = [r for r in all_rows if r["class_2026_2027"] == class_name]
        has_img = sum(1 for r in class_rows if r["has_image"] == "Y")
        likely = sum(1 for r in class_rows if r["status"] == "Likely has image (name spelling differs)")
        new = sum(1 for r in class_rows if r["status"] == "No photo (new student)")
        print(f"  {class_name}: {len(class_rows)} students")
        print(f"    With image: {has_img}")
        print(f"    Likely has image (spelling): {likely}")
        print(f"    New / no photo: {new}")
    print(f"  Saved: {output_path.name}")


if __name__ == "__main__":
    main()
