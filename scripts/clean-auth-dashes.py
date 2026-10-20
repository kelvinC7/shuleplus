#!/usr/bin/env python3
"""Remove em/en dashes and empty dash placeholders from Authentication Frontend (incl. LandingPage)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend")
SKIP = {"node_modules", ".next", "dist", "build", ".git"}
EXT = {".tsx", ".ts", ".jsx", ".js", ".css", ".md", ".json", ".html"}

EM = "\u2014"
EN = "\u2013"

PLACEHOLDER_RES = [
    (re.compile(r"(\?\?|\|\|)\s*'-'"), r"\1 ''"),
    (re.compile(r'(\?\?|\|\|)\s*"-"'), r'\1 ""'),
    (re.compile(r"return\s+'-'"), "return ''"),
    (re.compile(r'return\s+"-"'), 'return ""'),
    (re.compile(r"\{'-'\}"), "{''}"),
    (re.compile(r'\{"-"\}'), '{""}'),
    (re.compile(r"\?\s*'-'\s*:"), "? '' :"),
    (re.compile(r'\?\s*"-"\s*:'), '? "" :'),
    (re.compile(r"(\s:\s*)'-'(\s*[;,\)\}\]])"), r"\1''\2"),
    (re.compile(r'(\s:\s*)"-"(\s*[;,\)\}\]])'), r'\1""\2'),
    (re.compile(r"(!==|===|!=|==)\s*'-'"), r"\1 ''"),
    (re.compile(r'(!==|===|!=|==)\s*"-"'), r'\1 ""'),
    (re.compile(r">\s*'-'\s*<"), ">{''}<"),
    (re.compile(r'>\s*"-"\s*<'), '>{""}<'),
    (re.compile("'" + EM + "'"), "''"),
    (re.compile("'" + EN + "'"), "''"),
    (re.compile('"' + EM + '"'), '""'),
    (re.compile('"' + EN + '"'), '""'),
]


def clean_text(text: str) -> str:
    text = text.replace(EM, "").replace(EN, "")
    for pat, repl in PLACEHOLDER_RES:
        text = pat.sub(repl, text)
    return text


def main() -> None:
    changed = []
    scanned = 0
    remaining_before = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in EXT:
            continue
        if any(s in path.parts for s in SKIP):
            continue
        scanned += 1
        try:
            raw = path.read_text(encoding="utf-8")
        except Exception:
            continue
        remaining_before += raw.count(EM) + raw.count(EN)
        new = clean_text(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))

    # verify
    left = 0
    landing_left = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in EXT:
            continue
        if any(s in path.parts for s in SKIP):
            continue
        t = path.read_text(encoding="utf-8", errors="ignore")
        c = t.count(EM) + t.count(EN)
        left += c
        if "LandingPage" in path.parts:
            landing_left += c

    print(f"scanned={scanned} changed={len(changed)} unicode_before={remaining_before}")
    print(f"unicode_left={left} landing_left={landing_left}")
    for f in changed:
        if "LandingPage" in f.replace("\\", "/"):
            print(f"  LP: {f}")
    other = [f for f in changed if "LandingPage" not in f.replace("\\", "/")]
    print(f"other_auth_files={len(other)}")
    for f in other[:30]:
        print(f"  {f}")
    if len(other) > 30:
        print(f"  ... +{len(other)-30} more")


if __name__ == "__main__":
    main()
