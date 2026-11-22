# Shule+ Director — React rewrite

Full conversion of the original vanilla-JS / DOM-manipulation prototype into **proper React** (hooks, components, declarative UI). No jQuery.

## Features ported

- Multi-school scope switcher (6 schools)
- Home dashboard with live KPIs, health ring, feed (auto-updating)
- Live Campus cameras with SVG scenes + full viewer (PTZ, talk, record)
- Approvals list with approve / decline
- Insights charts (term / vs last term / year) + students to watch
- Console with all Shule+ modules
- Toast notifications
- Bottom sheet for school picker
- Tab navigation (Home / Approve / yoInfo / Insights / Console)

## Run

```bash
cd shule-react
npm install
npm run dev
```

Open the URL shown by Vite (usually http://localhost:5173).

## Structure

```
src/
  App.jsx                 Main shell + routing
  components/             All UI views & shared pieces
  data/                   Static data (cams, approvals, schools, insights…)
  hooks/                  useClock, useToast
  utils/                  icons, scene SVG generator
  styles/                 CSS (tokens + app layout)
```

## Notes

- Original CSS classes are preserved so you can drop in the full original `styles.css` / `styles/app.css` if you have them; the included styles already cover the UI.
- Wizards (Blast / Meeting) and full yoInfo story flip are stubbed with toasts / simple placeholder — the same pattern used for the rest of the app can be extended for them.
- All state is React state; no global DOM queries or `innerHTML` mutation except for the intentional SVG scene strings.
