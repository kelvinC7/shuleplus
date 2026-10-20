# ShulePlus UI Design System

Shared UI built with [shadcn/ui](https://ui.shadcn.com) — Amber `#FCB038` + Navy `#000435`.

## Folder structure

```
src/
├── app/
├── components/
│   ├── ui/           # shadcn primitives (Button, Card, Table, Dialog…)
│   ├── shared/       # ShulePlus wrappers (PageHeader, StatCard, DataTable…)
│   ├── layout/       # DashboardLayout, AdminLayout, AuthLayoutShell
│   ├── dashboard/
│   └── modules/
├── hooks/
├── lib/
│   └── utils.ts      # cn() helper
├── styles/
│   └── tokens.ts     # Design tokens
└── services/
```

## Install more shadcn components

```bash
cd Authentication/Frontend
npx shadcn@latest add <component> -y
```

Examples: `calendar`, `command`, `form`, `sonner`

## Shared package for all modules

```
packages/ui/          → @shuleplus/ui
```

```tsx
import { PageHeader, StatCard, ModuleCard, DataTable } from '@shuleplus/ui';
```

See `packages/ui/README.md` for module setup.

## Design tokens

| Token | Value |
|-------|-------|
| Primary | `#FCB038` |
| Navy | `#000435` |
| Radius | 12px (`--radius: 0.75rem`) |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48 |

## Recommended next components

```bash
npx shadcn@latest add form sonner alert alert-dialog separator scroll-area -y
```
