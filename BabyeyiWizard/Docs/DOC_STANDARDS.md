# Babyeyi Wizard — Documentation Standards

Every page doc and feature chapter in `docs/babyeyi-wizard/` must include **two mandatory sections**:

---

## 1. Frontend design

Describe how the UI is built and behaves.

| Subsection | Include |
|------------|---------|
| **Route & component** | Path, main `.jsx` file, child components |
| **Layout** | Stepper, modals, cards, file upload zones |
| **Visual design** | Navy `#000435`, amber `#FEBF10` / `#F59E0B`, MTN font stack, Tailwind |
| **State** | React `useState` / `useMemo` keys, what triggers re-render |
| **User actions** | Buttons, toggles, forms — what each control does |
| **Client utils** | `babyeyiWizardSchoolScope.js`, `schoolLiteApi.js`, `educationLevelClasses.js` |

---

## 2. Backend logic

Describe how the server persists and validates data.

| Subsection | Include |
|------------|---------|
| **API endpoints** | Method + path from `babyeyi.js` |
| **Auth** | Session cookie `babyeyi_sid`, school console permission |
| **Database tables** | `babyeyi_documents`, `student_requirements`, school profile assets |
| **Business rules** | NESA scope, ownership locks, approval status transitions |
| **FormData fields** | Multipart field names for POST/PUT |
| **Assets** | `upload-asset` types: logo, signature, stamp |

---

## Document index (all must follow this standard)

| Doc | Page |
|-----|------|
| [features/01-getting-started](./features/01-getting-started.md) | Access & module map |
| [features/02-school-and-classes](./features/02-school-and-classes.md) | Step 1 |
| [features/03-payments-and-nesa](./features/03-payments-and-nesa.md) | Step 2 |
| [features/04-requirements](./features/04-requirements.md) | Step 3 |
| [features/05-bank-account](./features/05-bank-account.md) | Step 4 |
| [features/06-authorization](./features/06-authorization.md) | Step 5 |
| [features/07-class-notes](./features/07-class-notes.md) | Step 6 |
| [features/08-leaders](./features/08-leaders.md) | Step 7 |
| [features/09-preview-and-submit](./features/09-preview-and-submit.md) | Step 8 |
| [features/10-babyeyi-list](./features/10-babyeyi-list.md) | List & documents |

Shared references: [00-architecture](./00-architecture.md) · [BUSINESS_RULES](./BUSINESS_RULES.md) · [API_REFERENCE](./API_REFERENCE.md)
