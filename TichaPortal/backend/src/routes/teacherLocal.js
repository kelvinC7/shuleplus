const { Router } = require('express');
const { authenticateIam, orgId, teacher } = require('../middleware/iamAuth');
const { readDb, writeDb } = require('../models/db');

const router = Router();
router.use(authenticateIam);

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ success: false, message: err.message || 'Request failed' });
}

function db() {
  const data = readDb();
  if (!Array.isArray(data.requisitions)) data.requisitions = [];
  if (!Array.isArray(data.englishClub)) data.englishClub = [];
  return data;
}

router.get('/teacher-portal/english-club/resources', (req, res) => {
  try {
    const type = String(req.query.type || 'all');
    const rows = db().englishClub.filter((r) => type === 'all' || r.type === type);
    return res.json({ success: true, resources: rows });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/teacher-portal/requisitions', (req, res) => {
  try {
    const t = teacher(req);
    const organizationId = orgId(req);
    const rows = db().requisitions.filter(
      (r) => r.organizationId === organizationId && r.teacherUserId === t.id
    );
    send(res, rows);
  } catch (err) {
    fail(res, err);
  }
});

router.post('/teacher-portal/requisitions', (req, res) => {
  try {
    const t = teacher(req);
    const body = req.body || {};
    const row = {
      id: `REQ-${Date.now()}`,
      db_id: `req-${Date.now()}`,
      organizationId: orgId(req),
      teacherUserId: t.id,
      dept: body.dept || '',
      requester: body.requester || t.name,
      items: body.items || '',
      amount: body.amount || 0,
      submitted: body.submitted || new Date().toISOString().slice(0, 10),
      attachmentName: body.attachmentName || '',
      description: body.description || body.note || '',
      destination: body.destination || 'accountant',
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    const data = db();
    data.requisitions.unshift(row);
    writeDb(data);
    send(res, row, 201);
  } catch (err) {
    fail(res, err);
  }
});

router.patch('/teacher-portal/requisitions/:id', (req, res) => {
  try {
    const t = teacher(req);
    const data = db();
    const row = data.requisitions.find(
      (r) =>
        (r.db_id === req.params.id || r.id === req.params.id) &&
        r.teacherUserId === t.id
    );
    if (!row) return res.status(404).json({ success: false, message: 'Requisition not found' });
    const body = req.body || {};
    if (body.items != null) row.items = body.items;
    if (body.attachmentName != null) row.attachmentName = body.attachmentName;
    if (body.description != null) row.description = body.description;
    if (body.note != null) row.description = body.note;
    writeDb(data);
    send(res, row);
  } catch (err) {
    fail(res, err);
  }
});

module.exports = { teacherLocalRouter: router };
