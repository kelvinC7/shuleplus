# 04 — Requirements (Step 3)

Step 3 builds the student requirements list — standard catalog items plus custom entries with optional costs.

---

## Features

| Feature | Description |
|---------|-------------|
| **Standard package checklist** | Checkboxes from `student_requirements` catalog |
| **Select all** | Bulk-add all catalog items not yet selected |
| **Catalog loading states** | Spinner, error with retry, empty state message |
| **Custom requirements** | Add manual rows with item, description, quantity |
| **Pay channel per item** | Other requirements vs Paid to School Account |
| **Cost field** | Required when pay channel is "school" |
| **Other school information** | Freeform bullet items (also editable in Step 6) |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 3 |
| **Catalog fetch** | `loadStudentReqCatalog()` → `GET /student-requirements-catalog` |

### Requirement row shape

```js
{
  item: "",           // e.g. "Exercise books"
  description: "",    // e.g. "A4, 80gsm"
  quantity: "",       // e.g. "2 per term"
  pay_channel: "babyeyi" | "school",
  cost: ""            // RWF — only when pay_channel === "school"
}
```

### Catalog item mapping

Catalog rows map to requirement rows via `rowFromCatalog()`:
- `name` → `item`
- `description`, `quantity` copied from DB

### Other info row shape

```js
{ item: "" }  // e.g. "Parents must clear fees before exams"
```

---

## Backend logic

| Endpoint | Purpose |
|----------|---------|
| `GET /babyeyi/student-requirements-catalog` | Load standard checklist |

**Source table:** `student_requirements`  
Managed via Super Admin → requirement prices (when empty, wizard shows setup hint).

### FormData fields

```
requirements  → JSON [{ item, description, quantity, pay_channel, cost }]
other_infos   → JSON [{ item }]
classReqs     → JSON (class-specific notes, if used)
```

### Empty catalog behavior

If no rows in `student_requirements`:
- Checklist area shows setup message
- Custom requirements still work
- Select all button disabled
