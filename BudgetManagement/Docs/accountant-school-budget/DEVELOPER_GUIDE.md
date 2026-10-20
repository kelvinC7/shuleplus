# School Budget — Developer Guide

## Canonical shell

`accountant_portal/frontend/src/pages/schoolBugdet.jsx`

- Owns `activePage` state (nav ids from `schoolBudgetNav.js`)  
- Wraps `SchoolBudgetDataContext`  
- Renders nested sidebar + page component map  

**Note:** Filename is misspelled (`Bugdet`). Prefer not renaming without updating all imports.

## Adding a nested page

1. Add item to `SCHOOL_BUDGET_NAV` in `schoolBudgetNav.js`.  
2. Create page component under `pages/`.  
3. Register in `schoolBugdet.jsx` page map.  
4. Document in `features/`.

## Extending income sources

1. Preset in `budgetIncomeConfig.js` (`INCOME_SOURCE_PRESETS`).  
2. Ensure backend options / validation accepts the key.  
3. Store calc details in `config_json`.

## Wiring a real budget-line update

Frontend already has `updateBudgetLine` → `PATCH /accountant/budget-lines/:id`.  
Implement matching handler in `portalOperations.js` with:

- Edit only when parent budget allows  
- Re-validate remaining allocation when planned amount changes  
- Audit log  

## Manager vs Accountant

| Concern | Accountant | Manager |
|---------|------------|---------|
| Create / submit | ✅ | — |
| Approve / reject | — | ✅ |
| Allocate lines | ✅ (approved budget) | View |
| Freeze line | — | ✅ |
| Register usage | ✅ | — |

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Empty dashboard | Select or approve a budget |
| Cannot edit | Status not draft/rejected |
| Cannot add line | Unallocated income exhausted |
| Usage fails | Line frozen or over remaining |
| Tuition blank | Run fee-card analysis / ensure Babyeyi fees exist |
| PATCH line 404 | Backend update route missing |

## Testing checklist

- [ ] Create draft with income + deductions  
- [ ] Submit → appears on manager `/finance/budgets`  
- [ ] Approve → allocate lines → register usage  
- [ ] Reject → edit → resubmit  
- [ ] Freeze line → usage blocked  
- [ ] Department + vs-actual pages refresh  
- [ ] Export PDF/Excel from view modal  
