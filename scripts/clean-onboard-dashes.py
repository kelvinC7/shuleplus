from pathlib import Path
import re

p = Path(
    r"H:\Projects\ShulePlus\ShulePlus\Authentication\Frontend\src\LandingPage\components\OnboardPage.tsx"
)
t = p.read_text(encoding="utf-8")
t = t.replace("\u2014", "").replace("\u2013", "")
t = re.sub(r"\|\|\s*''", "|| ''", t)
t = re.sub(r'\|\|\s*""', '|| ""', t)

def fix_str(m: re.Match) -> str:
    q, inner = m.group(1), m.group(2)
    if "  " not in inner:
        return m.group(0)
    return q + re.sub(r" {2,}", " ", inner) + q

t = re.sub(r"(['\"])([^'\"\\]*)\1", fix_str, t)
p.write_text(t, encoding="utf-8")
print("em", t.count("\u2014"), "SchoolSearchSelect", "SchoolSearchSelect" in t)
