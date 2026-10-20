# TichaPortal Backend

Minimal Express backend for TichaPortal (prototype).

Run:

```
cd TichaPortal/Backend
npm install
cp .env.example .env
npm run dev
```

Endpoints:
- `POST /api/auth/register` - register user (admin or teacher)
- `POST /api/auth/login` - login -> returns JWT
- `GET /api/users` - admin only, list users
- `POST /api/users/teacher` - admin only, create teacher
- `GET /api/timetable` - list timetable
- `POST /api/timetable` - create timetable entry (requires auth)
