import { Request, Response, NextFunction } from 'express';
import { fetchIamAcademicSettings } from '../clients/iam.client';
import { studentManagementClient } from '../services/student-management-client.service';
import { kitService } from '../services/kit.service';
import { platformCatalogService } from '../services/platform-catalog.service';
import { platformOpsService } from '../services/platform-ops.service';
import { PaymentMethod } from '../generated/prisma';

export class PublicController {
  /** Landing-portal lookup: resolve a student + parents by ShuleCode/SDMS (via Student Management). */
  async lookupStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      if (!code) {
        res.status(400).json({ success: false, message: 'code is required' });
        return;
      }
      const data = await studentManagementClient.lookupByCode(code);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Public kits listing for the student's grade level (org resolved from query). */
  async listKits(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : '';
      const gradeLevel = typeof req.query.gradeLevel === 'string' ? req.query.gradeLevel : undefined;
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await kitService.list(organizationId, gradeLevel, 'ACTIVE');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.listProducts({
        status: 'ACTIVE',
        customEligible: true,
        categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        featured: req.query.featured === 'true' ? true : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listStandardKits(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.listStandardKits({
        organizationId: typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        status: 'ACTIVE',
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createPlatformOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body ?? {};
      const orderType = body.orderType === 'CUSTOM' ? 'CUSTOM' : body.orderType === 'STANDARD' ? 'STANDARD' : null;
      if (!orderType) {
        res.status(400).json({ success: false, message: 'orderType must be STANDARD or CUSTOM' });
        return;
      }
      const data = await platformOpsService.createPublicPlatformOrder({
        orderType,
        studentCode: String(body.studentCode ?? ''),
        standardKitId: typeof body.standardKitId === 'string' ? body.standardKitId : undefined,
        items: Array.isArray(body.items) ? body.items : undefined,
        parentName: String(body.parentName ?? ''),
        parentPhone: typeof body.parentPhone === 'string' ? body.parentPhone : undefined,
        parentRelation: body.parentRelation,
        deliveryMethod: body.deliveryMethod,
        deliveryAddress: typeof body.deliveryAddress === 'string' ? body.deliveryAddress : undefined,
        pickupPoint: typeof body.pickupPoint === 'string' ? body.pickupPoint : undefined,
        district: typeof body.district === 'string' ? body.district : undefined,
        sector: typeof body.sector === 'string' ? body.sector : undefined,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        paymentMethod: body.paymentMethod as PaymentMethod | undefined,
        paymentReference: typeof body.paymentReference === 'string' ? body.paymentReference : undefined,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAcademicSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : '';
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await fetchIamAcademicSettings(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.getSettings();
      res.json({
        success: true,
        data: {
          homeDeliveryFee: data.homeDeliveryFee,
          schoolPickupFee: data.schoolPickupFee,
          customKitsEnabled: data.customKitsEnabled,
          standardKitsEnabled: data.standardKitsEnabled,
          supportPhone: data.supportPhone,
          supportEmail: data.supportEmail,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** Parent consent: create/link the parent to the student in the school database. */
  async claimParent(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body ?? {};
      const role = body.role as 'FATHER' | 'MOTHER' | 'GUARDIAN' | undefined;
      if (role !== 'FATHER' && role !== 'MOTHER' && role !== 'GUARDIAN') {
        res.status(400).json({ success: false, message: 'role must be FATHER, MOTHER or GUARDIAN' });
        return;
      }
      const data = await studentManagementClient.claimParent({
        studentCode: String(body.studentCode ?? ''),
        firstName: String(body.firstName ?? ''),
        lastName: String(body.lastName ?? ''),
        phone: typeof body.phone === 'string' ? body.phone : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        role,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
