#!/usr/bin/env python3
"""Collapse double spaces left after em-dash removal inside LandingPage string literals."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\src\LandingPage")
EXT = {".tsx", ".ts", ".jsx", ".js"}

# Match single/double/backtick string literals (no nested template expressions complexity)
STR_RE = re.compile(r"('([^'\\]|\\.)*'|\"([^\"\\]|\\.)*\"|`([^`\\]|\\.)*`)")


def fix_literal(m: re.Match) -> str:
    s = m.group(0)
    # collapse 2+ spaces inside the quotes only
    inner = s[1:-1]
    if "  " not in inner:
        return s
    inner2 = re.sub(r" {2,}", " ", inner)
    return s[0] + inner2 + s[-1]


def main() -> None:
    changed = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in EXT:
            continue
        raw = path.read_text(encoding="utf-8")
        new = STR_RE.sub(fix_literal, raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            changed += 1
            print(path.relative_to(ROOT))
    print(f"changed={changed}")


if __name__ == "__main__":
    main()
