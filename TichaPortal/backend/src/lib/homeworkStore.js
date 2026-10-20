const crypto = require('crypto');
const { readDb, writeDb } = require('../models/db');

function ensureHomeworkDb() {
  const db = readDb();
  if (!Array.isArray(db.homeworkAssignments)) db.homeworkAssignments = [];
  return db;
}

function saveHomeworkDb(db) {
  writeDb(db);
}

function newId() {
  return crypto.randomUUID();
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function computeDisplayStatus(hw, now = new Date()) {
  if (hw.status === 'DRAFT') return 'DRAFT';
  if (hw.status === 'ARCHIVED') return 'ARCHIVED';
  if (hw.status === 'CLOSED') return 'CLOSED';
  const due = hw.dueDate ? new Date(hw.dueDate) : null;
  if (due && due < now) return 'OVERDUE';
  if (due) {
    const ms = due.getTime() - now.getTime();
    if (ms >= 0 && ms <= 24 * 60 * 60 * 1000) return 'DUE_SOON';
  }
  return hw.status === 'PUBLISHED' ? 'ACTIVE' : hw.status || 'ACTIVE';
}

function countSubmissions(hw) {
  const subs = hw.submissions || {};
  const values = Object.values(subs);
  const total = hw.studentCount || values.length || 0;
  const submitted = values.filter((s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED').length;
  const reviewed = values.filter((s) => s.status === 'REVIEWED').length;
  const pendingReview = values.filter((s) => s.status === 'SUBMITTED').length;
  const scores = values.filter((s) => typeof s.score === 'number').map((s) => s.score);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return { total, submitted, reviewed, pendingReview, avgScore };
}

function summarize(hw, now = new Date()) {
  const counts = countSubmissions(hw);
  const displayStatus = computeDisplayStatus(hw, now);
  const questionCount = Array.isArray(hw.questions) ? hw.questions.length : 0;
  return {
    id: hw.id,
    title: hw.title,
    className: hw.className,
    classId: hw.classId,
    courseName: hw.courseName,
    homeworkType: hw.homeworkType,
    academicYear: hw.academicYear,
    term: hw.term,
    teacherName: hw.teacherName,
    dueDate: hw.dueDate,
    startDate: hw.startDate,
    status: displayStatus,
    rawStatus: hw.status,
    questionCount,
    maxScore: hw.maxScore,
    estimatedMinutes: hw.estimatedMinutes,
    submissions: `${counts.submitted}/${counts.total || 0}`,
    submissionSubmitted: counts.submitted,
    submissionTotal: counts.total,
    pendingReview: counts.pendingReview,
    averageScore: counts.avgScore,
    createdAt: hw.createdAt,
    updatedAt: hw.updatedAt,
    publishedAt: hw.publishedAt,
  };
}

function listAssignments(organizationId, teacherUserId, filters = {}) {
  const db = ensureHomeworkDb();
  const now = new Date();
  let rows = db.homeworkAssignments.filter(
    (h) => h.organizationId === organizationId && h.teacherUserId === teacherUserId
  );

  if (filters.academicYear) {
    rows = rows.filter((h) => h.academicYear === filters.academicYear);
  }
  if (filters.term) {
    rows = rows.filter((h) => h.term === filters.term);
  }
  if (filters.className) {
    const q = String(filters.className).toLowerCase();
    rows = rows.filter((h) => String(h.className || '').toLowerCase().includes(q));
  }
  if (filters.courseName) {
    const q = String(filters.courseName).toLowerCase();
    rows = rows.filter((h) => String(h.courseName || '').toLowerCase().includes(q));
  }
  if (filters.status) {
    rows = rows.filter((h) => computeDisplayStatus(h, now) === filters.status);
  }
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    rows = rows.filter((h) => String(h.title || '').toLowerCase().includes(q));
  }
  if (filters.statFilter) {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    rows = rows.filter((h) => {
      const s = summarize(h, now);
      switch (filters.statFilter) {
        case 'active':
          return ['ACTIVE', 'DUE_SOON', 'PUBLISHED'].includes(s.status);
        case 'dueToday': {
          if (!h.dueDate) return false;
          const due = new Date(h.dueDate);
          return due >= todayStart && due <= todayEnd;
        }
        case 'pendingReview':
          return s.pendingReview > 0;
        case 'completed':
          return s.submissionTotal > 0 && s.submissionSubmitted >= s.submissionTotal;
        case 'averageScore':
          return s.averageScore != null;
        default:
          return true;
      }
    });
  }

  rows.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  return rows.map((h) => summarize(h, now));
}

function computeStats(organizationId, teacherUserId) {
  const db = ensureHomeworkDb();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const rows = db.homeworkAssignments.filter(
    (h) => h.organizationId === organizationId && h.teacherUserId === teacherUserId
  );

  let active = 0;
  let dueToday = 0;
  let pendingReview = 0;
  let completed = 0;
  const scores = [];

  for (const h of rows) {
    const s = summarize(h, now);
    if (['ACTIVE', 'DUE_SOON', 'PUBLISHED'].includes(s.status)) active += 1;
    if (h.dueDate) {
      const due = new Date(h.dueDate);
      if (due >= todayStart && due <= todayEnd) dueToday += 1;
    }
    pendingReview += s.pendingReview || 0;
    if (s.submissionTotal > 0 && s.submissionSubmitted >= s.submissionTotal) completed += 1;
    if (s.averageScore != null) scores.push(s.averageScore);
  }

  return {
    active,
    dueToday,
    pendingReview,
    completed,
    averageScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    total: rows.length,
  };
}

function getAssignment(organizationId, teacherUserId, id) {
  const db = ensureHomeworkDb();
  const hw = db.homeworkAssignments.find(
    (h) => h.id === id && h.organizationId === organizationId && h.teacherUserId === teacherUserId
  );
  if (!hw) return null;
  return { ...hw, displayStatus: computeDisplayStatus(hw) };
}

function upsertAssignment(organizationId, teacherUserId, teacherName, body, id) {
  const db = ensureHomeworkDb();
  const now = new Date().toISOString();
  const existingIdx = id
    ? db.homeworkAssignments.findIndex(
        (h) => h.id === id && h.organizationId === organizationId && h.teacherUserId === teacherUserId
      )
    : -1;

  const base =
    existingIdx >= 0
      ? { ...db.homeworkAssignments[existingIdx] }
      : {
          id: newId(),
          organizationId,
          teacherUserId,
          teacherName,
          status: 'DRAFT',
          submissions: {},
          studentCount: 0,
          createdAt: now,
        };

  const merged = {
    ...base,
    title: body.title ?? base.title ?? '',
    description: body.description ?? base.description ?? '',
    academicYear: body.academicYear ?? base.academicYear ?? '',
    term: body.term ?? base.term ?? '',
    classId: body.classId ?? base.classId ?? null,
    className: body.className ?? base.className ?? '',
    courseName: body.courseName ?? base.courseName ?? '',
    homeworkType: body.homeworkType ?? base.homeworkType ?? 'QUIZ',
    startDate: body.startDate ?? base.startDate ?? null,
    dueDate: body.dueDate ?? base.dueDate ?? null,
    estimatedMinutes: body.estimatedMinutes ?? base.estimatedMinutes ?? null,
    maxScore: body.maxScore ?? base.maxScore ?? null,
    questions: body.questions ?? base.questions ?? [],
    attachment: body.attachment ?? base.attachment ?? null,
    resourceUrl: body.resourceUrl ?? base.resourceUrl ?? null,
    submissionMode: body.submissionMode ?? base.submissionMode ?? 'SYSTEM',
    teacherName: teacherName || base.teacherName,
    updatedAt: now,
  };

  if (body.status && ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].includes(body.status)) {
    merged.status = body.status;
    if (body.status === 'PUBLISHED' && !merged.publishedAt) merged.publishedAt = now;
  }

  if (existingIdx >= 0) {
    db.homeworkAssignments[existingIdx] = merged;
  } else {
    db.homeworkAssignments.push(merged);
  }
  saveHomeworkDb(db);
  return merged;
}

function patchAssignment(organizationId, teacherUserId, id, patch) {
  const db = ensureHomeworkDb();
  const idx = db.homeworkAssignments.findIndex(
    (h) => h.id === id && h.organizationId === organizationId && h.teacherUserId === teacherUserId
  );
  if (idx < 0) return null;
  const now = new Date().toISOString();
  db.homeworkAssignments[idx] = {
    ...db.homeworkAssignments[idx],
    ...patch,
    updatedAt: now,
  };
  saveHomeworkDb(db);
  return db.homeworkAssignments[idx];
}

function deleteAssignment(organizationId, teacherUserId, id) {
  const db = ensureHomeworkDb();
  const before = db.homeworkAssignments.length;
  db.homeworkAssignments = db.homeworkAssignments.filter(
    (h) => !(h.id === id && h.organizationId === organizationId && h.teacherUserId === teacherUserId)
  );
  if (db.homeworkAssignments.length === before) return false;
  saveHomeworkDb(db);
  return true;
}

function duplicateAssignment(organizationId, teacherUserId, teacherName, id) {
  const hw = getAssignment(organizationId, teacherUserId, id);
  if (!hw) return null;
  const copy = {
    ...hw,
    id: newId(),
    title: `${hw.title} (Copy)`,
    status: 'DRAFT',
    publishedAt: null,
    submissions: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    teacherUserId,
    teacherName,
  };
  delete copy.displayStatus;
  const db = ensureHomeworkDb();
  db.homeworkAssignments.push(copy);
  saveHomeworkDb(db);
  return copy;
}

function setStudentCount(organizationId, teacherUserId, id, count) {
  return patchAssignment(organizationId, teacherUserId, id, { studentCount: count });
}

module.exports = {
  listAssignments,
  computeStats,
  getAssignment,
  upsertAssignment,
  patchAssignment,
  deleteAssignment,
  duplicateAssignment,
  setStudentCount,
  summarize,
  computeDisplayStatus,
  countSubmissions,
};
