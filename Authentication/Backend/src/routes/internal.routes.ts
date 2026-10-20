import { Router, Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireServiceKey } from '../middleware/service-auth.middleware';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../constants/roles';
import { organizationProfileController } from '../controllers/organization-profile.controller';
import { academicSettingsService } from '../services/academic-settings.service';
import { authService } from '../services/auth.service';
import { teacherAccountInternalService } from '../services/teacher-account-internal.service';
import { gateOfficerAccountInternalService } from '../services/gate-officer-account-internal.service';
import { invigilatorAccountInternalService } from '../services/invigilator-account-internal.service';
import { teachingStaffService } from '../services/teaching-staff.service';
import {
  findIamUserByRfid,
  listIamUsersForSmartAccess,
} from '../services/smart-access-iam-users.service';
import { AppError } from '../middleware/error.middleware';
import { UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';

const router = Router();
const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

function ensureUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

ensureUploadRoot();

/** Service-to-service: registered schools for national modules (NESA, etc.). */
router.get('/organizations', requireServiceKey, (req, res, next) =>
  organizationProfileController.listSchools(req, res, next)
);

/** Service-to-service: DEO officer geographic scope (District MIS). */
router.get('/deo-officers/:userId/scope', requireServiceKey, async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const profile = await prisma.deoOfficerProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError(404, 'DEO officer profile not found');
    res.json({
      success: true,
      data: {
        userId,
        provinceId: profile.provinceId,
        provinceName: profile.provinceName,
        districtId: profile.districtId,
        districtName: profile.districtName,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/sei-officers/:userId/scope', requireServiceKey, async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const profile = await prisma.seiOfficerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(404, 'SEI officer profile not found');
    }
    res.json({
      success: true,
      data: {
        userId,
        provinceId: profile.provinceId,
        provinceName: profile.provinceName,
        districtId: profile.districtId,
        districtName: profile.districtName,
        sectorId: profile.sectorId,
        sectorName: profile.sectorName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Service-to-service: modules fetch full school profile for auto-fill. */
router.get(
  '/organizations/:organizationId/profile',
  requireServiceKey,
  (req, res, next) => organizationProfileController.getProfile(req, res, next)
);

/** Service-to-service: resolve IAM user by org + email (Payroll → Teacher Portal linking). */
router.get(
  '/organizations/:organizationId/users/by-email',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const organizationId = String(req.params.organizationId);
      const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
      if (!email) throw new AppError(400, 'email query is required');
      const user = await authService.findUserByOrgEmail(organizationId, email);
      if (!user) {
        res.json({ success: true, data: null });
        return;
      }
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/** Service-to-service: Smart Access staff card assigned on IAM user (gate / attendance). */
router.get('/staff/rfid-lookup', requireServiceKey, async (req, res, next) => {
  try {
    const rfidUid = typeof req.query.rfidUid === 'string' ? req.query.rfidUid.trim() : '';
    if (!rfidUid) {
      throw new AppError(400, 'rfidUid is required');
    }
    const data = await findIamUserByRfid(rfidUid);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/** Service-to-service: resolve user first/last name for documents and audit fields. */
router.get('/users/:userId', requireServiceKey, async (req, res, next) => {
  try {
    const user = await authService.getUserById(String(req.params.userId));
    res.json({
      success: true,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:userId/avatar', requireServiceKey, async (req, res, next) => {
  try {
    const avatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl : null;
    const user = await authService.updateAvatar(String(req.params.userId), avatarUrl);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

/** Service-to-service: org-wide academic year / term settings. */
router.get(
  '/organizations/:organizationId/academic-settings',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const data = await academicSettingsService.getForOrganization(String(req.params.organizationId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/organizations/:organizationId/academic-settings',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const data = await academicSettingsService.updateForOrganization(
        String(req.params.organizationId),
        req.body
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/** Service-to-service: teacher portal account provisioning from Timetable module */
router.post(
  '/organizations/:organizationId/teacher-accounts/check',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const data = await teacherAccountInternalService.checkIdentifier(
        String(req.params.organizationId),
        req.body
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/organizations/:organizationId/teacher-accounts/:userId',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const data = await teacherAccountInternalService.getAccount(
        String(req.params.organizationId),
        String(req.params.userId)
      );
      if (!data) throw new AppError(404, 'Teacher account not found');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/organizations/:organizationId/teacher-accounts',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const actorId = String(req.body.actorId ?? 'system');
      const data = await teacherAccountInternalService.provisionAccount(
        actorId,
        String(req.params.organizationId),
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/organizations/:organizationId/teacher-accounts/:userId/reset-password',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const actorId = String(req.body.actorId ?? 'system');
      const data = await teacherAccountInternalService.resetPassword(
        actorId,
        String(req.params.organizationId),
        String(req.params.userId),
        req.body
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/organizations/:organizationId/teacher-accounts/:userId/status',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const actorId = String(req.body.actorId ?? 'system');
      const status = req.body.status as UserStatus;
      const data = await teacherAccountInternalService.setAccountStatus(
        actorId,
        String(req.params.organizationId),
        String(req.params.userId),
        status
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/** Service-to-service: gate officer login account from Student Discipline module */
router.post(
  '/organizations/:organizationId/gate-officer-accounts',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const actorId = String(req.body.actorId ?? 'system');
      const data = await gateOfficerAccountInternalService.provisionAccount(
        actorId,
        String(req.params.organizationId),
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/organizations/:organizationId/users',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const data = await invigilatorAccountInternalService.listOrgUsers(String(req.params.organizationId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/** Service-to-service: org users for card printing (Users & Access — same roster as Smart Access). */
router.get(
  '/organizations/:organizationId/staff-for-cards',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const organizationId = String(req.params.organizationId);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await listIamUsersForSmartAccess(organizationId, { search });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/** Service-to-service: teaching staff from IAM (teacher-portal, teaching positions, academic departments). */
router.get(
  '/organizations/:organizationId/teaching-staff',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const organizationId = String(req.params.organizationId);
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await teachingStaffService.listForOrganization(organizationId, search);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/organizations/:organizationId/invigilator-accounts',
  requireServiceKey,
  async (req, res, next) => {
    try {
      const actorId = String(req.body.actorId ?? 'system');
      const data = await invigilatorAccountInternalService.provisionAccount(
        actorId,
        String(req.params.organizationId),
        req.body
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Super-admin branding upload during registration.
 * Accepts raw multipart fields without multer dependency — JSON base64 or data URL.
 * Prefer: POST body { assetType, fileName, contentBase64, mimeType }
 */
router.post(
  '/branding/upload',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ROOT_ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
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

      const allowed = new Set(['logo', 'signature', 'stamp']);
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

      ensureUploadRoot();
      fs.writeFileSync(path.join(uploadRoot, stored), buffer);

      const publicUrl = `/uploads/${stored}`;
      res.json({
        success: true,
        data: {
          assetType,
          url: publicUrl,
          fileName: stored,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
