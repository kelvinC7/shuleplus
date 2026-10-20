"""
Gashonga-style disk analysis + LIST 2027 dashboard for ST MATTHEWS RUSIZI PRIMARY.

Usage (on server, from docs/SchoolData):
  python3 build_rusizi_full_photo_reports.py
"""

from __future__ import annotations

from pathlib import Path

from analyze_school_photos import SCHOOLS, analyze_school, write_report
from build_photo_dashboard import generate_dashboard
from build_rusizi_primary_class_photo_lists import main as build_list_2027_reports

BASE = Path(__file__).resolve().parent
SCHOOL = "ST MATTHEWS RUSIZI PRIMARY"


def main() -> None:
    school_cfg = next(s for s in SCHOOLS if s["name"] == SCHOOL)

    print("=== LIST 2027 + app status ===")
    build_list_2027_reports()

    print("\n=== Gashonga-style folder vs Excel (uploaded / orphan / missing) ===")
    result = analyze_school(school_cfg)
    analysis_path = BASE / SCHOOL / f"{SCHOOL} - Students and Staff With Photos.xlsx"
    write_report(result, analysis_path)
    for key, value in result["summary"].items():
        if key != "School":
            print(f"  {key}: {value}")
    print(f"  Saved: {analysis_path.name}")

    dup = result.get("duplicate_photo_ids") or []
    if dup:
        print("\n  Duplicate photo_id (fix in Excel, then re-upload individually):")
        seen: set[int] = set()
        for row in dup:
            pid = int(row["photo_id"])
            if pid in seen:
                continue
            seen.add(pid)
            names = [d["name"] for d in dup if int(d["photo_id"]) == pid]
            print(f"    {pid}: {' | '.join(names)}")

    print("\n=== Photo dashboard (audit + LIST 2027 + remaining JPGs) ===")
    dash = generate_dashboard(SCHOOL, BASE / SCHOOL)
    print(f"  Saved: {dash.name}")


if __name__ == "__main__":
    main()
