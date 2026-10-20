const jwt = require('jsonwebtoken');
const env = require('../lib/env');

function authenticateIam(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), env.JWT_ACCESS_SECRET, { clockTolerance: 60 });
    req.organizationId =
      req.user.organizationId || req.user.organization_id || req.user.orgId || null;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
}

function orgId(req) {
  const id = req.organizationId || req.user?.organizationId;
  if (!id) {
    const err = new Error('Missing organization context');
    err.status = 401;
    throw err;
  }
  return id;
}

function teacher(req) {
  const user = req.user || {};
  const email = user.email ? String(user.email) : '';
  const fromEmail = email.includes('@') ? email.split('@')[0].replace(/[._]/g, ' ') : '';
  const composed = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return {
    id: user.sub || user.id || user.userId,
    email,
    name: user.name || user.full_name || user.fullName || composed || fromEmail || 'Teacher',
  };
}

module.exports = { authenticateIam, orgId, teacher };
