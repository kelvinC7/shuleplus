const { Router } = require('express');
const env = require('../lib/env');
const { authenticateIam, orgId, teacher } = require('../middleware/iamAuth');
const { requireServiceAuth } = require('../middleware/serviceAuth');
const { serviceFetch, unwrap } = require('../lib/serviceFetch');
const { readDb, writeDb } = require('../models/db');

const router = Router();

/** Academic / other modules call `/service/*` with x-service-key only (no teacher JWT). */
function authenticateIamUnlessService(req, res, next) {
  const path = String(req.path || '');
  if (path.startsWith('/service/')) return next();
  return authenticateIam(req, res, next);
}

router.use(authenticateIamUnlessService);

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ success: false, message: err.message || 'Request failed' });
}

function db() {
  const data = readDb();
  if (!Array.isArray(data.permissions)) data.permissions = [];
  if (!Array.isArray(data.rollCall)) data.rollCall = [];
  if (!Array.isArray(data.calendarEvents)) data.calendarEvents = [];
  return data;
}

async function iamAcademicSettings(organizationId) {
  try {
    const payload = await serviceFetch(
      env.IAM_API_URL,
      `/internal/organizations/${organizationId}/academic-settings`
    );
    return unwrap(payload) || {};
  } catch {
    return {};
  }
}

const DEFAULT_CALENDAR = [
  { title: 'Term 1 Begins', eventType: 'TERM', month: 9, day: 1 },
  { title: 'Mid-Term Examination', eventType: 'EXAM', month: 10, day: 15 },
  { title: 'Staff Meeting', eventType: 'MEETING', month: 10, day: 14 },
  { title: 'Parent Meeting', eventType: 'MEETING', month: 11, day: 20 },
  { title: 'Sports Day', eventType: 'SPORT', month: 11, day: 8 },
  { title: 'School Holiday', eventType: 'HOLIDAY', month: 12, day: 23, endDay: 31 },
];

function mapEventType(t) {
  const key = String(t || 'OTHER').toUpperCase();
  if (key === 'EXAMINATION') return 'EXAM';
  if (key === 'SPORTS') return 'SPORT';
  if (['HOLIDAY', 'EXAM', 'SPORT', 'CEREMONY', 'MEETING', 'TERM', 'PERMISSION', 'OTHER'].includes(key)) {
    return key;
  }
  return 'OTHER';
}

