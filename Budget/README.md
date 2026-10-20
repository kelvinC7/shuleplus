# School Budget

Modern ShulePlus School Budget module — plan income, allocate expenses, track usage, and manage approvals.

Matches the **HR / Assets Portal** UI shell (sidebar, page header, toasts, tables) and implements the logic in [`Docs/accountant-school-budget`](./Docs/accountant-school-budget).

## Ports

| Layer | URL |
|-------|-----|
| Backend API | http://localhost:3022/api |
| Frontend | http://localhost:3023 |

## Quick start

```bash
# Backend
cd Budget/Backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# Frontend
cd Budget/Frontend
npm install
npm run dev
```

## IAM seed

```bash
cd Authentication/Backend
npm run seed:school-budget
```

Or register via Super Admin → Module Catalog:

| Field | Value |
|--------|--------|
| Slug | `school-budget` |
| Frontend URL | `http://localhost:3023` |
| Backend URL | `http://localhost:3022/api` |
| Health | `/health` |

Then assign to org → provision tenant → open from Organization Admin.

## Core workflow

1. **Create Budget** — income sources (fixed / per-student + deductions)
2. **Submit** → Manager **Approve / Reject / Revision / Cancel**
3. **Expenses** — allocate lines (cannot exceed expected income)
4. **Usage** — post spend against lines (blocked if frozen / over remaining)
5. **Departments / Vs Actual / Analytics / Audit**

## Docs

See [`Docs/accountant-school-budget/README.md`](./Docs/accountant-school-budget/README.md).
