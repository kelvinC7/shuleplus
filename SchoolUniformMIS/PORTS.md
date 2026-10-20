# SchoolUniformMIS — ports

## Local

| Service | Port | URL |
|---------|------|-----|
| Frontend | **3050** | http://localhost:3050 |
| Backend  | **3051** | http://localhost:3051 |

## Production

| Service | Port | Host | PM2 |
|---------|------|------|-----|
| Frontend | **6122** | https://uniform.shuleplus.rw | `uniform-web` |
| Backend  | **4023** | https://uniform-api.shuleplus.rw | `uniform-api` |

Slug: `school-uniform`  
Database: `school_uniform_module_db`

See: [docs/PORTS.md](../docs/PORTS.md) · [docs/DEPLOY.md](../docs/DEPLOY.md)

```bash
cd SchoolUniformMIS/Backend && npm run setup:env && npm i && npx prisma migrate dev && npm run dev
cd SchoolUniformMIS/Frontend && npm i && npm run dev
```
