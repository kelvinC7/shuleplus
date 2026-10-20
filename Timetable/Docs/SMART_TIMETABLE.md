# Smart Timetable + Teacher Portal + Live Monitoring

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Timetable Backend :3010** | Source of truth — schedule, classrooms/QR, lesson sessions, attendance rows, live monitor, settings |
| **Timetable Frontend :3011** | DOS tools — generator + **Live Monitor** + **Smart Settings** |
| **Teacher Portal Frontend :3012** | Teacher UX — My Teaching, schedule, QR scan, attendance, complete lesson |
| **Teacher Portal Backend :3009** | Salary Advance (unchanged) |

Teachers never pick classes manually — lessons load from `AcademicTimetable` for today.

## Lesson workflow

1. Teacher opens **My Teaching** → sees today's slots from timetable  
2. **Start Lesson** → optionally **Scan Classroom QR**  
3. System verifies classroom + teacher + period; records punctuality (Early / On Time / Late / Very Late)  
4. **Take Attendance** → Academic student roster for the class (or saved rows); demo only if Academic is down  
5. **Complete Lesson** → topic, notes, homework  

## Live monitor (DOS)

`GET /api/smart/live/monitor` — auto-refresh KPIs, running cards, period grid.  
Missed lessons (past end, never scanned) are marked automatically and notify Head of Studies.

## Key APIs

```
GET  /api/smart/teacher/today
GET  /api/smart/teacher/schedule
POST /api/smart/lessons/start
POST /api/smart/lessons/scan-qr
GET|POST /api/smart/lessons/:sessionId/attendance
POST /api/smart/lessons/:sessionId/complete
GET  /api/smart/live/monitor
GET|PUT /api/smart/settings
GET|POST /api/smart/classrooms
GET  /api/smart/analytics
GET  /api/smart/academic/classes
GET  /api/smart/academic/students?className=S1%20A
```

Access: JWT with `timetable` **or** `teacher-portal` module license.

## Academic integration

Timetable Backend calls Academic service APIs with `x-service-key` (shared `SERVICE_API_KEY`):

| Academic endpoint | Purpose |
|-------------------|---------|
| `GET /api/service/classes?organizationId=` | Class/stream list |
| `GET /api/service/students?organizationId=&className=` | Active students for a class |

Env: `ACADEMIC_API_URL=http://localhost:3003/api` (Timetable Backend).  
Class labels match Timetable `className` as `name + stream` (e.g. `S1 A`).

## Settings

Grace / late / very-late thresholds, QR required, GPS flag, auto-close, reminders, live refresh interval.

## Run

```bash
# Timetable API (must be up)
cd Timetable/Backend && npm run dev          # :3010

# DOS Live Monitor
cd Timetable/Frontend && npm run dev         # :3011

# Teacher Portal UI
cd TeacherPortal/Frontend && npm run dev     # :3012
```

Open modules from Organization Admin with a valid token.  
Generate & apply a timetable first (or seed demo), then test My Teaching / Live Monitor.
