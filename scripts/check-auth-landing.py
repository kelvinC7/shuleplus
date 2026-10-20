from pathlib import Path
import re

root = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\src\LandingPage")
hits = []
for p in root.rglob("*"):
    if p.suffix not in {".tsx", ".ts", ".jsx", ".js"}:
        continue
    text = p.read_text(encoding="utf-8", errors="ignore")
    for i, line in enumerate(text.splitlines(), 1):
        for m in re.finditer(r"(['\"`])(.*?)\1", line):
            if "  " in m.group(2):
                hits.append(f"{p.name}:{i}: {line.strip()[:140]}")
                break

print("double-space strings", len(hits))
for h in hits[:30]:
    print(h)

src = Path(r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\src")
broken = []
for p in src.rglob("*"):
    if p.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
        continue
    if "/[]/g" in p.read_text(encoding="utf-8", errors="ignore"):
        broken.append(str(p.relative_to(src)))
print("broken regex", broken)

em = en = 0
for p in root.rglob("*"):
    if not p.is_file():
        continue
    t = p.read_text(encoding="utf-8", errors="ignore")
    em += t.count("\u2014")
    en += t.count("\u2013")
print("landing em", em, "en", en)
