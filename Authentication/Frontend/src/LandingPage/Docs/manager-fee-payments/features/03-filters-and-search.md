# 03 — Filters & Search

## Features

| Feature | Description |
|---------|-------------|
| **Search** | Filter by student name or student ID (client-side) |
| **Filter By Class** | Toggle chip bar; `View All` or specific class |
| **Status select** | All / Paid / Not paid / Partial payment |
| **Term select** | From AcademicContext active terms (+ Annual Review) |
| **Academic year select** | From AcademicContext years or generated list |
| **Bulk Payment** | Button present — **not wired** |

### Status option map (UI → API)

| UI label | Query `status` |
|----------|----------------|
| All status | *(omit / `all`)* |
| Paid | `full_pay` |
| Not paid | `not_paid` |
| Partial payment | `remain_pay` |

---

## Frontend design

| Item | Detail |
|------|--------|
| **State** | `searchTerm`, `showClassFilter`, `selectedClass`, `selectedStatus`, `selectedTerm`, `selectedYear` |
| **Class chips** | Built from `data.class_names` returned by API |
| **Refetch triggers** | Class, status, term, year (not search) |

Changing term/year/class/status re-calls the report API. Search only filters the already-loaded `students` array.

---

## Backend logic

| Param | Effect |
|-------|--------|
| `class_name` | Restrict students to that class |
| `status` | Restrict rows after status derivation |
| `academic_year`, `term` | Resolve fee cards + collections windows |
