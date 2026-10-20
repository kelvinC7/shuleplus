const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authenticateIam, orgId, teacher } = require('../middleware/iamAuth');
const {
  listAssignments,
  computeStats,
  getAssignment,
  upsertAssignment,
  patchAssignment,
  deleteAssignment,
  duplicateAssignment,
  setStudentCount,
} = require('../lib/homeworkStore');
const { syncHomeworkToParentMis } = require('../lib/parentMisHomework');
const env = require('../lib/env');

const router = Router();
router.use(authenticateIam);

function publicAttachmentUrl(relative) {
  if (!relative) return null;
  if (/^https?:\/\//i.test(relative)) return relative;
  const base = (process.env.TICHA_API_PUBLIC_URL || process.env.TICHA_API_URL || `http://localhost:${env.PORT}`).replace(/\/$/, '');
  return `${base}${relative.startsWith('/') ? relative : `/${relative}`}`;
}

const uploadsDir = path.join(__dirname, '../../uploads/homework');
fs.mkdirSync(uploadsDir, { recursive: true });

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, err, status = 500) {
  const code = err.status || status;
  return res.status(code).json({ success: false, message: err.message || 'Request failed' });
}

function q(req, key) {
  return typeof req.query[key] === 'string' ? req.query[key] : undefined;
}

async function teacherName(req) {
  const t = teacher(req);
  return t.name || t.email || 'Teacher';
}

function saveBase64File(base64, originalName) {
  const match = String(base64).match(/^data:([^;]+);base64,(.+)$/);
  const mime = match ? match[1] : 'application/octet-stream';
  const raw = match ? match[2] : base64;
  const ext = path.extname(originalName || '') || (mime.includes('pdf') ? '.pdf' : '.bin');
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(uploadsDir, storageKey);
  fs.writeFileSync(filePath, Buffer.from(raw, 'base64'));
  return {
    storageKey,
    fileName: originalName || storageKey,
    mimeType: mime,
    fileSize: fs.statSync(filePath).size,
    fileUrl: `/uploads/homework/${storageKey}`,
  };
}

/** Re-use listStudentsForClassName from teacherWork */
async function fetchClassStudents(req, className, academicYear) {
  const { listStudentsForClassName } = require('./teacherWork');
  return listStudentsForClassName(orgId(req), className, academicYear);
}

