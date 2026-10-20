School Budget — Word exports
============================

Generated with Pandoc from markdown in this folder.

| File | Contents |
|------|----------|
| School-Budget-Complete-Manual.docx | FEATURES_COMPLETE.md |
| School-Budget-Developer-Pack.docx | Hub + architecture + API + rules + backend |
| School-Budget-All-In-One.docx | Complete manual + all feature chapters + tech docs |

Regenerate (from accountant-school-budget/):

  pandoc FEATURES_COMPLETE.md -o word/School-Budget-Complete-Manual.docx --toc --toc-depth=3

  pandoc README.md 00-architecture.md DEVELOPER_GUIDE.md BACKEND_LOGIC.md API_REFERENCE.md BUSINESS_RULES.md DOC_STANDARDS.md -o word/School-Budget-Developer-Pack.docx --toc --toc-depth=2
