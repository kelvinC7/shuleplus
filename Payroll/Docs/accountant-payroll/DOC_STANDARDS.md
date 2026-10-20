# Accountant Payroll — Documentation Standards

Every page doc and feature chapter in `docs/accountant-payroll/` must include **two mandatory sections**:

---

## 1. Frontend design

Describe how the UI is built and behaves.

| Subsection | Include |
|---|---|
| **Route & component** | Path, main `.jsx` file, child components |
| **Layout** | Hero, tabs, split panels, modals, tables |
| **Visual design** | `AccountantOchreHero`, navy `#000435`, amber `#F59E0B`, cards, register tables |
| **State** | React `useState` / `useMemo` / `useCallback` keys, what triggers re-render |
| **User actions** | Buttons, forms, tabs — what each control does |
| **Client services** | `*Service.js` functions called |
| **Client utils** | `rwandaPayrollEngine.js`, `payrollRegister.js`, etc. |

---

## 2. Backend logic

Describe how the server persists and validates data.

| Subsection | Include |
|---|---|
| **API endpoints** | Method + path from `portalOperations.js` |
| **Auth** | `ACCOUNTANT_READ_ROLES` / `ACCOUNTANT_WRITE_ROLES` |
| **Database tables** | MySQL tables and JSON columns |
| **Business rules** | Validation, status transitions, transactions |
| **Calculation** | Server-side `calcRwandaPayroll` when used |
| **Audit** | `appendAuditLog()` where applicable |

---

## Document index (all must follow this standard)

| Doc | Page |
|---|---|
| [01-salary-template](./01-salary-template.md) | Salary Template |
| [02-staff-salary-setup](./02-staff-salary-setup.md) | Staff Salary Setup |
| [03-payroll-run](./03-payroll-run.md) | Payroll Run |
| [04-payroll-reports](./04-payroll-reports.md) | Payroll Reports |
| [05-termination-benefits](./05-termination-benefits.md) | Termination Benefits |
| [06-salary-payment](./06-salary-payment.md) | Salary Payment |
| [07-employees-hr](./07-employees-hr.md) | Employee Directory |
| [08-payroll-disbursement](./08-payroll-disbursement.md) | Disbursement |
| [09-payslips](./09-payslips.md) | Payslips |
| [10-bank-payroll](./10-bank-payroll.md) | Bank Payroll |
| [11-my-payroll](./11-my-payroll.md) | My Payroll |
| [features/*](./FEATURES_INDEX.md) | Step-by-step chapters |

Shared references: [00-architecture](./00-architecture.md) · [00-payroll-engine](./00-payroll-engine.md) · [13-services-and-utils](./13-services-and-utils.md)
