# ShulePlus IAM Backend

Express.js API for the Babyeyi Identity & Access Management service.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optional for local dev; required in production)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

Server runs at `http://localhost:3001`

## API Documentation (Swagger)

Interactive API docs are available when `SWAGGER_ENABLED=true`:

| Resource | URL |
|----------|-----|
| Swagger UI | http://localhost:3001/api/docs |
| OpenAPI JSON | http://localhost:3001/api/docs.json |

Use **Authorize** in Swagger UI to test protected endpoints with a Bearer JWT from `POST /api/v1/auth/login`.

## Project Structure (MVC)

```
src/
├── config/          # env, database, redis, swagger
├── controllers/     # HTTP request handlers (thin layer)
├── middleware/      # auth, rate limiting, error handling
├── routes/          # Express route definitions
├── services/        # Business logic
├── utils/           # Helpers (JWT, password, etc.)
├── app.ts           # Express app factory
└── server.ts        # Bootstrap entry point
prisma/
└── schema.prisma    # Database models
```

## Adding New Endpoints

1. Define Prisma model if needed in `prisma/schema.prisma`
2. Create service in `src/services/`
3. Create controller with `@swagger` JSDoc annotations in `src/controllers/`
4. Register route in `src/routes/`
5. Swagger picks up docs automatically from JSDoc comments

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run prisma:migrate` | Apply migrations |
| `npm run prisma:seed` | Seed root admin (+ auto-import Rwanda locations if JSON exists) |
| `npm run prisma:import-locations` | Full re-import Rwanda locations from JSON |
| `npm run prisma:studio` | Open Prisma Studio |

See [prisma/data/README.md](./prisma/data/README.md) for Rwanda location import details.


# Find what's on 3004 (Sample)
netstat -ano | findstr :3004

# Find what's on 3000 (Auth)
netstat -ano | findstr :3000

# Kill that PID (replace 12345 with the number you see)
taskkill /PID 12345 /F