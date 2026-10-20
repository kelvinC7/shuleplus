# Print Card — Local Setup (Windows)

## 1. Copy environment files (PowerShell)

```powershell
cd PrintCardMIS\Backend
Copy-Item .env.example .env

cd ..\Frontend
Copy-Item .env.example .env
```

> On Windows, use `Copy-Item` instead of `cp`.

## 2. Start PostgreSQL

Start Docker Desktop, then:

```powershell
cd Authentication
docker compose up -d
```

## 3. Create database and run migrations

```powershell
cd PrintCardMIS\Backend
npm install
npm run db:setup
```

`db:setup` drops and recreates `print_card_module_db`, then applies the single Print Card migration.

If you see **P3015** (missing migration.sql) or **P3018** (type already exists), leftover SampleModule migrations were the cause — they are removed. Reset the DB:

```powershell
npm run db:reset
npm run db:migrate
```

If Docker is not running, `db:ensure` will fail — start Postgres first.

## 4. Run the module

```powershell
# Terminal 1 — Backend (port 3093)
cd PrintCardMIS\Backend
npm run dev

# Terminal 2 — Frontend (port 3092)
cd PrintCardMIS\Frontend
npm install
npm run dev
```

Open http://localhost:3092/cards

## 5. Register module in IAM

```powershell
cd ..\..
node scripts/apply-module-subdomains.mjs
```

Then assign **Print Card** to users in Super Admin → Module Assignment → Users & Access.
