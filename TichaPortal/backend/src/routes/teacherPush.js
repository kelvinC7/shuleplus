const { Router } = require('express');
const { authenticateIam, orgId } = require('../middleware/iamAuth');
const { requireServiceAuth } = require('../middleware/serviceAuth');
const {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  notifyByIdentity,
} = require('../lib/webPush');

const router = Router();

// Teacher-authenticated push subscription management (used by TichaPortal frontend)
router.get('/teacher-portal/push/vapid-key', authenticateIam, async (_req, res) => {
  try {
    const keys = getVapidPublicKey();
    return res.json({ success: true, publicKey: keys.publicKey });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to get VAPID key' });
  }
});

router.post('/teacher-portal/push/subscribe', authenticateIam, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint is required' });
    }
    saveSubscription(
      {
        organizationId: orgId(req),
        iamUserId: req.user?.sub || req.user?.id || req.user?.userId,
        email: req.user?.email,
      },
      body
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to subscribe' });
  }
});

router.post('/teacher-portal/push/unsubscribe', authenticateIam, async (req, res) => {
  try {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : undefined;
    removeSubscription(
      {
        organizationId: orgId(req),
        iamUserId: req.user?.sub || req.user?.id || req.user?.userId,
        email: req.user?.email,
      },
      endpoint
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to unsubscribe' });
  }
});

// Service-to-service: Attendance/other modules trigger push to a teacher (no Kazi dependency)
router.post('/service/push/notify', requireServiceAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const message = String(body.body || body.message || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const result = await notifyByIdentity(
      {
        organizationId: body.organizationId,
        iamUserId: body.iamUserId || body.userId || body.teacherUserId,
        email: body.email,
      },
      {
        title,
        body: message,
        tag: body.tag ? String(body.tag).trim() : undefined,
        url: body.url ? String(body.url).trim() : undefined,
      }
    );
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to send push' });
  }
});

module.exports = { teacherPushRouter: router };