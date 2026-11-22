# ShuleTrip — Stage 1 inspection & implementation plan

## Reference prototype (`GuideDocs/shuletrip_3.html`)

### What exists today

| Area | Prototype behavior | Preserve? |
|------|-------------------|-----------|
| Entry | Role picker: School vs Government console | Yes → `WelcomePage` |
| School portal | Dashboard KPIs, trip list, multi-step wizard (trip, roster, vehicle, driver, review) | Yes — expand to 7-step spec |
| Government | Overview, review queue, checkpoint QR verify, schools registry, settings, guidelines | Yes — align nav to spec §10 |
| Workflow | Sequential approvals by office (MoES-style), clearance codes, signed QR | Yes — replace with configurable engine + real JWT audit |
| Trip day | Boarding/return roll call, guardian SMS preview, missing learner alerts | Yes — §15 Trip operations |
| Documents | Printable clearance + manifest + public verify page (no PII) | Yes — §17 |
| Data | `localStorage` demo seed, Uganda-specific rule text | Migrate rules to **configurable** `trip_policy_rules`; default Rwanda-neutral |
| Brand | Navy/amber, sidebar shell, KPI cards, tables, stepper | Yes — map to Shule+ tokens `#000435` / `#FCB038` |

### Gaps vs product spec

- No Shule+ IAM, tenant DB, or Student Management manifest integration
- Approval workflow is hardcoded offices, not jurisdiction-configurable
- No guardian consent module, document uploads, or audit log persistence
- Government roles/jurisdiction not tied to real IAM claims
- Single HTML file — not maintainable for production

### Discard / refactor

- Uganda ministry crests and fixed legal copy → configurable templates per jurisdiction
- Demo signing secret in frontend → server-issued authorization tokens only
- “Smart ISAU suite” naming → Shule+ / EDUPOTO ShuleTrip

---

## Target architecture (aligned with Student Management)

```
ShuleTrip/
├── Backend/                 Express + Prisma + PostgreSQL (tenant per school org)
├── Frontend_react/          Vite + React + TypeScript + Tailwind
│   └── src/
│       ├── schools/         School portal routes, layouts, pages
│       ├── government/      Government workspace
│       └── shared/          Auth, API, design tokens, UI primitives
├── GuideDocs/               HTML prototype (reference only)
└── Docs/                    This plan, test checklist, API notes
```

**Ports:** BE `3076`, FE `3077` (add to `docs/PORTS.md` when registering in IAM).

**Auth**

- Schools: same IAM credentials as other modules; JWT must include `shule-trip` in `modules`; tenant provisioned via `POST /api/tenant/create`.
- Government: same IAM login; backend `requireGovernmentAccess` checks roles (e.g. `district_education_officer`, `sector_education_inspector`, `super_admin`) — exact role slugs configured in env.

**Integrations**

- Student manifest: HTTP client to Student Management `GET /service/students` (service key + organizationId).
- Notifications: Notification Service abstraction (Stage 3).
- Files: secure upload store on backend (Stage 3).

---

## Data model (Prisma — initial slice)

Core entities in `Backend/prisma/schema.prisma`:

- `Tenant` — school organization mirror
- `Trip` + lifecycle `TripStatus`
- `TripParticipant`, `TripStaff`, `TripVehicle`, `TripRoute`, `TripItineraryStop`
- `TripDocument`, `TripGuardianConsent`, `TripSafetyAssessment`
- `TripApprovalWorkflow`, `TripApproval`, `TripCorrectionRequest`
- `TripAuthorization`, `TripEvent`, `TripIncident`, `TripAuditLog`
- `TripPolicyRule` — jurisdiction-configurable requirements

---

## Delivery stages

### Stage 2 (current) — Interface shell

- [x] Welcome + portal selection
- [x] School / Government folder structure, layouts, navigation
- [x] School dashboard (API-driven KPIs with demo fallback)
- [x] Government overview + review queue (API + demo fallback)
- [x] Trip registration wizard skeleton (7 steps)
- [x] Backend health, tenant create, dashboard, trips list/create draft

### Stage 3 — Behavior

- Wire wizard to API; student picker from Student Management
- Document upload, consent tracking, safety engine
- Configurable approval workflow + government review workspace actions
- Notifications + audit log writes

### Stage 4 — Harden

- Permission matrix tests, cross-tenant isolation, print/PDF, offline trip-day sync
- IAM catalog registration, nginx module script, CI deploy

See [TEST_CHECKLIST.md](./TEST_CHECKLIST.md).
