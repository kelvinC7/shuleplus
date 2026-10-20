# ShulePlus IAM Service Architecture v1.0

| Item | Value |
|------|-------|
| Document Name | ShulePlus IAM Service Architecture |
| Version | 1.0 |
| System | ShulePlus Platform (Babyeyi) |
| Service | Identity & Access Management (IAM) |
| Architecture Style | Microservices |
| Technology Stack | Next.js, Node.js, Express.js, PostgreSQL, Prisma, Redis, Swagger |
| Status | Development |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Repository Layout](#2-repository-layout)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Backend Architecture (MVC)](#4-backend-architecture-mvc)
5. [API Documentation (Swagger)](#5-api-documentation-swagger)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Database Model](#7-database-model)
8. [Core Domains](#8-core-domains)
9. [Authentication Flow](#9-authentication-flow)
10. [Post Sign-In Experience](#10-post-sign-in-experience)
11. [Role & Permission Architecture](#11-role--permission-architecture)
12. [Session Management](#12-session-management)
13. [Security Policies](#13-security-policies)
14. [Audit Logging](#14-audit-logging)
15. [Environment Variables](#15-environment-variables)
16. [Local Development Setup](#16-local-development-setup)
17. [Deployment](#17-deployment)
18. [Implementation Roadmap](#18-implementation-roadmap)
19. [Future Roadmap (v2.0)](#19-future-roadmap-v20)

---

## 1. Introduction

### Purpose

The ShulePlus Identity and Access Management (IAM) Service provides centralized authentication, authorization, session management, organization management, role management, permission management, and security policies for all ShulePlus microservices.

The IAM Service acts as the **security backbone** of the ShulePlus ecosystem.

### Objectives

| Capability | Description |
|------------|-------------|
| Secure authentication | Email/password with bcrypt hashing |
| Single Sign-On (SSO) | One login across Education, Finance, HR, RFID, Inventory |
| Multi-tenant organizations | Schools, universities, NGOs, hospitals, etc. |
| RBAC | Role-Based Access Control with hierarchy |
| Permission-based access | Fine-grained `module.action` permissions |
| Session management | Device tracking, logout all, revocation |
| Audit logging | Every security-sensitive action logged |
| MFA | Email OTP and Authenticator App (Phase 2) |
| API security | JWT, rate limiting, brute-force protection |

---

## 2. Repository Layout

```
Authentication/
├── ARCHITECTURE.md          # This document
├── docker-compose.yml       # PostgreSQL + Redis for local dev
├── Backend/                 # Express.js IAM API
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/          # env, database, redis, swagger
│   │   ├── controllers/     # HTTP handlers
│   │   ├── middleware/      # auth, errors, rate limits
│   │   ├── routes/          # Route definitions
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Security helpers
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
└── Frontend/                # Next.js auth UI
    ├── public/
    │   ├── logo.svg
    │   └── auth-background.jpg   # Add your image here
    ├── src/
    │   ├── app/             # App Router pages
    │   ├── components/      # UI + auth components
    │   └── lib/             # API client
    └── package.json
```

---

## 3. High-Level Architecture

```
                    User
                      │
                      ▼
                 Next.js (Frontend)
                      │
                      ▼
                 API Gateway (future)
                      │
                      ▼
                 IAM Service (Backend)
        ┌─────────────┼─────────────┐
        ▼                           ▼
   PostgreSQL                   Redis
        │                           │
 Users / Roles             Sessions / Token Cache
 Permissions               Login Tracking
 Organizations
```

### Request Flow

1. User interacts with Next.js frontend (`Frontend/`)
2. Frontend calls IAM REST API via Axios (`NEXT_PUBLIC_API_URL`)
3. Express routes → controllers → services → Prisma/Redis
4. JWT access token returned; refresh token stored hashed in DB
5. Other microservices validate JWT (shared secret or JWKS in v2)

---

## 4. Backend Architecture (MVC)

The backend follows **Model–View–Controller** adapted for REST APIs:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Model** | `prisma/schema.prisma` + Prisma Client | Data persistence, relations, enums |
| **View** | JSON HTTP responses | No server-side templates |
| **Controller** | `src/controllers/*.ts` | Parse request, call service, send response |
| **Routes** | `src/routes/*.ts` | URL mapping, middleware attachment |
| **Service** | `src/services/*.ts` | Business logic, validation orchestration |
| **Middleware** | `src/middleware/*.ts` | Auth, rate limits, error handling |

### Layer Rules

- **Routes** only wire HTTP verbs to controller methods. No business logic.
- **Controllers** are thin: validate input (Zod), call service, format JSON.
- **Services** contain all business rules (login attempts, MFA checks, audit).
- **Never** call Prisma directly from controllers.

### Example: Login

```
POST /api/v1/auth/login
  → auth.routes.ts
  → loginRateLimiter middleware
  → auth.controller.login()
  → auth.service.login()
  → prisma.user.findFirst() + bcrypt + session creation
  → JSON { accessToken, refreshToken, user }
```

### Adding a New Feature

1. Update `prisma/schema.prisma` if schema changes needed
2. Run `npm run prisma:migrate`
3. Create `src/services/<domain>.service.ts`
4. Create `src/controllers/<domain>.controller.ts` with `@swagger` JSDoc
5. Create `src/routes/<domain>.routes.ts`
6. Register in `src/routes/index.ts`

---

## 5. API Documentation (Swagger)

### Overview

API documentation uses **OpenAPI 3.0** via:

- `swagger-jsdoc` — generates spec from JSDoc comments in controllers/routes
- `swagger-ui-express` — serves interactive Swagger UI

### Access URLs

| Environment | Swagger UI | OpenAPI JSON |
|-------------|------------|--------------|
| Local | http://localhost:3001/api/docs | http://localhost:3001/api/docs.json |

### Configuration

| File | Purpose |
|------|---------|
| `src/config/swagger.ts` | OpenAPI definition, shared schemas, security schemes |
| `src/controllers/*.ts` | Per-endpoint `@swagger` JSDoc blocks |
| `src/routes/index.ts` | Health check and route-level docs |

### Documenting a New Endpoint

Add a JSDoc block above the controller method:

```typescript
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
```

Shared schemas (LoginRequest, UserProfile, Error, etc.) live in `src/config/swagger.ts` under `components.schemas`.

### Testing Protected Endpoints

1. Call `POST /api/v1/auth/login` in Swagger UI
2. Copy `accessToken` from response
3. Click **Authorize** → enter `Bearer <token>`
4. Call protected endpoints

### Disabling Swagger in Production

Set `SWAGGER_ENABLED=false` in production `.env`.

---

## 6. Frontend Architecture

### Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 | App Router, SSR/SSG where needed |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling with design tokens |
| TanStack Query | Server state (future data fetching) |
| Axios | HTTP client with token refresh interceptor |

### Design Tokens

| Token | CSS Variable | Value |
|-------|--------------|-------|
| Primary | `--color-primary` | `#FCB038` |
| Dark Navy | `--color-navy` | `#000435` |
| Background | `--color-background` | `#F8FAFC` |

### Typography

- **Poppins** — body text, buttons, labels (`font-poppins`, weight utilities)
- **Montserrat** — headings (`font-montserrat`)

Fonts are loaded via `next/font/google` in `src/app/layout.tsx` (preferred over `<link>` tags for performance).

### Background Image

Place your image at `Frontend/public/auth-background.jpg`. The `.auth-bg` class in `globals.css` applies it to all auth pages.

### Page Map

| Route | File | Status |
|-------|------|--------|
| `/login` | `src/app/login/page.tsx` | Implemented |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Implemented |
| `/reset-password` | `src/app/reset-password/page.tsx` | UI ready; backend TODO |
| `/verify-email` | `src/app/verify-email/page.tsx` | UI ready; backend TODO |
| `/mfa` | `src/app/mfa/page.tsx` | Placeholder (Phase 2) |
| `/post-login` | `src/app/post-login/page.tsx` | Post-sign-in flow demo |
| `/profile` | — | Phase 2 |
| `/sessions` | — | Phase 2 |
| `/security` | — | Phase 2 |

### API Client

`src/lib/api.ts` configures Axios with:

- Base URL from `NEXT_PUBLIC_API_URL`
- Bearer token from `localStorage`
- Automatic refresh on 401 using refresh token

### Component Structure

```
src/components/
├── auth/
│   └── auth-layout.tsx    # Shared auth page shell
├── ui/
│   ├── button.tsx
│   └── input.tsx
└── providers.tsx          # TanStack Query provider
```

---

## 7. Database Model

### Entity Relationship Summary

```
Organization ──┬── User ──┬── UserRole ── Role ── RolePermission ── Permission
               │          ├── Session ── RefreshToken
               │          ├── MfaSecret
               │          ├── AuditLog
               │          └── Notification
               └── Role (org-scoped)
```

### Core Tables

| Model | Table | Purpose |
|-------|-------|---------|
| Organization | `organizations` | Multi-tenant schools, NGOs, etc. |
| User | `users` | Accounts with status, lockout, MFA flag |
| Role | `roles` | Org-scoped or system roles with hierarchy |
| Permission | `permissions` | Global `module.action` permissions |
| RolePermission | `role_permissions` | Many-to-many |
| UserRole | `user_roles` | User role assignments |
| Session | `sessions` | Active device sessions |
| RefreshToken | `refresh_tokens` | Hashed refresh tokens |
| MfaSecret | `mfa_secrets` | TOTP/email MFA secrets |
| AuditLog | `audit_logs` | Security audit trail |
| Notification | `notifications` | Email/SMS/in-app events |

### User Status Enum

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Can sign in |
| `INACTIVE` | Disabled by admin |
| `LOCKED` | Brute-force lockout |
| `SUSPENDED` | Policy violation |
| `PENDING_VERIFICATION` | Email not verified |

### Data Scope Enum

| Scope | Visibility |
|-------|------------|
| `SELF` | Own records only |
| `DEPARTMENT` | Department data |
| `BRANCH` | Branch/campus data |
| `ORGANIZATION` | Full org data |
| `GLOBAL` | Platform-wide (super admin) |

---

## 8. Core Domains

### Organization Management

- Create, update, suspend organizations
- Subscription tier and module activation (`modules` JSON field)
- Types: SCHOOL, UNIVERSITY, NGO, FACTORY, HOSPITAL, CHURCH, BUSINESS

### User Management

- Registration, profiles, activation
- Password reset, email verification
- Status management (ACTIVE → LOCKED after 5 failed attempts)

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Email + password login |
| `/auth/logout` | POST | Revoke current session (Bearer required) |
| `/auth/refresh` | POST | Exchange refresh token |
| `/auth/forgot-password` | POST | Send reset email |
| `/auth/reset-password` | POST | Set new password with token |
| `/auth/verify-email` | POST | Verify email with token |

### Authorization

- Roles assigned per user per organization
- Permissions derived from role → role_permission → permission
- Data scope on role controls row-level visibility

### Session Management (Phase 2)

- List active devices
- Logout single device
- Logout all devices

### Audit Management

Every action writes to `audit_logs` with action enum, IP, user agent, metadata JSON.

---

## 9. Authentication Flow

```
User enters email + password
        │
        ▼
POST /auth/login
        │
        ├── User exists?
        ├── Password valid? (bcrypt)
        ├── Organization ACTIVE?
        ├── User status OK?
        ├── Account locked?
        │
        ▼
MFA required? ──yes──► Return { requiresMfa: true }
        │
        no
        ▼
Create Session (device, IP, browser)
        │
        ▼
Generate access token (15 min) + refresh token (30 days)
        │
        ▼
Store refresh token hash in DB
        │
        ▼
Write LOGIN audit log
        │
        ▼
Return tokens + user profile (org, roles, permissions)
```

### Token Payload (JWT Access)

```json
{
  "sub": "user-uuid",
  "email": "teacher@school.com",
  "organizationId": "org-uuid",
  "sessionId": "session-uuid",
  "iat": 1234567890,
  "exp": 1234568790
}
```

---

## 10. Post Sign-In Experience

Users must **not** land directly on a generic dashboard.

### Step 1: Verify Organization

Confirm the user's organization context (e.g., "St Matthew School").

### Step 2: Load User Profile

Load name, role, department, permissions, activated modules.

### Step 3: Build Dynamic Navigation

Menus are generated from role + permissions + modules.

| Role | Example Navigation |
|------|-------------------|
| Teacher | Dashboard, Academics, Attendance, Marks, Timetable, Assignments |
| Accountant | Dashboard, Fees, Finance, Budget, Reports |
| Parent | Dashboard, Children, Attendance, Results, Fee Statements |
| Director | Dashboard, Academics, Finance, HR, Budget, Reports, Analytics |

Implemented as a demo in `Frontend/src/app/post-login/page.tsx`. Production will redirect to the correct microservice based on role and modules.

---

## 11. Role & Permission Architecture

### Role Hierarchy

```
Super Admin
  └── Organization Owner
        └── Director
              └── Deputy Director
                    └── Head Of Studies
                          └── Department Head
                                └── Teacher
Accountant (parallel branch)
Parent
Student
```

### Permission Naming Convention

```
<module>.<action>

Examples:
  students.view
  students.create
  students.edit
  students.delete
  budget.approve
  finance.view
  payroll.process
```

### Checking Permissions (Backend)

```typescript
// Future middleware
function requirePermission(...permissions: string[]) {
  return (req, res, next) => {
    const userPermissions = req.user.permissions;
    if (!permissions.every(p => userPermissions.includes(p))) {
      throw new AppError(403, 'Insufficient permissions');
    }
    next();
  };
}
```

---

## 12. Session Management

Each login creates a `sessions` record:

| Field | Example |
|-------|---------|
| deviceName | Chrome on Windows |
| browser | Chrome |
| os | Windows |
| ipAddress | 192.168.1.10 |
| location | Nairobi, KE |
| lastActivity | 2026-06-24T21:00:00Z |
| expiresAt | 30 min inactivity |

### Active Devices Page (Phase 2)

- List all active sessions for user
- Actions: Logout Device, Logout All Devices

---

## 13. Security Policies

### Password Policy

| Rule | Value |
|------|-------|
| Minimum length | 12 characters |
| Uppercase | Required |
| Lowercase | Required |
| Number | Required |
| Special character | Required |

Enforced in `src/utils/security.ts` via regex.

### Login Protection

| Policy | Value |
|--------|-------|
| Max failed attempts | 5 |
| Lockout duration | 15 minutes |
| Rate limit window | 15 minutes |

### Session & Token

| Setting | Value |
|---------|-------|
| Session inactivity timeout | 30 minutes |
| Access token expiry | 15 minutes |
| Refresh token expiry | 30 days |

### MFA (Phase 2)

Required for: Directors, Finance Managers, HR Managers, System Administrators.

Methods: Email OTP, Authenticator App (TOTP).

---

## 14. Audit Logging

### Logged Actions

| Action | Trigger |
|--------|---------|
| LOGIN | Successful sign-in |
| LOGIN_FAILED | Bad password or unknown user |
| LOGOUT | User signs out |
| PASSWORD_CHANGED | Password update |
| MFA_ENABLED | MFA activated |
| USER_CREATED | Admin creates user |
| ROLE_ASSIGNED | Role change |
| SESSION_REVOKED | Device logout |

### Audit Record Structure

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "userId": "uuid",
  "action": "LOGIN",
  "resource": null,
  "resourceId": null,
  "metadata": { "sessionId": "...", "device": "Chrome on Windows" },
  "ipAddress": "192.168.1.10",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2026-06-24T21:00:00Z"
}
```

---

## 15. Environment Variables

### Backend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `API_PREFIX` | /api/v1 | API base path |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `JWT_ACCESS_SECRET` | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | — | Refresh token signing secret |
| `JWT_ACCESS_EXPIRY` | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRY` | 30d | Refresh token TTL |
| `CORS_ORIGIN` | http://localhost:3000 | Frontend origin |
| `SWAGGER_ENABLED` | true | Enable Swagger UI |
| `SWAGGER_PATH` | /api/docs | Swagger UI path |

### Frontend (`.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | http://localhost:3001/api/v1 | Backend API base URL |

---

## 16. Local Development Setup

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)

### Step-by-Step

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Backend setup
cd Backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev

# 3. Frontend setup (new terminal)
cd Frontend
cp .env.example .env.local
npm install
npm run dev
```

### Verify

| Check | URL |
|-------|-----|
| Frontend login | http://localhost:3000/login |
| API health | http://localhost:3001/api/v1/health |
| Swagger docs | http://localhost:3001/api/docs |

### Add Background Image

Copy your image to `Frontend/public/auth-background.jpg`.

---

## 17. Deployment

### Recommended Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vercel or Docker + Nginx |
| Backend | Docker container |
| Database | Managed PostgreSQL |
| Cache | Managed Redis |
| CDN / WAF | Cloudflare |
| CI/CD | GitHub Actions |

### Production Checklist

- [ ] Set strong `JWT_*_SECRET` values (32+ chars)
- [ ] Set `SWAGGER_ENABLED=false` or restrict by IP
- [ ] Enable HTTPS everywhere
- [ ] Configure `CORS_ORIGIN` to production frontend URL
- [ ] Run `npm run build` for both apps
- [ ] Apply Prisma migrations on deploy
- [ ] Configure Redis for session cache and rate limiting

---

## 18. Implementation Roadmap

### Phase 1 — Foundation (Current)

- [x] Project scaffolding (Frontend + Backend)
- [x] Prisma schema with all core models
- [x] MVC backend structure
- [x] Swagger/OpenAPI documentation
- [x] Auth endpoints (login, logout, refresh)
- [x] Login UI with design system
- [x] Post-login flow demo
- [x] Docker Compose for local DB/Redis

### Phase 2 — Core IAM

- [ ] User registration and admin user management APIs
- [ ] Organization CRUD APIs
- [ ] Role and permission management APIs
- [ ] Password reset with email (Redis tokens)
- [ ] Email verification flow
- [ ] MFA (Email OTP + TOTP)
- [ ] Sessions / active devices page
- [ ] Profile and security settings pages

### Phase 3 — Integration

- [ ] API Gateway integration
- [ ] SSO token validation for other microservices
- [ ] Notification service (email/SMS)
- [ ] Audit log viewer for admins

---

## 19. Future Roadmap (v2.0)

- OAuth2 / OpenID Connect
- Google Login
- Microsoft Login
- Biometric authentication
- Risk-based authentication
- Advanced security analytics
- JWKS endpoint for distributed token validation

---

## Appendix: API Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

---

*Document maintained by the Babyeyi Development Team. Update this file when architecture decisions change.*