function seedCalendarIfEmpty(organizationId, academicYear) {
  const data = db();
  const hasOrgEvents = data.calendarEvents.some((e) => e.organizationId === organizationId);
  if (hasOrgEvents) return data;

  const year = new Date().getFullYear();
  for (const e of DEFAULT_CALENDAR) {
    const start = `${year}-${String(e.month).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`;
    const endDay = e.endDay || e.day;
    const end = `${year}-${String(e.month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    data.calendarEvents.push({
      id: `cal-seed-${organizationId}-${e.title.replace(/\s+/g, '-').toLowerCase()}`,
      organizationId,
      title: e.title,
      event_type: mapEventType(e.eventType),
      event_date: start,
      start_date: start,
      end_date: end,
      all_day: true,
      academicYear: academicYear || `${year}-${year + 1}`,
    });
  }
  writeDb(data);
  return data;
}

function calendarInRange(events, year, month) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return events.filter((e) => {
    const start = e.event_date || e.start_date;
    const end = e.end_date || start;
    return start <= monthEnd && end >= monthStart;
  });
}

router.get('/school/calendar-events', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const t = teacher(req);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const settings = await iamAcademicSettings(organizationId);
    const data = seedCalendarIfEmpty(organizationId, settings.currentAcademicYear);

    const stored = data.calendarEvents
      .filter((e) => e.organizationId === organizationId)
      .map((e) => ({
        id: e.id,
        title: e.title,
        event_type: mapEventType(e.event_type || e.eventType),
        event_date: e.event_date || e.start_date,
        start_date: e.start_date || e.event_date,
        end_date: e.end_date || e.event_date,
        start_time: e.start_time || null,
        end_time: e.end_time || null,
        location: e.location || null,
        description: e.description || null,
        all_day: e.all_day ?? true,
      }));

    const permissionEvents = data.permissions
      .filter(
        (p) =>
          p.organizationId === organizationId &&
          p.teacherUserId === t.id &&
          String(p.status || '').toLowerCase() === 'approved'
      )
      .map((p) => ({
        id: `perm-cal-${p.id}`,
        title: `Approved: ${String(p.permission_type || 'Permission').replace(/_/g, ' ')}`,
        event_type: 'PERMISSION',
        event_date: String(p.start_date).slice(0, 10),
        start_date: String(p.start_date).slice(0, 10),
        end_date: String(p.end_date).slice(0, 10),
        all_day: true,
        description: p.reason || null,
      }));

    send(res, calendarInRange([...stored, ...permissionEvents], year, month));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/permissions', (req, res) => {
  try {
    const t = teacher(req);
    if (!t.id) {
      return res.status(401).json({ success: false, message: 'Teacher identity missing from session. Sign in again.' });
    }
    const organizationId = orgId(req);
    const rows = db().permissions.filter(
      (p) =>
        p.organizationId === organizationId &&
        (p.teacherUserId === t.id || (t.email && String(p.teacher_email || '').toLowerCase() === t.email.toLowerCase()))
    );
    send(res, rows);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/permissions', (req, res) => {
  try {
    const t = teacher(req);
    const body = req.body || {};
    const row = {
      id: `perm-${Date.now()}`,
      organizationId: orgId(req),
      teacherUserId: t.id,
      teacher_email: t.email || '',
      teacher_name: t.name,
      permission_type: body.permission_type,
      permission_type_other: body.permission_type_other || '',
      start_date: body.start_date,
      end_date: body.end_date,
      reason: body.reason || '',
      emergency_phone: body.emergency_phone || '',
      alt_contact: body.alt_contact || '',
      term: body.term || '',
      academicYear: body.academicYear || body.academic_year || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const data = db();
    data.permissions.unshift(row);
    writeDb(data);
    send(res, row, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/teacher-portal/permissions/:id', (req, res) => {
  try {
    const t = teacher(req);
    const data = db();
    const row = data.permissions.find((p) => p.id === req.params.id && p.teacherUserId === t.id);
    if (!row) return res.status(404).json({ success: false, message: 'Permission not found' });
    if (row.status === 'pending') row.status = 'cancelled';
    writeDb(data);
    send(res, row);
  } catch (err) {
    fail(res, err);
  }
});

function permissionMatchesFilters(row, filters) {
  const status = String(filters.status || '').toLowerCase();
  if (status && status !== 'all' && String(row.status || '').toLowerCase() !== status) return false;
  const type = String(filters.permission_type || filters.type || '').toLowerCase();
  if (type && type !== 'all' && String(row.permission_type || '').toLowerCase() !== type) return false;
  const q = String(filters.q || filters.search || '')
    .trim()
    .toLowerCase();
  if (q) {
    const hay = [
      row.teacher_name,
      row.reason,
      row.permission_type,
      row.permission_type_other,
      row.emergency_phone,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  const from = filters.date_from || filters.dateFrom;
  const to = filters.date_to || filters.dateTo;
  if (from && String(row.end_date).slice(0, 10) < String(from).slice(0, 10)) return false;
  if (to && String(row.start_date).slice(0, 10) > String(to).slice(0, 10)) return false;
  return true;
}

function paginateRows(rows, req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

router.get('/service/teacher-permissions', requireServiceAuth, (req, res) => {
  try {
    const organizationId = String(req.query.organizationId || '');
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId required' });
    }
    const rows = db()
      .permissions.filter((p) => p.organizationId === organizationId)
      .filter((p) => permissionMatchesFilters(p, req.query))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    send(res, paginateRows(rows, req));
  } catch (err) {
    fail(res, err);
  }
});

router.post('/service/teacher-permissions/:id/approve', requireServiceAuth, (req, res) => {
  try {
    const organizationId = String(req.body?.organizationId || req.query.organizationId || '');
    const data = db();
    const row = data.permissions.find(
      (p) => p.id === req.params.id && (!organizationId || p.organizationId === organizationId)
    );
    if (!row) return res.status(404).json({ success: false, message: 'Permission not found' });
    if (String(row.status).toLowerCase() !== 'pending') {
      return res.status(409).json({ success: false, message: 'Request is not pending' });
    }
    row.status = 'approved';
    row.reviewed_at = new Date().toISOString();
    row.reviewed_by = req.body?.reviewedBy || req.body?.reviewed_by || 'academic';
    const notes = String(req.body?.reviewNotes || req.body?.review_notes || '').trim();
    row.review_notes = notes;
    if (notes) row.decision_note = notes;
    writeDb(data);
    send(res, row);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/service/teacher-permissions/:id/reject', requireServiceAuth, (req, res) => {
  try {
    const organizationId = String(req.body?.organizationId || req.query.organizationId || '');
    const reason = String(req.body?.reviewNotes || req.body?.review_notes || req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    const data = db();
    const row = data.permissions.find(
      (p) => p.id === req.params.id && (!organizationId || p.organizationId === organizationId)
    );
    if (!row) return res.status(404).json({ success: false, message: 'Permission not found' });
    if (String(row.status).toLowerCase() !== 'pending') {
      return res.status(409).json({ success: false, message: 'Request is not pending' });
    }
    row.status = 'rejected';
    row.reviewed_at = new Date().toISOString();
    row.reviewed_by = req.body?.reviewedBy || req.body?.reviewed_by || 'academic';
    row.review_notes = reason;
    row.decision_note = reason;
    row.rejection_reason = reason;
    writeDb(data);
    send(res, row);
  } catch (err) {
    fail(res, err);
  }
});

async function smStudents(organizationId, className) {
  const payload = await serviceFetch(env.STUDENT_MANAGEMENT_API_URL, '/service/students', {
    query: { organizationId, className, status: 'ACTIVE' },
  });
  return Array.isArray(unwrap(payload)) ? unwrap(payload) : [];
}

function rollStats(roster) {
  const list = Array.isArray(roster) ? roster : [];
  return {
    total: list.length,
    present: list.filter((r) => String(r.status || '').toLowerCase() === 'present').length,
    absent: list.filter((r) => String(r.status || '').toLowerCase() === 'absent').length,
    excused: list.filter((r) => String(r.status || '').toLowerCase() === 'excused').length,
  };
}

function mapRosterOut(roster) {
  return (Array.isArray(roster) ? roster : []).map((r) => ({
    id: r.id || r.student_id,
    name: r.name || r.student_name || '',
    adm: r.student_code || r.adm || '',
    status: r.status || 'present',
    remarks: r.remarks || '',
  }));
}

function smStudentDisplayName(s) {
  if (!s) return '';
  if (s.fullName) return String(s.fullName).trim();
  const parts = [s.firstName, s.lastName, s.middleName].filter(Boolean).map(String);
  return parts.join(' ').trim();
}

async function enrichRosterRecords(organizationId, className, roster) {
  const list = Array.isArray(roster) ? roster : [];
  if (!list.length) return [];

  let students = [];
  try {
    students = await smStudents(organizationId, className);
  } catch {
    students = [];
  }
  const byId = new Map();
  for (const s of students) {
    if (s.id) byId.set(String(s.id), s);
    if (s.studentCode) byId.set(String(s.studentCode), s);
  }

  return list.map((r) => {
    const sid = String(r.id || r.student_id || '');
    const sm = byId.get(sid);
    const name =
      String(r.name || r.student_name || '').trim() ||
      smStudentDisplayName(sm) ||
      (sid ? `Learner ${sid.slice(0, 8)}` : 'Unknown learner');
    const code = String(r.student_code || r.adm || sm?.studentCode || '').trim();
    return {
      id: r.id || r.student_id || sid,
      name,
      student_code: code,
      student_name: name,
      status: r.status || 'present',
      remarks: r.remarks || '',
    };
  });
}

function rosterNeedsPersistEnrich(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
  for (let i = 0; i < before.length; i += 1) {
    const b = before[i];
    const a = after[i];
    if (!String(b.name || b.student_name || '').trim() && String(a.name || '').trim()) return true;
    if (!String(b.student_code || b.adm || '').trim() && String(a.student_code || '').trim()) return true;
  }
  return false;
}

async function persistSessionRosterIfEnriched(sessionId, organizationId, className, roster) {
  const enriched = await enrichRosterRecords(organizationId, className, roster);
  const data = db();
  const idx = data.rollCall.findIndex((s) => s.id === sessionId && s.organizationId === organizationId);
  if (idx < 0) return enriched;
  if (rosterNeedsPersistEnrich(data.rollCall[idx].roster, enriched)) {
    data.rollCall[idx].roster = enriched;
    data.rollCall[idx].updatedAt = new Date().toISOString();
    writeDb(data);
  }
  return enriched;
}

function rollSessionSummary(s) {
  const stats = rollStats(s.roster);
  return {
    id: s.id,
    log_id: s.id,
    roll_label: s.roll_label,
    date: s.date,
    class_name: s.class_name,
    teacher_name: s.teacher_name || '',
    teacherUserId: s.teacherUserId,
    updatedAt: s.updatedAt || s.createdAt || null,
    ...stats,
  };
}

function rollHistoryFilters(s, organizationId, query) {
  if (s.organizationId !== organizationId) return false;
  const className = String(query.class_name || query.className || '');
  if (className && s.class_name !== className) return false;
  const date = String(query.date || '');
  if (date && s.date !== date) return false;
  const from = query.date_from || query.dateFrom;
  const to = query.date_to || query.dateTo;
  if (from && String(s.date) < String(from).slice(0, 10)) return false;
  if (to && String(s.date) > String(to).slice(0, 10)) return false;
  const q = String(query.q || query.search || '')
    .trim()
    .toLowerCase();
  if (q) {
    const hay = [s.roll_label, s.class_name, s.teacher_name].filter(Boolean).join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

router.get('/teacher-portal/round-roll-call/history', (req, res) => {
  try {
    const organizationId = orgId(req);
    const rows = db()
      .rollCall.filter((s) => rollHistoryFilters(s, organizationId, req.query))
      .sort((a, b) => {
        const d = String(b.date || '').localeCompare(String(a.date || ''));
        if (d !== 0) return d;
        return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      })
      .map(rollSessionSummary);
    send(res, paginateRows(rows, req));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/round-roll-call/sessions/:sessionId', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const session = db().rollCall.find(
      (s) => s.id === req.params.sessionId && s.organizationId === organizationId
    );
    if (!session) return res.status(404).json({ success: false, message: 'Roll call not found' });
    const enriched = await persistSessionRosterIfEnriched(
      session.id,
      organizationId,
      session.class_name,
      session.roster
    );
    const stats = rollStats(enriched);
    send(res, {
      ...rollSessionSummary({ ...session, roster: enriched }),
      roster: mapRosterOut(enriched),
      stats,
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/round-roll-call/sessions', (req, res) => {
  try {
    const organizationId = orgId(req);
    const className = String(req.query.class_name || '');
    const date = String(req.query.date || '');
    const mineOnly = String(req.query.mine || '').toLowerCase() === '1';
    const t = teacher(req);
    const sessions = db().rollCall.filter(
      (s) =>
        s.organizationId === organizationId &&
        (!mineOnly || s.teacherUserId === t.id) &&
        (!className || s.class_name === className) &&
        (!date || s.date === date)
    );
    send(res, {
      sessions: sessions.map(rollSessionSummary),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/round-roll-call', async (req, res) => {
  try {
    const t = teacher(req);
    const organizationId = orgId(req);
    const className = String(req.query.class_name || '');
    const date = String(req.query.date || '');
    const rollLabel = String(req.query.roll_label || '');
    const existing = db().rollCall.find(
      (s) =>
        s.organizationId === organizationId &&
        s.class_name === className &&
        s.date === date &&
        s.roll_label === rollLabel
    );
    if (existing) {
      const enriched = await persistSessionRosterIfEnriched(
        existing.id,
        organizationId,
        existing.class_name,
        existing.roster
      );
      return send(res, {
        log_exists: true,
        session_id: existing.id,
        owned_by_me: existing.teacherUserId === t.id,
        teacher_name: existing.teacher_name || '',
        roster: mapRosterOut(enriched),
      });
    }
    const students = await smStudents(organizationId, className);
    send(res, {
      log_exists: false,
      roster: students.map((s) => ({
        id: s.id,
        name: s.fullName,
        adm: s.studentCode,
        status: 'present',
        remarks: '',
        student_code: s.studentCode,
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/round-roll-call', async (req, res) => {
  try {
    const t = teacher(req);
    const organizationId = orgId(req);
    const body = req.body || {};
    const data = db();
    const idx = data.rollCall.findIndex(
      (s) =>
        s.organizationId === organizationId &&
        s.class_name === body.class_name &&
        s.date === body.date &&
        s.roll_label === body.roll_label
    );
    if (idx >= 0 && data.rollCall[idx].teacherUserId !== t.id) {
      return res.status(409).json({
        success: false,
        message: 'This roll was already saved by another teacher. Open it from history to view.',
      });
    }
    const prev = idx >= 0 ? data.rollCall[idx] : null;
    const rawRoster = (body.records || []).map((r) => ({
      id: r.student_id || r.id,
      name: r.name || r.student_name || '',
      student_code: r.student_code || r.adm || '',
      status: r.status,
      remarks: r.remarks || '',
    }));
    const roster = await enrichRosterRecords(organizationId, body.class_name, rawRoster);
    const row = {
      id: prev?.id || `roll-${Date.now()}`,
      organizationId,
      teacherUserId: t.id,
      teacher_name: t.name || prev?.teacher_name || '',
      class_name: body.class_name,
      date: body.date,
      roll_label: body.roll_label,
      roster,
      createdAt: prev?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) data.rollCall[idx] = row;
    else data.rollCall.unshift(row);
    writeDb(data);
    send(res, rollSessionSummary(row));
  } catch (err) {
    fail(res, err);
  }
});

function serviceOrgId(req) {
  return String(req.query.organizationId || req.body?.organizationId || '');
}

function academicYearDateMatch(dateStr, academicYear) {
  if (!academicYear) return true;
  const y = String(academicYear).trim();
  if (!y) return true;
  const parts = y.split(/[-–/]/).map((p) => p.trim()).filter(Boolean);
  const d = String(dateStr || '');
  return parts.some((p) => p.length >= 4 && d.includes(p.slice(0, 4)));
}

function filterRollSessionsForOrg(organizationId, query) {
  return db()
    .rollCall.filter((s) => {
      if (s.organizationId !== organizationId) return false;
      if (!rollHistoryFilters(s, organizationId, query)) return false;
      const ay = query.academic_year || query.academicYear;
      if (ay && !academicYearDateMatch(s.date, ay)) return false;
      return true;
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

function buildRollAnalytics(sessions) {
  const byClass = new Map();
  const byDay = new Map();
  let present = 0;
  let absent = 0;
  let excused = 0;

  for (const s of sessions) {
    const stats = rollStats(s.roster);
    present += stats.present;
    absent += stats.absent;
    excused += stats.excused;

    const ck = s.class_name || 'Unknown';
    if (!byClass.has(ck)) {
      byClass.set(ck, { class_name: ck, present: 0, absent: 0, excused: 0, rolls: 0, learners: 0 });
    }
    const c = byClass.get(ck);
    c.present += stats.present;
    c.absent += stats.absent;
    c.excused += stats.excused;
    c.rolls += 1;
    c.learners += stats.total;

    const dk = s.date || 'unknown';
    if (!byDay.has(dk)) {
      byDay.set(dk, { date: dk, present: 0, absent: 0, excused: 0, rolls: 0 });
    }
    const d = byDay.get(dk);
    d.present += stats.present;
    d.absent += stats.absent;
    d.excused += stats.excused;
    d.rolls += 1;
  }

  return {
    totals: { sessions: sessions.length, present, absent, excused },
    byClass: [...byClass.values()].sort((a, b) => a.class_name.localeCompare(b.class_name)),
    byDay: [...byDay.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 31),
  };
}

router.get('/service/round-roll-call/history', requireServiceAuth, (req, res) => {
  try {
    const organizationId = serviceOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId required' });
    }
    const rows = filterRollSessionsForOrg(organizationId, req.query).map(rollSessionSummary);
    send(res, paginateRows(rows, req));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/service/round-roll-call/sessions/:sessionId', requireServiceAuth, async (req, res) => {
  try {
    const organizationId = serviceOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId required' });
    }
    const session = db().rollCall.find(
      (s) => s.id === req.params.sessionId && s.organizationId === organizationId
    );
    if (!session) return res.status(404).json({ success: false, message: 'Roll call not found' });
    const enriched = await persistSessionRosterIfEnriched(
      session.id,
      organizationId,
      session.class_name,
      session.roster
    );
    const stats = rollStats(enriched);
    send(res, {
      ...rollSessionSummary({ ...session, roster: enriched }),
      roster: mapRosterOut(enriched),
      stats,
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/service/round-roll-call/analytics', requireServiceAuth, (req, res) => {
  try {
    const organizationId = serviceOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId required' });
    }
    const sessions = filterRollSessionsForOrg(organizationId, req.query);
    send(res, buildRollAnalytics(sessions));
  } catch (err) {
    fail(res, err);
  }
});

module.exports = { teacherServicesRouter: router };
