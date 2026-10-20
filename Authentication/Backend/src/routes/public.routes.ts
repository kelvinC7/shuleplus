import { Router, Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { organizationRegistrationController } from '../controllers/organization-registration.controller';
import { publicStaffLookupController } from '../controllers/public-staff-lookup.controller';
import { admissionController } from '../controllers/admission.controller';
import { AppError } from '../middleware/error.middleware';

const router = Router();
const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

/** Public location helpers for school onboarding */
router.get('/locations/provinces', (req, res, next) =>
  organizationRegistrationController.listProvinces(req, res, next)
);
router.get('/locations/provinces/:provinceId/districts', (req, res, next) =>
  organizationRegistrationController.listDistricts(req, res, next)
);
router.get('/locations/districts/:districtId/sectors', (req, res, next) =>
  organizationRegistrationController.listSectors(req, res, next)
);
router.get('/locations/sectors/:sectorId/cells', (req, res, next) =>
  organizationRegistrationController.listCells(req, res, next)
);
router.get('/locations/cells/:cellId/villages', (req, res, next) =>
  organizationRegistrationController.listVillages(req, res, next)
);
router.get('/locations/districts/:districtId/preview-code', (req, res, next) =>
  organizationRegistrationController.previewCode(req, res, next)
);

/** Public branding upload for school onboarding (logo / signature / stamp) */
router.post('/branding/upload', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetType, fileName, contentBase64, mimeType } = req.body as {
      assetType?: string;
      fileName?: string;
      contentBase64?: string;
      mimeType?: string;
    };

    if (!contentBase64 || !assetType) {
      throw new AppError(400, 'assetType and contentBase64 are required');
    }

    const allowed = new Set(['logo', 'signature', 'stamp', 'avatar']);
    if (!allowed.has(assetType)) {
      throw new AppError(400, 'assetType must be logo, signature, or stamp');
    }

    const mime = mimeType ?? 'image/png';
    if (!mime.startsWith('image/')) {
      throw new AppError(400, 'Only image uploads are allowed');
    }

    const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const safeName = (fileName ?? `${assetType}.${ext}`).replace(/[^\w.\-()+]/g, '_');
    const stored = `${randomUUID()}-${assetType}-${safeName}`;
    const buffer = Buffer.from(contentBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      throw new AppError(400, 'File too large (max 5MB)');
    }

    fs.mkdirSync(uploadRoot, { recursive: true });
    fs.writeFileSync(path.join(uploadRoot, stored), buffer);

    res.json({
      success: true,
      data: {
        assetType,
        url: `/uploads/${stored}`,
        fileName: stored,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Public directory feed: onboarded schools for the babyeyi.rw landing page */
router.get('/school-registrations', (req, res, next) =>
  organizationRegistrationController.listPublicSchools(req, res, next)
);

/** Public school registration → ACTIVE org, locked modules until super-admin activates */
router.post('/school-registrations', (req, res, next) =>
  organizationRegistrationController.submitPublic(req, res, next)
);

/** Public admissions — babyeyi.rw application flow */
router.get('/admissions/check', (req, res, next) =>
  admissionController.publicCheck(req, res, next)
);
router.get('/admissions/config', (req, res, next) =>
  admissionController.publicConfig(req, res, next)
);
router.post('/admissions/submit', (req, res, next) =>
  admissionController.submit(req, res, next)
);
router.post('/admissions/draft', (req, res, next) =>
  admissionController.saveDraft(req, res, next)
);
router.get('/admissions/track/:applicationNumber', (req, res, next) =>
  admissionController.track(req, res, next)
);

/** Public staff profile for Smart Card QR scans */
router.get('/staff/lookup', (req, res, next) =>
  publicStaffLookupController.lookup(req, res, next)
);

export default router;
