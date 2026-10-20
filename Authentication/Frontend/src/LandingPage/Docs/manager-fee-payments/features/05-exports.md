# 05 — Exports

## Features

| Feature | Description |
|---------|-------------|
| **Export CSV** | Downloads filtered/searched ledger as `.csv` |
| **Export Excel** | Downloads same rows as `.xlsx` via SheetJS (`xlsx`) |

### Export columns

1. Student ID  
2. Student Name  
3. Class  
4. Expected Total (RWF)  
5. Paid (RWF)  
6. Remaining (RWF)  
7. Status  
8. Term  
9. Academic Year  

### Filename pattern

```
student-fee-ledger-{year}-{term}-{classPart}-{statusPart}.csv|.xlsx
```

Exports use **current UI filters** (`filteredStudents`), not a separate server export call.

---

## Frontend design

| Item | Detail |
|------|--------|
| **Handlers** | `exportLedgerCsv()`, `exportLedgerXlsx()` |
| **Library** | `import * as XLSX from 'xlsx'` |
| **Placement** | Hero stats right rail (desktop) |

---

## Backend logic

None for manager client exports. Accountant portal has server Excel/PDF export routes on the same report engine if needed later.
