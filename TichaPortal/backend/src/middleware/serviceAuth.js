const env = require('../lib/env');

/** IAM module provisioning: x-service-key must match SERVICE_API_KEY. */
function requireServiceAuth(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!env.SERVICE_API_KEY) return next();
  if (!key || key !== env.SERVICE_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing service API key',
    });
  }
  return next();
}

module.exports = { requireServiceAuth };
