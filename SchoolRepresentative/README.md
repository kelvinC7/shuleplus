# ShulePlus School Representative Portal

Multi-school oversight dashboard for users with the `school_representative` role.

## Location

| Layer | Path |
| --- | --- |
| Representative UI | `Authentication/Frontend/src/app/school-representative/` |
| Shared components | `Authentication/Frontend/src/components/school-representative/` |
| IAM APIs | `Authentication/Backend/src/routes/school-representative.routes.ts` (mounted at `/iam/representative`) |
| SuperAdmin management | `/super-admin/representatives` |

## Setup

1. Apply IAM schema (representative assignments, profiles, follow-ups).
2. Run seed or upsert the `school_representative` role on `babyeyi-platform`.
3. SuperAdmin → **Representatives** → create user and assign school organizations.
4. Representative signs in → redirected to `/school-representative`.

## Data model

- `SchoolRepresentativeProfile` — global permission template, MFA, access mode.
- `SchoolRepresentativeAssignment` — many-to-many user ↔ organization with optional per-school permissions.
- `RepresentativeFollowUp` — follow-up tasks created by representatives.
- `RepresentativeAlert` — optional persisted alerts (synthetic alerts shown when empty).

Cross-school metrics currently blend real IAM data (assigned schools, staff counts) with derived placeholders until Academic, Payroll, Attendance, and Fees microservice clients are wired.

## Next integration steps

- Organization-scoped HTTP clients for student counts, marks, payroll totals, and attendance rates.
- Redis caching for `/iam/representative/overview`.
- PDF/Excel report generation service with permission checks and audit logs.
