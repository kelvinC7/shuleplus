import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  brandingService,
  dashboardService,
  disbursementService,
  runService,
  seedService,
  staffService,
  templateService,
  deductionService,
  terminationService,
  tenantService,
  settingsService,
  advanceService,
} from '../services/payroll.service';
import { staffImportService } from '../services/staff-import.service';
import { staffSyncService } from '../services/staff-sync.service';
import { hrClient } from '../clients/hr.client';
import type { HrEmployeeSyncPayload } from '../types/employee-sync';

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef!;
}

function paramId(req: Request, key: string) {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

export class TenantController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        organizationId: z.string(),
        organizationName: z.string(),
        organizationCode: z.string().optional(),
      }).parse(req.body);
      const tenant = await tenantService.create(body);
      res.status(201).json({ success: true, data: tenant });
    } catch (e) {
      next(e);
    }
  }
}

export class PayrollController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await dashboardService.summary(orgId(req)) });
    } catch (e) { next(e); }
  }

  async seed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await tenantService.create({
        organizationId: orgId(req),
        organizationName: 'School',
      });
      res.json({ success: true, data: await seedService.seed(orgId(req), tenant.organizationName) });
    } catch (e) { next(e); }
  }

  async getTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await templateService.getActive(orgId(req)) });
    } catch (e) { next(e); }
  }

  async saveTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await templateService.save(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async activateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await templateService.activate(orgId(req)) });
    } catch (e) { next(e); }
  }

  async deactivateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await templateService.deactivate(orgId(req)) });
    } catch (e) { next(e); }
  }

  async previewTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 500;
      res.json({ success: true, data: await templateService.preview(orgId(req), undefined, limit) });
    } catch (e) { next(e); }
  }

  async templateHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await templateService.history(orgId(req)) });
    } catch (e) { next(e); }
  }

  async listDeductions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.query.staffId as string | undefined;
      res.json({ success: true, data: await deductionService.list(orgId(req), staffId) });
    } catch (e) { next(e); }
  }

  async createDeduction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await deductionService.create(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async updateDeduction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await deductionService.update(orgId(req), paramId(req, 'id'), req.body) });
    } catch (e) { next(e); }
  }

  async deleteDeduction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await deductionService.delete(orgId(req), paramId(req, 'id')) });
    } catch (e) { next(e); }
  }

  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      res.json({ success: true, data: await staffService.list(orgId(req), search) });
    } catch (e) { next(e); }
  }

  async staffDirectory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page as string | undefined,
        limit: req.query.limit as string | undefined,
      };
      const result = await staffService.directory(orgId(req), filters);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }

  async getStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await staffService.getById(orgId(req), paramId(req, 'id')) });
    } catch (e) { next(e); }
  }

  async createStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await staffService.create(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async updateStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await staffService.update(orgId(req), paramId(req, 'id'), req.body) });
    } catch (e) { next(e); }
  }

  async deleteStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await staffService.softDelete(orgId(req), paramId(req, 'id')) });
    } catch (e) { next(e); }
  }

  async bulkDeleteStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids: string[] };
      res.json({ success: true, data: await staffService.bulkDelete(orgId(req), ids) });
    } catch (e) { next(e); }
  }

  async validateStaffImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rows } = req.body as { rows: unknown[] };
      const existing = await staffService.allForMatching(orgId(req));
      const result = staffImportService.validateRows(rows as never[], existing);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }

  async importStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rows, ...options } = req.body as { rows: unknown[]; dryRun?: boolean; updateExisting?: boolean };
      const result = await staffImportService.importRows(orgId(req), rows as never[], options);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async syncStaffFromHr(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        organizationId: z.string(),
        employee: z.custom<HrEmployeeSyncPayload>(),
      }).parse(req.body);
      const data = await staffSyncService.upsertFromHr(body.organizationId, body.employee);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async syncAllFromHr(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await staffSyncService.syncAllFromHr(orgId(req)) });
    } catch (e) { next(e); }
  }

  async listHrDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = hrClient.isEnabled() ? (await hrClient.listDepartments(orgId(req))) ?? [] : [];
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getStaffProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await staffService.getProfile(orgId(req), paramId(req, 'id')) });
    } catch (e) { next(e); }
  }

  async saveStaffProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await staffService.saveProfile(orgId(req), paramId(req, 'id'), req.body) });
    } catch (e) { next(e); }
  }

  async listRuns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await runService.list(orgId(req), {
          month: req.query.month ? Number(req.query.month) : undefined,
          year: req.query.year ? Number(req.query.year) : undefined,
          academicYear: req.query.academicYear as string | undefined,
          status: req.query.status as string | undefined,
        }),
      });
    } catch (e) { next(e); }
  }

  async getRun(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await runService.get(orgId(req), paramId(req, 'id')) });
    } catch (e) { next(e); }
  }

  async previewRun(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { month, year, staffIds, overrides } = req.body as {
        month: number; year: number; staffIds?: string[]; overrides?: Record<string, unknown>;
      };
      res.json({ success: true, data: await runService.preview(orgId(req), { month, year, staffIds, overrides: overrides as never }) });
    } catch (e) { next(e); }
  }

  async triggerRun(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as {
        month: number; year: number; academicYear?: string; term?: string;
        staffIds?: string[]; overrides?: Record<string, unknown>;
      };
      res.status(201).json({
        success: true,
        data: await runService.trigger(orgId(req), req.user!.sub, {
          ...body,
          overrides: body.overrides as never,
        }),
      });
    } catch (e) { next(e); }
  }

  async markPaid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await runService.markPaid(orgId(req), paramId(req, 'id'), req.user!.sub, req.body) });
    } catch (e) { next(e); }
  }

  async deleteRun(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await runService.deleteRun(orgId(req), paramId(req, 'id'), req.user!.sub) });
    } catch (e) { next(e); }
  }

  async listTerminations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await terminationService.list(orgId(req)) });
    } catch (e) { next(e); }
  }

  async createTermination(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await terminationService.create(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async updateTerminationStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body as { status: 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' };
      res.json({ success: true, data: await terminationService.updateStatus(orgId(req), paramId(req, 'id'), status) });
    } catch (e) { next(e); }
  }

  async disbursementRules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await disbursementService.rules(orgId(req)) });
    } catch (e) { next(e); }
  }

  async createDisbursementRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await disbursementService.createRule(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async paymentRows(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const runId = (req.query.runId as string) || paramId(req, 'id');
      const rows = await disbursementService.paymentRows(orgId(req), runId);
      res.json({ success: true, data: rows, banks: disbursementService.groupByBank(rows as never[]) });
    } catch (e) { next(e); }
  }

  async applyScheduledDeductions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const runId = String(req.body.runId ?? paramId(req, 'id'));
      res.json({
        success: true,
        data: await disbursementService.applyScheduledDeductions(orgId(req), runId, req.user?.sub),
      });
    } catch (e) { next(e); }
  }

  async auditTrail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const runId = req.query.runId as string | undefined;
      res.json({ success: true, data: await disbursementService.auditTrail(orgId(req), runId) });
    } catch (e) { next(e); }
  }

  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await settingsService.get(orgId(req)) });
    } catch (e) { next(e); }
  }

  async saveSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await settingsService.save(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async advanceCheck(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await advanceService.getCheck(orgId(req), paramId(req, 'staffId')) });
    } catch (e) { next(e); }
  }

  async listForKaziSync(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await staffService.listForKaziSync(orgId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getBranding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await brandingService.get(orgId(req)) });
    } catch (e) { next(e); }
  }

  async saveBranding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await brandingService.save(orgId(req), req.body) });
    } catch (e) { next(e); }
  }

  async myPayroll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const runs = await runService.list(orgId(req), {});
      const paid = runs.filter((r) => r.status === 'PAID').slice(0, 12);
      res.json({ success: true, data: paid });
    } catch (e) { next(e); }
  }
}

export const tenantController = new TenantController();
export const payrollController = new PayrollController();
