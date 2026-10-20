# Accountant Payroll — Features Step-by-Step Index

User-friendly guides for **Payroll Salary Template** and **Staff Salary Setup**, including how the React frontend and Node backend work together.

> **Doc standard:** Every chapter includes **Frontend design** and **Backend logic** sections. See [DOC_STANDARDS](./DOC_STANDARDS.md).

## Main manuals

| Document | Purpose |
|---|---|
| [FEATURES_COMPLETE.md](./FEATURES_COMPLETE.md) | Full all-in-one manual (best for Word export) |
| [00-payroll-engine.md](./00-payroll-engine.md) | Rwanda PAYE, statutory math, channels |
| [00-architecture.md](./00-architecture.md) | Folder map, data flow, register columns |
| [13-services-and-utils.md](./13-services-and-utils.md) | API endpoints and utils index |

## Step-by-step chapters

| # | Guide | What it covers |
|---|---|---|
| 01 | [Getting Started](./features/01-getting-started.md) | Access, roles, routes, workflow order |
| 02 | [Salary Template Overview](./features/02-salary-template-overview.md) | Header, save draft, activate/deactivate, stats |
| 03 | [Allowances Tab](./features/03-allowances-tab.md) | Template allowances, auto Others/H/A/T/A |
| 04 | [Deductions Tab](./features/04-deductions-tab.md) | Recurring template deductions, channels |
| 05 | [Statutory Rates Tab](./features/05-statutory-rates-tab.md) | PAYE, CSR, RAMA, live register, export |
| 06 | [Employee Deductions Tab](./features/06-employee-deductions-tab.md) | Per-staff loans and advances |
| 07 | [Staff Salary Setup](./features/07-staff-salary-setup.md) | Normal payroll, earnings, deductions, advances |
| 08 | [Net-to-Gross Mode](./features/08-net-to-gross-mode.md) | Reverse salary calculation |
| 09 | [Frontend & Backend Flow](./features/09-frontend-backend-flow.md) | Request paths, DB tables, calc pipeline |
| 10 | [Validation & QA](./features/10-validation-and-qa.md) | Test checklist before Payroll Run |

## Recommended learning path

1. Getting Started  
2. Salary Template Overview → Allowances → Deductions → Statutory → Employee Deductions  
3. Activate template  
4. Staff Salary Setup (Normal mode)  
5. Net-to-Gross mode (if needed)  
6. Frontend & Backend Flow (developers)  
7. Validation & QA → proceed to [Payroll Run](./03-payroll-run.md)

## Source files

| Page | Component |
|---|---|
| Salary Template | `Frontend/web/src/accountant_portal/frontend/src/pages/Payroll/SalaryTemplate.jsx` |
| Staff Salary Setup | `Frontend/web/src/accountant_portal/frontend/src/pages/Payroll/StaffSalarySetup.jsx` |
| API service | `frontend/src/services/payrollTemplateService.js` |
| Payroll math | `frontend/src/utils/rwandaPayrollEngine.js` |
| Backend routes | `BabyeyiSystem/backend/BabyeyiRoutes/portalOperations.js` |
