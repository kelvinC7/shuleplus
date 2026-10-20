"""
Analyze school data: match students/staff from Excel (photo_id) with photos on disk.
Generates per-school Excel reports with students and staff who have photos.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
SCHOOLS = [
    {
        "name": "ST MATTHEWS GASHONGA",
        "photo_id_file": "classes with photo_id.xlsx",
        "staff_file": "STAFF 2027.xlsx",
        "classes_file": "CLASSES OF 2026- 2027.xlsx",
        "photo_id_min": 2000,
    },
    {
        "name": "ST MATTHEWS NTENDEZI",
        "photo_id_file": "classes with photo_id.xlsx",
        "staff_file": None,
        "classes_file": None,
        "photo_id_min": 2000,
    },
    {
        "name": "ST MATTHEWS TYAZO",
        "photo_id_file": "classes with photo_id.xlsx",
        "staff_file": None,
        "classes_file": None,
        "photo_id_min": 1800,
    },
    {
        "name": "ST MATTHEWS RUSIZI PRIMARY",
        "photo_id_file": "classes with photo_id.xlsx",
        "staff_file": "TEACHERS 2027.xlsx",
        "classes_file": None,
        "photo_id_min": 1000,
    },
    {
        "name": "ST MATTHEWS RUSIZI SECONDARY",
        "photo_id_file": "classes with photo_id.xlsx",
        "staff_file": "TEACHERS 2027.xlsx",
        "classes_file": None,
        "photo_id_min": 1000,
    },
]

PHOTO_PATTERN = re.compile(r"^2L7A(\d+)$", re.IGNORECASE)
PHOTO_ID_MAX = 4000
DEFAULT_PHOTO_ID_MIN = 2000


def photo_id_to_filename(photo_id: int) -> str:
    return f"2L7A{photo_id}.JPG"


def load_photos(photo_dir: Path) -> dict[int, Path]:
    photos: dict[int, Path] = {}
    if not photo_dir.is_dir():
        return photos
    for path in photo_dir.iterdir():
        if not path.is_file():
            continue
        match = PHOTO_PATTERN.match(path.stem)
        if match:
            photos[int(match.group(1))] = path
    return photos


def extract_photo_id(row_values: list, photo_id_min: int = DEFAULT_PHOTO_ID_MIN) -> int | None:
    for value in row_values:
        if isinstance(value, (int, float)) and photo_id_min <= value < PHOTO_ID_MAX:
            return int(value)
    return None


def extract_name(row_values: list) -> str | None:
    for value in row_values:
        if isinstance(value, str):
            text = value.strip()
            if not text:
                continue
            upper = text.upper()
            if "CLASS LIST" in upper or upper in {"NO", "NAMES", "LEARNERS' NAMES", "STAFF NAME"}:
                continue
            if text.replace(".", "").isdigit():
                continue
            return text
    return None


def extract_number(row_values: list) -> int | None:
    for value in row_values:
        if isinstance(value, (int, float)) and 0 < value < 500 and float(value).is_integer():
            return int(value)
    return None


def parse_photo_id_workbook(path: Path, photo_id_min: int = DEFAULT_PHOTO_ID_MIN) -> list[dict]:
    records: list[dict] = []
    workbook = pd.ExcelFile(path)
    for sheet in workbook.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet, header=None)
        for _, row in df.iterrows():
            values = [row[c] for c in df.columns if pd.notna(row[c])]
            if len(values) < 2:
                continue
            photo_id = extract_photo_id(values, photo_id_min)
            name = extract_name(values)
            if photo_id is None or name is None:
                continue
            records.append(
                {
                    "class": sheet.strip(),
                    "number": extract_number(values),
                    "name": name,
                    "photo_id": photo_id,
                    "type": "Student",
                }
            )
    return records


def parse_staff_workbook(path: Path, photo_id_min: int = DEFAULT_PHOTO_ID_MIN) -> list[dict]:
    records: list[dict] = []
    df = pd.read_excel(path, header=None)
    for _, row in df.iterrows():
        values = [row[c] for c in df.columns if pd.notna(row[c])]
        if len(values) < 2:
            continue
        photo_id = extract_photo_id(values, photo_id_min)
        name = extract_name(values)
        position = None
        for value in values:
            if isinstance(value, str):
                text = value.strip()
                if text == name:
                    continue
                if "CLASS LIST" in text.upper() or text.upper() in {"STAFF NAME", "POSITION"}:
                    continue
                if text.replace(".", "").isdigit():
                    continue
                position = text
                break
        if name is None:
            continue
        if photo_id is None:
            records.append(
                {
                    "class": "STAFF",
                    "number": extract_number(values),
                    "name": name,
                    "photo_id": None,
                    "position": position,
                    "type": "Staff",
                }
            )
        else:
            records.append(
                {
                    "class": "STAFF",
                    "number": extract_number(values),
                    "name": name,
                    "photo_id": photo_id,
                    "position": position,
                    "type": "Staff",
                }
            )
    return records


def enrich_with_photo_status(records: list[dict], photos: dict[int, Path]) -> list[dict]:
    enriched = []
    for record in records:
        photo_id = record.get("photo_id")
        has_photo = False
        photo_file = ""
        if photo_id is not None:
            path = photos.get(photo_id)
            has_photo = path is not None
            photo_file = path.name if path else photo_id_to_filename(photo_id)
        enriched.append(
            {
                **record,
                "photo_file": photo_file,
                "has_photo": has_photo,
            }
        )
    return enriched


def find_orphan_photos(photos: dict[int, Path], used_photo_ids: set[int]) -> list[dict]:
    orphans = []
    for photo_id, path in sorted(photos.items()):
        if photo_id not in used_photo_ids:
            orphans.append(
                {
                    "photo_id": photo_id,
                    "photo_file": path.name,
                    "type": "Unknown (likely staff or unlisted)",
                    "has_photo": True,
                }
            )
    return orphans


def find_duplicate_photo_ids(records: list[dict]) -> list[dict]:
    by_id: dict[int, list[dict]] = {}
    for rec in records:
        pid = rec.get("photo_id")
        if pid is None:
            continue
        by_id.setdefault(int(pid), []).append(rec)
    dupes: list[dict] = []
    for pid in sorted(by_id):
        group = by_id[pid]
        if len(group) < 2:
            continue
        for rec in group:
            dupes.append(
                {
                    **rec,
                    "duplicate_photo_id": "Y",
                    "share_count": len(group),
                    "other_names_same_photo_id": "; ".join(
                        r["name"] for r in group if r["name"] != rec["name"]
                    ),
                }
            )
    return dupes


def analyze_school(school: dict) -> dict:
    school_dir = BASE / school["name"]
    photo_dir = school_dir / "photo"
    photos = load_photos(photo_dir)
    photo_id_min = int(school.get("photo_id_min") or DEFAULT_PHOTO_ID_MIN)

    students = parse_photo_id_workbook(school_dir / school["photo_id_file"], photo_id_min)
    staff: list[dict] = []
    if school.get("staff_file"):
        staff_path = school_dir / school["staff_file"]
        if staff_path.exists():
            staff = parse_staff_workbook(staff_path, photo_id_min)

    all_people = enrich_with_photo_status(students + staff, photos)
    used_photo_ids = {p["photo_id"] for p in all_people if p.get("photo_id") is not None}
    orphan_photos = find_orphan_photos(photos, used_photo_ids)

    with_photo = [p for p in all_people if p["has_photo"]]
    without_photo = [p for p in all_people if p.get("photo_id") is not None and not p["has_photo"]]
    no_photo_id = [p for p in all_people if p.get("photo_id") is None]

    students_with = [p for p in with_photo if p["type"] == "Student"]
    staff_with = [p for p in with_photo if p["type"] == "Staff"]
    students_without = [p for p in without_photo if p["type"] == "Student"]
    duplicate_photo_ids = find_duplicate_photo_ids(students)

    summary = {
        "School": school["name"],
        "Total photos in folder": len(photos),
        "Students in photo_id Excel": len(students),
        "Staff in Excel": len(staff),
        "Students with matching photo file": len(students_with),
        "Students missing photo file": len(students_without),
        "Staff with matching photo file": len(staff_with),
        "Staff without photo_id in Excel": len(no_photo_id),
        "Orphan photos (file exists, not in Excel)": len(orphan_photos),
        "Duplicate photo_id rows in Excel": len(duplicate_photo_ids),
        "Photo ID range in folder": (
            f"{min(photos)} - {max(photos)}" if photos else "N/A"
        ),
    }

    return {
        "school": school["name"],
        "summary": summary,
        "with_photo": with_photo,
        "without_photo": without_photo,
        "no_photo_id": no_photo_id,
        "orphan_photos": orphan_photos,
        "students_with": students_with,
        "staff_with": staff_with,
        "duplicate_photo_ids": duplicate_photo_ids,
    }


def to_dataframe(records: list[dict], columns: list[str]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame(columns=columns)
    df = pd.DataFrame(records)
    for col in columns:
        if col not in df.columns:
            df[col] = ""
    return df[columns]


def write_report(result: dict, output_path: Path) -> None:
    cols_people = ["type", "class", "number", "name", "position", "photo_id", "photo_file", "has_photo"]
    cols_orphan = ["photo_id", "photo_file", "type", "has_photo"]
    cols_dup = [
        "type",
        "class",
        "number",
        "name",
        "photo_id",
        "photo_file",
        "share_count",
        "other_names_same_photo_id",
        "has_photo",
    ]

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame([result["summary"]]).T.reset_index().rename(
            columns={"index": "Metric", 0: "Value"}
        ).to_excel(writer, sheet_name="Summary", index=False)

        to_dataframe(result["students_with"], cols_people).to_excel(
            writer, sheet_name="Students With Photo", index=False
        )
        to_dataframe(result["staff_with"], cols_people).to_excel(
            writer, sheet_name="Staff With Photo", index=False
        )
        to_dataframe(result["with_photo"], cols_people).to_excel(
            writer, sheet_name="All With Photo", index=False
        )
        to_dataframe(result["without_photo"], cols_people).to_excel(
            writer, sheet_name="Missing Photo File", index=False
        )
        to_dataframe(result["no_photo_id"], cols_people).to_excel(
            writer, sheet_name="No Photo ID", index=False
        )
        to_dataframe(result["orphan_photos"], cols_orphan).to_excel(
            writer, sheet_name="Orphan Photos", index=False
        )
        dup = result.get("duplicate_photo_ids") or []
        if dup:
            to_dataframe(dup, cols_dup).to_excel(writer, sheet_name="Duplicate Photo ID", index=False)
        else:
            pd.DataFrame({"info": ["No duplicate photo_id in upload Excel"]}).to_excel(
                writer, sheet_name="Duplicate Photo ID", index=False
            )


def main() -> None:
    all_summaries = []
    for school in SCHOOLS:
        school_dir = BASE / school["name"]
        if not school_dir.is_dir():
            print(f"\nSkipping {school['name']} (folder not found)")
            continue
        print(f"\nAnalyzing {school['name']}...")
        result = analyze_school(school)
        all_summaries.append(result["summary"])

        for key, value in result["summary"].items():
            if key != "School":
                print(f"  {key}: {value}")

        output_name = f"{school['name']} - Students and Staff With Photos.xlsx"
        output_path = school_dir / output_name
        write_report(result, output_path)
        print(f"  Report saved: {output_path.name}")

    combined_path = BASE / "PHOTO ANALYSIS SUMMARY - GASHONGA and NTENDEZI.xlsx"
    with pd.ExcelWriter(combined_path, engine="openpyxl") as writer:
        pd.DataFrame(all_summaries).to_excel(writer, sheet_name="Summary", index=False)
    print(f"\nCombined summary saved: {combined_path.name}")


if __name__ == "__main__":
    main()
