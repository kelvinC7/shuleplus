# How Authentication Works in ShulePlus

**Audience:** Module teams (HR, Finance, Academic, etc.) and platform engineers  
**Related docs:** [Module Integration Guide](./MODULE_INTEGRATION_GUIDE.md), [Sample Module auth middleware](../SampleModule/Backend/src/middleware/auth.middleware.ts)

---

## TL;DR — Answer for teammates

> **Do we need Auth routes like `check/organizationId`, `check/role`, `check/isAdmin`?**  
> **No. Not as the primary design.**

Organization, role, and admin status are already inside the **JWT** that IAM issues at login.  
Each module must **verify the JWT locally** and read those fields. Calling Auth again for those checks on every request is unnecessary, slower, and not how Sample Module / the platform guide work.

| Question from teammaate | Answer |
|-------------------------|--------|
| Do I implement `check/organizationId` in Auth? | **No** — read `organizationId` from JWT |
| Do I implement `check/role` in Auth? | **No** — read `roles` from JWT |
| Do I implement `check/isAdmin` in Auth? | **No** — check `roles.includes('organization_admin')` (or platform roles) |
| What must my module implement? | JWT verify + module license check + tenant load |

---

## 1. Who authenticates users?

**Only IAM (Authentication service)** authenticates users.

- Login, MFA, password never happen inside HR / Payroll / Sample Module
- Modules never store passwords
- Modules only receive a signed access token and trust claims after verifying the signature

```
User → IAM Login → JWT
User → Module Frontend (?token=JWT)
Module Frontend → Module Backend (Authorization: Bearer JWT)
Module Backend verifies JWT locally (same JWT_ACCESS_SECRET as IAM)
```

---

## 2. What is inside the access token?

After successful login, IAM issues a JWT with this payload:

```json
{
  "sub": "user-uuid",
  "email": "mugabopeter@gmail.com",
  "organizationId": "org-uuid",
  "sessionId": "session-uuid",
  "roles": ["organization_member"],
  "modules": ["sample-module"]
}
```

### What each claim means for modules

| Claim | Use it for |
|-------|------------|
| `sub` | Current user id (`userId`) |
| `organizationId` | Tenant / school scope — **this replaces `check/organizationId`** |
| `roles` | Platform roles — **this replaces `check/role`** |
| `roles` includes `organization_admin` | Org admin — **this replaces `check/isAdmin`** |
| `modules` | Which apps the user may open |

### Common roles

| Role slug | Meaning |
|-----------|---------|
| `root_admin` | Platform root |
| `super_admin` | Platform super admin |
| `organization_admin` | School/org administrator |
| `organization_member` | Normal org user with assigned modules |

---

## 3. Correct pattern for every module backend

Copy the approach used by **Sample Module**:

1. Verify `Authorization: Bearer <token>` with shared `JWT_ACCESS_SECRET`
2. Reject if signature/expiry invalid → **401**
3. Reject if `modules` does not include your module slug → **403 Module Not Licensed**
4. Load tenant by `organizationId` → **403** if tenant not provisioned
5. Use `sub`, `organizationId`, `roles` in your business logic

### Example (same idea as Sample Module)

```ts
// 1) Verify JWT
const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

// 2) Organization — no Auth API call
const organizationId = payload.organizationId;

// 3) Role — no Auth API call
const roles: string[] = payload.roles ?? [];
const isOrgAdmin = roles.includes('organization_admin');

// 4) Module license — no Auth API call
if (!payload.modules?.includes(process.env.MODULE_SLUG)) {
  throw new Error('Module Not Licensed'); // 403
}
```

### Helper examples modules can use locally

```ts
function getOrganizationId(user: JwtPayload) {
  return user.organizationId;
}

function hasRole(user: JwtPayload, role: string) {
  return user.roles?.includes(role) ?? false;
}

function isOrgAdmin(user: JwtPayload) {
  return hasRole(user, 'organization_admin');
}

function isPlatformAdmin(user: JwtPayload) {
  return hasRole(user, 'root_admin') || hasRole(user, 'super_admin');
}
```

These helpers live **in the module**, not as new Auth HTTP routes.

---

## 4. Why checker routes are not necessary

Routes like:

```text
GET /check/organizationId
GET /check/role
GET /check/isAdmin
```

are redundant because:

1. **JWT already contains the answers** (signed by IAM)
2. Modules already must verify the JWT — that is the security boundary
3. Extra Auth round-trips on every API call add latency and coupling
4. Platform docs / Sample Module already standardize on **local JWT checks**
5. If Auth is briefly down, modules would fail even when tokens are still valid

