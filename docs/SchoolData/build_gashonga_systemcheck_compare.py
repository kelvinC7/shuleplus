"""
Compare ST MATTHEWS GASHONGA Excel class lists with systemCeck student cards.

Matches students by normalized name against:
  - CLASSES OF 2026- 2027.xlsx
  - classes with photo_id.xlsx
  - systemCeck JPG files (ST GASHONGA STUNT CARD 2026)
  - systemCeck PNG files (student-cards by system student ID)

Usage:
  python build_gashonga_systemcheck_compare.py
"""

from __future__ import annotations

import hashlib
import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

SCHOOL = "ST MATTHEWS GASHONGA"
BASE = Path(__file__).resolve().parent
SCHOOL_DIR = BASE / SCHOOL
SYSTEMCHECK_DIR = SCHOOL_DIR / "systemCeck"
PHOTO_DIR = SCHOOL_DIR / "photo"

PHOTO_ID_MIN = 2000
PHOTO_ID_MAX = 4000
SKIP_LABELS = {"NO", "NAMES", "LEARNERS' NAMES", "PHOTO_ID", "N0", "NO."}


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", str(name).upper().strip())


def is_header_or_number(text: str) -> bool:
    upper = text.upper()
    if "CLASS LIST" in upper or upper in SKIP_LABELS:
        return True
    return text.replace(".", "").replace(",", "").isdigit()


def extract_name_from_row(values: list) -> str | None:
    for value in values:
        if isinstance(value, str):
            text = value.strip()
            if not text or is_header_or_number(text):
                continue
            return text
    return None


def extract_number_from_row(values: list) -> int | None:
    for value in values:
        if isinstance(value, (int, float)) and 0 < value < 500 and float(value).is_integer():
            return int(value)
        if isinstance(value, str) and value.strip().replace(".", "").isdigit():
            return int(float(value.strip()))
    return None


def extract_photo_id_from_row(values: list) -> int | None:
    for value in values:
        if isinstance(value, (int, float)) and PHOTO_ID_MIN < value < PHOTO_ID_MAX:
            return int(value)
    return None


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


def parse_class_list_workbook(path: Path) -> list[dict]:
    records: list[dict] = []
    for sheet in excel_sheet_names(path):
        df = read_excel_safe(path, sheet)
        for _, row in df.iterrows():
            values = [row[c] for c in df.columns if pd.notna(row[c])]
            if len(values) < 2:
                continue
            name = extract_name_from_row(values)
            if not name:
                continue
            records.append(
                {
                    "class": sheet.strip(),
                    "number": extract_number_from_row(values),
                    "name": name,
                    "name_key": normalize_name(name),
                    "source": "2026-2027 list",
                }
            )
    return records


def parse_photo_id_workbook(path: Path) -> list[dict]:
    records: list[dict] = []
    for sheet in excel_sheet_names(path):
        df = read_excel_safe(path, sheet)
        for _, row in df.iterrows():
            values = [row[c] for c in df.columns if pd.notna(row[c])]
            if len(values) < 2:
                continue
            photo_id = extract_photo_id_from_row(values)
            name = extract_name_from_row(values)
            if photo_id is None or name is None:
                continue
            records.append(
                {
                    "class": sheet.strip(),
                    "number": extract_number_from_row(values),
                    "name": name,
                    "name_key": normalize_name(name),
                    "photo_id": photo_id,
                    "photo_file": f"2L7A{photo_id}.JPG",
                    "source": "photo_id list",
                }
            )
    return records


def load_systemcheck_jpg(systemcheck_dir: Path) -> dict[str, dict]:
    by_name: dict[str, dict] = {}
    for path in sorted(systemcheck_dir.rglob("*.JPG")):
        key = normalize_name(path.stem)
        by_name[key] = {
            "name": path.stem,
            "name_key": key,
            "systemcheck_jpg": path.name,
            "systemcheck_jpg_folder": path.parent.name,
        }
    return by_name


