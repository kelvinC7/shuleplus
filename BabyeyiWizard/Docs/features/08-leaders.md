# 08 — Leaders (Step 7)

Step 7 captures school leadership contacts displayed on the Babyeyi document.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multiple leaders** | Add/remove leader cards |
| **Full name** | Required for valid leader |
| **Role / position** | Preset dropdown + "Other" custom role |
| **Phone number** | Contact phone |
| **Email address** | Contact email |
| **Live card header** | Shows name and role as user types |
| **Minimum one card** | Cannot remove last leader row |

---

## Frontend design

| Item | Detail |
|------|--------|
| **Component** | `Babyeyi.jsx` → `renderStep()` case 7 |
| **Blank template** | `blankLeader()` → `{ name, role, phone, email }` |

### Role presets

Common roles include Head Teacher, Director, Deputy Head, Accountant, etc. (from `LEADER_ROLE_PRESETS` constant). Selecting "Other" allows free-text role entry.

### Leader row shape

```js
{ name: "", role: "", phone: "", email: "" }
```

### Save filter

Only leaders with at least `name` or `role` trimmed are included in submit payload.

---

## Backend logic

### FormData field

```
leaders → JSON [{ name, role, phone, email }]
```

### Dedicated leaders API (optional)

| Method | Path |
|--------|------|
| GET | `/babyeyi/:id/leaders` |
| POST | `/babyeyi/:id/leaders` |
| PUT | `/babyeyi/:id/leaders/:leaderId` |
| DELETE | `/babyeyi/:id/leaders/:leaderId` |

Primary flow embeds leaders in main POST/PUT; dedicated endpoints used by document viewer.

### i18n

Leader roles editable in Kinyarwanda via List view modal (`type: "leader"`).
