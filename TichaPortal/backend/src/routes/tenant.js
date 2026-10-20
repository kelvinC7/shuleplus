const express = require('express');
const { requireServiceAuth } = require('../middleware/serviceAuth');

const router = express.Router();

/**
 * IAM provisioning hook. TichaPortal is a BFF (no local tenant DB) — acknowledge
 * so organizationModule.tenantProvisioned can be set and teachers get launch URLs.
 */
router.post('/tenant/create', requireServiceAuth, (req, res) => {
  const organizationId = String(req.body?.organizationId ?? '').trim();
  const organizationName = String(req.body?.organizationName ?? '').trim();
  const organizationCode = req.body?.organizationCode
    ? String(req.body.organizationCode).trim()
    : null;

  if (!organizationId || !organizationName) {
    return res.status(400).json({
      success: false,
      message: 'organizationId and organizationName are required',
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      organizationId,
      organizationName,
      organizationCode,
      provisioned: true,
      message: 'Teacher Portal BFF ready (proxies Academic, Timetable, HR, etc.)',
    },
  });
});

module.exports = { tenantRouter: router };