def load_systemcheck_png(systemcheck_dir: Path) -> list[dict]:
    records: list[dict] = []
    pattern = re.compile(r"student-(\d+)", re.IGNORECASE)
    for path in sorted(systemcheck_dir.rglob("*.png")):
        match = pattern.search(path.name)
        if not match:
            continue
        records.append(
            {
                "system_student_id": match.group(1),
                "systemcheck_png": path.name,
                "systemcheck_png_folder": path.parent.name,
            }
        )
    return records


def dedupe_by_key(records: list[dict], key_field: str = "name_key") -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for record in records:
        key = record[key_field]
        if key in seen:
            continue
        seen.add(key)
        unique.append(record)
    return unique


def build_student_rows(
    list_2027: list[dict],
    photo_id_list: list[dict],
    jpg_by_name: dict[str, dict],
) -> list[dict]:
    photo_by_name = {r["name_key"]: r for r in photo_id_list}
    keys_2027 = {r["name_key"] for r in list_2027}
    keys_photo = set(photo_by_name)
    keys_jpg = set(jpg_by_name)
    all_keys = sorted(keys_2027 | keys_photo | keys_jpg)

    class_2027 = {r["name_key"]: r for r in list_2027}

    rows: list[dict] = []
    for key in all_keys:
        in_2027 = key in keys_2027
        in_photo = key in keys_photo
        in_jpg = key in keys_jpg

        row = {
            "name": (class_2027.get(key) or photo_by_name.get(key) or jpg_by_name.get(key))["name"],
            "name_key": key,
            "in_2026_2027_list": "Y" if in_2027 else "N",
            "in_photo_id_list": "Y" if in_photo else "N",
            "in_systemcheck_jpg": "Y" if in_jpg else "N",
            "class_2026_2027": class_2027[key]["class"] if in_2027 else "",
            "number_2026_2027": class_2027[key].get("number") if in_2027 else "",
            "class_photo_id": photo_by_name[key]["class"] if in_photo else "",
            "number_photo_id": photo_by_name[key].get("number") if in_photo else "",
            "photo_id": photo_by_name[key]["photo_id"] if in_photo else "",
            "photo_file": photo_by_name[key]["photo_file"] if in_photo else "",
            "systemcheck_jpg": jpg_by_name[key]["systemcheck_jpg"] if in_jpg else "",
            "match_status": "",
        }

        if in_2027 and in_photo and in_jpg:
            row["match_status"] = "In all 3 (2026-2027 + photo_id + systemCeck)"
        elif in_2027 and in_jpg:
            row["match_status"] = "In 2026-2027 + systemCeck (no photo_id)"
        elif in_photo and in_jpg:
            row["match_status"] = "In photo_id + systemCeck (not in 2026-2027)"
        elif in_2027 and in_photo:
            row["match_status"] = "In both Excel lists (no systemCeck JPG)"
        elif in_2027:
            row["match_status"] = "In 2026-2027 only"
        elif in_photo:
            row["match_status"] = "In photo_id only"
        elif in_jpg:
            row["match_status"] = "In systemCeck only (not in Excel)"
        rows.append(row)

    return rows


def file_md5(path: Path) -> str:
    digest = hashlib.md5()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_photo_md5_index(photo_dir: Path) -> dict[str, list[int]]:
    index: dict[str, list[int]] = defaultdict(list)
    for path in photo_dir.glob("2L7A*.JPG"):
        match = re.match(r"2L7A(\d+)", path.stem, re.IGNORECASE)
        if match:
            index[file_md5(path)].append(int(match.group(1)))
    return index


