const { Router } = require('express');
const env = require('../lib/env');
const { authenticateIam, orgId, teacher } = require('../middleware/iamAuth');
const { serviceFetch, unwrap } = require('../lib/serviceFetch');
const { existingPhoto, saveTeacherPhoto } = require('../lib/teacherPhoto');

const router = Router();

function send(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ success: false, message: err.message || 'Request failed' });
}

async function iamAvatar(userId) {
  try {
    const user = unwrap(await serviceFetch(env.IAM_API_URL, `/internal/users/${userId}`));
    return user?.avatarUrl || null;
  } catch {
    return null;
  }
}

async function setIamAvatar(userId, avatarUrl) {
  try {
    await serviceFetch(env.IAM_API_URL, `/internal/users/${userId}/avatar`, {
      method: 'PATCH',
      body: { avatarUrl },
    });
  } catch {
    /* photo still saved locally */
  }
}

function profilePayload(req) {
  const t = teacher(req);
  return {
    id: t.id,
    email: t.email,
    name: t.name,
    organizationId: orgId(req),
    photo: existingPhoto(t.id),
  };
}

router.get('/school-profile', authenticateIam, async (req, res) => {
  try {
    const organizationId = orgId(req);
    const profile = unwrap(
      await serviceFetch(env.IAM_API_URL, `/internal/organizations/${organizationId}/profile`)
    );
    send(res, profile);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/profile', authenticateIam, async (req, res) => {
  try {
    const t = teacher(req);
    const photo = existingPhoto(t.id) || (await iamAvatar(t.id));
    send(res, { ...profilePayload(req), photo });
  } catch (err) {
    fail(res, err);
  }
});

async function handlePhoto(req, res) {
  try {
    const t = teacher(req);
    const dataUrl = req.body?.image || req.body?.photo || req.body?.dataUrl;
    if (!dataUrl) {
      return res.status(400).json({ success: false, message: 'Choose an image first.' });
    }
    const photo = saveTeacherPhoto(t.id, dataUrl);
    await setIamAvatar(t.id, photo);
    send(res, { photo });
  } catch (err) {
    fail(res, err);
  }
}

router.post('/profile/photo', authenticateIam, handlePhoto);
router.post('/auth/profile/photo', authenticateIam, handlePhoto);

async function handlePassword(req, res) {
  try {
    const currentPassword = req.body?.currentPassword || req.body?.current_password;
    const newPassword = req.body?.newPassword || req.body?.new_password;
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Enter your current password.' });
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    const payload = await serviceFetch(env.IAM_API_URL, '/auth/change-password', {
      method: 'POST',
      authorization: req.headers.authorization,
      body: { currentPassword, newPassword },
    });
    send(res, { message: payload?.message || 'Password updated successfully' });
  } catch (err) {
    fail(res, err);
  }
}

router.post('/profile/password', authenticateIam, handlePassword);
router.put('/profile/password', authenticateIam, handlePassword);
router.post('/auth/change-password', authenticateIam, handlePassword);
router.put('/auth/change-password', authenticateIam, handlePassword);

module.exports = { teacherProfileRouter: router };