router.get('/homework/stats', async (req, res) => {
  try {
    const t = teacher(req);
    send(res, computeStats(orgId(req), t.id));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/homework', async (req, res) => {
  try {
    const t = teacher(req);
    const items = listAssignments(orgId(req), t.id, {
      search: q(req, 'search'),
      academicYear: q(req, 'academicYear') || q(req, 'academic_year'),
      term: q(req, 'term'),
      className: q(req, 'className') || q(req, 'class'),
      courseName: q(req, 'course'),
      status: q(req, 'status'),
      statFilter: q(req, 'statFilter'),
    });
    send(res, items);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/homework/:id', async (req, res) => {
  try {
    const t = teacher(req);
    const hw = getAssignment(orgId(req), t.id, req.params.id);
    if (!hw) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    send(res, hw);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/homework', async (req, res) => {
  try {
    const t = teacher(req);
    const body = { ...(req.body || {}) };
    if (body.fileBase64 && body.fileName) {
      body.attachment = saveBase64File(body.fileBase64, body.fileName);
      delete body.fileBase64;
    }
    const hw = upsertAssignment(orgId(req), t.id, await teacherName(req), body);
    send(res, hw, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.put('/homework/:id', async (req, res) => {
  try {
    const t = teacher(req);
    const body = { ...(req.body || {}) };
    if (body.fileBase64 && body.fileName) {
      body.attachment = saveBase64File(body.fileBase64, body.fileName);
      delete body.fileBase64;
    }
    const hw = upsertAssignment(orgId(req), t.id, await teacherName(req), body, req.params.id);
    if (!hw) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    send(res, hw);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/homework/:id/publish', async (req, res) => {
  try {
    const t = teacher(req);
    const organizationId = orgId(req);
    let hw = getAssignment(organizationId, t.id, req.params.id);
    if (!hw) return fail(res, { message: 'Homework not found', status: 404 }, 404);

    const students = await fetchClassStudents(req, hw.className, hw.academicYear);
    setStudentCount(organizationId, t.id, hw.id, students.length);

    hw = patchAssignment(organizationId, t.id, hw.id, {
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      studentCount: students.length,
    });

    const syncResult = await syncHomeworkToParentMis({
      organizationId,
      assignment: {
        id: hw.id,
        title: hw.title,
        description: hw.description,
        subject: hw.courseName,
        className: hw.className,
        teacher: hw.teacherName,
        homeworkType: hw.homeworkType,
        assignedDate: hw.startDate || hw.publishedAt,
        dueDate: hw.dueDate,
        maxScore: hw.maxScore,
        estimatedMinutes: hw.estimatedMinutes,
        questions: hw.questions,
        attachment: hw.attachment
          ? {
              ...hw.attachment,
              fileUrl: publicAttachmentUrl(hw.attachment.fileUrl),
            }
          : null,
        resourceUrl: hw.resourceUrl,
        submissionMode: hw.submissionMode,
      },
      students: students.map((s) => ({
        shuleCode: s.id || s.studentCode,
        smStudentId: s.row_id || s.id,
        name: s.name,
      })),
    });

    send(res, { homework: hw, parentSync: syncResult });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/homework/:id/duplicate', async (req, res) => {
  try {
    const t = teacher(req);
    const copy = duplicateAssignment(orgId(req), t.id, await teacherName(req), req.params.id);
    if (!copy) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    send(res, copy, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.patch('/homework/:id', async (req, res) => {
  try {
    const t = teacher(req);
    const allowed = {};
    const body = req.body || {};
    if (body.dueDate) allowed.dueDate = body.dueDate;
    if (body.status) allowed.status = body.status;
    if (body.title) allowed.title = body.title;
    const hw = patchAssignment(orgId(req), t.id, req.params.id, allowed);
    if (!hw) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    send(res, hw);
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/homework/:id', async (req, res) => {
  try {
    const t = teacher(req);
    const ok = deleteAssignment(orgId(req), t.id, req.params.id);
    if (!ok) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    send(res, { deleted: true });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/homework/:id/submissions', async (req, res) => {
  try {
    const t = teacher(req);
    const hw = getAssignment(orgId(req), t.id, req.params.id);
    if (!hw) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    const students = await fetchClassStudents(req, hw.className, hw.academicYear);
    const subs = hw.submissions || {};
    const rows = students.map((s) => {
      const key = s.row_id || s.id;
      const sub = subs[key] || subs[s.id] || {};
      return {
        studentId: key,
        shuleCode: s.id,
        name: s.name,
        status: sub.status || 'NOT_STARTED',
        score: sub.score ?? null,
        feedback: sub.feedback ?? null,
        submittedAt: sub.submittedAt ?? null,
      };
    });
    send(res, rows);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/homework/:id/review', async (req, res) => {
  try {
    const t = teacher(req);
    const hw = getAssignment(orgId(req), t.id, req.params.id);
    if (!hw) return fail(res, { message: 'Homework not found', status: 404 }, 404);
    const { studentId, score, feedback } = req.body || {};
    if (!studentId) return fail(res, { message: 'studentId required', status: 400 }, 400);
    const submissions = { ...(hw.submissions || {}) };
    submissions[studentId] = {
      ...(submissions[studentId] || {}),
      status: 'REVIEWED',
      score: score != null ? Number(score) : null,
      feedback: feedback || null,
      reviewedAt: new Date().toISOString(),
    };
    const updated = patchAssignment(orgId(req), t.id, hw.id, { submissions });
    send(res, updated);
  } catch (err) {
    fail(res, err);
  }
});

module.exports = { homeworkRouter: router };
