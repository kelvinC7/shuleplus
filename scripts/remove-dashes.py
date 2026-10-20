#!/usr/bin/env python3
"""Safely remove em/en dashes and empty dash placeholders. Does not touch whitespace."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"H:\Projects\ShulePlus\ShulePlus")
SKIP = {
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    "coverage",
    "docs",
    "config",
    "packages",
    "scripts",
}
EXT = {".tsx", ".ts", ".jsx", ".js"}

EM = "\u2014"
EN = "\u2013"

PLACEHOLDER_RES = [
    (re.compile(r"(\?\?|\|\|)\s*'-'"), r"\1 ''"),
    (re.compile(r'(\?\?|\|\|)\s*"-"'), r'\1 ""'),
    (re.compile(r"return\s+'-'"), "return ''"),
    (re.compile(r'return\s+"-"'), 'return ""'),
    (re.compile(r"\{'-'\}"), "{''}"),
    (re.compile(r'\{"-"\}'), '{""}'),
    # ternary: cond ? '-' : x  OR  cond ? '-': x
    (re.compile(r"\?\s*'-'\s*:"), "? '' :"),
    (re.compile(r'\?\s*"-"\s*:'), '? "" :'),
    (re.compile(r"(\s:\s*)'-'(\s*[;,\)\}\]])"), r"\1''\2"),
    (re.compile(r'(\s:\s*)"-"(\s*[;,\)\}\]])'), r'\1""\2'),
    (re.compile(r"(!==|===|!=|==)\s*'-'"), r"\1 ''"),
    (re.compile(r'(!==|===|!=|==)\s*"-"'), r'\1 ""'),
    (re.compile(r">\s*'-'\s*<"), ">{''}<"),
    (re.compile(r'>\s*"-"\s*<'), '>{""}<'),
    (re.compile(r"(\?\?|\|\|)\s*'" + EM + "'"), r"\1 ''"),
    (re.compile(r"(\?\?|\|\|)\s*'" + EN + "'"), r"\1 ''"),
    (re.compile(r"return\s+'" + EM + "'"), "return ''"),
    (re.compile(r"return\s+'" + EN + "'"), "return ''"),
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
    changed = 0
    scanned = 0
    by_mod: dict[str, int] = {}
    for child in sorted(ROOT.iterdir()):
        if not child.is_dir() or child.name in SKIP or child.name.startswith("."):
            continue
        for sub in ("Frontend/src", "Backend/src", "src"):
            src = child / sub
            if not src.is_dir():
                continue
            for path in src.rglob("*"):
                if not path.is_file() or path.suffix not in EXT:
                    continue
                if any(s in path.parts for s in SKIP):
                    continue
                scanned += 1
                try:
                    raw = path.read_text(encoding="utf-8")
                except Exception:
                    continue
                new = clean_text(raw)
                if new == raw:
                    continue
                path.write_text(new, encoding="utf-8")
                changed += 1
                by_mod[child.name] = by_mod.get(child.name, 0) + 1
    for mod, n in sorted(by_mod.items()):
        print(f"{mod}: {n}")
    print(f"scanned={scanned} changed={changed}")


if __name__ == "__main__":
    main()
