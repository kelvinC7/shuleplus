#!/usr/bin/env python3
"""Extract OnboardPage.tsx content from agent transcript Write/StrReplace calls."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\ishim\.cursor\projects\h-Projects-ShulePlus\agent-transcripts"
    r"\96726314-cccf-49a0-93b7-e6f829bfbf5b\96726314-cccf-49a0-93b7-e6f829bfbf5b.jsonl"
)
TARGET = Path(
    r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\src"
    r"\LandingPage\components\OnboardPage.tsx"
)
BACKUP = TARGET.with_suffix(".tsx.bak-before-restore")

ops = []
with TRANSCRIPT.open(encoding="utf-8") as f:
    for line_no, line in enumerate(f, 1):
        if "OnboardPage.tsx" not in line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        content = obj.get("message", {}).get("content", [])
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            name = part.get("name")
            inp = part.get("input") or {}
            path = str(inp.get("path", ""))
            if "OnboardPage.tsx" not in path:
                continue
            if name == "Write" and inp.get("contents"):
                ops.append(("write", line_no, inp["contents"], None, None))
            elif name == "StrReplace":
                old = inp.get("old_string")
                new = inp.get("new_string")
                if old is not None and new is not None:
                    ops.append(("str", line_no, None, old, new))

print(f"found {len(ops)} ops")
for kind, ln, *_ in ops:
    print(f"  {kind} @ transcript line {ln}")

# Start from current file (HEAD), apply StrReplaces in order; Write replaces entirely
text = TARGET.read_text(encoding="utf-8")
shutil.copy2(TARGET, BACKUP)
print(f"backup -> {BACKUP}")

applied = 0
failed = []
for kind, ln, contents, old, new in ops:
    if kind == "write":
        text = contents
        applied += 1
        print(f"applied WRITE @{ln} len={len(contents)}")
    else:
        if old not in text:
            # try with em-dash variants already removed / hyphen
            variants = [
                old,
                old.replace("\u2014", "-").replace("\u2013", "-"),
                old.replace("\u2014", "").replace("\u2013", ""),
                old.replace(" — ", " - ").replace(" – ", " - "),
                old.replace(" — ", " ").replace(" – ", " "),
            ]
            matched = None
            for v in variants:
                if v in text:
                    matched = v
                    break
            if matched is None:
                failed.append((ln, old[:80].replace("\n", " ")))
                continue
            text = text.replace(matched, new, 1)
        else:
            text = text.replace(old, new, 1)
        applied += 1
        print(f"applied STR @{ln}")

TARGET.write_text(text, encoding="utf-8")
print(f"wrote {TARGET} ({len(text)} chars), applied={applied}, failed={len(failed)}")
for ln, preview in failed[:20]:
    print(f"  FAIL @{ln}: {preview}...")

# sanity checks
checks = ["SchoolSearchSelect", "isValidEmail", "isValidPhone", "StepSchool"]
for c in checks:
    print(f"  has {c}: {c in text}")
