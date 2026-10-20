const env = require('../lib/env');
const { authenticateIam } = require('../middleware/iamAuth');
const { serviceFetch } = require('../lib/serviceFetch');

function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  return res.status(status).json({ success: false, message: err.message || 'Kazi request failed' });
}

function kaziProxy(req, res) {
  const rest = String(req.originalUrl || '').replace(/^\/api\/kazi/, '') || '/';
  const qIndex = rest.indexOf('?');
  const pathPart = (qIndex >= 0 ? rest.slice(0, qIndex) : rest) || '/';
  const query = {};
  if (qIndex >= 0) {
    new URLSearchParams(rest.slice(qIndex + 1)).forEach((value, key) => {
      query[key] = value;
    });
  }
  const method = String(req.method || 'GET').toUpperCase();
  serviceFetch(env.KAZI_API_URL, pathPart, {
    method,
    query,
    body: method === 'GET' || method === 'HEAD' ? undefined : req.body,
    authorization: req.headers.authorization,
  })
    .then((payload) => res.json(payload))
    .catch((err) => fail(res, err));
}

function mountKaziProxy(app) {
  app.use('/api/kazi', authenticateIam, kaziProxy);
}

module.exports = { mountKaziProxy };
