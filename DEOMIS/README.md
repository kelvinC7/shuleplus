# District MIS (DEOMIS)

Shule+ module for **District Education Officers (DEO)**: district-wide attendance oversight, sector rollups, school performance (students, staff, class, gender).

| Service  | Port | Folder |
|----------|------|--------|
| Frontend | 3073 | `Frontend_react/` |
| Backend  | 3072 | `Backend/` |

IAM module slug: **`deo-mis`**. DEO users need a **`deo_officer_profiles`** row with **`districtId`** (or district name for school filtering).

```bash
cd DEOMIS/Backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run dev
cd ../Frontend_react && npm install && npm run dev
```
