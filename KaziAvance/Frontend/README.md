# KaziAdvance Frontend

Modern Next.js UI for KaziAdvance Employee Module with IAM SSO token handoff.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy env:
   - `copy .env.example .env.local`
3. Start app:
   - `npm run dev`
4. Open from IAM (not directly):
   - IAM launches `http://localhost:4401/dashboard?token=<accessToken>`

Environment:

- `NEXT_PUBLIC_KAZI_API_URL=http://localhost:4400`
- `NEXT_PUBLIC_IAM_URL=http://localhost:3000`

## IAM Launch Flow

Register the module in IAM **Super Admin → Module Catalog** (do not rely on seed).

1. Super admin creates module `kaziavance` in Module Catalog.
2. Super admin provisions/licenses it for an organization.
3. Org admin assigns it to users.
4. User signs in on IAM.
5. User opens KaziAdvance from `/post-login` or organization admin dashboard.
6. IAM redirects to `/dashboard?token=...`.
7. Frontend captures token, stores it, and calls protected KaziAdvance APIs.

If token is missing or module is not licensed, user sees an access denied screen with a link back to IAM.

## Implemented Screens/Blocks

- IAM SSO token bootstrap (no local login form).
- Employee dashboard welcome + profile summary.
- Financial KPI cards.
- Eligibility score with reasons.
- Smart advance calculator.
- Multi-step advance request wizard.
- Active advance + repayment tracker.
- Salary and advance history tables.
- Approval workflow timeline.
- Notifications center.
- Personal document upload + list + view.
