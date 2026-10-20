# 01 — Getting Started (Babyeyi Wizard)

## Access

1. Log in with a **School Admin** or **School Manager** account on Pro.
2. Confirm the school has **Pro access** or your user has `pro.school_console.access`.
3. Sidebar → **Babyeyi School Admin** → **Babyeyi Wizard**.
4. Opens `/manager/school-console?tab=babyeyi`.

Alternative entry points:
- Dashboard → **Create New Babyeyi** button
- Dashboard → NESA exceed alert → redirects to wizard
- Babyeyi List → **Edit** on a card → opens wizard in modal

---

## Frontend design

| Item | Detail |
|------|--------|
| **Route** | `/manager/school-console?tab=babyeyi` |
| **Shell** | `SchoolLiteSuite.jsx` — tab router |
| **Component** | `schoolLite/Babyeyi.jsx` — `BabyeyiWizard` |
| **Layout** | 8-step horizontal stepper, amber progress bar, navy headings |
| **Access gate** | `canAccessSchoolConsole()` in `PortalRoutes.jsx` |

### Visual design

- Navy `#000435` for headings and primary text
- Amber gradient `#c87800` → `#FEBF10` for progress and CTAs
- Font: `"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif`
- Mobile-first Tailwind; step pills scroll horizontally on small screens

### State on load

| Fetch | Endpoint | Purpose |
|-------|----------|---------|
| School info | `GET /babyeyi/school-info` | Ownership, location, assets |
| Classes | `GET /schools/:id/classes` | Class picker options |
| Requirements catalog | `GET /student-requirements-catalog` | Step 3 checklist |
| Academic defaults | `AcademicContext` | Year and term from settings |

---

## Backend logic

| Item | Detail |
|------|--------|
| **Auth** | Session cookie; school scoped to logged-in manager |
| **Permission** | `pro.school_console.access` or school `pro_access_effective` |
| **Tables** | `schools`, `school_classes`, `student_requirements`, `babyeyi_documents` |

---

## Module map

```
/manager/school-console
├── ?tab=dashboard      → Stats, NESA alerts, quick actions
├── ?tab=babyeyi        → ★ 8-step wizard (this module)
├── ?tab=babyeyi_list   → Registry, view, PDF, share
├── ?tab=students       → Student management
├── ?tab=student_transfer
└── ?tab=school_mini_website
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Dev | Backend URL |
| `VITE_BABYEYI_VERIFY_PUBLIC_URL` | Prod | Public verify domain for QR |
| `VITE_BABYEYI_LOGIN_URL` | Optional | Login redirect for verify page |

---

## First-time developer checklist

1. Backend running on port 5100
2. Frontend running with correct `VITE_API_URL`
3. Test school has registered classes
4. Test school ownership set (Government / Private / Government-Aided)
5. Open wizard and confirm Step 1 loads school profile banner
