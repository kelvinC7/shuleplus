# ShulePlus IAM Frontend

Next.js authentication UI for the ShulePlus (Babyeyi) platform.

## Design System

| Token | Value |
|-------|-------|
| Primary | `#FCB038` |
| Dark Navy | `#000435` |
| Background | `#F8FAFC` |
| Fonts | Poppins (body), Montserrat (headings) |

Place your background image at `public/auth-background.jpg`.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

App runs at `http://localhost:3000`

## Pages

| Route | Purpose |
|-------|---------|
| `/login` | Email + password sign in |
| `/forgot-password` | Request reset link |
| `/reset-password?token=` | Set new password |
| `/verify-email?token=` | Email verification |
| `/mfa` | Two-factor authentication |
| `/post-login` | Org verify → profile → nav (post-sign-in flow) |

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- TanStack Query
- Axios
