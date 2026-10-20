"""
Build Excel files of 2026-2027 students who have a photo_id, for GASHONGA and NTENDEZI.
Matches 2026-2027 class lists with classes with photo_id.xlsx by student name.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
PHOTO_ID_MIN = 2000
PHOTO_ID_MAX = 4000
SKIP_LABELS = {"NO", "NAMES", "LEARNERS' NAMES", "N0", "NO."}


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


def class_from_header(values: list) -> str | None:
    for value in values:
        if not isinstance(value, str):
            continue
        upper = value.upper()
        if "2026" not in upper and "2027" not in upper:
            continue
        match = re.search(r"\b(N[123]|P[1-6])\b", upper)
        if match:
            return match.group(1)
    return None


def parse_class_list_workbook(path: Path, class_label: str | None = None) -> list[dict]:
    records: list[dict] = []
    for sheet in excel_sheet_names(path):
        df = read_excel_safe(path, sheet)
        current_class = class_label or sheet.strip()
        for _, row in df.iterrows():
            values = [row[c] for c in df.columns if pd.notna(row[c])]
            if len(values) < 2:
                continue
            name = extract_name_from_row(values)
            if not name:
                continue
            records.append(
                {
                    "class_2026_2027": current_class,
                    "sheet": sheet.strip(),
                    "number": extract_number_from_row(values),
                    "name": name,
                    "name_key": normalize_name(name),
                }
            )
    return records


def parse_photo_id_workbook(path: Path) -> dict[str, dict]:
    by_name: dict[str, dict] = {}
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
            key = normalize_name(name)
            by_name[key] = {
                "class_photo_id": sheet.strip(),
                "number": extract_number_from_row(values),
                "name": name,
                "photo_id": photo_id,
                "photo_file": f"2L7A{photo_id}.JPG",
            }
    return by_name


def load_gashonga_2026_2027(school_dir: Path) -> list[dict]:
    path = school_dir / "CLASSES OF 2026- 2027.xlsx"
    return parse_class_list_workbook(path)


def load_ntendezi_2026_2027(school_dir: Path) -> list[dict]:
    records: list[dict] = []
    class_files = [
        ("N1 2026-2027.xlsx", "N1", ["Sheet1"]),
        ("N2 2026-2027.xlsx", "N2", ["N2"]),
        ("N3 2026-2027.xlsx", "N3", ["N3"]),
        ("P3 CLASS LIST (P2).xlsx", "P3", ["P2"]),
        ("P4 CLASS LIST (P3).xlsx", "P4", ["P3"]),
        ("NTENDEZI_CLASS_LISTS_P5_2026_2027.xlsx", "P5", ["P5 (2026-2027)"]),
        ("NTENDEZI_CLASS_LISTS_P6_2026-2027_CLEANED.xlsx", "P6", ["P5"]),
    ]

    for filename, default_class, sheets in class_files:
        path = school_dir / filename
        if not path.exists():
            continue
        available_sheets = excel_sheet_names(path)
        for sheet in sheets:
            if sheet not in available_sheets:
                continue
            df = read_excel_safe(path, sheet)
            header_class = None
            for _, row in df.iterrows():
                values = [row[c] for c in df.columns if pd.notna(row[c])]
                if not header_class:
                    header_class = class_from_header(values)
                if len(values) < 2:
                    continue
                name = extract_name_from_row(values)
                if not name:
                    continue
                records.append(
                    {
                        "class_2026_2027": header_class or default_class,
                        "sheet": sheet.strip(),
                        "number": extract_number_from_row(values),
                        "name": name,
                        "name_key": normalize_name(name),
                        "source_file": filename,
                    }
                )
    return records


CLASS_ORDER = [
    "BABY CLASS",
    "MIDDLE CLASS",
    "TOP CLASS",
    "N1",
    "N2",
    "N3",
    "P1",
    "P1  CLASS",
    "P1 CLASS",
    "P2",
    "P2 CLASS",
    "P2 ALPHA",
    "P2 OMEGA",
    "P3",
    "P3 CLASS",
    "P3 ALPHA",
    "P3  OMEGA",
    "P4",
    "P4  CLASS",
    "P4 CLASS",
    "P4 NORTH CLASS",
    "P4 SOUTH CLASS",
    "P5",
    "P5 CLASS",
    "P6",
    "P6 CLASS",
]


def class_sort_key(class_name: str) -> tuple[int, str]:
    normalized = re.sub(r"\s+", " ", class_name.strip().upper())
    try:
        return (CLASS_ORDER.index(normalized), normalized)
    except ValueError:
        for index, known in enumerate(CLASS_ORDER):
            if normalized.startswith(known.replace("  ", " ")):
                return (index, normalized)
        return (len(CLASS_ORDER), normalized)


def sanitize_sheet_name(name: str, used: set[str]) -> str:
    cleaned = re.sub(r"[\\/*?:\[\]]", "-", name.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)[:31] or "Class"
    candidate = cleaned
    suffix = 2
    while candidate in used:
        tail = f" {suffix}"
        candidate = f"{cleaned[: 31 - len(tail)]}{tail}"
        suffix += 1
    used.add(candidate)
    return candidate


def group_by_class(records: list[dict], class_field: str = "class_2026_2027") -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for record in records:
        class_name = str(record.get(class_field, "Unknown")).strip()
        grouped.setdefault(class_name, []).append(record)
    return grouped


def merge_with_photo_id(students: list[dict], photo_by_name: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    matched: list[dict] = []
    unmatched: list[dict] = []
    seen_keys: set[str] = set()

    for student in students:
        key = student["name_key"]
        if key in seen_keys:
            continue
        seen_keys.add(key)

        photo = photo_by_name.get(key)
        if photo:
            matched.append(
                {
                    "class_2026_2027": student["class_2026_2027"],
                    "number": student.get("number"),
                    "name": student["name"],
                    "photo_id": photo["photo_id"],
                    "photo_file": photo["photo_file"],
                    "class_in_photo_id_file": photo["class_photo_id"],
                    "source_file": student.get("source_file", "CLASSES OF 2026- 2027.xlsx"),
                }
            )
        else:
            unmatched.append(
                {
                    "class_2026_2027": student["class_2026_2027"],
                    "number": student.get("number"),
                    "name": student["name"],
                    "source_file": student.get("source_file", "CLASSES OF 2026- 2027.xlsx"),
                }
            )

    return matched, unmatched


def write_output(
    school_name: str,
    matched: list[dict],
    unmatched: list[dict],
    total_2026: int,
    school_dir: Path | None = None,
) -> Path:
    root = school_dir or (BASE / school_name)
    output_path = root / f"{school_name} - 2026-2027 By Class With Photo ID.xlsx"

    matched_cols = ["number", "name", "photo_id", "photo_file", "class_in_photo_id_file"]
    unmatched_cols = ["number", "name", "source_file"]

    matched_by_class = group_by_class(matched)
    unmatched_by_class = group_by_class(unmatched)
    all_classes = sorted(
        set(matched_by_class) | set(unmatched_by_class),
        key=class_sort_key,
    )

    class_summary_rows = []
    for class_name in all_classes:
        class_matched = matched_by_class.get(class_name, [])
        class_unmatched = unmatched_by_class.get(class_name, [])
        class_summary_rows.append(
            {
                "Class": class_name,
                "Students in 2026-2027 list": len(class_matched) + len(class_unmatched),
                "With photo_id": len(class_matched),
                "Without photo_id": len(class_unmatched),
            }
        )

    overview = pd.DataFrame(
        [
            {"Metric": "School", "Value": school_name},
            {"Metric": "Academic year", "Value": "2026-2027"},
            {"Metric": "Total students in 2026-2027 class lists", "Value": total_2026},
            {"Metric": "Students with photo_id", "Value": len(matched)},
            {"Metric": "Students without photo_id", "Value": len(unmatched)},
            {"Metric": "Number of classes", "Value": len(all_classes)},
        ]
    )
    class_summary = pd.DataFrame(class_summary_rows)

    used_sheet_names: set[str] = {"Summary", "By Class Summary"}

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        overview.to_excel(writer, sheet_name="Summary", index=False)
        class_summary.to_excel(writer, sheet_name="By Class Summary", index=False)

        for class_name in all_classes:
            class_matched = matched_by_class.get(class_name, [])
            if not class_matched:
                continue
            sheet_name = sanitize_sheet_name(class_name, used_sheet_names)
            class_df = pd.DataFrame(class_matched)[matched_cols]
            if "number" in class_df.columns:
                class_df = class_df.sort_values(by="number", kind="stable", na_position="last")
            class_df.to_excel(writer, sheet_name=sheet_name, index=False)

        without_used: set[str] = set()
        for class_name in all_classes:
            class_unmatched = unmatched_by_class.get(class_name, [])
            if not class_unmatched:
                continue
            sheet_name = sanitize_sheet_name(f"{class_name} - No Photo", without_used)
            class_df = pd.DataFrame(class_unmatched)[unmatched_cols]
            if "number" in class_df.columns:
                class_df = class_df.sort_values(by="number", kind="stable", na_position="last")
            class_df.to_excel(writer, sheet_name=sheet_name, index=False)

    return output_path


def process_school(school_name: str, loader) -> Path:
    school_dir = BASE / school_name
    students = loader(school_dir)
    photo_by_name = parse_photo_id_workbook(school_dir / "classes with photo_id.xlsx")
    matched, unmatched = merge_with_photo_id(students, photo_by_name)
    output_path = write_output(school_name, matched, unmatched, len(students), school_dir)

    matched_by_class = group_by_class(matched)
    print(f"\n{school_name}")
    print(f"  2026-2027 students: {len(students)}")
    print(f"  With photo_id: {len(matched)}")
    print(f"  Without photo_id: {len(unmatched)}")
    print(f"  Classes with photo_id sheets: {len(matched_by_class)}")
    for class_name in sorted(matched_by_class, key=class_sort_key):
        print(f"    {class_name}: {len(matched_by_class[class_name])}")
    print(f"  Saved: {output_path.name}")
    return output_path


def main() -> None:
    process_school("ST MATTHEWS GASHONGA", load_gashonga_2026_2027)
    process_school("ST MATTHEWS NTENDEZI", load_ntendezi_2026_2027)


if __name__ == "__main__":
    main()
