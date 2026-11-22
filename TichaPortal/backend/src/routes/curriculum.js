const express = require('express');
const env = require('../lib/env');
const { authenticateIam, orgId, teacher } = require('../middleware/iamAuth');
const { serviceFetch, unwrap } = require('../lib/serviceFetch');

const router = express.Router();
const BASE = () => env.CURRICULUM_API_URL.replace(/\/$/, '');

function curriculum(path, opts = {}) {
  return serviceFetch(BASE(), path, opts);
}

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

router.use(authenticateIam);

router.get('/curriculum/ai/status', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum('/teacher/ai/status', { authorization: req.headers.authorization })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'AI status unavailable' });
  }
});

router.get('/curriculum/catalog', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const path = `/teacher/catalog${qs ? `?${qs}` : ''}`;
    const data = unwrap(await curriculum(path, { authorization: req.headers.authorization }));
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Curriculum service unavailable' });
  }
});

router.get('/curriculum/books/:bookId/tree', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/books/${req.params.bookId}/tree`, {
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Curriculum service unavailable' });
  }
});

router.get('/curriculum/lesson-plans/performance', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/performance${qs ? `?${qs}` : ''}`, {
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Performance unavailable' });
  }
});

router.get('/curriculum/lesson-plans', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans${qs ? `?${qs}` : ''}`, { authorization: req.headers.authorization })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Curriculum service unavailable' });
  }
});

router.post('/curriculum/lesson-plans/:id/duplicate', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/${req.params.id}/duplicate`, {
        method: 'POST',
        body: {},
        authorization: req.headers.authorization,
      })
    );
    send(res, data, 201);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Duplicate failed' });
  }
});

router.post('/curriculum/lesson-plans/:id/archive', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/${req.params.id}/archive`, {
        method: 'POST',
        body: {},
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Archive failed' });
  }
});

router.delete('/curriculum/lesson-plans/:id', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/${req.params.id}`, {
        method: 'DELETE',
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Delete failed' });
  }
});

router.post('/curriculum/lesson-plans/:id/mark-taught', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/${req.params.id}/mark-taught`, {
        method: 'POST',
        body: req.body || {},
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.get('/curriculum/lesson-plans/:id', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const [data, teacherName, schoolName] = await Promise.all([
      curriculum(`/teacher/lesson-plans/${req.params.id}`, {
        authorization: req.headers.authorization,
      }).then(unwrap),
      resolveTeacherDisplayName(req),
      resolveSchoolName(organizationId),
    ]);
    send(res, applyTeacherAndSchoolMeta(data, { teacherName, schoolName }));
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Curriculum service unavailable' });
  }
});

async function resolveSchoolName(organizationId) {
  try {
    const profile = unwrap(
      await serviceFetch(env.IAM_API_URL, `/internal/organizations/${organizationId}/profile`)
    );
    return profile?.schoolName || profile?.name || '';
  } catch {
    return '';
  }
}

async function resolveTeacherDisplayName(req) {
  const t = teacher(req);
  const organizationId = orgId(req);
  let best = '';

  try {
    const user = unwrap(await serviceFetch(env.IAM_API_URL, `/internal/users/${t.id}`));
    const full = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (full) best = full;
  } catch {
    /* IAM optional */
  }

  try {
    const profile = unwrap(
      await serviceFetch(env.TIMETABLE_API_URL, '/internal/teacher/account-profile', {
        query: { organizationId, teacherUserId: t.id, email: t.email },
      })
    );
    const tt = String(profile?.teacherName || '').trim();
    if (tt && (!best || tt.split(/\s+/).length >= best.split(/\s+/).length)) best = tt;
  } catch {
    /* timetable optional */
  }

  if (!best) best = t.name;
  return best;
}

function applyTeacherAndSchoolMeta(plan, { teacherName, schoolName }) {
  if (!plan || typeof plan !== 'object') return plan;
  const content = plan.planContent;
  if (!content || typeof content !== 'object') return plan;
  const general = content.general || {};
  const patchField = (field, value) => {
    if (!value) return field;
    const current = field?.value ? String(field.value).trim() : '';
    const shouldReplace =
      !current || current.toLowerCase() === 'teacher' || current.split(/\s+/).filter(Boolean).length < 2;
    if (!shouldReplace && field?.provenance === 'teacher') return field;
    return { ...(field || {}), value, provenance: 'teacher' };
  };
  if (teacherName) {
    general.teacherName = patchField(general.teacherName, teacherName);
    plan.teacherName = teacherName;
  }
  if (schoolName) {
    general.schoolName = patchField(general.schoolName, schoolName);
  }
  content.general = general;
  plan.planContent = content;
  return plan;
}

router.post('/curriculum/lesson-plans/generate', async (req, res) => {
  try {
    const organizationId = orgId(req);
    const [schoolName, teacherName] = await Promise.all([
      req.body?.schoolName?.trim() ? Promise.resolve(req.body.schoolName.trim()) : resolveSchoolName(organizationId),
      req.body?.teacherName?.trim() ? Promise.resolve(req.body.teacherName.trim()) : resolveTeacherDisplayName(req),
    ]);
    const data = unwrap(
      await curriculum('/teacher/lesson-plans/generate', {
        method: 'POST',
        body: {
          ...req.body,
          schoolName,
          teacherName,
        },
        authorization: req.headers.authorization,
      })
    );
    send(res, data, 201);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Generation failed' });
  }
});

router.put('/curriculum/lesson-plans/:id', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/${req.params.id}`, {
        method: 'PUT',
        body: req.body,
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message || 'Save failed' });
  }
});

router.post('/curriculum/lesson-plans/:id/regenerate-section', async (req, res) => {
  try {
    const data = unwrap(
      await curriculum(`/teacher/lesson-plans/${req.params.id}/regenerate-section`, {
        method: 'POST',
        body: req.body,
        authorization: req.headers.authorization,
      })
    );
    send(res, data);
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    res.status(status).json({
      success: false,
      message: err.message || 'Regenerate failed',
    });
  }
});

async function proxyBinary(req, res, upstreamPath, contentType) {
  const url = `${BASE()}${upstreamPath}`;
  const response = await fetch(url, {
    headers: {
      Authorization: req.headers.authorization || '',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'ticha-portal',
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return res.status(response.status).json({
      success: false,
      message: payload.message || 'Export failed',
    });
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', response.headers.get('content-disposition') || 'attachment');
  return res.send(buffer);
}

router.get('/curriculum/lesson-plans/:id/export/pdf', async (req, res) => {
  try {
    await proxyBinary(req, res, `/teacher/lesson-plans/${req.params.id}/export/pdf`, 'application/pdf');
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'PDF export failed' });
  }
});

router.get('/curriculum/lesson-plans/:id/export/docx', async (req, res) => {
  try {
    await proxyBinary(
      req,
      res,
      `/teacher/lesson-plans/${req.params.id}/export/docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'DOCX export failed' });
  }
});

module.exports = { curriculumRouter: router };
