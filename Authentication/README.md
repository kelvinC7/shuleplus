# ShulePlus Authentication Module

Identity & Access Management (IAM) for the ShulePlus platform.

## Structure

| Folder | Description |
|--------|-------------|
| `Frontend/` | Next.js authentication UI |
| `Backend/` | Express.js IAM API with Swagger docs |
| `ARCHITECTURE.md` | Full system architecture (read this first) |
| [`../docs/MODULE_INTEGRATION_GUIDE.md`](../docs/MODULE_INTEGRATION_GUIDE.md) | **Module teams:** register, assign, and access modules (HR example) |

## Quick Start

```bash
# Start PostgreSQL + Redis
docker compose up -d

# Backend (terminal 1)
cd Backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev

# Frontend (terminal 2)
cd Frontend
cp .env.example .env.local
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Login UI | http://localhost:3000/login |
| API | http://localhost:3001/api/v1 |
| Swagger Docs | http://localhost:3001/api/docs |

## Design

- Primary: `#FCB038`
- Navy: `#000435`
- Background: `#F8FAFC`
- Fonts: Poppins + Montserrat
- Background image: `Frontend/public/auth-background.jpg`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete documentation.