def find_wrong_images(
    photo_id_list: list[dict],
    jpg_by_name: dict[str, dict],
    photo_dir: Path,
) -> list[dict]:
    wrong: list[dict] = []
    photo_by_md5 = build_photo_md5_index(photo_dir)

    by_photo_id: dict[int, list[dict]] = defaultdict(list)
    for record in photo_id_list:
        by_photo_id[int(record["photo_id"])].append(record)

    for photo_id, group in sorted(by_photo_id.items()):
        if len(group) <= 1:
            continue
        photo_path = photo_dir / f"2L7A{photo_id}.JPG"
        photo_md5 = file_md5(photo_path) if photo_path.exists() else ""
        for record in group:
            card = jpg_by_name.get(record["name_key"])
            card_path = next(SYSTEMCHECK_DIR.rglob(card["systemcheck_jpg"]), None) if card else None
            card_md5 = file_md5(card_path) if card_path else ""
            if card and card_md5 != photo_md5:
                wrong.append(
                    {
                        "issue": "Duplicate photo_id (shared with another student)",
                        "name": record["name"],
                        "class_photo_id": record["class"],
                        "wrong_photo_id": photo_id,
                        "wrong_photo_file": f"2L7A{photo_id}.JPG",
                        "correct_photo_id": "",
                        "correct_photo_file": "",
                        "other_students_same_photo_id": "; ".join(
                            other["name"] for other in group if other["name"] != record["name"]
                        ),
                    }
                )

    for record in photo_id_list:
        card = jpg_by_name.get(record["name_key"])
        if not card:
            continue
        card_path = next(SYSTEMCHECK_DIR.rglob(card["systemcheck_jpg"]), None)
        assigned_path = photo_dir / record["photo_file"]
        if not card_path or not assigned_path.exists():
            continue
        if file_md5(card_path) == file_md5(assigned_path):
            continue
        correct_ids = photo_by_md5.get(file_md5(card_path), [])
        correct_id = correct_ids[0] if correct_ids else None
        wrong.append(
            {
                "issue": "Wrong photo_id in Excel",
                "name": record["name"],
                "class_photo_id": record["class"],
                "wrong_photo_id": record["photo_id"],
                "wrong_photo_file": record["photo_file"],
                "correct_photo_id": correct_id or "",
                "correct_photo_file": f"2L7A{correct_id}.JPG" if correct_id else "Not found in photo folder",
                "other_students_same_photo_id": "",
            }
        )

    seen: set[tuple[str, int]] = set()
    unique_wrong: list[dict] = []
    for row in wrong:
        key = (row["name"], int(row["wrong_photo_id"]))
        if key in seen:
            continue
        seen.add(key)
        unique_wrong.append(row)
    return unique_wrong


def summary_metrics(
    list_2027: list[dict],
    photo_id_list: list[dict],
    jpg_by_name: dict[str, dict],
    png_records: list[dict],
    student_rows: list[dict],
    wrong_images: list[dict],
) -> list[dict]:
    keys_2027 = {r["name_key"] for r in list_2027}
    keys_photo = {r["name_key"] for r in photo_id_list}
    keys_jpg = set(jpg_by_name)
    keys_all_excel = keys_2027 | keys_photo

    return [
        {"Metric": "School", "Value": SCHOOL},
        {"Metric": "2026-2027 Excel rows", "Value": len(list_2027)},
        {"Metric": "2026-2027 unique students", "Value": len(keys_2027)},
        {"Metric": "photo_id Excel rows", "Value": len(photo_id_list)},
        {"Metric": "photo_id unique students", "Value": len(keys_photo)},
        {"Metric": "systemCeck JPG student cards", "Value": len(jpg_by_name)},
        {"Metric": "systemCeck PNG system cards", "Value": len(png_records)},
        {"Metric": "In 2026-2027 AND systemCeck JPG", "Value": len(keys_2027 & keys_jpg)},
        {"Metric": "In photo_id AND systemCeck JPG", "Value": len(keys_photo & keys_jpg)},
        {"Metric": "In any Excel AND systemCeck JPG", "Value": len(keys_all_excel & keys_jpg)},
        {"Metric": "In Excel but NOT in systemCeck JPG", "Value": len(keys_all_excel - keys_jpg)},
        {"Metric": "In systemCeck JPG but NOT in Excel", "Value": len(keys_jpg - keys_all_excel)},
        {"Metric": "In all 3 (2026-2027 + photo_id + systemCeck)", "Value": sum(1 for r in student_rows if r["match_status"].startswith("In all 3"))},
        {"Metric": "In 2026-2027 + systemCeck (no photo_id)", "Value": sum(1 for r in student_rows if r["match_status"] == "In 2026-2027 + systemCeck (no photo_id)")},
        {"Metric": "In photo_id + systemCeck (not in 2026-2027)", "Value": sum(1 for r in student_rows if r["match_status"] == "In photo_id + systemCeck (not in 2026-2027)")},
        {"Metric": "In both Excel lists (no systemCeck JPG)", "Value": sum(1 for r in student_rows if r["match_status"] == "In both Excel lists (no systemCeck JPG)")},
        {"Metric": "Wrong photo_id (systemCeck card mismatch)", "Value": len(wrong_images)},
    ]


