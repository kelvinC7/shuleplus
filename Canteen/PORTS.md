# Canteen - local ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | **3050** | http://localhost:3050 |
| Backend  | **3051** | http://localhost:3051 |
| Backend health | **3051** | http://localhost:3051/api/health |
| DB | — | PostgreSQL `canteen_module_db` |

See the full platform map: [docs/PORTS.md](../docs/PORTS.md)

```bash
# Backend
cd Canteen/Backend && pnpm install && pnpm prisma:generate && pnpm prisma:migrate
pnpm dev

# Frontend (single unified portal for superadmin/seller/supplier/driver)
cd Canteen/Frontend && pnpm install
pnpm dev
```

Integration:

- Auth: IAM JWT (`JWT_ACCESS_SECRET` shared with `Authentication/Backend`), module slug `canteen`.
- Tenant provisioning: IAM calls `POST /api/tenant/create` with `x-service-key`.
- Roster sync: `Canteen/Backend` calls `Academic/Backend` `/service/students` + `/service/classes`.
- IAM user creation: `POST /api/v1/iam/org/users` (used by canteen/supplier/driver staff provisioning).
- Registered in `Authentication/Backend/src/config/local-module-urls.ts` as `canteen`.
