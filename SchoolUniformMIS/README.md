# School Uniform MIS

Complete ERP-style module for school uniforms (products, fabric/tailoring, inventory, students, sales).

## Ports

| Env | Frontend | Backend |
|-----|----------|---------|
| Local | 3050 | 3051 |
| Production | 6122 (`uniform.shuleplus.rw`) | 4023 (`uniform-api.shuleplus.rw`) |

Slug: `school-uniform`  
DB: `school_uniform_module_db`  
PM2: `uniform-web` / `uniform-api`

## Quick start

```bash
# Backend
cd SchoolUniformMIS/Backend
cp .env.example .env
npm install
# ensure DB exists:
# docker exec shuleplus-iam-db psql -U postgres -c "CREATE DATABASE school_uniform_module_db;"
npx prisma migrate deploy
npm run dev

# Frontend
cd SchoolUniformMIS/Frontend
cp .env.example .env.local
npm install
npm run dev
```

Open via Organization Admin after assigning the `school-uniform` module (JWT must include the slug).

## Settings

Toggle **Fabric Management** and **Tailoring** under Settings to expand the sidebar for manufacturing workflows. Ready-made-only schools keep a simpler menu.