def write_report(
    student_rows: list[dict],
    png_records: list[dict],
    summary: list[dict],
    wrong_images: list[dict],
    output_path: Path,
) -> None:
    cols = [
        "match_status",
        "name",
        "in_2026_2027_list",
        "in_photo_id_list",
        "in_systemcheck_jpg",
        "class_2026_2027",
        "number_2026_2027",
        "class_photo_id",
        "number_photo_id",
        "photo_id",
        "photo_file",
        "systemcheck_jpg",
    ]

    df = pd.DataFrame(student_rows)
    matched = df[df["in_systemcheck_jpg"] == "Y"].copy()
    excel_only = df[(df["in_2026_2027_list"] == "Y") | (df["in_photo_id_list"] == "Y")]
    excel_only = excel_only[excel_only["in_systemcheck_jpg"] == "N"].copy()
    system_only = df[df["match_status"] == "In systemCeck only (not in Excel)"].copy()
    all_three = df[df["match_status"].str.startswith("In all 3")].copy()

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(summary).to_excel(writer, sheet_name="Summary", index=False)
        all_three[cols].to_excel(writer, sheet_name="Matched All 3", index=False)
        matched[cols].to_excel(writer, sheet_name="In systemCeck JPG", index=False)
        excel_only[cols].to_excel(writer, sheet_name="In Excel Not systemCeck", index=False)
        system_only[cols].to_excel(writer, sheet_name="systemCeck Not Excel", index=False)
        df[cols].sort_values(["match_status", "name"], kind="stable").to_excel(
            writer, sheet_name="Full Comparison", index=False
        )
        pd.DataFrame(png_records).to_excel(writer, sheet_name="systemCeck PNG IDs", index=False)
        wrong_cols = [
            "issue",
            "name",
            "class_photo_id",
            "wrong_photo_id",
            "wrong_photo_file",
            "correct_photo_id",
            "correct_photo_file",
            "other_students_same_photo_id",
        ]
        if wrong_images:
            pd.DataFrame(wrong_images)[wrong_cols].to_excel(writer, sheet_name="Wrong Images", index=False)
        else:
            pd.DataFrame({"info": ["No wrong photo_id detected"]}).to_excel(
                writer, sheet_name="Wrong Images", index=False
            )


def main() -> None:
    list_2027 = parse_class_list_workbook(SCHOOL_DIR / "CLASSES OF 2026- 2027.xlsx")
    photo_id_list = parse_photo_id_workbook(SCHOOL_DIR / "classes with photo_id.xlsx")
    jpg_by_name = load_systemcheck_jpg(SYSTEMCHECK_DIR)
    png_records = load_systemcheck_png(SYSTEMCHECK_DIR)

    student_rows = build_student_rows(list_2027, photo_id_list, jpg_by_name)
    wrong_images = find_wrong_images(photo_id_list, jpg_by_name, PHOTO_DIR)
    summary = summary_metrics(list_2027, photo_id_list, jpg_by_name, png_records, student_rows, wrong_images)

    output_path = SCHOOL_DIR / f"{SCHOOL} - systemCeck vs Excel Compare.xlsx"
    write_report(student_rows, png_records, summary, wrong_images, output_path)

    print(SCHOOL)
    for item in summary:
        print(f"  {item['Metric']}: {item['Value']}")
    print(f"  Saved: {output_path.name}")


if __name__ == "__main__":
    main()
