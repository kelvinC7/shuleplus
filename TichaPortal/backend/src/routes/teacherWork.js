const { Router } = require('express');
const env = require('../lib/env');
const { authenticateIam, orgId, teacher } = require('../middleware/iamAuth');
const { serviceFetch, unwrap } = require('../lib/serviceFetch');
const { existingPhoto } = require('../lib/teacherPhoto');
const {
  buildTeacherPayrollSummary,
  probeConfiguredModules,
  disciplineApi,
} = require('../lib/moduleApis');
const router = Router();
router.use(authenticateIam);

function authHeader(req) {
  return req.headers.authorization;
}

function q(req, key) {
  return typeof req.query[key] === 'string' ? req.query[key] : undefined;
}

function defaultAcademicSettings() {
  const y = new Date().getFullYear();
  return {
    academicYears: [`${y}-${y + 1}`],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: `${y}-${y + 1}`,
    currentTerm: 'Term 1',
  };
}

async function iamAcademicSettings(organizationId) {
  try {
    const payload = await serviceFetch(
      env.IAM_API_URL,
      `/internal/organizations/${organizationId}/academic-settings`
    );
    return unwrap(payload) || defaultAcademicSettings();
  } catch {
    return defaultAcademicSettings();
  }
}

async function iamTeacherName(userId) {
  try {
    const user = unwrap(await serviceFetch(env.IAM_API_URL, `/internal/users/${userId}`));
    return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || null;
  } catch {
    return null;
  }
}

async function teacherIdentity(req) {
  if (req._teacherIdentity) return req._teacherIdentity;
  const t = teacher(req);
  let name = q(req, 'teacherName') || t.name;
  const iamName = await iamTeacherName(t.id);
  if (iamName) name = iamName;
  try {
    const link = await teacherLink(orgId(req), t.id, t.email);
    if (link.profile?.teacherName) name = link.profile.teacherName;
    req._teacherLink = link;
  } catch {
    /* keep IAM / query name */
  }
  req._teacherIdentity = { ...t, name };
  return req._teacherIdentity;
}

function requestedAcademic(req, extra = {}) {
  return {
    term: extra.term || q(req, 'term') || undefined,
    academicYear:
      extra.academicYear ||
      q(req, 'academicYear') ||
      q(req, 'academic_year') ||
      undefined,
  };
}

function timetable(path, opts) {
  return serviceFetch(env.TIMETABLE_API_URL, path, opts);
}

function academic(path, req, opts = {}) {
  return serviceFetch(env.ACADEMIC_API_URL, path, {
    ...opts,
    authorization: authHeader(req),
    query: { organizationId: orgId(req), ...(opts.query || {}) },
  });
}

function studentMgmt(path, organizationId, query) {
  return serviceFetch(env.STUDENT_MANAGEMENT_API_URL, path, {
    query: { organizationId, ...(query || {}) },
  });
}

function attendanceApi(path, organizationId, query) {
  return serviceFetch(env.ATTENDANCE_API_URL, path, {
    query: { organizationId, ...(query || {}) },
  });
}

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ success: false, message: err.message || 'Request failed' });
}

function normalize(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}

function smLabel(c) {
  return c.label?.trim() || [c.name, c.stream].filter(Boolean).join(' ').trim() || String(c.name || '');
}

function normalizeCompact(s) {
  return normalize(s).replace(/\s+/g, '');
}

function classNamesEquivalent(a, b) {
  const left = String(a ?? '').trim();
  const right = String(b ?? '').trim();
  if (!left || !right) return false;
  const na = normalize(left);
  const nb = normalize(right);
  if (na === nb) return true;
  if (normalizeCompact(left) === normalizeCompact(right)) return true;
  return na.includes(nb) || nb.includes(na);
}

const ANNUAL_TEMPLATE_TERM = 'Annual';

function templateTermMatchesSession(templateTerm, sessionTerm) {
  const t = String(templateTerm ?? '').trim();
  const s = String(sessionTerm ?? '').trim();
  if (!s) return true;
  if (t.toLowerCase() === s.toLowerCase()) return true;
  if (t === ANNUAL_TEMPLATE_TERM && /^term\s*[123]\b/i.test(s)) return true;
  return false;
}

function academicYearsMatch(a, b) {
  if (!a || !b) return false;
  const na = String(a)
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/\s/g, '')
    .toLowerCase();
  const nb = String(b)
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/\s/g, '')
    .toLowerCase();
  return na === nb;
}

async function teacherLink(organizationId, userId, email) {
  try {
    const profile = unwrap(
      await timetable('/internal/teacher/account-profile', {
        query: { organizationId, teacherUserId: userId, email },
      })
    );
    return {
      profile,
      linked: Boolean(profile && (profile.teacherUserId === userId || profile.loginEmail)),
    };
  } catch {
    return { profile: null, linked: false };
  }
}

/** IAM user id + linked Timetable teacher id (parent chat threads use assignment ids). */
async function resolveTeacherUserIds(req) {
  const t = teacher(req);
  const organizationId = orgId(req);
  const ids = new Set([t.id]);
  let primary = t.id;
  try {
    const link = await teacherLink(organizationId, t.id, t.email);
    if (link.profile?.teacherUserId) {
      primary = String(link.profile.teacherUserId);
      ids.add(primary);
    }
  } catch {
    /* IAM id only */
  }
  return { primary, ids: [...ids], iamUserId: t.id };
}

