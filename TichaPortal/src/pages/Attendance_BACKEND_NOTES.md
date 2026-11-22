# Attendance Page — Backend Interaction Backup

Snapshot of how `src/pages/Attendance.jsx` talks to the backend before the UI was
replaced with an empty component. Keep this as a reference to re-implement later.

## Imports / clients used

```js
import api from '../services/api';                 // Babyeyi/MTN backend, base = VITE_API_URL + /api
import {
  fetchTeacherSchedule,
  flattenScheduleByDay,
  startLesson,
  fetchLessonAttendance,
  saveLessonAttendance,
} from '../services/teacherPortalApi';             // TichaPortal BFF, base = VITE_TP_API_URL (dev: /tp-api)
import useTpAcademic from '../hooks/useTpAcademic'; // provides `ready` gate before fetching
```

- `api` base URL: `VITE_API_URL` + `/api` (dev proxy → `/api`).
- `tpApi` base URL: `VITE_TP_API_URL` + `/api` (dev → `/tp-api`; prod → `https://ticha-api.shuleplus.rw/api`).
- Both send credentials (`withCredentials: true`) and IAM auth headers via `attachIamAuth`.

## Endpoints

### 1. Weekly timetable / lessons
- **Client:** `teacherPortalApi.fetchTeacherSchedule('weekly')`
- **Request:** `GET /timetable/teacher/schedule?view=weekly`
- **Response:** `{ byDay: { Monday: [ { timetableId|id, dayOfWeek, startTime, endTime, subjectName, className, room, teacherName, periodLabel, academicYear, term } ] } }`
- **Transform:** `flattenScheduleByDay(week)` → flat lesson rows with `id, day, time, subject, group, class_name, roster_class_name, academic year/term`.
- Called on mount and whenever `selectedDate` or `ready` changes.

### 2. Start a lesson session
- **Client:** `teacherPortalApi.startLesson({ timetableId, skipQr: true })`
- **Request:** `POST /timetable/lessons/start`
- **Body:** `{ timetableId, skipQr: true }`
- **Response:** session object; id read as `started.id || started.sessionId`.
- Used when opening a lesson with no `sessionId` and again on save if still missing.

### 3. Fetch saved lesson attendance
- **Client:** `teacherPortalApi.fetchLessonAttendance(sessionId)`
- **Request:** `GET /timetable/lessons/{sessionId}/attendance`
- **Response:** `{ rows: [ { studentCode|id, fullName, gender, status, notes|reason, photoUrl, rollNumber, className, stream } ] }`
- Rows mapped by `mapLessonRows` (status → present/absent/late/permission). If rows exist
  they become the roster; otherwise falls back to student management (below).

### 4. Save lesson attendance
- **Client:** `teacherPortalApi.saveLessonAttendance(sessionId, rows, true)`
- **Request:** `POST /timetable/lessons/{sessionId}/attendance`
- **Body:**
  ```json
  {
    "rows": [
      {
        "studentCode": "...",
        "fullName": "...",
        "gender": "M|F|-",
        "className": "...",
        "status": "PRESENT|ABSENT|LATE|EXCUSED",
        "notes": "..."
      }
    ],
    "submit": true
  }
  ```
- UI status mapping: `present→PRESENT`, `absent→ABSENT`, `late→LATE`, `permission→EXCUSED`.

### 5. Roster fallback from Student Management
- **Client:** `api.get('/teacher-portal/students', { params })`
- **Request params:** `{ class_name, className, scope: 'attendance', date, academicYear }`
- **Response:** `{ success: true, data: [ { row_id|id, student_code, name, gender, student_photo_url, grade } ] }`
- Mapped by `mapPortalStudents` (all default to `present`).

### 6. Daily attendance summary
- **Client:** `api.get('/teacher-portal/attendance-summary/daily', { params })`
- **Params:** `{ date, class_name }`
- **Response:** `{ success: true, data: [ { class_name, subject_name, total_students, present_count, absent_count, late_count, excused_count } ] }`

### 7. Weekly attendance summary
- **Client:** `api.get('/teacher-portal/attendance-summary/weekly', { params })`
- **Params:** `{ date }`
- **Response:** `{ success: true, data: { start, end, rows: [ { student_uid, record_date, status } ] } }`
- `rows` filtered by `student_uid === selectedStudent.adm` for per-student history.

## Data flow

1. `useTpAcademic().ready` gates the first load.
2. Load weekly schedule → flatten → filter by selected day (`periodScope = 'daily'`) or show all (`'all'`).
3. Selecting a period stores the lesson and calls `fetchRosterAndSaved`:
   - start session if needed → fetch saved attendance → else fetch roster from student management.
4. Status changes are local only (`handleStatusChange`) until **Save** (`handleSave`) posts all rows.
5. Daily + weekly summaries load on date/class change (independent of roster).

## Notes

- `academicYear` on the roster fallback comes from the selected lesson.
- Errors are logged to console; user-facing errors use `alert(...)` with `response.data.message`.
- Attendance uses no direct socket; all data is REST via the two clients above.
