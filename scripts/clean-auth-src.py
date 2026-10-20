#!/usr/bin/env python3
"""Remove em/en dashes from Authentication (Frontend + Backend src). Do not break regex classes."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication")
SKIP = {"node_modules", ".next", "dist", "build", ".git"}
EXT = {".tsx", ".ts", ".jsx", ".js", ".css", ".md"}
EM, EN = "\u2014", "\u2013"

# Preserve dash-normalization intent: /[—–]/g or /[—]/g → remove those replaces or use empty
BROKEN_EMPTY_CLASS = re.compile(r"\.replace\(/\[\]/g,\s*['\"]-['\"]\)")

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
]


def clean_text(text: str) -> str:
    # Remove unicode dashes, but first rewrite common normalize patterns that include them
    text = re.sub(
        r"\.replace\(/\[(?:\u2014|\u2013)+\]/g,\s*['\"]-['\"]\)\.?",
        "",
        text,
    )
    text = text.replace(EM, "").replace(EN, "")
    text = BROKEN_EMPTY_CLASS.sub("", text)
    for pat, repl in PLACEHOLDER_RES:
        text = pat.sub(repl, text)
    # tidy double spaces only inside quotes for src files handled separately
    return text


def main() -> None:
    targets = [
        ROOT / "Frontend" / "src",
        ROOT / "Backend" / "src",
    ]
    changed = 0
    for base in targets:
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix not in EXT:
                continue
            if any(s in path.parts for s in SKIP):
                continue
            raw = path.read_text(encoding="utf-8")
            new = clean_text(raw)
            if new != raw:
                path.write_text(new, encoding="utf-8")
                changed += 1
                print(path.relative_to(ROOT))
    # verify
    left = 0
    for base in targets:
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix not in EXT:
                continue
            if any(s in path.parts for s in SKIP):
                continue
            t = path.read_text(encoding="utf-8", errors="ignore")
            left += t.count(EM) + t.count(EN)
    print(f"changed={changed} unicode_left_in_src={left}")


if __name__ == "__main__":
    main()
