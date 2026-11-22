"""
Build Word (.docx) training guide from docs/MODULES_VIDEO_TRAINING.md
Uses only Python stdlib (zipfile + xml).
"""
from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "MODULES_VIDEO_TRAINING.md"
OUT_PATH = ROOT / "docs" / "ShulePlus_Module_Training_Guide.docx"
OUT_PATH_ALT = ROOT / "docs" / "ShulePlus_Module_Training_Guide_v2.docx"

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>"""


def w_p(text: str, style: str | None = None) -> str:
    text = escape(text)
    ppr = ""
    if style == "h1":
        ppr = '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
    elif style == "h2":
        ppr = '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>'
    elif style == "h3":
        ppr = '<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>'
    elif style == "bullet":
        ppr = (
            '<w:pPr><w:pStyle w:val="ListParagraph"/>'
            '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
        )
    elif style == "num":
        ppr = (
            '<w:pPr><w:pStyle w:val="ListParagraph"/>'
            '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>'
        )
    return f"<w:p>{ppr}<w:r><w:t xml:space=\"preserve\">{text}</w:t></w:r></w:p>"


def w_p_bold_label(label: str, body: str) -> str:
    label = escape(label)
    body = escape(body)
    return (
        f"<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space=\"preserve\">{label}</w:t></w:r>"
        f"<w:r><w:t xml:space=\"preserve\"> {body}</w:t></w:r></w:p>"
    )


def md_to_body(md: str) -> str:
    md = re.sub(
        r"^# ShulePlus — Module Training Guide\s*\n\n\*.*?\*\s*\n\n---\s*\n\n",
        "",
        md,
        count=1,
        flags=re.DOTALL,
    )
    blocks: list[str] = []
    lines = md.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip() == "---":
            i += 1
            continue
        if line.startswith("# "):
            blocks.append(w_p(line[2:].strip(), "h1"))
            i += 1
            continue
        if line.startswith("## "):
            blocks.append(w_p(line[3:].strip(), "h2"))
            i += 1
            continue
        if line.startswith("### "):
            blocks.append(w_p(line[4:].strip(), "h3"))
            i += 1
            continue
        if line.startswith("- "):
            blocks.append(w_p(line[2:].strip(), "bullet"))
            i += 1
            continue
        if re.match(r"^\d+\.\s", line):
            blocks.append(w_p(re.sub(r"^\d+\.\s", "", line).strip(), "num"))
            i += 1
            continue
        if line.strip():
            plain = re.sub(r"\*\*([^*]+)\*\*", r"\1", line.strip())
            blocks.append(w_p(plain))
        i += 1
    return "".join(blocks)


def build_document_xml(body: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>"""


def main() -> None:
    if not MD_PATH.is_file():
        print(f"Missing source: {MD_PATH}", file=sys.stderr)
        sys.exit(1)
    md = MD_PATH.read_text(encoding="utf-8")
    body = md_to_body(md)
    document_xml = build_document_xml(body)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    target = OUT_PATH
    try:
        zf_ctx = zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED)
    except PermissionError:
        target = OUT_PATH_ALT
        zf_ctx = zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED)
    with zf_ctx as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", RELS)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS)
        zf.writestr("word/document.xml", document_xml)
    print(f"Wrote {target}")


if __name__ == "__main__":
    main()