router.get('/timetable/academic-settings', async (req, res) => {
  try {
    send(res, await iamAcademicSettings(orgId(req)));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/timetable/teacher/today', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const ac = requestedAcademic(req);
    const data = unwrap(
      await timetable('/internal/teacher/today', {
        query: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          email: t.email,
          teacherName: t.name,
          term: ac.term,
          academicYear: ac.academicYear,
          date: q(req, 'date'),
        },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/timetable/teacher/schedule', async (req, res) => {
  try {
    send(res, await fetchTeacherSchedule(req));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/timetable/teacher/live', async (req, res) => {
  try {
    const today = await fetchTeacherTodaySafe(req);
    const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
    send(res, {
      serverTime: new Date().toISOString(),
      refreshSeconds: 30,
      dayOfWeek: today?.dayOfWeek || null,
      current: today?.current || null,
      next: today?.next || null,
      kpis: today?.kpis || {},
      lessons: lessons.map((l) => ({
        ...l,
        isCurrent: l.phase === 'current' || today?.current?.timetableId === l.timetableId,
        isNext: today?.next?.timetableId === l.timetableId,
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/timetable/teacher/attendance-history', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const ac = requestedAcademic(req);
    const data = unwrap(
      await timetable('/internal/teacher/attendance-history', {
        query: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          email: t.email,
          teacherName: t.name,
          term: ac.term,
          academicYear: ac.academicYear,
          limit: q(req, 'limit') || '100',
        },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/timetable/lessons/start', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const data = unwrap(
      await timetable('/internal/lessons/start', {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          teacherName: t.name,
          email: t.email,
          ...(req.body || {}),
        },
      })
    );
    send(res, data, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/timetable/lessons/:sessionId/complete', async (req, res) => {
  try {
    const t = teacher(req);
    const data = unwrap(
      await timetable(`/internal/lessons/${req.params.sessionId}/complete`, {
        method: 'POST',
        body: { organizationId: orgId(req), teacherUserId: t.id, ...(req.body || {}) },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

/** Timetable assignments + weekly schedule fallback, with Student Management class ids. */
async function resolveTeacherAssignments(req, academicYear, term) {
  const t = await teacherIdentity(req);
  const organizationId = orgId(req);
  const link = req._teacherLink || (await teacherLink(organizationId, t.id, t.email));
  const teacherUserId = link.profile?.teacherUserId || t.id;
  const reqWithAc = {
    ...req,
    query: { ...req.query, academicYear, term },
  };
  const [assignmentsPayload, classesPayload, schedule] = await Promise.all([
    timetable('/internal/teacher/assignments', {
      query: {
        organizationId,
        teacherUserId,
        email: t.email,
        teacherName: t.name,
        term,
        academicYear,
      },
    }).catch(() => ({ data: [] })),
    studentMgmt('/service/classes', organizationId).catch(() => ({ data: [] })),
    fetchTeacherSchedule(reqWithAc).catch(() => null),
  ]);
  let assignments = Array.isArray(unwrap(assignmentsPayload)) ? unwrap(assignmentsPayload) : [];
  const smClasses = Array.isArray(unwrap(classesPayload)) ? unwrap(classesPayload) : [];

  if (!assignments.length && schedule?.byDay) {
    const seen = new Set();
    for (const slots of Object.values(schedule.byDay)) {
      for (const slot of slots || []) {
        const key = `${slot.subjectName}|${slot.className}`;
        if (seen.has(key)) continue;
        seen.add(key);
        assignments.push({
          subjectName: slot.subjectName,
          className: slot.className,
          periodsPerWeek: 1,
          room: slot.room || null,
          term: slot.term,
          academicYear: slot.academicYear,
        });
      }
    }
  }

  return assignments.map((a) => {
    const target = a.className;
    const matched =
      smClasses.find((c) => classNamesEquivalent(smLabel(c), target)) ||
      smClasses.find((c) => classNamesEquivalent(c.name, target)) ||
      null;
    return {
      subjectName: a.subjectName,
      className: a.className,
      classId: matched?.id || a.classId || null,
      classLabel: matched ? smLabel(matched) : a.className,
      periodsPerWeek: a.periodsPerWeek,
      room: a.room || null,
      term: a.term,
      academicYear: a.academicYear,
    };
  });
}

router.get('/my-courses', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const organizationId = orgId(req);
    const link = req._teacherLink || (await teacherLink(organizationId, t.id, t.email));
    const ac = requestedAcademic(req);
    const courses = await resolveTeacherAssignments(req, ac.academicYear, ac.term);

    const groupedMap = new Map();
    for (const course of courses) {
      const current = groupedMap.get(course.subjectName) || {
        subjectName: course.subjectName,
        totalPeriods: 0,
        classes: [],
      };
      current.totalPeriods += course.periodsPerWeek || 0;
      current.classes.push({
        className: course.className,
        classId: course.classId,
        periodsPerWeek: course.periodsPerWeek,
        room: course.room,
      });
      groupedMap.set(course.subjectName, current);
    }

    send(res, {
      linked: Boolean(link.linked || courses.length),
      teacherName: link.profile?.teacherName || t.name,
      assignments: courses,
      grouped: [...groupedMap.values()],
      totalPeriods: courses.reduce((sum, c) => sum + (c.periodsPerWeek || 0), 0),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/my-classes', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const organizationId = orgId(req);
    let smWarning = null;
    const [smPayload, names] = await Promise.all([
      studentMgmt('/service/classes', organizationId)
        .then(unwrap)
        .catch((err) => {
          if (err.status === 503) smWarning = err.message;
          return [];
        }),
      listTeacherClassNames(req),
    ]);
    const smClasses = Array.isArray(smPayload) ? smPayload : [];
    const classes = names.map((name) => {
      const matched =
        smClasses.find((c) => normalize(smLabel(c)) === normalize(name)) ||
        smClasses.find((c) => normalize(c.name) === normalize(name)) ||
        null;
      return {
        id: matched?.id || name,
        name: matched?.name || name,
        stream: matched?.stream || null,
        label: matched ? smLabel(matched) : name,
        studentCount: matched?.studentCount ?? null,
        roles: ['TEACHING'],
      };
    });
    send(res, {
      linked: classes.length > 0,
      teacherName: t.name,
      warning: smWarning,
      classes,
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/my-classes/:classId/students', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const classId = req.params.classId;
    const className = q(req, 'className') || '';
    const academicYear = q(req, 'academicYear');
    const attempts = [
      { classId, academicYear },
      { classId },
      { className, academicYear },
      { className },
    ];
    let students = [];
    for (const query of attempts) {
      try {
        const payload = await studentMgmt('/service/students', organizationId, {
          ...query,
          status: 'ACTIVE',
        });
        const list = Array.isArray(unwrap(payload)) ? unwrap(payload) : [];
        if (list.length) {
          students = list;
          break;
        }
      } catch (err) {
        if (err.status === 503) {
          return fail(res, err);
        }
      }
    }
    send(res, students);
  } catch (err) {
    fail(res, err);
  }
});

function examGet(req, path, query) {
  return academic(path, req, { query });
}

function examPost(req, path) {
  return academic(path, req, { method: 'POST', body: req.body || {} });
}

router.get('/examinations/me', async (req, res) => {
  try {
    send(res, unwrap(await examGet(req, '/exam-invigilator/me')));
  } catch (err) {
    if (err.status === 503) {
      return send(res, { rooms: [], warning: err.message, serviceDown: true });
    }
    fail(res, err);
  }
});

router.get('/examinations/lists', async (req, res) => {
  try {
    send(res, unwrap(await examGet(req, '/exam-invigilator/lists')));
  } catch (err) {
    if (err.status === 503) {
      return send(res, { rooms: [], warning: err.message, serviceDown: true });
    }
    fail(res, err);
  }
});

router.get('/examinations/room', async (req, res) => {
  try {
    send(
      res,
      unwrap(
        await examGet(req, '/exam-invigilator/room', {
          roomName: q(req, 'roomName'),
          sessionId: q(req, 'sessionId'),
          examDate: q(req, 'examDate'),
          slotCode: q(req, 'slotCode'),
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

router.post('/examinations/entry', async (req, res) => {
  try {
    send(res, unwrap(await examPost(req, '/exam-invigilator/entry')));
  } catch (err) {
    fail(res, err);
  }
});

router.post('/examinations/eligibility', async (req, res) => {
  try {
    send(res, unwrap(await examPost(req, '/exam-invigilator/eligibility')));
  } catch (err) {
    fail(res, err);
  }
});

router.post('/examinations/exit', async (req, res) => {
  try {
    send(res, unwrap(await examPost(req, '/exam-invigilator/exit')));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/assessments', async (req, res) => {
  try {
    send(
      res,
      unwrap(
        await academic('/assessments', req, {
          query: {
            status: q(req, 'status'),
            subjectId: q(req, 'subjectId'),
            classId: q(req, 'classId'),
            academicYear: q(req, 'academicYear'),
            term: q(req, 'term'),
            createdBy: q(req, 'mine') === '1' ? req.user?.sub : undefined,
          },
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

router.post('/assessments', async (req, res) => {
  try {
    send(res, unwrap(await academic('/assessments', req, { method: 'POST', body: req.body || {} })), 201);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/assessments/preview-code', async (req, res) => {
  try {
    send(res, unwrap(await academic('/assessments/preview-code', req, { query: req.query })));
  } catch (err) {
    fail(res, err);
  }
});

router.put('/assessments/:id', async (req, res) => {
  try {
    send(res, unwrap(await academic(`/assessments/${req.params.id}`, req, { method: 'PUT', body: req.body || {} })));
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/assessments/:id', async (req, res) => {
  try {
    send(res, unwrap(await academic(`/assessments/${req.params.id}`, req, { method: 'DELETE' })));
  } catch (err) {
    fail(res, err);
  }
});

async function resolveCourseDefaultMarks(req, { classId, className, subjectName, academicYear, term }) {
  if (!academicYear || !term || !subjectName) return null;
  try {
    const query = { academicYear, term };
    if (classId) query.classId = classId;
    const rows = asList(unwrap(await academic('/grading/course-default-marks', req, { query })));
    const sn = normalize(subjectName);
    const hit = rows.find((r) => {
      const rn = normalize(r.subject?.name || '');
      if (rn !== sn) return false;
      if (!className) return true;
      const cn = [r.class?.name, r.class?.stream].filter(Boolean).join(' ') || r.class?.name || '';
      return classNamesEquivalent(cn, className);
    });
    const n = Number(hit?.defaultCourseMarks);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

router.get('/course-default-marks', async (req, res) => {
  try {
    const academicYear = q(req, 'academic_year') || q(req, 'academicYear');
    const term = q(req, 'term');
    const className = q(req, 'class_name') || q(req, 'className');
    const subjectName = q(req, 'subject_name') || q(req, 'subjectName');
    const classId = q(req, 'class_id') || q(req, 'classId');
    const value = await resolveCourseDefaultMarks(req, {
      classId,
      className,
      subjectName,
      academicYear,
      term,
    });
    send(res, { defaultCourseMarks: value });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/assessments/:id', async (req, res) => {
  try {
    send(res, unwrap(await academic(`/assessments/${req.params.id}`, req)));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/assessments/:id/marks', async (req, res) => {
  try {
    send(res, unwrap(await academic(`/assessments/${req.params.id}/marks`, req)));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/assessments/:id/statistics', async (req, res) => {
  try {
    send(res, unwrap(await academic(`/assessments/${req.params.id}/statistics`, req)));
  } catch (err) {
    fail(res, err);
  }
});

router.post('/assessments/:id/marks', async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const body = req.body || {};
    const payload = unwrap(
      await academic(`/assessments/${assessmentId}/marks`, req, { method: 'POST', body })
    );
    const marks = body.marks || body.entries || [];
    if (Array.isArray(marks) && marks.some((m) => m.score != null || m.value != null || m.mark_code)) {
      await ensureAssessmentMarkEntryStatus(req, assessmentId);
    }
    send(res, payload);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/grading-scale', async (req, res) => {
  try {
    const academicLevel = q(req, 'academicLevel') || q(req, 'academic_level') || 'PRIMARY';
    const raw = await academic('/grading/grading-scale', req, { query: { academicLevel } });
    send(res, asList(unwrap(raw)));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/report-card/settings', async (req, res) => {
  try {
    send(res, unwrap(await academic('/grading/report-card/settings', req)));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/report-card/comments', async (req, res) => {
  try {
    send(
      res,
      unwrap(
        await academic('/grading/report-card/comments', req, {
          query: {
            studentId: q(req, 'studentId'),
            classId: q(req, 'classId'),
            academicYear: q(req, 'academicYear'),
            term: q(req, 'term'),
          },
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

router.put('/report-card/comments', async (req, res) => {
  try {
    send(
      res,
      unwrap(
        await academic('/grading/report-card/comments', req, {
          method: 'PUT',
          body: { ...(req.body || {}), role: req.body?.role || 'class' },
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

router.get('/assessment-templates', async (req, res) => {
  try {
    send(
      res,
      unwrap(
        await academic('/assessment-templates', req, {
          query: {
            status: q(req, 'status'),
            academicYear: q(req, 'academicYear'),
            term: q(req, 'term'),
            academicLevel: q(req, 'academicLevel'),
          },
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

function minutesUntil(hhmm) {
  const parts = String(hhmm || '').split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (!Number.isFinite(h)) return null;
  const now = new Date();
  return h * 60 + m - (now.getHours() * 60 + now.getMinutes());
}

function flattenSlots(byDay) {
  const rows = [];
  for (const [day, slots] of Object.entries(byDay || {})) {
    for (const slot of Array.isArray(slots) ? slots : []) {
      const start = slot.startTime || '';
      rows.push({
        id: slot.id,
        day: slot.dayOfWeek || day,
        time: start,
        subject: slot.subjectName,
        group: slot.className,
        class_name: slot.className,
        room: slot.room || '',
        teacher_name: slot.teacherName,
        start_time: start,
        end_time: slot.endTime || '',
        day_of_week: slot.dayOfWeek || day,
      });
    }
  }
  return rows;
}

async function fetchTeacherSchedule(req, extra = {}) {
  const t = await teacherIdentity(req);
  const ac = requestedAcademic(req, extra);
  return unwrap(
    await timetable('/internal/teacher/schedule', {
      query: {
        organizationId: orgId(req),
        teacherUserId: t.id,
        email: t.email,
        teacherName: t.name,
        term: ac.term,
        academicYear: ac.academicYear,
        className: extra.className || q(req, 'class_name') || q(req, 'className'),
        view: extra.view || q(req, 'view') || 'weekly',
        day: extra.day || q(req, 'day'),
        course: extra.course || q(req, 'course'),
      },
    })
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTimeToMinutes(time) {
  if (!time) return null;
  const parts = String(time).trim().split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h)) return null;
  return h * 60 + m;
}

function slotDurationMinutes(startTime, endTime) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

function normalizeCourseKey(subjectName, className) {
  return `${String(subjectName || '').trim().toLowerCase()}|${String(className || '').trim().toLowerCase()}`;
}

function lessonTimingFields(row) {
  const durationMinutes =
    row.durationMinutes ||
    row.periodMinutes ||
    slotDurationMinutes(row.startTime, row.endTime) ||
    40;
  return {
    ...row,
    durationMinutes,
    periodCount: row.periodCount || 1,
  };
}

function isConsecutiveSameCourse(current, next) {
  return (
    current.endTime === next.startTime &&
    normalizeCourseKey(current.subjectName, current.className) ===
      normalizeCourseKey(next.subjectName, next.className)
  );
}

function mergeConsecutiveLessonBlocks(lessons) {
  if (!Array.isArray(lessons) || !lessons.length) return [];
  const sorted = [...lessons]
    .map(lessonTimingFields)
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
  const merged = [];
  let block = { ...sorted[0], periodCount: 1 };
  block.durationMinutes = slotDurationMinutes(block.startTime, block.endTime) || block.durationMinutes || 40;

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    if (isConsecutiveSameCourse(block, next)) {
      block = {
        ...block,
        endTime: next.endTime,
        periodCount: (block.periodCount || 1) + 1,
        durationMinutes:
          slotDurationMinutes(block.startTime, next.endTime) ||
          (block.durationMinutes || 40) + (next.durationMinutes || 40),
        periodLabel: [block.periodLabel, next.periodLabel].filter(Boolean).join(' + ') || block.periodLabel,
      };
    } else {
      merged.push(block);
      block = {
        ...next,
        periodCount: 1,
        durationMinutes: slotDurationMinutes(next.startTime, next.endTime) || next.durationMinutes || 40,
      };
    }
  }
  merged.push(block);
  return merged;
}

function dayNameFromIsoDate(isoDate) {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return DAY_NAMES[d.getDay()];
}

function filterLessonsForCourse(lessons, subjectName, className) {
  const key = normalizeCourseKey(subjectName, className);
  return (lessons || []).filter(
    (l) => normalizeCourseKey(l.subjectName, l.className || l.group) === key
  );
}

async function resolveSessionDurationForCourse(
  req,
  { subjectName, className, date, academicYear, term }
) {
  const fallback = { durationMinutes: 40, periodCount: 1, source: 'default' };
  if (!subjectName || !className) return fallback;

  const today = await fetchTeacherTodaySafe(req, { date, academicYear, term });
  let lessons = mergeConsecutiveLessonBlocks(today?.lessons || []);
  let matches = filterLessonsForCourse(lessons, subjectName, className);

  if (!matches.length) {
    try {
      const schedule = await fetchTeacherSchedule(req, { academicYear, term });
      const day = dayNameFromIsoDate(date);
      const rawDay =
        (day && schedule?.byDay?.[day]) ||
        (day && schedule?.byDay?.[day.toUpperCase()]) ||
        [];
      lessons = mergeConsecutiveLessonBlocks(
        (Array.isArray(rawDay) ? rawDay : []).map((slot) => ({
          subjectName: slot.subjectName,
          className: slot.className,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          periodLabel: slot.periodLabel,
        }))
      );
      matches = filterLessonsForCourse(lessons, subjectName, className);
    } catch {
      /* schedule optional */
    }
  }

  if (!matches.length) return fallback;

  const durationMinutes = matches.reduce((sum, l) => sum + (l.durationMinutes || 40), 0);
  const periodCount = matches.reduce((sum, l) => sum + (l.periodCount || 1), 0);
  const first = matches[0];
  const last = matches[matches.length - 1];
  return {
    durationMinutes,
    periodCount,
    startTime: first.startTime || null,
    endTime: last.endTime || null,
    source: 'timetable',
  };
}

async function fetchTeacherTodaySafe(req, extra = {}) {
  try {
    const t = await teacherIdentity(req);
    const ac = requestedAcademic(req, extra);
    return (
      unwrap(
        await timetable('/internal/teacher/today', {
          query: {
            organizationId: orgId(req),
            teacherUserId: t.id,
            email: t.email,
            teacherName: t.name,
            term: ac.term,
            academicYear: ac.academicYear,
            date: extra.date || q(req, 'date'),
          },
        })
      ) || null
    );
  } catch {
    return null;
  }
}

router.get('/teacher-portal/upcoming-lesson', async (req, res) => {
  try {
    const today = await fetchTeacherTodaySafe(req);
    const target = today?.next || today?.current || null;
    if (!target) {
      return send(res, { has_lesson: false, warn_soon: false, minutes_until: null, lesson: null });
    }
    const mins = minutesUntil(target.startTime);
    const isCurrent = Boolean(today?.current) && today.current === target;
    const warnSoon = isCurrent || (mins != null && mins <= 15);
    send(res, {
      has_lesson: true,
      warn_soon: warnSoon,
      minutes_until: isCurrent ? 0 : mins,
      lesson: {
        class_name: target.className,
        subject_name: target.subjectName,
        start_time: target.startTime,
        end_time: target.endTime,
        room: target.room,
      },
    });
  } catch {
    send(res, { has_lesson: false, warn_soon: false, minutes_until: null, lesson: null });
  }
});

router.get('/teacher-portal/timetable-filters', async (req, res) => {
  try {
    const settings = await iamAcademicSettings(orgId(req));
    let classes = [];
    try {
      const schedule = await fetchTeacherSchedule(req);
      classes = Array.isArray(schedule?.classes) ? schedule.classes : [];
    } catch {
      classes = [];
    }
    send(res, {
      classes,
      terms: settings.terms || [],
      academicYears: settings.academicYears || [],
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/timetable', async (req, res) => {
  try {
    const schedule = await fetchTeacherSchedule(req);
    send(res, flattenSlots(schedule?.byDay));
  } catch {
    send(res, []);
  }
});

router.get('/teacher-portal/dashboard', async (req, res) => {
  try {
    const [today, schedule] = await Promise.all([
      fetchTeacherTodaySafe(req),
      fetchTeacherSchedule(req).catch(() => null),
    ]);
    const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
    send(res, {
      stats: [
        { label: 'Total Classes', value: today?.kpis?.todayClasses ?? lessons.length },
        { label: 'Total Sessions', value: lessons.length },
      ],
      schedule: lessons.map((l) => ({
        time: l.startTime,
        end_time: l.endTime,
        title: [l.subjectName, l.className].filter(Boolean).join(' · '),
        room: l.room || l.className || '',
        active: l.phase === 'current',
        period_checked_in: Boolean(l.qrVerified || l.scannedAt),
        entry_time: l.scannedAt || null,
      })),
      weeklySchedule: flattenSlots(schedule?.byDay),
      schoolOverview: {
        students: 0,
        girls: 0,
        boys: 0,
        classNames: schedule?.classes || [],
      },
    });
  } catch {
    send(res, { stats: [], schedule: [], weeklySchedule: [], schoolOverview: null });
  }
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mapSmStudent(s) {
  const parts = String(s.fullName || '')
    .trim()
    .split(/\s+/);
  const first = parts[0] || '';
  const last = parts.slice(1).join(' ');
  const genderRaw = String(s.gender || '');
  const gender =
    /^m/i.test(genderRaw) ? 'Male' : /^f/i.test(genderRaw) ? 'Female' : genderRaw || '-';
  return {
    id: s.studentCode || s.id,
    row_id: s.id,
    name: s.fullName || s.studentCode || 'Student',
    grade: s.className || '',
    stream: s.stream || '',
    gender,
    parent: s.parentName || '-',
    phone: s.parentPhone || '-',
    email: '-',
    status: 'Active',
    gpa: null,
    attendance: null,
    student_photo_url: s.photoUrl || null,
    created_at: null,
    province: '-',
    district: '-',
    active_permission: null,
    residency_status: 'DAY',
    student_id: s.id,
    student_code: s.studentCode,
    student_uid: s.studentCode,
    first_name: first,
    last_name: last,
    allowed_for_exam: true,
    fee_status: 'unknown',
    total_paid: 0,
    remaining: null,
    override_mode: 'auto',
  };
}

function isClassTeacherScope(req) {
  const scope = String(q(req, 'scope') || '').toLowerCase();
  return scope === 'class_teacher' || scope === 'head_class' || scope === 'head';
}

async function listHeadTeacherClassNames(req) {
  const t = await teacherIdentity(req);
  const organizationId = orgId(req);
  const classesPayload = await studentMgmt('/service/classes', organizationId, {
    headTeacherUserId: t.id,
    headTeacherEmail: t.email,
  }).catch(() => ({ data: [] }));
  const smClasses = Array.isArray(unwrap(classesPayload)) ? unwrap(classesPayload) : [];
  const names = new Set();
  for (const c of smClasses) {
    const label = smLabel(c);
    if (label) names.add(label);
  }
  return [...names].sort();
}

async function assertClassTeacherForClass(req, className) {
  const allowed = await listHeadTeacherClassNames(req);
  const target = String(className || '').trim();
  if (!target) {
    const err = new Error('Class is required.');
    err.status = 400;
    throw err;
  }
  const ok = allowed.some((n) => n.toLowerCase() === target.toLowerCase());
  if (!ok) {
    const err = new Error('Only your assigned class (class teacher) can access this action.');
    err.status = 403;
    throw err;
  }
}

async function listTeacherClassNames(req) {
  const t = await teacherIdentity(req);
  const organizationId = orgId(req);
  if (isClassTeacherScope(req)) {
    return listHeadTeacherClassNames(req);
  }
  const scopeSchool = String(q(req, 'scope') || '').toLowerCase() === 'school';
  if (scopeSchool) {
    const classesPayload = await studentMgmt('/service/classes', organizationId, {}).catch(() => ({
      data: [],
    }));
    const smClasses = Array.isArray(unwrap(classesPayload)) ? unwrap(classesPayload) : [];
    const names = new Set();
    for (const c of smClasses) {
      const label = smLabel(c);
      if (label) names.add(label);
    }
    return [...names].sort();
  }
  const [assignmentsPayload, classesPayload, schedule] = await Promise.all([
    timetable('/internal/teacher/assignments', {
      query: {
        organizationId,
        teacherUserId: t.id,
        email: t.email,
        teacherName: t.name,
      },
    }).catch(() => ({ data: [] })),
    studentMgmt('/service/classes', organizationId, {
      headTeacherUserId: t.id,
      headTeacherEmail: t.email,
    }).catch(() => ({ data: [] })),
    fetchTeacherSchedule(req).catch(() => null),
  ]);
  const assignments = Array.isArray(unwrap(assignmentsPayload)) ? unwrap(assignmentsPayload) : [];
  const smClasses = Array.isArray(unwrap(classesPayload)) ? unwrap(classesPayload) : [];
  const names = new Set();
  for (const a of assignments) if (a.className) names.add(a.className);
  for (const c of smClasses) {
    const label = smLabel(c);
    if (label) names.add(label);
  }
  for (const name of schedule?.classes || []) if (name) names.add(name);
  return [...names].sort();
}

function classNameVariants(className) {
  const n = String(className || '')
    .trim()
    .replace(/[\s_]+/g, ' ');
  if (!n) return [];
  const compact = n.replace(/\s+/g, '');
  const dashed = n.replace(/\s+/g, '-');
  return [...new Set([n, n.toUpperCase(), compact, compact.toUpperCase(), dashed])];
}

function yearVariants(year) {
  if (!year || !String(year).trim()) return [];
  const y = String(year).trim().replace(/[–—]/g, '-').replace(/\s/g, '');
  return [...new Set([String(year).trim(), y, y.replace(/-/g, '–'), y.replace(/-/g, '/')])];
}

async function listStudentsForClassName(organizationId, className, academicYear) {
  if (!className) return [];
  const names = classNameVariants(className);
  const years = [
    undefined,
    ...yearVariants(academicYear),
    ...yearVariants((await iamAcademicSettings(organizationId).catch(() => null))?.currentAcademicYear),
    '2025-2026',
    '2025–2026',
    '2026-2027',
  ];
  const seenYears = new Set();
  const yearTries = years.filter((y) => {
    const key = y === undefined ? '' : String(y);
    if (seenYears.has(key)) return false;
    seenYears.add(key);
    return true;
  });

  for (const name of names) {
    for (const year of yearTries) {
      try {
        const payload = await studentMgmt('/service/students', organizationId, {
          className: name,
          status: 'ACTIVE',
          ...(year ? { academicYear: year } : {}),
        });
        const list = Array.isArray(unwrap(payload)) ? unwrap(payload) : [];
        if (list.length) return list.map(mapSmStudent);
      } catch {
        /* try next */
      }
    }
  }
  return [];
}

async function fetchCheckInHistorySafe(req, extra = {}) {
  try {
    const t = await teacherIdentity(req);
    return (
      unwrap(
        await timetable('/internal/teacher/check-in-history', {
          query: {
            organizationId: orgId(req),
            teacherUserId: t.id,
            email: t.email,
            teacherName: t.name,
            date: extra.date || q(req, 'date'),
            limit: extra.limit || q(req, 'limit') || '50',
          },
        })
      ) || []
    );
  } catch {
    return [];
  }
}

function toTtStatus(status) {
  const v = String(status || '').toLowerCase();
  if (v === 'absent') return 'ABSENT';
  if (v === 'late') return 'LATE';
  if (v === 'permission' || v === 'excused' || v === 'sick') return 'EXCUSED';
  return 'PRESENT';
}

function toUiStatus(status) {
  const v = String(status || '').toUpperCase();
  if (v === 'ABSENT') return 'absent';
  if (v === 'LATE') return 'late';
  if (v === 'EXCUSED' || v === 'SICK' || v === 'SCHOOL_ACTIVITY') return 'permission';
  return 'present';
}

async function sessionForTimetable(req, timetableId, date, { startIfMissing = false } = {}) {
  const today = await fetchTeacherTodaySafe(req, { date });
  const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
  const match = lessons.find((l) => String(l.timetableId) === String(timetableId));
  if (match?.sessionId) return match;
  if (!timetableId || !startIfMissing) return match || null;
  try {
    const t = teacher(req);
    const started = unwrap(
      await timetable('/internal/lessons/start', {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          teacherName: t.name,
          email: t.email,
          timetableId,
          skipQr: true,
        },
      })
    );
    return { ...match, sessionId: started?.id || started?.sessionId || null, started };
  } catch {
    return match || null;
  }
}

router.get('/timetable/teacher/check-in-history', async (req, res) => {
  try {
    send(res, await fetchCheckInHistorySafe(req));
  } catch (err) {
    fail(res, err);
  }
});

router.post('/timetable/lessons/scan-qr', async (req, res) => {
  try {
    const t = teacher(req);
    const data = unwrap(
      await timetable('/internal/lessons/scan-qr', {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          teacherName: t.name,
          email: t.email,
          qrCode: req.body?.qrCode || req.body?.qr_token,
          device: req.body?.device,
          location: req.body?.location,
        },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/timetable/lessons/:sessionId/attendance', async (req, res) => {
  try {
    const t = teacher(req);
    const data = unwrap(
      await timetable(`/internal/lessons/${req.params.sessionId}/attendance`, {
        query: { organizationId: orgId(req), teacherUserId: t.id, email: t.email },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/timetable/lessons/:sessionId/attendance', async (req, res) => {
  try {
    const t = teacher(req);
    const data = unwrap(
      await timetable(`/internal/lessons/${req.params.sessionId}/attendance`, {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          email: t.email,
          rows: req.body?.rows || [],
          submit: req.body?.submit !== false,
        },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/me', async (req, res) => {
  const t = await teacherIdentity(req);
  const organizationId = orgId(req);
  const date = todayIso();

  const settled = await Promise.allSettled([
    iamAcademicSettings(organizationId),
    fetchTeacherTodaySafe(req),
    fetchTeacherSchedule(req),
    timetable('/internal/teacher/assignments', {
      query: {
        organizationId,
        teacherUserId: t.id,
        email: t.email,
        teacherName: t.name,
      },
    }).then(unwrap),
    teacherLink(organizationId, t.id, t.email),
    studentMgmt('/service/classes', organizationId).then(unwrap),
    academic('/exam-invigilator/me', req).then(unwrap),
    attendanceApi('/service/attendance', organizationId, { date })
      .then(unwrap)
      .catch(() => []),
    fetchCheckInHistorySafe(req, { date, limit: '20' }),
    probeConfiguredModules(),
  ]);

  const value = (i, fallback) => (settled[i].status === 'fulfilled' ? settled[i].value : fallback);
  const ok = (i) => settled[i].status === 'fulfilled';
  const reason = (i) =>
    settled[i].status === 'rejected' ? settled[i].reason?.message || 'Unavailable' : null;

  const settings = value(0, defaultAcademicSettings());
  const today = value(1, null);
  const schedule = value(2, null);
  const assignments = Array.isArray(value(3, [])) ? value(3, []) : [];
  const link = value(4, { profile: null, linked: false });
  const smClasses = Array.isArray(value(5, [])) ? value(5, []) : [];
  const examDesk = value(6, null);
  const gateRecords = Array.isArray(value(7, [])) ? value(7, []) : [];
  const checkIns = Array.isArray(value(8, [])) ? value(8, []) : [];
  const extraModules = Array.isArray(value(9, [])) ? value(9, []) : [];
  const extraOk = (name) => extraModules.find((m) => m.name === name)?.ok === true;

  send(res, {
    teacher: {
      id: t.id,
      email: t.email,
      name: link.profile?.teacherName || t.name,
      photo: existingPhoto(t.id),
      organizationId,
      linked: Boolean(link.linked || (schedule?.total ?? 0) > 0),
    },
    academicSettings: settings,
    timetable: {
      ok: ok(1) || ok(2),
      today,
      schedule,
      assignments,
    },
    studentManagement: {
      ok: ok(5),
      classes: smClasses,
      warning: reason(5),
    },
    academic: {
      ok: ok(6),
      examDesk,
      warning: reason(6),
    },
    attendance: {
      ok: ok(7) || ok(8),
      gateRecords,
      checkIns,
    },
    services: {
      timetable: ok(1) || ok(2) || ok(3),
      studentManagement: ok(5),
      academic: ok(6),
      attendance: ok(7) || ok(8),
      payroll: extraOk('payroll'),
      hr: extraOk('hr'),
      kazi: extraOk('kazi'),
      discipline: extraOk('discipline'),
      babyeyi: extraOk('babyeyi'),
    },
    extraModules,
  });
});

router.get('/session/me', async (req, res) => {
  const t = await teacherIdentity(req);
  send(res, {
    id: t.id,
    email: t.email,
    name: t.name,
    organizationId: orgId(req),
  });
});

router.get('/teacher-portal/classes', async (req, res) => {
  try {
    send(res, await listTeacherClassNames(req));
  } catch {
    send(res, []);
  }
});

router.get('/teacher-portal/discipline/marks', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const payload = await disciplineApi('/service/discipline/marks', {
      query: {
        organizationId,
        status: q(req, 'status') || 'Active',
        search: q(req, 'search'),
        type: q(req, 'type'),
      },
    });
    send(res, unwrap(payload) || []);
  } catch (err) {
    if (err.status === 503) {
      return res.status(200).json({ success: true, data: [], warning: err.message });
    }
    send(res, []);
  }
});

router.get('/teacher-portal/discipline/cases', async (req, res) => {
  try {
    const className = q(req, 'class_name') || q(req, 'className');
    if (className) await assertClassTeacherForClass(req, className);
    const organizationId = orgId(req);
    const payload = await disciplineApi('/service/discipline/cases', {
      query: {
        organizationId,
        className,
        studentCode: q(req, 'student_code') || q(req, 'studentCode'),
        search: q(req, 'search'),
        status: q(req, 'status'),
      },
    });
    send(res, unwrap(payload) || []);
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    send(res, []);
  }
});

router.post('/teacher-portal/discipline/conduct', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const organizationId = orgId(req);
    const body = req.body || {};
    const className = body.className || body.class_name;
    await assertClassTeacherForClass(req, className);

    const studentId = body.studentId || body.student_id;
    const studentName = body.studentName || body.student_name;
    const studentCode = body.studentCode || body.student_code;
    const items = Array.isArray(body.items) ? body.items : [];
    if (!studentId || !studentName || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'studentId, studentName, and at least one discipline mark are required.',
      });
    }

    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const notifyMethods = Array.isArray(body.notifyMethods)
      ? body.notifyMethods
      : ['sms', 'email', 'inapp'];
    const created = [];

    for (const item of items) {
      const markId = item.markId || item.mark_id;
      const qty = Math.max(1, Number(item.qty) || 1);
      if (!markId) continue;
      for (let i = 0; i < qty; i += 1) {
        const payload = await disciplineApi('/service/discipline/cases', {
          method: 'POST',
          query: { organizationId },
          body: {
            studentId,
            studentName,
            studentCode,
            className,
            markId,
            description: note || undefined,
            notifyParent: body.notifyParent !== false,
            notifyMethods,
            recordedBy: t.id,
            source: 'ticha-class-teacher',
          },
        });
        const row = unwrap(payload);
        if (row) created.push(row);
      }
    }

    res.json({
      success: true,
      data: { cases: created, count: created.length },
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    fail(res, err);
  }
});

router.get('/teacher-portal/students', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const className = q(req, 'class_name') || q(req, 'className');
    const labels = q(req, 'class_labels')
      ? String(q(req, 'class_labels'))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : className
        ? [className]
        : await listTeacherClassNames(req);

    const buckets = await Promise.all(
      labels.map(async (name) => {
        try {
          return await listStudentsForClassName(
            organizationId,
            name,
            q(req, 'academicYear') || q(req, 'academic_year')
          );
        } catch (err) {
          if (err.status === 503) throw err;
          return [];
        }
      })
    );
    const students = buckets.flat();
    const seen = new Set();
    const unique = students.filter((s) => {
      const key = s.row_id || s.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json({
      success: true,
      data: unique,
      warning:
        labels.length === 0
          ? isClassTeacherScope(req)
            ? 'You are not assigned as class teacher for any class in Academic / Student Management.'
            : 'No teaching classes found on your timetable yet.'
          : unique.length === 0
            ? 'No students returned for your classes. Confirm Student Management is running on port 3052.'
            : undefined,
      stats: {
        totalEnrolled: unique.length,
        avgAttendance: 0,
        activePermissions: 0,
      },
    });
  } catch (err) {
    if (err.status === 503) {
      return res.status(200).json({
        success: true,
        data: [],
        warning: err.message,
        stats: { totalEnrolled: 0, avgAttendance: 0, activePermissions: 0 },
      });
    }
    send(res, []);
  }
});

router.get('/teacher-portal/attendance', async (req, res) => {
  try {
    const timetableId = q(req, 'timetable_id');
    const date = q(req, 'date') || todayIso();
    const lesson = await sessionForTimetable(req, timetableId, date);
    if (!lesson?.sessionId) {
      return send(res, { records: [], log_id: null });
    }
    const t = teacher(req);
    const payload = unwrap(
      await timetable(`/internal/lessons/${lesson.sessionId}/attendance`, {
        query: { organizationId: orgId(req), teacherUserId: t.id, email: t.email },
      })
    );
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    send(res, {
      log_id: lesson.sessionId,
      records: rows.map((r) => ({
        student_id: r.id || r.studentCode,
        student_code: r.studentCode,
        status: toUiStatus(r.status),
        remarks: r.notes || r.reason || '',
      })),
    });
  } catch {
    send(res, { records: [], log_id: null });
  }
});

router.post('/teacher-portal/attendance', async (req, res) => {
  try {
    const timetableId = req.body?.timetable_id;
    const date = req.body?.date || todayIso();
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    const lesson = await sessionForTimetable(req, timetableId, date, { startIfMissing: true });
    if (!lesson?.sessionId) {
      return res.status(400).json({ success: false, message: 'Start the lesson from My Teaching before marking attendance.' });
    }
    const t = teacher(req);
    const roster = unwrap(
      await timetable(`/internal/lessons/${lesson.sessionId}/attendance`, {
        query: { organizationId: orgId(req), teacherUserId: t.id, email: t.email },
      })
    );
    const byCode = new Map((roster?.rows || []).map((r) => [String(r.id || r.studentCode), r]));
    const rows = records.map((r) => {
      const existing = byCode.get(String(r.student_id)) || {};
      return {
        studentCode: existing.studentCode || r.student_code || r.adm || r.student_id,
        fullName: existing.fullName || r.name || 'Student',
        gender: existing.gender,
        className: existing.className,
        status: toTtStatus(r.status),
        notes: r.remarks || '',
      };
    });
    unwrap(
      await timetable(`/internal/lessons/${lesson.sessionId}/attendance`, {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          email: t.email,
          rows,
          submit: true,
        },
      })
    );
    send(res, { saved: true, sessionId: lesson.sessionId });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/attendance-summary/daily', async (req, res) => {
  try {
    const date = q(req, 'date') || todayIso();
    const className = q(req, 'class_name');
    const rows = unwrap(
      await attendanceApi('/service/attendance', orgId(req), { date, className }).catch(() => ({ data: [] }))
    );
    send(res, Array.isArray(rows) ? rows : []);
  } catch {
    send(res, []);
  }
});

router.get('/teacher-portal/attendance-summary/weekly', async (req, res) => {
  try {
    const date = q(req, 'date') || todayIso();
    const end = new Date(`${date}T12:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const from = start.toISOString().slice(0, 10);
    const to = date;
    const rows = unwrap(
      await attendanceApi('/service/attendance', orgId(req), { from, to }).catch(() => ({ data: [] }))
    );
    send(res, { from, to, records: Array.isArray(rows) ? rows : [] });
  } catch {
    send(res, null);
  }
});

router.get('/teacher-portal/class-period/active', async (req, res) => {
  try {
    const today = await fetchTeacherTodaySafe(req);
    const current = today?.current || null;
    send(res, {
      current_lesson: current
        ? {
            subject_name: current.subjectName,
            class_name: current.className,
            start_time: current.startTime,
            end_time: current.endTime,
            room: current.room,
          }
        : null,
      period_log: {
        checked_in: Boolean(current?.qrVerified || current?.scannedAt),
        checked_out: current?.lessonStatus === 'COMPLETED',
        entry_time: current?.scannedAt
          ? String(current.scannedAt).slice(11, 16)
          : current?.startedAt
            ? String(current.startedAt).slice(11, 16)
            : null,
      },
    });
  } catch {
    send(res, { current_lesson: null, period_log: {} });
  }
});

router.get('/teacher-portal/class-period/history', async (req, res) => {
  try {
    const rows = await fetchCheckInHistorySafe(req, { date: todayIso(), limit: '20' });
    send(
      res,
      (Array.isArray(rows) ? rows : []).map((r) => ({
        id: r.sessionId,
        subject_name: r.subjectName,
        class_name: r.className,
        start_time: r.startTime,
        entry_hm: r.checkedInAt ? String(r.checkedInAt).slice(11, 16) : null,
        exit_hm: null,
        status: r.punctuality,
      }))
    );
  } catch {
    send(res, []);
  }
});

router.post('/teacher-portal/class-room/scan', async (req, res) => {
  try {
    const t = teacher(req);
    const data = unwrap(
      await timetable('/internal/lessons/scan-qr', {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: t.id,
          teacherName: t.name,
          email: t.email,
          qrCode: req.body?.qr_token || req.body?.qrCode,
        },
      })
    );
    const ok = Boolean(data?.ok);
    res.status(ok ? 200 : 400).json({
      success: ok,
      action: 'entry',
      message: data?.message || (ok ? 'Checked in' : 'Scan failed'),
      data: {
        class_name: data?.lesson?.className || data?.session?.className,
        subject_name: data?.lesson?.subjectName || data?.session?.subjectName,
        ...data,
      },
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/attendance-module/teacher', async (req, res) => {
  try {
    const t = teacher(req);
    const date = q(req, 'date') || todayIso();
    const history = await fetchCheckInHistorySafe(req, { date, limit: '50' });
    const first = Array.isArray(history) && history.length ? history[history.length - 1] : null;
    const last = Array.isArray(history) && history.length ? history[0] : null;
    const late = (Array.isArray(history) ? history : []).some((r) => String(r.punctuality).toUpperCase() === 'LATE');
    send(res, [
      {
        teacher_id: t.id,
        date,
        status_in: first ? (late ? 'late' : 'present') : 'missed',
        check_in: first?.checkedInAt || null,
        check_out: last && last !== first ? last.checkedInAt : null,
      },
    ]);
  } catch {
    send(res, []);
  }
});

router.get('/teacher-portal/attendance-module/teacher/monthly-grid', async (req, res) => {
  try {
    const t = teacher(req);
    const month = Number(q(req, 'month') || new Date().getMonth() + 1);
    const year = Number(q(req, 'year') || new Date().getFullYear());
    const history = await fetchCheckInHistorySafe(req, { limit: '200' });
    const rows = Array.isArray(history) ? history : [];
    const inMonth = rows.filter((r) => {
      const d = String(r.date || '');
      return d.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    });
    const byDay = new Map();
    for (const r of inMonth) {
      const day = r.date;
      const prev = byDay.get(day) || { late: false, present: false };
      prev.present = true;
      if (String(r.punctuality).toUpperCase() === 'LATE') prev.late = true;
      byDay.set(day, prev);
    }
    let present = 0;
    let late = 0;
    for (const v of byDay.values()) {
      if (v.late) late += 1;
      else present += 1;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    let weekdays = 0;
    for (let d = 1; d <= daysInMonth; d += 1) {
      const wd = new Date(year, month - 1, d).getDay();
      if (wd >= 1 && wd <= 5) weekdays += 1;
    }
    send(res, {
      grid: [
        {
          teacher_id: t.id,
          present_days: present,
          late_days: late,
          absent_days: Math.max(0, weekdays - present - late),
        },
      ],
    });
  } catch {
    send(res, { grid: [] });
  }
});

router.get('/teacher-portal/attendance-module/teacher-class-checkin', async (req, res) => {
  try {
    const t = teacher(req);
    const date = q(req, 'date') || todayIso();
    const today = await fetchTeacherTodaySafe(req, { date });
    const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
    const history = await fetchCheckInHistorySafe(req, { date, limit: '50' });
    const byClass = new Map((Array.isArray(history) ? history : []).map((r) => [r.className, r]));
    send(res, {
      rows: lessons.map((l, i) => {
        const check = byClass.get(l.className);
        const late = String(check?.punctuality || l.punctuality || '').toUpperCase() === 'LATE';
        return {
          teacher_id: t.id,
          class_id: l.className,
          period: `P${i + 1}`,
          status: check || l.qrVerified || l.scannedAt ? (late ? 'late' : 'present') : '',
          check_time: check?.checkedInAt || l.scannedAt || l.startedAt || null,
        };
      }),
    });
  } catch {
    send(res, { rows: [] });
  }
});

router.get('/teacher-portal/examination-list', async (req, res) => {
  try {
    const className = q(req, 'class_name');
    const students = await listStudentsForClassName(orgId(req), className);
    send(res, {
      published: true,
      message: className ? `Eligibility for ${className}` : '',
      students,
    });
  } catch {
    send(res, { published: false, students: [], message: 'Could not load students' });
  }
});

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

const DEFAULT_ASSESSMENT_TYPES = [
  { slug: 'quiz', name: 'Quiz', weight_percent: 10, default_max_score: 10, template_id: null, component_id: null },
  { slug: 'cat', name: 'CAT', weight_percent: 30, default_max_score: 20, template_id: null, component_id: null },
  { slug: 'exam', name: 'Exam', weight_percent: 60, default_max_score: 50, template_id: null, component_id: null },
];

function classCategoryMatchesTemplateLevel(classCategory, templateLevel) {
  const cat = String(classCategory ?? '').trim().toUpperCase();
  const level = String(templateLevel ?? '').trim().toUpperCase();
  if (!cat || !level) return false;
  if (cat === level) return true;
  if (level === 'PRIMARY' && (cat === 'PRIMARY' || cat === 'PRIMARYSCHOOL')) return true;
  if ((level === 'O_LEVEL' || level === 'A_LEVEL') && cat === 'SECONDARY') return true;
  if (level === 'UNIVERSITY' && cat === 'TVET') return true;
  return false;
}

async function resolveClassEducationLevel(req, className) {
  if (!className) return null;
  const organizationId = orgId(req);
  try {
    const classes = asList(unwrap(await studentMgmt('/service/classes', organizationId)));
    const hit = classes.find((c) => {
      const full = [c.name, c.stream].filter(Boolean).join(' ');
      return classNamesEquivalent(full, className) || classNamesEquivalent(c.name, className);
    });
    return hit?.category || null;
  } catch {
    return null;
  }
}

async function resolveTemplateComponents(req, { className, academicYear, term, templateId } = {}) {
  const year = academicYear && String(academicYear).trim();
  const termVal = term && String(term).trim();
  const yearTries = year
    ? [...new Set([year, ...yearVariants(year)])]
    : [undefined];
  const queryBases = year
    ? [
        { status: 'ACTIVE', term: termVal },
        { status: 'ACTIVE' },
        { term: termVal },
        {},
      ]
    : [
        { status: 'ACTIVE', academicYear, term },
        { status: 'ACTIVE', academicYear },
        { status: 'ACTIVE' },
        { academicYear, term },
        {},
      ];
  let templates = [];
  outer: for (const base of queryBases) {
    const yearKeys = year ? yearTries : [undefined];
    for (const yKey of yearKeys) {
      const query = { ...base, ...(yKey ? { academicYear: yKey } : {}) };
      const cleaned = Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== ''));
      try {
        const batch = asList(unwrap(await academic('/assessment-templates', req, { query: cleaned })));
        if (!batch.length) continue;
        templates = year ? batch.filter((t) => academicYearsMatch(t.academicYear, year)) : batch;
        if (templates.length) break outer;
      } catch {
        /* try next filter */
      }
    }
  }
  if (termVal) {
    templates = templates.filter((t) => templateTermMatchesSession(t.term, termVal));
  }
  if (!templates.length && year) {
    try {
      const batch = asList(unwrap(await academic('/assessment-templates', req, { query: { status: 'ACTIVE' } })));
      templates = batch.filter((t) => academicYearsMatch(t.academicYear, year));
      if (termVal) templates = templates.filter((t) => templateTermMatchesSession(t.term, termVal));
    } catch {
      /* keep empty */
    }
  }

  const templateSummaries = templates.map((t) => ({
    id: t.id,
    name: t.name,
    academic_year: t.academicYear,
    term: t.term,
    status: t.status,
    components_count: (t.components || []).filter((c) => c.isActive !== false).length,
  }));

  let template = null;
  const classEducationLevel = await resolveClassEducationLevel(req, className);
  const wantedTemplateId = templateId && isUuid(templateId) ? templateId : null;
  if (wantedTemplateId) {
    template = templates.find((t) => t.id === wantedTemplateId) || null;
  }

  const classMatches = (label, stream) => {
    const full = [label, stream].filter(Boolean).join(' ');
    return classNamesEquivalent(full, className) || classNamesEquivalent(label, className);
  };

  if (!template) for (const t of templates) {
    const assignments = t.assignments || [];
    const assigned = assignments.some((a) => classMatches(a.class?.name || a.className || '', a.class?.stream || ''));
    if (assigned) {
      template = t;
      break;
    }
    const applicable = t.applicableClasses;
    if (Array.isArray(applicable)) {
      const hit = applicable.some((c) => {
        if (typeof c === 'string') return classNamesEquivalent(c, className);
        return classMatches(c?.name || c?.label || '', c?.stream || '');
      });
      if (hit) {
        template = t;
        break;
      }
    }
  }

  if (!template && classEducationLevel) {
    template =
      templates.find(
        (t) =>
          t.status === 'ACTIVE' &&
          classCategoryMatchesTemplateLevel(classEducationLevel, t.academicLevel) &&
          (t.components || []).length
      ) || null;
  }

  if (!template && templates.length === 1) template = templates[0];
  if (!template) {
    template =
      templates.find((t) => t.status === 'ACTIVE' && (t.components || []).length) ||
      templates.find((t) => (t.components || []).length) ||
      templates[0] ||
      null;
  }

  const components = (template?.components || []).filter((c) => c.isActive !== false);
  const rows = components.map((c) => ({
    slug: c.id,
    component_id: c.id,
    template_id: template?.id || null,
    name: c.name,
    code: c.code,
    weight_percent: Number(c.weightPercentage || 0),
    default_max_score: Number(c.maxMark || 20),
  }));

  return { template, rows, templates: templateSummaries };
}

function resolveAssessmentTemplateRefs(body, templateRows = []) {
  let templateId = body.template_id || body.templateId || null;
  let componentId = body.component_id || body.componentId || body.column_slug || null;

  if (!isUuid(templateId)) templateId = null;
  if (isUuid(componentId)) return { templateId, componentId };

  const slug = String(body.column_slug || body.component_id || body.componentId || '').trim().toLowerCase();
  if (slug && templateRows.length) {
    const row = templateRows.find(
      (r) =>
        r.slug === slug ||
        r.component_id === slug ||
        String(r.code || '').toLowerCase() === slug ||
        String(r.name || '').toLowerCase() === slug
    );
    if (row) {
      return { templateId: row.template_id || templateId, componentId: row.component_id };
    }
  }

  return { templateId, componentId: null };
}

/** Report cards ignore DRAFT assessments — move to MARK_ENTRY once marks are saved. */
async function ensureAssessmentMarkEntryStatus(req, assessmentId) {
  if (!assessmentId) return;
  try {
    const assessment = unwrap(await academic(`/assessments/${assessmentId}`, req));
    const cur = String(assessment?.status || 'DRAFT').toUpperCase();
    if (cur === 'DRAFT') {
      await academic(`/assessments/${assessmentId}/status`, req, {
        method: 'PUT',
        body: { status: 'MARK_ENTRY' },
      });
    }
  } catch {
    /* non-fatal */
  }
}

async function publishAssessmentWorkflow(req, assessmentId) {
  const order = ['OPEN', 'MARK_ENTRY', 'SUBMITTED'];
  for (let guard = 0; guard < 6; guard += 1) {
    const assessment = unwrap(await academic(`/assessments/${assessmentId}`, req));
    const cur = String(assessment?.status || 'DRAFT').toUpperCase();
    if (['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(cur)) return;
    if (cur === 'DRAFT') {
      await academic(`/assessments/${assessmentId}/status`, req, {
        method: 'PUT',
        body: { status: 'OPEN' },
      });
      continue;
    }
    const curIdx = order.indexOf(cur);
    const next = order.find((s, i) => i > curIdx);
    if (!next) return;
    await academic(`/assessments/${assessmentId}/status`, req, {
      method: 'PUT',
      body: { status: next },
    });
  }
}

function mapStatsForWizard(stats, maxScore) {
  if (!stats) {
    return {
      statistics: { highest: null, lowest: null, average: null, pass_rate: null },
      at_risk: [],
    };
  }
  const maxMark = Number(stats.assessment?.maxMark || maxScore || 20);
  const marks = stats.assessment?.marks || [];
  const atRisk = marks
    .filter((m) => {
      if (m.score == null || m.markStatus !== 'PRESENT') return false;
      return (Number(m.score) / maxMark) * 100 < 40;
    })
    .map((m) => ({
      student_id: m.studentId,
      name: m.student ? `${m.student.firstName} ${m.student.lastName}` : m.studentId,
      score: Number(m.score),
    }));

  return {
    statistics: {
      highest: stats.highest ?? null,
      lowest: stats.lowest ?? null,
      average: stats.average ?? null,
      pass_rate: stats.passRate ?? null,
    },
    at_risk: atRisk,
  };
}

async function teacherAssignmentPairs(req) {
  const t = await teacherIdentity(req);
  const organizationId = orgId(req);
  const ac = requestedAcademic(req);
  const [assignmentsPayload, schedule] = await Promise.all([
    timetable('/internal/teacher/assignments', {
      query: {
        organizationId,
        teacherUserId: t.id,
        email: t.email,
        teacherName: t.name,
        term: ac.term,
        academicYear: ac.academicYear,
      },
    }).catch(() => ({ data: [] })),
    fetchTeacherSchedule(req).catch(() => null),
  ]);
  const assignments = Array.isArray(unwrap(assignmentsPayload)) ? unwrap(assignmentsPayload) : [];
  const pairs = [];
  const seen = new Set();
  const add = (className, subjectName, extra = {}) => {
    const cn = String(className || '').trim();
    const sn = String(subjectName || '').trim();
    if (!cn || !sn) return;
    const key = `${normalize(cn)}|${normalize(sn)}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({
      id: extra.id || key,
      assignment_id: extra.id || key,
      class_name: cn,
      subject_name: sn,
      term: extra.term || ac.term,
      academic_year: extra.academicYear || extra.academic_year || ac.academicYear,
    });
  };
  for (const a of assignments) add(a.className, a.subjectName, a);
  if (schedule?.byDay) {
    for (const slots of Object.values(schedule.byDay)) {
      for (const slot of slots || []) add(slot.className, slot.subjectName, slot);
    }
  }
  return pairs;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.rows)) return value.rows;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.assessments)) return value.assessments;
  return [];
}

function inferLevelFromClassName(className) {
  const label = normalize(className || '').toUpperCase();
  if (/^N\d|NURSERY/.test(label)) return 'NURSERY';
  if (/^P\d|PRIMARY/.test(label)) return 'PRIMARY';
  if (/^S6|^S5/.test(label)) return 'A_LEVEL';
  if (/^S[1-4]|SECONDARY/.test(label)) return 'O_LEVEL';
  return 'PRIMARY';
}

function letterGradeFallback(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return null;
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 50) return 'D';
  return 'F';
}

async function fetchOrgGradingScaleRows(req, className) {
  const inferred = className ? inferLevelFromClassName(className) : null;
  const order = [...new Set([inferred, 'PRIMARY', 'O_LEVEL', 'A_LEVEL', 'NURSERY', 'SECONDARY'].filter(Boolean))];
  for (const academicLevel of order) {
    try {
      const raw = await academic('/grading/grading-scale', req, { query: { academicLevel } });
      const rows = asList(unwrap(raw));
      if (rows.length) return rows;
    } catch {
      /* try next level */
    }
  }
  return [];
}

function gradeFromScalePct(pct, scaleRows) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return null;
  if (!scaleRows?.length) return letterGradeFallback(n);
  const sorted = [...scaleRows].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
  for (const g of sorted) {
    const min = Number(g.minPercentage);
    const max = Number(g.maxPercentage);
    if (n >= min && n <= max) return g.grade;
  }
  const lowest = sorted[sorted.length - 1];
  if (lowest && n >= Number(lowest.minPercentage)) return lowest.grade;
  return letterGradeFallback(n);
}

function performanceBandsFromScale(scaleRows) {
  if (!scaleRows?.length) {
    return [
      { label: '80–100%', grade: 'A', min: 80, max: 100 },
      { label: '70–79%', grade: 'B', min: 70, max: 79.99 },
      { label: '60–69%', grade: 'C', min: 60, max: 69.99 },
      { label: '50–59%', grade: 'D', min: 50, max: 59.99 },
      { label: 'Below 50%', grade: 'F', min: 0, max: 49.99 },
    ];
  }
  return [...scaleRows]
    .sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage))
    .map((s) => ({
      label: `${Number(s.minPercentage)}–${Number(s.maxPercentage)}%`,
      grade: s.grade,
      min: Number(s.minPercentage),
      max: Number(s.maxPercentage),
    }));
}

function letterGrade(pct) {
  return letterGradeFallback(pct);
}

async function listTeacherAssessments(req, filters = {}) {
  const query = { mine: '1' };
  if (filters.academicYear || filters.academic_year) {
    query.academicYear = filters.academicYear || filters.academic_year;
  }
  if (filters.term) query.term = filters.term;
  return asList(unwrap(await academic('/assessments', req, { query })));
}

async function fetchAssessmentStats(req, assessmentId) {
  try {
    return unwrap(await academic(`/assessments/${assessmentId}/statistics`, req));
  } catch {
    return null;
  }
}

async function fetchAssessmentMarksRows(req, assessmentId) {
  try {
    const payload = unwrap(await academic(`/assessments/${assessmentId}/marks`, req));
    if (Array.isArray(payload?.marks)) return payload.marks;
    if (Array.isArray(payload)) return payload;
    return asList(payload);
  } catch {
    return [];
  }
}

function filterAssessments(list, className, subjectName) {
  return list.filter((a) => {
    const cn = a.className || a.class?.name;
    const sn = a.subjectName || a.subject?.name;
    const classOk = !className || classNamesEquivalent(cn, className);
    const subjectOk = !subjectName || normalize(sn) === normalize(subjectName);
    return classOk && subjectOk;
  });
}

function markStudentDisplayName(m) {
  const st = m?.student;
  if (st?.fullName) return String(st.fullName).trim();
  if (st?.firstName || st?.lastName) {
    return [st.firstName, st.lastName].filter(Boolean).join(' ').trim();
  }
  if (m?.fullName) return String(m.fullName).trim();
  if (m?.studentName) return String(m.studentName).trim();
  if (m?.studentCode) return String(m.studentCode).trim();
  return '';
}

async function buildMarksAnalytics(req) {
  const organizationId = orgId(req);
  const settings = await iamAcademicSettings(organizationId);
  const className = q(req, 'class_name');
  const subjectName = q(req, 'subject_name');
  const term = q(req, 'term') || settings.currentTerm;
  const academicYear = q(req, 'academic_year') || q(req, 'academicYear') || settings.currentAcademicYear;
  req.query = {
    ...req.query,
    academic_year: q(req, 'academic_year') || academicYear,
    academicYear: q(req, 'academicYear') || academicYear,
    term: q(req, 'term') || term,
  };
  const pairs = await teacherAssignmentPairs(req);
  const scaleRows = await fetchOrgGradingScaleRows(req, className);
  const bandDefs = performanceBandsFromScale(scaleRows);

  const allAssessments = filterAssessments(
    await listTeacherAssessments(req, { term, academicYear }),
    className,
    subjectName
  );

  const statsList = await Promise.all(
    allAssessments.slice(0, 40).map(async (a) => {
      const stats = await fetchAssessmentStats(req, a.id);
      return { assessment: a, stats };
    })
  );

  const classMap = new Map();
  const subjectMap = new Map();
  const monthMap = new Map();
  const courseClassMap = new Map();
  const gradeBuckets = Object.fromEntries(bandDefs.map((b) => [b.grade, 0]));
  const studentScores = new Map();
  let totalPct = 0;
  let pctCount = 0;
  let passCount = 0;

  for (const { assessment: a, stats } of statsList) {
    const cn = a.className || a.class?.name || 'Unknown';
    const sn = a.subjectName || a.subject?.name || 'Unknown';
    const avg = Number(stats?.average || 0);
    const passRate = Number(stats?.passRate || 0);
    const maxMark = Number(a.maxMark || a.maxScore || 20);

    if (!classMap.has(cn)) classMap.set(cn, { name: cn, total: 0, count: 0, students: new Set() });
    const cRow = classMap.get(cn);
    if (avg > 0) {
      cRow.total += avg;
      cRow.count += 1;
    }

    const ccKey = `${sn}\0${cn}`;
    if (!courseClassMap.has(ccKey)) {
      courseClassMap.set(ccKey, { subject: sn, class_name: cn, total: 0, count: 0, assessments: 0 });
    }
    const ccRow = courseClassMap.get(ccKey);
    if (avg > 0) {
      ccRow.total += avg;
      ccRow.count += 1;
    }
    ccRow.assessments += 1;

    if (!subjectMap.has(sn)) subjectMap.set(sn, { name: sn, total: 0, count: 0 });
    const sRow = subjectMap.get(sn);
    if (avg > 0) {
      sRow.total += avg;
      sRow.count += 1;
    }

    const dateRaw = a.assessmentDate || a.createdAt;
    if (dateRaw && avg > 0) {
      const d = new Date(dateRaw);
      const key = d.toLocaleString('en-US', { month: 'short' });
      if (!monthMap.has(key)) monthMap.set(key, { month: key, total: 0, count: 0 });
      const mRow = monthMap.get(key);
      mRow.total += avg;
      mRow.count += 1;
    }

    if (stats?.distribution) {
      for (const bucket of stats.distribution) {
        const grade = bucket.grade || gradeFromScalePct(Number(bucket.min ?? bucket.minPercentage ?? 0), scaleRows);
        if (grade && gradeBuckets[grade] != null) gradeBuckets[grade] += bucket.count || 0;
      }
    }

    if (avg > 0) {
      totalPct += avg;
      pctCount += 1;
      if (passRate >= 50 || avg >= 50) passCount += 1;
    }

    const marks = await fetchAssessmentMarksRows(req, a.id);
    for (const m of marks) {
      const sid = m.studentId || m.student?.id;
      let name = markStudentDisplayName(m);
      const score = m.score != null ? Number(m.score) : null;
      if (!sid || score == null || m.markStatus === 'ABSENT') continue;
      const pct = maxMark > 0 ? (score / maxMark) * 100 : score;
      if (!studentScores.has(sid)) {
        studentScores.set(sid, {
          id: sid,
          name: name || 'Student',
          class_name: cn,
          total: 0,
          count: 0,
          scores: [],
        });
      }
      const st = studentScores.get(sid);
      if (name && st.name === 'Student') st.name = name;
      st.total += pct;
      st.count += 1;
      st.scores.push(pct);
    }
  }

  for (const st of studentScores.values()) {
    if (st.name === 'Student' || !st.name) {
      st.name = `Learner ${String(st.id).slice(0, 8)}`;
    }
  }

  const students = [...studentScores.values()].map((s) => {
    const average = s.count ? Math.round((s.total / s.count) * 10) / 10 : null;
    return {
      id: s.id,
      name: s.name,
      class_name: s.class_name,
      average,
      grade: gradeFromScalePct(average, scaleRows),
      at_risk: average != null && average < 40,
    };
  });

  const classNames = [...new Set(pairs.map((p) => p.class_name))];
  let totalStudents = 0;
  if (className) {
    totalStudents = (await listStudentsForClassName(organizationId, className, academicYear)).length;
  } else {
    const counts = await Promise.all(
      classNames.slice(0, 8).map((cn) => listStudentsForClassName(organizationId, cn, academicYear))
    );
    totalStudents = counts.reduce((sum, list) => sum + list.length, 0);
  }

  const class_performance = [...classMap.values()]
    .map((c) => ({
      name: c.name,
      average: c.count ? Math.round((c.total / c.count) * 10) / 10 : null,
      pass_rate: null,
    }))
    .sort((a, b) => (b.average || 0) - (a.average || 0));

  const subject_scores = [...subjectMap.values()].map((s) => ({
    subject: s.name,
    average: s.count ? Math.round((s.total / s.count) * 10) / 10 : null,
  }));

  const courseClassBySubject = new Map();
  for (const row of courseClassMap.values()) {
    const average = row.count ? Math.round((row.total / row.count) * 10) / 10 : null;
    if (average == null) continue;
    if (!courseClassBySubject.has(row.subject)) courseClassBySubject.set(row.subject, []);
    courseClassBySubject.get(row.subject).push({
      class_name: row.class_name,
      average,
      assessments: row.assessments,
    });
  }
  const course_class_comparison = [...courseClassBySubject.entries()]
    .map(([subject, classes]) => ({
      subject,
      classes: classes.sort((a, b) => (b.average || 0) - (a.average || 0)),
    }))
    .filter((g) => g.classes.length > 0)
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const term_trend = [...monthMap.values()].map((m) => ({
    month: m.month,
    term: term,
    average: m.count ? Math.round((m.total / m.count) * 10) / 10 : 0,
  }));

  const grade_distribution = Object.entries(gradeBuckets).map(([grade, count]) => ({ grade, count }));

  const at_risk_students = students.filter((s) => s.at_risk);

  const assessmentsSummary = statsList.map(({ assessment: a, stats }) => ({
    id: a.id,
    name: a.title || a.name,
    type: a.component?.name || a.type || 'Assessment',
    class: a.className || a.class?.name,
    subject: a.subjectName || a.subject?.name,
    date: a.assessmentDate ? String(a.assessmentDate).slice(0, 10) : '',
    maxMarks: Number(a.maxMark || 20),
    completed: stats?.completedCount ?? 0,
    missing: stats?.missingCount ?? 0,
    averageScore: stats?.average ?? null,
  }));

  const insights = [];
  if (class_performance.length >= 2) {
    const best = class_performance[0];
    const weak = class_performance[class_performance.length - 1];
    if (best?.average != null) {
      insights.push({ type: 'success', text: `${best.name} leads with ${best.average}% average.` });
    }
    if (weak?.average != null && weak.name !== best?.name) {
      insights.push({ type: 'warning', text: `${weak.name} may need support (${weak.average}% average).` });
    }
  }
  if (at_risk_students.length) {
    insights.push({
      type: 'warning',
      text: `${at_risk_students.length} student${at_risk_students.length === 1 ? '' : 's'} below 40%. Review intervention plans.`,
    });
  }
  if (!insights.length && !statsList.length) {
    insights.push({ type: 'warning', text: 'No published marks yet. Record marks to unlock analytics.' });
  }

  const average_percent = pctCount ? Math.round((totalPct / pctCount) * 10) / 10 : null;
  const pass_rate = pctCount ? Math.round((passCount / pctCount) * 1000) / 10 : null;

  const performance_bands = bandDefs.map((band) => ({
    label: band.label,
    grade: band.grade,
    count: 0,
    students: [],
  }));

  for (const s of students) {
    if (s.average == null) continue;
    const idx = bandDefs.findIndex((b) => s.average >= b.min && s.average <= b.max);
    const slot = performance_bands[idx >= 0 ? idx : performance_bands.length - 1];
    slot.count += 1;
    slot.students.push({
      id: s.id,
      name: s.name,
      class_name: s.class_name,
      average: s.average,
      grade: s.grade,
    });
  }

  const strong_students = students
    .filter((s) => s.average != null && s.average >= 75)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
    .slice(0, 40);

  const weak_students = students
    .filter((s) => s.average != null && s.average < 40)
    .sort((a, b) => (a.average ?? 0) - (b.average ?? 0))
    .slice(0, 40);

  const assignmentRows = pairs.map((p) => ({
    class_name: p.class_name,
    subject_name: p.subject_name,
  }));

  return {
    filters: {
      academic_years: settings.academicYears,
      current_academic_year: settings.currentAcademicYear,
      current_term: settings.currentTerm,
      terms: settings.terms,
      classes: classNames,
      courses: [...new Set(pairs.map((p) => p.subject_name))],
      assignments: assignmentRows,
    },
    selected: { academic_year: academicYear, term, class_name: className, subject_name: subjectName },
    kpis: {
      total_classes: classNames.length,
      total_students: totalStudents,
      average_percent,
      pass_rate,
      at_risk_count: at_risk_students.length,
      assessment_count: allAssessments.length,
    },
    class_performance,
    course_class_comparison,
    subject_scores,
    term_trend,
    monthly_progress: term_trend,
    grade_distribution,
    pass_rate_trend: term_trend.map((t) => ({ month: t.month, rate: t.average })),
    students,
    at_risk_students,
    performance_bands,
    strong_students,
    weak_students,
    assessments: assessmentsSummary,
    insights,
    intervention_plans: at_risk_students.slice(0, 10).map((s, i) => ({
      id: `int-${i}`,
      student: s.name,
      class: s.class_name,
      issue: 'Below 40% average',
      priority: s.average != null && s.average < 30 ? 'High' : 'Medium',
      action: 'Schedule remedial session and contact parent',
    })),
    alerts: [
      ...at_risk_students.slice(0, 5).map((s, i) => ({
        id: `alert-${i}`,
        type: 'warning',
        message: `${s.name} is at risk (${s.average}%)`,
        date: new Date().toISOString().slice(0, 10),
      })),
      ...(assessmentsSummary.filter((a) => a.missing > 0).slice(0, 3).map((a, i) => ({
        id: `miss-${i}`,
        type: 'info',
        message: `${a.name}: ${a.missing} marks missing`,
        date: a.date,
      }))),
    ],
    attendance_vs_performance: [],
  };
}

async function hydrateGradebookMatrix(req, className, subjectName, students, columns) {
  for (const col of columns) {
    const marks = await fetchAssessmentMarksRows(req, col.slug);
    const max = col.max || 20;
    for (const m of marks) {
      const sid = m.studentId || m.student?.id;
      const score = m.score != null ? Number(m.score) : null;
      if (!sid || score == null) continue;
      const student = students.find((s) => s.student_uid === sid || s.student_id === sid);
      if (student) {
        student.scores[col.slug] = Math.round((score / max) * 1000) / 10;
      }
    }
  }
  return students;
}

router.get('/teacher-portal/staff/payroll/my', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const data = await buildTeacherPayrollSummary(orgId(req), t);
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/gradebook-filters', async (req, res) => {
  try {
    const pairs = await teacherAssignmentPairs(req);
    send(res, { pairs });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/teaching-assignments', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const settings = await iamAcademicSettings(organizationId);
    const ac = requestedAcademic(req);
    const pairs = await teacherAssignmentPairs(req);
    const countYear = ac.academicYear || settings.currentAcademicYear;
    const assignments = await Promise.all(
      pairs.map(async (p) => {
        const students = await listStudentsForClassName(
          organizationId,
          p.class_name,
          p.academic_year || countYear,
        );
        return { ...p, student_count: students.length };
      }),
    );
    send(res, {
      assignments,
      academic_year: settings.currentAcademicYear,
      current_academic_year: settings.currentAcademicYear,
      academic_years: settings.academicYears,
      term: settings.currentTerm,
      terms: settings.terms,
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/assessment-types', async (req, res) => {
  try {
    const className = q(req, 'class_name');
    const academicYear = q(req, 'academic_year') || q(req, 'academicYear');
    const term = q(req, 'term');
    const templateId = q(req, 'template_id') || q(req, 'templateId');
    const { template, rows, templates } = await resolveTemplateComponents(req, {
      className,
      academicYear,
      term,
      templateId,
    });
    if (rows.length) {
      return send(res, {
        rows,
        templates: templates || [],
        template: template
          ? { id: template.id, name: template.name, academic_year: template.academicYear, term: template.term }
          : null,
      });
    }
    send(res, { rows: DEFAULT_ASSESSMENT_TYPES, template: null, templates: templates || [] });
  } catch {
    send(res, { rows: DEFAULT_ASSESSMENT_TYPES, template: null, templates: [] });
  }
});

router.get('/teacher-portal/assessment-context', async (req, res) => {
  try {
    const className = q(req, 'class_name');
    const subjectName = q(req, 'subject_name');
    const componentId = q(req, 'column_slug');
    const academicYear = q(req, 'academic_year') || q(req, 'academicYear');
    const term = q(req, 'term');
    const templateId = q(req, 'template_id') || q(req, 'templateId');
    const { template, rows } = await resolveTemplateComponents(req, {
      className,
      academicYear,
      term,
      templateId,
    });
    const comp = rows.find((r) => r.slug === componentId) || rows.find((r) => r.component_id === componentId);

    let assessments = [];
    try {
      const query = { mine: '1' };
      if (componentId) query.componentId = componentId;
      if (academicYear) query.academicYear = academicYear;
      if (term) query.term = term;
      assessments = filterAssessments(asList(unwrap(await academic('/assessments', req, { query }))), className, subjectName);
    } catch {
      assessments = [];
    }

    const count = assessments.length;
    const suggestions = comp
      ? [`${comp.name} ${count + 1}`, `${comp.name} (${new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })})`]
      : [];

    send(res, {
      template_name: template?.name || null,
      suggestions,
      type_weight_percent: comp?.weight_percent ?? null,
      assessment_count: count,
      default_max_score: comp?.default_max_score ?? 20,
      assessments: assessments.map((a) => ({
        id: a.id,
        assessment_name: a.title || a.name,
        status: a.status,
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/gradebook-matrix', async (req, res) => {
  try {
    const className = q(req, 'class_name');
    const subjectName = q(req, 'subject_name');
    const students = (await listStudentsForClassName(orgId(req), className)).map((s) => ({
      student_id: s.row_id || s.id,
      student_uid: s.id,
      name: s.name,
      gender: s.gender,
      scores: {},
    }));
    let columns = [];
    try {
      const assessments = asList(unwrap(await academic('/assessments', req, { query: { mine: '1' } })));
      columns = assessments
        .filter((a) => {
          const classOk = !className || normalize(a.className || a.class?.name) === normalize(className);
          const subjectOk =
            !subjectName || normalize(a.subjectName || a.subject?.name) === normalize(subjectName);
          return classOk && subjectOk;
        })
        .map((a) => ({
          slug: a.id,
          label: a.title || a.name || 'Assessment',
          max: Number(a.maxMark || a.maxScore || 20),
        }));
    } catch {
      columns = [];
    }
    await hydrateGradebookMatrix(req, className, subjectName, students, columns);
    const { rows: typeRows } = await resolveTemplateComponents(req, {
      className,
      academicYear: q(req, 'academic_year'),
      term: q(req, 'term'),
    });
    send(res, {
      columns,
      students,
      assessment_types: typeRows.length ? typeRows : DEFAULT_ASSESSMENT_TYPES,
    });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/register-marks', async (req, res) => {
  try {
    const body = req.body || {};
    let assessmentId = body.assessment_id || body.assessmentId || null;
    const lockedStatuses = new Set(['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED']);
    const normTitle = (s) => String(s || '').trim().toLowerCase();

    if (assessmentId) {
      try {
        const existing = unwrap(await academic(`/assessments/${assessmentId}`, req));
        const sameTitle = normTitle(existing?.title) === normTitle(body.assessment_name);
        const editable = !lockedStatuses.has(String(existing?.status || '').toUpperCase());
        if (!sameTitle || !editable) assessmentId = null;
      } catch {
        assessmentId = null;
      }
    }

    if (!assessmentId) {
      const { rows: templateRows } = await resolveTemplateComponents(req, {
        className: body.class_name,
        academicYear: body.academic_year,
        term: body.term,
        templateId: body.template_id || body.templateId,
      });
      const { templateId, componentId } = resolveAssessmentTemplateRefs(body, templateRows);
      const created = unwrap(
        await academic('/assessments', req, {
          method: 'POST',
          body: {
            title: body.assessment_name,
            className: body.class_name,
            subjectName: body.subject_name,
            academicYear: body.academic_year,
            term: body.term,
            maxMark: Number(body.max_score || 20),
            assessmentDate: body.assessment_date,
            description: body.description,
            templateId: templateId || undefined,
            componentId: componentId || undefined,
          },
        })
      );
      assessmentId = created?.id;
    }

    if (assessmentId && Array.isArray(body.marks) && body.marks.length) {
      await academic(`/assessments/${assessmentId}/marks`, req, {
        method: 'POST',
        body: {
          marks: body.marks.map((m) => ({
            studentId: m.student_id,
            studentCode: m.student_code,
            fullName: m.full_name,
            score: m.value === '' || m.value == null ? undefined : Number(m.value),
            markStatus:
              m.mark_code === 'A' ? 'ABSENT' : m.mark_code === 'E' ? 'EXCUSED' : 'PRESENT',
          })),
        },
      });
      await ensureAssessmentMarkEntryStatus(req, assessmentId);
    }

    if (assessmentId && body.status === 'published') {
      await publishAssessmentWorkflow(req, assessmentId);
    }

    const statsPayload = assessmentId ? mapStatsForWizard(await fetchAssessmentStats(req, assessmentId), body.max_score) : { statistics: null, at_risk: [] };

    send(
      res,
      {
        id: assessmentId,
        published: body.status === 'published',
        ...statsPayload,
      },
      assessmentId ? 201 : 400
    );
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/teacher-portal/assessments/:id', async (req, res) => {
  try {
    await academic(`/assessments/${req.params.id}`, req, { method: 'DELETE' });
    send(res, { deleted: true });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/mark-corrections', async (req, res) => {
  try {
    const body = req.body || {};
    const assessmentId = body.assessment_id || body.assessmentId;
    if (!assessmentId) {
      return res.status(400).json({ success: false, message: 'assessment_id is required' });
    }
    send(
      res,
      unwrap(
        await academic(`/assessments/${assessmentId}/corrections`, req, {
          method: 'POST',
          body: {
            studentId: body.student_id || body.studentId,
            currentScore: Number(body.current_score ?? body.currentScore),
            requestedScore: Number(body.requested_score ?? body.requestedScore),
            reason: body.reason,
          },
        })
      ),
      201
    );
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/assessments', async (req, res) => {
  try {
    send(res, unwrap(await academic('/assessments', req, { method: 'POST', body: req.body || {} })), 201);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/marks', async (req, res) => {
  try {
    const body = req.body || {};
    const assessmentId = body.assessmentId || body.assessment_id;
    if (!assessmentId) {
      return res.status(400).json({ success: false, message: 'assessment_id is required' });
    }
    send(
      res,
      unwrap(
        await academic(`/assessments/${assessmentId}/marks`, req, {
          method: 'POST',
          body: { marks: body.marks || body.rows || [] },
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/marks-center', async (req, res) => {
  try {
    const settings = await iamAcademicSettings(orgId(req));
    const pairs = await teacherAssignmentPairs(req);
    const className = q(req, 'class_name');
    const scaleRows = await fetchOrgGradingScaleRows(req, className);
    const subjectName = q(req, 'subject_name');
    const students = className
      ? (await listStudentsForClassName(orgId(req), className)).map((s) => ({
          student_id: s.row_id || s.id,
          student_uid: s.id,
          name: s.name,
          marks: {},
          average_percent: null,
          grade: null,
        }))
      : [];
    let assessments = [];
    try {
      assessments = filterAssessments(
        await listTeacherAssessments(req, {
          term: settings.currentTerm,
          academicYear: settings.currentAcademicYear,
        }),
        className,
        subjectName
      );
    } catch {
      assessments = [];
    }
    const assessment_columns = assessments.map((a) => ({
      id: a.id,
      assessment_name: a.title || a.name,
      short_label: a.title || a.name,
      max_score: Number(a.maxMark || 20),
      status: a.status,
      is_locked: ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(String(a.status || '')),
      component_name: a.component?.name || null,
      weight_percent: a.component?.weightPercentage != null ? Number(a.component.weightPercentage) : null,
    }));

    for (const col of assessment_columns) {
      const marks = await fetchAssessmentMarksRows(req, col.id);
      for (const m of marks) {
        const sid = m.studentId || m.student?.id;
        const score = m.score != null ? Number(m.score) : null;
        if (!sid || score == null) continue;
        const student = students.find((s) => s.student_uid === sid || s.student_id === sid);
        if (student) student.marks[col.id] = score;
      }
    }
    for (const student of students) {
      const entries = assessment_columns
        .map((col) => {
          const score = student.marks[col.id];
          if (score == null) return null;
          const max = col.max_score || 20;
          return (Number(score) / max) * 100;
        })
        .filter((v) => v != null);
      student.average_percent = entries.length
        ? Math.round((entries.reduce((a, b) => a + b, 0) / entries.length) * 10) / 10
        : null;
      student.grade = gradeFromScalePct(student.average_percent, scaleRows);
    }

    const avgs = students.map((s) => s.average_percent).filter((v) => v != null);
    const average_percent = avgs.length
      ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10
      : null;

    send(res, {
      filters: {
        academic_years: settings.academicYears,
        current_academic_year: settings.currentAcademicYear,
        terms: settings.terms,
        assessment_types: DEFAULT_ASSESSMENT_TYPES,
        assessments: assessments.map((a) => ({
          id: a.id,
          assessment_name: a.title || a.name,
        })),
        classes: [...new Set(pairs.map((p) => p.class_name))],
        courses: [...new Set(pairs.filter((p) => !className || p.class_name === className).map((p) => p.subject_name))],
      },
      selected: {
        academic_year: settings.currentAcademicYear,
        term: settings.currentTerm,
        class_name: className,
        subject_name: subjectName,
      },
      assessment_columns,
      students,
      kpis: { average_percent },
      category_averages: [],
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/marks-analytics', async (req, res) => {
  try {
    send(res, await buildMarksAnalytics(req));
  } catch (err) {
    fail(res, err);
  }
});

router.patch('/teacher-portal/marks-cell', async (req, res) => {
  try {
    const body = req.body || {};
    const assessmentId = body.assessment_id;
    if (!assessmentId) {
      return res.status(400).json({ success: false, message: 'assessment_id is required' });
    }
    send(
      res,
      unwrap(
        await academic(`/assessments/${assessmentId}/marks`, req, {
          method: 'POST',
          body: {
            marks: [
              {
                studentId: body.student_id,
                score: body.value === '' || body.value == null ? undefined : Number(body.value),
                markStatus:
                  body.mark_code === 'A' ? 'ABSENT' : body.mark_code === 'E' ? 'EXCUSED' : 'PRESENT',
              },
            ],
          },
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

function mapUiStatusFromAcademic(status) {
  const s = String(status || 'DRAFT').toUpperCase();
  if (['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(s)) return 'draft';
  if (s === 'SUBMITTED') return 'submitted';
  if (s === 'REVIEWED') return 'under_review';
  if (s === 'APPROVED') return 'approved';
  if (s === 'LOCKED') return 'locked';
  return 'draft';
}

function isLockedAcademicStatus(status) {
  return ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(String(status || '').toUpperCase());
}

async function listMyCorrectionRequests(req) {
  try {
    const rows = asList(unwrap(await academic('/grading/corrections', req, { query: { status: 'all' } })));
    const uid = req.user?.sub;
    return uid ? rows.filter((r) => r.requestedBy === uid) : rows;
  } catch {
    return [];
  }
}

function buildAssessmentActivity(assessment, corrections = []) {
  const events = [];
  if (assessment?.createdAt) {
    events.push({
      type: 'created',
      label: 'Assessment created',
      at: assessment.createdAt,
    });
  }
  if (assessment?.publishedAt) {
    events.push({
      type: 'submitted',
      label: 'Marks submitted',
      at: assessment.publishedAt,
      by: assessment.publishedBy,
    });
  }
  for (const c of corrections) {
    events.push({
      type: 'edit_request',
      label: c.status === 'PENDING' ? 'Edit request pending review' : `Edit request ${String(c.status).toLowerCase()}`,
      at: c.createdAt,
      detail: c.reason,
    });
    if (c.reviewedAt) {
      events.push({
        type: 'edit_review',
        label: c.status === 'APPROVED' ? 'Edit request approved. Marks reopened.' : 'Edit request rejected',
        at: c.reviewedAt,
        detail: c.reviewNotes,
      });
    }
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

router.get('/teacher-portal/courses-marks-dashboard', async (req, res) => {
  try {
    const settings = await iamAcademicSettings(orgId(req));
    const academicYear = q(req, 'academic_year') || q(req, 'academicYear') || settings.currentAcademicYear;
    const term = q(req, 'term') || settings.currentTerm;
    const statusFilter = q(req, 'status_filter');

    const [pairs, assessmentsRaw, myCorrections] = await Promise.all([
      teacherAssignmentPairs(req),
      listTeacherAssessments(req, { term, academicYear }),
      listMyCorrectionRequests(req),
    ]);

    const correctionByAssessment = new Map();
    for (const c of myCorrections) {
      if (!correctionByAssessment.has(c.assessmentId)) correctionByAssessment.set(c.assessmentId, c);
    }

    const enriched = await Promise.all(
      assessmentsRaw.slice(0, 100).map(async (a) => {
        const [stats, markRows] = await Promise.all([
          fetchAssessmentStats(req, a.id),
          fetchAssessmentMarksRows(req, a.id),
        ]);
        const classLabel = a.class
          ? [a.class.name, a.class.stream].filter(Boolean).join(' ')
          : a.className || '';
        const entered = markRows.filter((m) => m.score != null && m.markStatus === 'PRESENT').length;
        const correction = correctionByAssessment.get(a.id) || null;
        return {
          id: a.id,
          title: a.title || a.name,
          subject: a.subject?.name || a.subjectName || 'Subject',
          class_name: classLabel,
          class_id: a.classId || a.class?.id,
          academic_year: a.academicYear || academicYear,
          max_mark: Number(a.maxMark || 20),
          status: a.status,
          ui_status: mapUiStatusFromAcademic(a.status),
          component_name: a.component?.name || null,
          marks_entered: entered,
          marks_total: markRows.length,
          average: stats?.average ?? null,
          pass_rate: stats?.passRate ?? null,
          is_locked: isLockedAcademicStatus(a.status),
          published_at: a.publishedAt,
          created_at: a.createdAt,
          correction_request: correction,
        };
      })
    );

    let filteredAssessments = enriched;
    if (statusFilter === 'draft') {
      filteredAssessments = enriched.filter((a) => ['draft'].includes(a.ui_status));
    } else if (statusFilter === 'pending') {
      filteredAssessments = enriched.filter((a) => ['submitted', 'under_review', 'edit_pending'].includes(a.ui_status));
    } else if (statusFilter === 'approved') {
      filteredAssessments = enriched.filter((a) => a.ui_status === 'approved');
    } else if (statusFilter === 'locked') {
      filteredAssessments = enriched.filter((a) => a.ui_status === 'locked');
    }

    const courseMap = new Map();
    for (const pair of pairs) {
      const key = `${pair.subject_name}::${pair.class_name}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          id: key,
          subject_name: pair.subject_name,
          class_name: pair.class_name,
          academic_year: academicYear,
          term,
          student_count: null,
          assessments: [],
        });
      }
    }
    for (const a of enriched) {
      const key = `${a.subject}::${a.class_name}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          id: key,
          subject_name: a.subject,
          class_name: a.class_name,
          academic_year: academicYear,
          term,
          student_count: null,
          assessments: [],
        });
      }
      courseMap.get(key).assessments.push(a);
    }

    const courses = await Promise.all(
      [...courseMap.values()].slice(0, 40).map(async (course) => {
        try {
          const students = await listStudentsForClassName(orgId(req), course.class_name);
          course.student_count = students.length;
        } catch {
          course.student_count = course.assessments[0]?.marks_total || 0;
        }
        const submitted = course.assessments.filter(
          (a) => !['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(String(a.status || '').toUpperCase())
        ).length;
        course.progress = {
          submitted,
          total: course.assessments.length,
          label:
            course.assessments.length > 0
              ? `${submitted} of ${course.assessments.length} Submitted`
              : 'No assessments yet',
        };
        const statuses = course.assessments.map((a) => a.ui_status);
        course.ui_status =
          statuses.length === 0
            ? 'draft'
            : statuses.every((s) => s === 'approved' || s === 'locked')
              ? 'approved'
              : statuses.some((s) => s === 'edit_pending')
                ? 'edit_pending'
                : statuses.some((s) => s === 'submitted' || s === 'under_review')
                  ? 'submitted'
                  : 'draft';
        return course;
      })
    );

    const summary = {
      assigned_courses: courses.length,
      draft: enriched.filter((a) => ['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(String(a.status || '').toUpperCase())).length,
      pending: enriched.filter((a) => ['SUBMITTED', 'REVIEWED'].includes(String(a.status || '').toUpperCase())).length,
      approved: enriched.filter((a) => a.status === 'APPROVED').length,
      locked: enriched.filter((a) => a.status === 'LOCKED').length,
      edit_pending: myCorrections.filter((c) => c.status === 'PENDING').length,
    };

    send(res, {
      summary,
      courses,
      assessments: filteredAssessments,
      filters: {
        academic_year: academicYear,
        current_academic_year: settings.currentAcademicYear,
        academic_years: settings.academicYears,
        term,
        terms: settings.terms,
      },
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/my-correction-requests', async (req, res) => {
  try {
    send(res, { rows: await listMyCorrectionRequests(req) });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/assessments/:id/activity', async (req, res) => {
  try {
    const assessment = unwrap(await academic(`/assessments/${req.params.id}`, req));
    const corrections = (await listMyCorrectionRequests(req)).filter((c) => c.assessmentId === req.params.id);
    send(res, { events: buildAssessmentActivity(assessment, corrections) });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/assessments/:id/submit', async (req, res) => {
  try {
    const assessmentId = req.params.id;
    await publishAssessmentWorkflow(req, assessmentId);
    const stats = await fetchAssessmentStats(req, assessmentId);
    const assessment = unwrap(await academic(`/assessments/${assessmentId}`, req));
    send(res, {
      submitted: true,
      assessment,
      statistics: stats
        ? {
            highest: stats.highest,
            lowest: stats.lowest,
            average: stats.average,
            pass_rate: stats.passRate,
          }
        : null,
    });
  } catch (err) {
    fail(res, err);
  }
});

router.put('/teacher-portal/assessments/:id/status', async (req, res) => {
  try {
    send(
      res,
      unwrap(
        await academic(`/assessments/${req.params.id}/status`, req, {
          method: 'PUT',
          body: req.body || {},
        })
      )
    );
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/competency-categories', async (req, res) => {
  try {
    send(res, asList(unwrap(await academic('/competency/templates', req))));
  } catch {
    send(res, []);
  }
});

router.get('/teacher-portal/competency-ratings', async (_req, res) => {
  send(res, { rows: [] });
});

router.post('/teacher-portal/competency-ratings', async (req, res) => {
  try {
    send(res, unwrap(await academic('/competency/records', req, { method: 'POST', body: req.body || {} })), 201);
  } catch (err) {
    fail(res, err);
  }
});

function parentMis(path, opts = {}) {
  return serviceFetch(env.PARENT_MIS_API_URL, path, opts);
}

function parentChatTeacherQuery(req, t, ids) {
  const { primary } = ids;
  return {
    organizationId: orgId(req),
    teacherUserId: primary,
    teacherUserIds: ids.ids.join(','),
    teacherEmail: t.email || '',
    teacherName: t.name || '',
  };
}

router.get('/parent-messages/contacts', async (req, res) => {
  try {
    const className = String(req.query.className ?? '').trim();
    const data = unwrap(
      await parentMis('/service/teacher-chat/contacts', {
        query: {
          organizationId: orgId(req),
          ...(className ? { className } : {}),
        },
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/parent-messages/threads/open', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const resolved = await resolveTeacherUserIds(req);
    const data = unwrap(
      await parentMis('/service/teacher-chat/threads/open', {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: resolved.primary,
          teacherName: t.name || t.email || 'Teacher',
          teacherEmail: t.email || '',
          teacherPhone: t.phone || '',
          studentId: req.body?.studentId,
          parentId: req.body?.parentId,
          subjects: req.body?.subjects || [],
        },
      })
    );
    send(res, data, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/parent-messages/threads', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const resolved = await resolveTeacherUserIds(req);
    const data = unwrap(
      await parentMis('/service/teacher-chat/threads', {
        query: parentChatTeacherQuery(req, t, resolved),
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/parent-messages/threads/:threadId', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const resolved = await resolveTeacherUserIds(req);
    const data = unwrap(
      await parentMis(`/service/teacher-chat/threads/${encodeURIComponent(req.params.threadId)}`, {
        query: parentChatTeacherQuery(req, t, resolved),
      })
    );
    send(res, data);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/parent-messages/threads/:threadId/messages', async (req, res) => {
  try {
    const t = await teacherIdentity(req);
    const resolved = await resolveTeacherUserIds(req);
    const data = unwrap(
      await parentMis(`/service/teacher-chat/threads/${encodeURIComponent(req.params.threadId)}/messages`, {
        method: 'POST',
        body: {
          organizationId: orgId(req),
          teacherUserId: resolved.primary,
          teacherUserIds: resolved.ids,
          teacherEmail: t.email || '',
          teacherName: t.name || t.email || 'Teacher',
          body: req.body?.body || '',
        },
      })
    );
    send(res, data, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/lesson-planning/context', async (req, res) => {
  try {
    const organizationId = orgId(req);
    await teacherIdentity(req);
    const ac = await iamAcademicSettings(organizationId);
    const academicYear = q(req, 'academicYear') || ac.currentAcademicYear;
    const term = q(req, 'term') || ac.currentTerm;
    const lessonDate = q(req, 'date') || new Date().toISOString().slice(0, 10);
    let subjectName = q(req, 'subjectName');
    let className = q(req, 'className');
    const reqWithAc = {
      ...req,
      query: { ...req.query, academicYear, term, date: lessonDate },
    };
    const assignments = await resolveTeacherAssignments(req, academicYear, term);
    if (!subjectName && assignments[0]?.subjectName) subjectName = assignments[0].subjectName;
    if (!className && assignments[0]?.className) className = assignments[0].className;
    const [today, sessionDuration] = await Promise.all([
      fetchTeacherTodaySafe(reqWithAc, { date: lessonDate, academicYear, term }),
      resolveSessionDurationForCourse(req, {
        subjectName,
        className,
        date: lessonDate,
        academicYear,
        term,
      }),
    ]);
    const lessonsToday = mergeConsecutiveLessonBlocks(Array.isArray(today?.lessons) ? today.lessons : []);
    const current = today?.current || null;
    const defaultDurationMinutes = sessionDuration.durationMinutes || 40;

    send(res, {
      academicYear,
      term,
      academicYears: ac.academicYears || [academicYear],
      terms: ac.terms || ['Term 1', 'Term 2', 'Term 3'],
      lessonDate,
      defaultDurationMinutes,
      sessionDuration,
      assignments: assignments.map((a) => ({
        subjectName: a.subjectName,
        className: a.className,
        classLabel: a.classLabel || a.className,
        classId: a.classId || null,
        periodsPerWeek: a.periodsPerWeek,
        room: a.room || null,
      })),
      timetableToday: lessonsToday.map((l) => ({
        subjectName: l.subjectName,
        className: l.className || l.group,
        startTime: l.startTime,
        endTime: l.endTime,
        durationMinutes: l.durationMinutes,
        periodCount: l.periodCount || 1,
        periodLabel: l.periodLabel,
        isCurrent: l.phase === 'current',
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/lesson-planning/class-summary', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const classId = q(req, 'classId');
    const className = q(req, 'className') || '';
    const academicYear = q(req, 'academicYear');
    const attempts = [
      classId ? { classId, academicYear } : null,
      classId ? { classId } : null,
      className ? { className, academicYear } : null,
      className ? { className } : null,
    ].filter(Boolean);
    let students = [];
    for (const query of attempts) {
      try {
        const payload = await studentMgmt('/service/students', organizationId, {
          ...query,
          status: 'ACTIVE',
        });
        const list = Array.isArray(unwrap(payload)) ? unwrap(payload) : [];
        if (list.length) {
          students = list;
          break;
        }
      } catch (err) {
        if (err.status === 503) return fail(res, err);
      }
    }
    let male = 0;
    let female = 0;
    for (const s of students) {
      const g = String(s.gender || '').toLowerCase();
      if (g.startsWith('m')) male += 1;
      else if (g.startsWith('f')) female += 1;
    }
    send(res, {
      classId: classId || null,
      className,
      total: students.length,
      male,
      female,
      classSize: students.length,
    });
  } catch (err) {
    fail(res, err);
  }
});

module.exports = {
  teacherWorkRouter: router,
  listStudentsForClassName,
};
