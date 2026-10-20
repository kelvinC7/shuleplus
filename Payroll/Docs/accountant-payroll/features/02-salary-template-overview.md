# 02 — Salary Template Overview

## Page

**Route:** `/accountant/payroll/salary-template`  
**Component:** `SalaryTemplate.jsx`

---

## Walkthrough: Page load

| Step | What you do | What the system does |
|---|---|---|
| 1 | Open Salary Template | Shows loading spinner |
| 2 | Wait ~1–2 seconds | `loadTemplate()` runs |
| 3 | Page renders | Hero + stats + 4 tabs |

### Frontend design (on load)

```javascript
const [tpl, empRows] = await Promise.all([
  getActivePayrollTemplate(),           // GET /templates/active
  getEmployeePayrollDeductions(),       // GET /employee-deductions
]);
```

### Backend logic (on load)

- Reads `accountant_payroll_templates` for school (latest active, else highest version).
- Parses JSON: `allowances_json`, `deductions_json`, `paye_rates_json`, `statutory_json`, `rules_json`.
- Returns `null` if no template exists yet.

---

## Walkthrough: Header area

**Visual (screenshot-style):**

```
┌──────────────────────────────────────────────────────────────────┐
│ Finance · Payroll                                                │
│ Salary Template                                                  │
│                                                                  │
│ Badge: [Live from server]  [↻]  [Save Draft]  [Activate]         │
└──────────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┐
│ Active     │ Template   │ Employee   │ Template   │
│ Allowances │ Deductions │ Deductions │ Status     │
│     3      │     2      │     5      │   Draft    │
└────────────┴────────────┴────────────┴────────────┘
```

| Control | Purpose |
|---|---|
| **Live from server** | Green when template loaded successfully |
| **Refresh** | Re-fetch template + employee deductions |
| **Save Draft** | Persist without activating |
| **Activate** | Mark template active for Payroll Run |
| **Deactivate** | Turn off active flag (shown when already active) |

---

## Walkthrough: Save Draft

1. Configure any tab (allowances, deductions, statutory values in memory).
2. Click **Save Draft**.
3. Green notice: "Template saved as draft" or "Changes saved."
4. Status remains **Draft** (or **Inactive** if previously deactivated).

### Frontend

```javascript
persistTemplate("save_draft")
  → savePayrollTemplate({ action: "save_draft" | "update", ... })
```

### Backend

- If `templateId` exists: `UPDATE` row, `status = 'Draft'`, `is_active = 0`.
- If no ID: `INSERT` new version with `version_no + 1`.

---

## Walkthrough: Activate

1. Complete configuration on all tabs.
2. Click **Activate** (amber button).
3. Notice: "Template activated for payroll runs."
4. Stats show **Template Status: Active**.

### Backend (activate)

```
BEGIN TRANSACTION
  SET is_active = 0 FOR ALL school templates
  UPDATE target template SET status = 'Active', is_active = 1
COMMIT
appendAuditLog(action: 'activate')
```

**Important:** Only one active template per school at a time.

---

## Walkthrough: Deactivate

1. When template is Active, **Deactivate** replaces Activate.
2. Confirm dialog.
3. Payroll Run will block until you activate again (or another template is activated).

---

## Four tabs

| Tab key | Label | Auto-save on edit? |
|---|---|---|
| `allowances` | Allowances | Yes (via `onSaveDraft`) |
| `deductions` | Deductions | Yes |
| `statutory` | Statutory Rates | No (uses in-memory state until Save Draft/Activate) |
| `employee` | Employee Deductions | Yes (direct API CRUD) |

---

## Template payload shape (saved to DB)

```json
{
  "action": "activate",
  "templateId": 12,
  "name": "Rwanda School Payroll Template",
  "applyToAll": true,
  "allowances": [ ... ],
  "deductions": [ ... ],
  "payeRates": [ { "min": 0, "max": 60000, "rate": "0%" }, ... ],
  "statutory": { "rssbEmployee": 6, "ramaEmployee": 7.5, ... },
  "rules": { "allowanceAuto": { "enabled": true, "totalPercent": 30, ... } }
}
```

---

## Next

- [03 — Allowances Tab](./03-allowances-tab.md)
- [04 — Deductions Tab](./04-deductions-tab.md)
- [05 — Statutory Rates Tab](./05-statutory-rates-tab.md)
- [06 — Employee Deductions Tab](./06-employee-deductions-tab.md)
