"""
Extract accredited school lists from district PDFs into schools-catalog.json.

PDFs break school rows across lines. We flatten whitespace, then walk SN+DISTRICT
starts and take the next STATUS within a bounded window (no catastrophic regex).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\public\Schools")
OUT = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\public\schools-catalog.json")

STATUS_PAT = re.compile(
    r"(?i)\b("
    r"PRIVATE|PUBLIC|"
    r"GOVERNMENT\s+AIDED|"
    r"GOVT?\.?\s*AIDED|GOVT?AIDED|"
    r"GVT\.?\s*AIDED|GVTAIDED|"
    r"GV\.?\s*AIDED|GVAIDED|"
    r"G\.?\s*AIDED|G\.AIDED"
    r")\b"
)

SMALL = {"and", "of", "the", "for", "de", "des", "du", "la", "le", "les", "et"}
ACRONYMS = {
    "GS", "EP", "ES", "TSS", "VTC", "TVET", "APEF", "APAPEB", "SOS", "EAV",
    "ESTHER'S", "ITS", "CMAK", "CFP", "JOC", "CSW", "APEFOC", "RCS", "ETAG",
    "ESTG", "APPEC", "APAPEM", "KETHA",
}
NOISE = {
    "SCHOOL", "NAME", "DISTRICT", "SECTOR", "TYPE", "STATUS", "BOARDING",
    "ACCREDITED", "PROGRAMS", "SN", "LIST", "OF", "IN", "FOR", "THE", "YEAR",
}
INVALID_NAME_KEYS = {"AND", "PS", "BPS", "OR", "TO", "A"}
TRADE_START = re.compile(
    r"(?i)^(building|electrical|tailoring|fashion|software|tourism|food|"
    r"masonry|welding|carpentry|hair|networking|automobile|manufacturing|"
    r"plumbing|wood|agriculture|animal|culinary|leather|domestic|electronics|"
    r"multimedia|public works|forestry|computer)\b"
)


def smart_name(raw: str | None) -> str | None:
    if not raw:
        return None
    parts: list[str] = []
    for i, w in enumerate(re.split(r"\s+", raw.strip())):
        if not w:
            continue
        up = re.sub(r"[^A-Z0-9]", "", w.upper())
        if up in ACRONYMS or (len(w) <= 3 and w.isupper() and w.isalpha()):
            parts.append(w.upper() if w.isalpha() else w)
        elif i > 0 and w.lower() in SMALL:
            parts.append(w.lower())
        elif w.isupper() or w.islower():
            parts.append(w.capitalize())
        else:
            parts.append(w)
    return " ".join(parts)


def normalize_status(status: str) -> str:
    su = re.sub(r"[\.\-]", " ", status.upper())
    su = re.sub(r"\s+", " ", su).strip()
    if "PRIVATE" in su:
        return "Private"
    if "PUBLIC" in su:
        return "Public"
    if "AIDED" in su or "GOVERNMENT" in su:
        return "Gov Aided"
    return status.title()


def name_key(name: str, sector: str | None = None) -> str:
    n = re.sub(r"[^A-Z0-9]", "", name.upper())
    s = re.sub(r"[^A-Z0-9]", "", (sector or "").upper())
    return f"{s}::{n}" if s else n


def extract_text(pdf: Path) -> str:
    reader = PdfReader(str(pdf))
    return "\n".join((p.extract_text() or "") for p in reader.pages).replace("\r", "")


def split_sections(text: str) -> tuple[str, str]:
    upper = text.upper()
    for marker in (
        "SCHOOLS WITH GENERAL EDUCATION",
        "GENERAL EDUCATION AND PROFESSIONAL",
        "2. SCHOOLS WITH GENERAL",
    ):
        idx = upper.find(marker)
        if idx >= 0:
            return text[:idx], text[idx:]
    return text, ""


def flatten(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_school_name(middle: str, *, tvet: bool) -> tuple[str | None, str | None]:
    """Return (sector|None, name)."""
    middle = re.sub(r"\s+", " ", middle).strip(" -|,")
    if tvet:
        middle = re.sub(
            r"\s+(TSS|VTC|SHORT\s+COURSE)(\s+(TSS|VTC|SHORT\s+COURSE))*\s*$",
            "",
            middle,
            flags=re.I,
        ).strip()
        middle = re.sub(r"\s+\(?TSS\)?\s*$", "", middle, flags=re.I).strip()
        middle = re.sub(r"\s+\(?VTC\)?\s*$", "", middle, flags=re.I).strip()
        name = middle.strip(" -|,")
        if len(name) < 3 or TRADE_START.match(name):
            return None, None
        key = re.sub(r"[^A-Z0-9]", "", name.upper())
        if name.upper() in NOISE or key in INVALID_NAME_KEYS:
            return None, None
        return None, name

    parts = middle.split(" ")
    if len(parts) == 1:
        name = parts[0].strip(" -|,")
        key = re.sub(r"[^A-Z0-9]", "", name.upper())
        if len(key) < 4 or key in INVALID_NAME_KEYS or name.upper() in NOISE:
            return None, None
        return None, name
    if len(parts) < 2:
        return None, None
    sector, name = parts[0], " ".join(parts[1:]).strip(" -|,")
    key = re.sub(r"[^A-Z0-9]", "", name.upper())
    # Official lists often abbreviate unnamed primaries as "P/S" / "PS" under a sector
    if key in {"PS", "BPS"} and sector:
        return sector, f"P/S {sector}"
    # Don't treat "NURSERY AND PRIMARY SCHOOL …" as sector+name crumbs
    if sector.upper() in {"NURSERY", "PRIMARY", "SECONDARY"} or name.upper().startswith(
        ("AND PRIMARY", "AND SECONDARY", "PRIMARY SCHOOL", "AND ")
    ):
        full = middle.strip(" -|,")
        if len(full) >= 4:
            return None, full
    if len(name) < 3 or key in INVALID_NAME_KEYS:
        return None, None
    # "Happiness School" / "Pioneer School" — second token is a generic noun
    if name.upper() in {"SCHOOL", "ACADEMY", "COLLEGE", "LYCEE", "COMPLEX"} and sector:
        return None, f"{sector} {name}"
    if sector.upper() in NOISE or name.upper() in NOISE:
        return None, None
    return sector, name


def parse_section(flat: str, district: str, *, tvet: bool) -> list[dict]:
    if not flat:
        return []
    start_pat = re.compile(rf"(?i)(?<!\d)(\d{{1,3}})\.?\s+{re.escape(district)}\b")
    starts = list(start_pat.finditer(flat))
    schools: list[dict] = []
    window = 360  # chars after district token — enough for multi-word names

    for i, m in enumerate(starts):
        sn = int(m.group(1))
        after = m.end()
        # Don't run past the next school start
        end_limit = starts[i + 1].start() if i + 1 < len(starts) else min(len(flat), after + window)
        end_limit = min(end_limit, after + window)
        chunk = flat[after:end_limit]
        sm = STATUS_PAT.search(chunk)
        if not sm:
            continue
        middle = chunk[: sm.start()].strip()
        status = sm.group(1)
        sector, name = clean_school_name(middle, tvet=tvet)
        if not name:
            continue
        schools.append(
            {
                "sn": sn,
                "name": smart_name(name) or name,
                "sector": smart_name(sector) if sector else None,
                "status": normalize_status(status),
                "type": "TVET" if tvet else "GENERAL",
                "district": district,
            }
        )
    return schools


def merge_schools(tvet: list[dict], general: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}

    def put(entry: dict) -> None:
        key = name_key(entry["name"], entry.get("sector"))
        bare = name_key(entry["name"], None)
        # If we already have bare TVET and this is GENERAL with sector, replace
        if entry.get("type") == "GENERAL":
            if bare in by_key and by_key[bare].get("type") == "TVET" and not by_key[bare].get("sector"):
                del by_key[bare]
            by_key[key] = entry
            return
        # TVET: only add if no general (bare or sectored) already covers the name
        if bare in by_key or any(
            name_key(v["name"], None) == bare and v.get("type") == "GENERAL" for v in by_key.values()
        ):
            return
        by_key[key] = entry

    for e in general:
        put(e)
    for e in tvet:
        put(e)

    cleaned = list(by_key.values())
    cleaned.sort(key=lambda x: ((x.get("sector") or ""), x["name"].lower()))
    for e in cleaned:
        e.pop("sn", None)
    return cleaned


def process_pdf(pdf: Path) -> tuple[str, list[dict], dict]:
    district = re.split(r"_+", pdf.name)[0].upper()
    raw = extract_text(pdf)
    tvet_raw, general_raw = split_sections(raw)
    tvet = parse_section(flatten(tvet_raw), district, tvet=True)
    general = parse_section(flatten(general_raw), district, tvet=False)
    merged = merge_schools(tvet, general)
    return district, merged, {
        "tvet": len(tvet),
        "general": len(general),
        "merged": len(merged),
    }


def main() -> None:
    catalog: dict[str, list] = {}
    pdfs = sorted(ROOT.rglob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"No PDFs under {ROOT}")

    for pdf in pdfs:
        try:
            district, schools, stats = process_pdf(pdf)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {pdf.name}: {exc}")
            continue
        catalog[district] = schools
        print(
            f"{district}: {stats['merged']} "
            f"(general={stats['general']}, tvet={stats['tvet']})"
        )

    payload = {
        "generatedFrom": "public/Schools/*.pdf accredited lists October 2024",
        "districtCount": len(catalog),
        "schoolCount": sum(len(v) for v in catalog.values()),
        "districts": {d: schools for d, schools in sorted(catalog.items())},
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT, "total", payload["schoolCount"])


if __name__ == "__main__":
    main()
