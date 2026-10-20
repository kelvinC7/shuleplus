from pathlib import Path

root = Path(r"H:\Projects\ShulePlus\ShulePlus")
skip = {"node_modules", ".next", "dist", "build", ".git", "coverage", "docs", "config", "packages", "scripts"}
em = en = ph = 0
for child in root.iterdir():
    if not child.is_dir() or child.name in skip or child.name.startswith("."):
        continue
    for sub in ("Frontend/src", "Backend/src", "src"):
        src = child / sub
        if not src.is_dir():
            continue
        for p in src.rglob("*"):
            if p.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            if any(s in p.parts for s in skip):
                continue
            t = p.read_text(encoding="utf-8", errors="ignore")
            em += t.count("\u2014")
            en += t.count("\u2013")
            for s in ("?? '-'", "|| '-'", "return '-'", "? '-'", '? "-"', "?? \"-\"", "|| \"-\""):
                ph += t.count(s)
print("em", em, "en", en, "hyphen_placeholders", ph)
