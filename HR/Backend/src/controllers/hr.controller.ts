import { Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function paramId(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}
import {
  categoryService,
  dashboardService,
  departmentService,
  documentService,
  employeeService,
  leaveService,
  qualificationService,
} from '../services/hr.service';
import { importService } from '../services/import.service';
import { seedService } from '../services/seed.service';
import { employeeSyncService } from '../services/employee-sync.service';
import type { PayrollStaffSyncPayload } from '../types/employee-sync';
import { LEAVE_TYPES, QUALIFICATION_LEVELS } from '../constants/hr.constants';
import { prisma } from '../config/database';
import type { ImportRow } from '../services/import.service';

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef!;
}

export class HrController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.summary(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async directory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.directory(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async getEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.getById(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.create(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.update(orgId(req), paramId(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await employeeService.softDelete(orgId(req), paramId(req, 'id'), req.user!.sub);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  async bulkDeleteEmployees(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids: string[] };
      const data = await employeeService.bulkDelete(orgId(req), ids);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async deleteAllDeletable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.deleteAllDeletable(orgId(req));
      res.json({ ...data, success: true });
    } catch (e) {
      next(e);
    }
  }

  async seedSamples(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await seedService.seedTenantData(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async validateImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rows } = req.body as { rows: ImportRow[] };
      const employees = await prisma.employee.findMany({
        where: { organizationId: orgId(req), deletedAt: null },
      });
      const { rows: validated, stats } = importService.validateRows(rows, employees);
      res.json({ success: true, rows: validated, stats });
    } catch (e) {
      next(e);
    }
  }

  async importEmployees(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as {
        rows: ImportRow[];
        dryRun?: boolean;
        updateExisting?: boolean;
        deleteAndReimport?: boolean;
        skipRowNumbers?: number[];
      };
      const result = await importService.importRows(orgId(req), body.rows, {
        dryRun: body.dryRun,
        updateExisting: body.updateExisting,
        deleteAndReimport: body.deleteAndReimport,
        skipRowNumbers: body.skipRowNumbers,
      });
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }

  async contracts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.contracts(orgId(req));
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async organization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await employeeService.organization(orgId(req));
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async listDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.list(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async departmentStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.stats(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.getById(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.create(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.update(orgId(req), paramId(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async bulkDepartmentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { ids, status } = req.body as { ids: string[]; status: string };
      const data = await departmentService.bulkUpdateStatus(orgId(req), ids, status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async duplicateDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.duplicate(orgId(req), paramId(req, 'id'));
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await departmentService.delete(orgId(req), paramId(req, 'id'));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  async seedDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await departmentService.seedDefaults(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await categoryService.list(orgId(req));
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await categoryService.create(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await categoryService.update(orgId(req), paramId(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await categoryService.delete(orgId(req), paramId(req, 'id'));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  async seedCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await categoryService.seedDefaults(orgId(req));
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async listLeave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.list(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async createLeave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.create(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateLeaveStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body as { status: 'APPROVED' | 'REJECTED' };
      const data = await leaveService.updateStatus(orgId(req), paramId(req, 'id'), status, req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async leaveKpis(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.kpis(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async leaveCharts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.charts(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async leaveRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.listRequests(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getLeaveRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.get(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateLeaveRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.update(orgId(req), paramId(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async approveLeave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.updateStatus(orgId(req), paramId(req, 'id'), 'APPROVED', req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async rejectLeave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.updateStatus(orgId(req), paramId(req, 'id'), 'REJECTED', req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async cancelLeave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.cancel(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async leaveEmployeeLookup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = String(req.query.q ?? '');
      const data = await leaveService.employeeLookup(orgId(req), query || undefined);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async leaveBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employeeId = String(req.params.employeeId);
      const leaveType = String(req.query.leaveType ?? 'Annual Leave');
      const data = await leaveService.balance(orgId(req), employeeId, leaveType);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicHolidays(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const start = String(req.query.start ?? '');
      const end = String(req.query.end ?? '');
      const data = leaveService.publicHolidays(start, end);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listLeavePolicies(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.listPolicies(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createLeavePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.createPolicy(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateLeavePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.updatePolicy(orgId(req), paramId(req, 'id'), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteLeavePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await leaveService.deletePolicy(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async documents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await documentService.repository(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async createDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await documentService.create(orgId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'File is required' });
        return;
      }
      const employeeId = String(req.body.employeeId ?? '');
      const category = String(req.body.category ?? 'Other');
      if (!employeeId) {
        res.status(400).json({ success: false, message: 'employeeId is required' });
        return;
      }
      const data = await documentService.upload(orgId(req), {
        employeeId,
        category,
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async downloadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { doc, absolutePath } = await documentService.getForDownload(orgId(req), paramId(req, 'id'));
      res.download(absolutePath, doc.filename, (err) => {
        if (err) next(err);
      });
    } catch (e) {
      next(e);
    }
  }

  async qualifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await qualificationService.list(orgId(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async verifyQualification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await qualificationService.verify(orgId(req), paramId(req, 'id'));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async syncEmployeeFromPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        organizationId: z.string(),
        staff: z.custom<PayrollStaffSyncPayload>(),
      }).parse(req.body);
      const data = await employeeSyncService.upsertFromPayroll(body.organizationId, body.staff);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listForPayrollSync(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await employeeService.listForPayrollSync(orgId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listTeachersForSync(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await employeeService.listTeachersForSync(orgId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listStaffForSmartAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await employeeService.listStaffForSmartAccess(orgId, { search });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async upsertStaffFromIam(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body?.organizationId ?? '');
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await employeeService.upsertFromIam(organizationId, req.body ?? {});
      res.status(data.created ? 201 : 200).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateStaffIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      const id = String(req.params.id ?? '');
      if (!orgId || !id) {
        res.status(400).json({ success: false, message: 'organizationId and staff id are required' });
        return;
      }
      const data = await employeeService.updateStaffIdentity(orgId, id, req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async lookupRfidOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const rfidUid = String(req.query.rfidUid ?? '').trim();
      if (!rfidUid) {
        res.status(400).json({ success: false, message: 'rfidUid is required' });
        return;
      }
      const data = await employeeService.lookupRfidOwner(rfidUid);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listDepartmentsForSync(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await departmentService.listForSync(orgId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createDepartmentForSync(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await departmentService.create(orgId, req.body ?? {});
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteDepartmentForSync(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      await departmentService.delete(orgId, paramId(req, 'id'));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  async constants(_req: AuthenticatedRequest, res: Response) {
    res.json({ success: true, data: { leaveTypes: LEAVE_TYPES, qualificationLevels: QUALIFICATION_LEVELS } });
  }
}

export const hrController = new HrController();
