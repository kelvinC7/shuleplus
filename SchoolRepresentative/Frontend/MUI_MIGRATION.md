# MUI Migration Notes

This project has been migrated from Tailwind CSS + lucide-react to:

- `@mui/material` + `@emotion/react` / `@emotion/styled`
- `@mui/icons-material`
- `@mui/material-nextjs` (App Router Emotion cache)

## What changed

### Infrastructure
- `package.json` — Tailwind removed; MUI + Emotion added
- `src/theme/theme.ts` — Shule+ brand palette (navy `#000435`, gold `#FCB038`)
- `src/theme/ThemeRegistry.tsx` — ThemeProvider + CssBaseline + App Router cache
- `src/app/layout.tsx` — wraps app with ThemeRegistry
- `src/app/globals.css` — minimal base styles + layout utility helpers for page modules
- `postcss.config.mjs` removed

### Shell & shared components (fully on MUI)
- `director-sidebar.tsx` / `director-sidebar-nav.tsx`
- `director-topbar.tsx`
- `main-layout.tsx`
- `stat-card.tsx`, `panel-card.tsx`, `status-badge.tsx`
- `list-ui.tsx`, `detail-drawer.tsx`, `session-access.tsx`
- `director-page-header.tsx`, `demo-mode-badge.tsx`
- `lib/nav-config.ts` — icons switched to `@mui/icons-material`

### Director pages
- All lucide-react icons replaced with `@mui/icons-material`
- Shared components now MUI-based
- Page layouts still use some utility classes from `globals.css` for density; prefer MUI `Box`/`sx` when editing further

## Run

```bash
npm install
npm run dev
```

App runs on port **3081**.

## Brand tokens

| Token | Value |
|-------|-------|
| Primary (gold) | `#FCB038` |
| Navy | `#000435` |
| Background | `#F5F6FA` |
| Success | `#168A55` |
| Danger | `#D64545` |
| Warning | `#D99013` |

Use `brand` from `@/theme/theme` or `theme.palette` in `sx` props.
