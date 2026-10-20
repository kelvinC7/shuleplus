# @shuleplus/ui

Shared ShulePlus design system for all microservice frontends (IAM, HR, Payroll, Teacher Portal, etc.).

## Install in a module frontend

```json
{
  "dependencies": {
    "@shuleplus/ui": "file:../../packages/ui"
  }
}
```

```ts
// next.config.ts
transpilePackages: ['@shuleplus/ui'],
```

```bash
npm install
```

## Usage

```tsx
import { PageHeader, StatCard, ModuleCard, DataTable, PrimaryButton } from '@shuleplus/ui';
```

Import theme variables in your `globals.css` (alongside Tailwind + shadcn):

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';
```

Brand colors are configured in each app's `:root` CSS variables:
- Primary (Amber): `#FCB038`
- Navy: `#000435`

## Structure

```
packages/ui/src/
├── primitives/     # shadcn base components (Button, Card, Table, Badge)
├── components/
│   ├── shared/     # PrimaryButton, PageHeader, StatCard, DataTable, etc.
│   └── layout/     # DashboardLayout, AdminLayout, AuthLayoutShell
├── lib/
│   ├── tokens.ts   # Design tokens (colors, spacing, typography)
│   └── utils.ts    # cn() helper
└── styles/
    └── theme.css   # CSS variables for brand colors
```

## Adding shadcn components

Install new primitives in **Authentication/Frontend** (source of truth):

```bash
cd Authentication/Frontend
npx shadcn@latest add <component> -y
```

Then copy to `packages/ui/src/primitives/` and export from `src/index.ts`.