### Security note

“Calling Auth again” does **not** replace JWT verification.  
If a module trusts an HTTP “check” response without verifying the token signature itself, that is weaker and incorrect.

Correct trust model:

> Module trusts claims **only after** verifying JWT signature with `JWT_ACCESS_SECRET`.

---

## 5. What Auth already provides (use these)

| Endpoint / mechanism | Purpose |
|----------------------|---------|
| `POST /api/v1/auth/login` | Authenticate user, issue JWT |
| `POST /api/v1/auth/refresh` | Refresh access token |
| `GET /api/v1/iam/me/modules` | List modules the user can launch (UI) |
| `GET /api/v1/iam/me/modules/:moduleSlug/visibility` | Head-of-module vs user visibility |
| JWT claims | Identity, org, roles, licensed modules |

Module teams should **not** invent parallel `check/*` endpoints for day-to-day authorization.

---

## 6. Optional later: one introspect API (only if needed)

If a module genuinely needs **live** confirmation (e.g. user was just suspended, modules revoked mid-session), prefer **one** endpoint later — not three:

```http
GET /api/v1/auth/introspect
Authorization: Bearer <accessToken>
```

Example response:

```json
{
  "active": true,
  "userId": "...",
  "organizationId": "...",
  "roles": ["organization_member"],
  "modules": ["sample-module"],
  "isOrgAdmin": false,
  "status": "ACTIVE"
}
```

### Rules if we ever add introspect

- Optional / rare (sensitive operations only)
- Not called on every list/get request
- Modules must still verify JWT signature first
- Do **not** ship separate `check/organizationId`, `check/role`, `check/isAdmin`

**Status today:** not required. Do not block module work waiting for it.

---

## 7. Frontend launch flow (so users open the right app)

1. User logs in on IAM (`http://localhost:3000`)
2. Org admin → `/organization-admin`
3. Org member → `/post-login`, which opens assigned module(s)
4. Module opens as:  
   `{frontendUrl}/dashboard?token=<accessToken>`
5. Module frontend stores token and sends `Authorization: Bearer …` to its backend

After module assignment changes, user should **sign out and sign in again** so JWT `modules` updates.

---

## 8. Checklist for module teams

- [ ] Share the same `JWT_ACCESS_SECRET` as IAM
- [ ] Verify Bearer JWT on every protected route
- [ ] Read `organizationId` from JWT (tenant scope)
- [ ] Read `roles` from JWT for admin/member logic
- [ ] Require your slug in JWT `modules`
- [ ] Load tenant for `organizationId`
- [ ] Do **not** depend on Auth `check/organizationId`, `check/role`, `check/isAdmin`
- [ ] Copy Sample Module middleware as reference

---

## 9. FAQ for teammates

### “How do I know the user’s organization?”
From JWT: `payload.organizationId`.

### “How do I know if the user is admin?”
From JWT:

```ts
payload.roles.includes('organization_admin')
```

### “How do I know their role?”
From JWT: `payload.roles` (array). Prefer role checks against known slugs.

### “Can Auth add checker routes so modules stay thin?”
Not recommended as the default. It conflicts with the platform contract (JWT self-contained auth). Keep authorization checks in module middleware.

### “What if JWT is stale after access was revoked?”
Access tokens expire (short-lived). User re-login/refresh updates claims. For critical revoke-now needs, consider one future introspect endpoint — not three checker routes.

---

## 10. Summary decision

| Proposal | Decision |
|----------|----------|
| Implement `check/organizationId` | **Reject as required work** |
| Implement `check/role` | **Reject as required work** |
| Implement `check/isAdmin` | **Reject as required work** |
| Module verifies JWT and reads claims | **Required — do this** |
| Optional future `auth/introspect` | Only if a proven live-check need appears |

**Platform position:** Authentication is centralized in IAM. **Authorization for modules is JWT-claim based.** Checker routes are not necessary for the current architecture.

---

## Reference files

| File | Why it matters |
|------|----------------|
| `docs/MODULE_INTEGRATION_GUIDE.md` | Official module integration contract |
| `SampleModule/Backend/src/middleware/auth.middleware.ts` | Working JWT + license check |
| `Authentication/Backend/src/middleware/auth.middleware.ts` | IAM JWT payload shape |
| `platform.env.example` | Shared secrets |

Questions from module teams about auth should be answered with this document first.
