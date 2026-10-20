import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { feesService } from '../services/fees.service';
import { structureService } from '../services/structure.service';
import { collectionsService } from '../services/collections.service';
import { scholarshipService } from '../services/scholarship.service';
import { remindersService } from '../services/reminders.service';
import { feeCollectionService } from '../services/fee-collection.service';
import { examinationEligibilityService } from '../services/examination-eligibility.service';
import { reportCardAccessService } from '../services/report-card-access.service';
import { examinationNotificationService } from '../services/examination-notification.service';
import { publicPaymentsService } from '../services/public-payments.service';
import { representativeReadService } from '../services/representative-read.service';

function org(req: AuthenticatedRequest) {
  return req.organizationRef ?? req.user!.organizationId;
}

export class FeesController {
  async parentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId
      );
      const codes = [
        ...String(req.query.studentCodes ?? '').split(','),
        String(req.query.studentCode ?? ''),
        String(req.query.studentId ?? ''),
      ]
        .map((s) => s.trim())
        .filter(Boolean);
      if (!codes.length) {
        res.status(400).json({ success: false, message: 'studentCode or studentId is required' });
        return;
      }
      const data = await feesService.getParentSummary(organizationId, codes);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async parentTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId
      );
      const data = await feesService.getParentTransactions(organizationId, {
        studentCodes: [
          String(req.query.studentCodes ?? ''),
          String(req.query.studentCode ?? ''),
          String(req.query.studentId ?? ''),
        ]
          .filter(Boolean)
          .join(','),
        academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
        term: req.query.term ? String(req.query.term) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.dashboard(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async organizationBranding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.organizationBranding(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async analytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.analytics(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listStructures(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await structureService.list(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async structuresSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await structureService.getSummary(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getStructure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const data = await structureService.getById(org(req), id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createStructure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await structureService.create(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateStructure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const data = await structureService.update(org(req), id, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteStructure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const data = await structureService.remove(org(req), id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async duplicateStructure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const data = await structureService.duplicate(org(req), id, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async academicContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await structureService.getAcademicContext(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async babyeyiFeeItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await structureService.getBabyeyiItems(org(req), {
        academicYear: String(req.query.academicYear ?? ''),
        term: String(req.query.term ?? ''),
        className: req.query.className ? String(req.query.className) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.getPublicReceipt(String(req.params.receiptNumber));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicInitiatePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body?.organizationId ?? req.query.organizationId ?? '');
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const rawKey = req.headers['idempotency-key'];
      const idempotencyKey =
        typeof rawKey === 'string' ? rawKey : Array.isArray(rawKey) ? rawKey[0] : undefined;
      const data = await publicPaymentsService.initiate(
        organizationId,
        (req.body ?? {}) as Record<string, unknown>,
        { idempotencyKey }
      );
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicPaymentsService.status(String(req.params.reference ?? ''));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicStudentFees(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const academicYear = String(req.query.academicYear ?? '');
      const term = String(req.query.term ?? '');
      const className = req.query.className ? String(req.query.className) : undefined;
      const studentCode = req.query.studentCode ? String(req.query.studentCode) : undefined;
      const studentId = req.query.studentId ? String(req.query.studentId) : undefined;
      const studentName = req.query.studentName ? String(req.query.studentName) : undefined;
      const autoBill =
        req.query.autoBill !== '0' &&
        req.query.autoBill !== 'false' &&
        Boolean(studentCode?.trim());
      if (!organizationId || !academicYear || !term) {
        res.status(400).json({ success: false, message: 'organizationId, academicYear and term are required' });
        return;
      }
      const data = await structureService.resolveStudentFees({
        organizationId,
        academicYear,
        term,
        className,
        studentCode,
        studentId,
        studentName,
        autoBill,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async exportStructures(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rows = await structureService.list(org(req), req.query as Record<string, string>);
      const csv = structureService.exportStructuresCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="fee-structures-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csv);
    } catch (e) {
      next(e);
    }
  }

  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listCategories(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listBills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listBills(org(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async createBill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.createBill(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listPayments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listPayments(org(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async createPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.createPayment(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listInstallments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.installmentsOverview(
        org(req),
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createInstallmentPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.createInstallmentPlan(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getInstallmentPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.getInstallmentPlan(org(req), String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listScholarships(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.scholarshipsOverview(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listSponsors(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listSponsors(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listReceipts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.receiptsOverview(
        org(req),
        req.query as Record<string, string>
      );
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async getReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.getReceipt(org(req), String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async verifyReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.verifyReceipt(org(req), String(req.params.receiptNumber));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async voidReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.voidReceipt(org(req), String(req.params.id), {
        reason: String(req.body.reason ?? 'Voided'),
        voidedBy: req.user?.email,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async receiptPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const html = await collectionsService.getReceiptPdfHtml(org(req), String(req.params.id));
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="receipt-${req.params.id}.html"`);
      res.send(html);
    } catch (e) {
      next(e);
    }
  }

  async sendReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.sendReceiptToParent(org(req), String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createScholarship(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await scholarshipService.create(org(req), req.body, req.user?.email);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async approveScholarship(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await scholarshipService.approve(org(req), String(req.params.id), req.body, req.user?.email);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async rejectScholarship(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await scholarshipService.reject(org(req), String(req.params.id), req.body, req.user?.email);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async previewScholarshipImpact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await scholarshipService.previewImpact(org(req), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reminderClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.classes(org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async reminderRecipients(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.recipients(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async remindersDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.dashboard(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listReminderAutomations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.listAutomations(org(req), req.query.status as string | undefined);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createReminderAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.createAutomation(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateReminderAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.updateAutomation(org(req), String(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async setReminderAutomationStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.setAutomationStatus(org(req), String(req.params.id), String(req.body.status));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteReminderAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.deleteAutomation(org(req), String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async runReminderAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.runAutomation(org(req), String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listReminderTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.listTemplates(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createReminderTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.createTemplate(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reminderHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.history(org(req), req.query as Record<string, string>);
      res.json({ success: true, ...data });
    } catch (e) {
      next(e);
    }
  }

  async reminderAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.analytics(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reminderPreview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = remindersService.preview(req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reminderTestSend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.testSend(org(req), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reminderSendNow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.sendNow(org(req), req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reminderTriggerTypes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = remindersService.triggerTypes();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async processReminders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await remindersService.processScheduled(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async feeCollectionOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feeCollectionService.overview(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async feeCollectionExport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rows } = await feeCollectionService.overview(org(req), req.query as Record<string, string>);
      const csv = feeCollectionService.exportCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="fee-collection-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (e) {
      next(e);
    }
  }

  async feeCollectionLookup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = String(req.query.search ?? '');
      const data = await feeCollectionService.lookupStudent(org(req), search);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async feeCollectionStudentAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feeCollectionService.studentAccount(org(req), {
        studentCode: String(req.query.studentCode ?? ''),
        academicYear: String(req.query.academicYear ?? ''),
        term: String(req.query.term ?? ''),
        className: req.query.className ? String(req.query.className) : undefined,
        studentName: req.query.studentName ? String(req.query.studentName) : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async feeCollectionRecordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feeCollectionService.recordPayment(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listOutstanding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.outstandingOverview(
        org(req),
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async collectionsCommandCenter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.commandCenter(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async collectionsInsights(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await collectionsService.collectionsInsights(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async studentFinancialProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const studentCode = typeof req.query.studentCode === 'string' ? req.query.studentCode : undefined;
      const data = await collectionsService.studentFinancialProfile(
        org(req),
        String(req.params.studentId),
        { studentCode }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listNotifications(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listApprovals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listApprovals(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.listAuditLogs(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await feesService.reportsSummary(org(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async examEligibilityPreview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationEligibilityService.preview(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async examEligibilityClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationEligibilityService.classStatuses(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async examEligibilityException(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationEligibilityService.setException(org(req), {
        sub: req.user?.sub,
        email: req.user?.email,
        roles: req.user?.roles,
      }, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async examEligibilityPublish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationEligibilityService.publish(org(req), {
        sub: req.user?.sub,
        email: req.user?.email,
        roles: req.user?.roles,
      }, req.body);
      void examinationNotificationService
        .notifyParents(org(req), {
          academicYear: String(req.body.academicYear ?? ''),
          term: String(req.body.term ?? ''),
          className: String(req.body.className ?? ''),
          examName: req.body.examName ? String(req.body.examName) : undefined,
        })
        .catch((err) => console.warn('[exam-eligibility] parent notify after publish failed', err));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async examEligibilityNotify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationNotificationService.notifyParents(org(req), {
        academicYear: String(req.body.academicYear ?? ''),
        term: String(req.body.term ?? ''),
        className: String(req.body.className ?? ''),
        examName: req.body.examName ? String(req.body.examName) : undefined,
        onlyBlocked: req.body.onlyBlocked !== false,
        studentIds: Array.isArray(req.body.studentIds) ? req.body.studentIds.map(String) : undefined,
        channels: req.body.channels,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async representativeOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.overview(organizationId, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async representativeTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.transactions(organizationId, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async representativeBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.balances(organizationId, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async representativeClassAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.classAnalytics(
        organizationId,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async representativeFeeStructures(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.feeStructures(
        organizationId,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async representativeStudentBills(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.studentBills(
        organizationId,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async representativeFilterOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? ''
      );
      const data = await representativeReadService.filterOptions(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async examEligibilityLookup(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? '',
      );
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await examinationEligibilityService.lookup(organizationId, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async reportCardAccessLookup(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(
        (req as AuthenticatedRequest).organizationRef ?? req.query.organizationId ?? '',
      );
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await reportCardAccessService.lookup(organizationId, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reportCardAccessPreview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportCardAccessService.preview(org(req), req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reportCardAccessPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.method === 'GET') {
        const data = await reportCardAccessService.getPolicy(org(req));
        res.json({ success: true, data });
        return;
      }
      const data = await reportCardAccessService.updatePolicy(org(req), req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reportCardAccessException(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportCardAccessService.setException(org(req), req.user ?? {}, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const feesController = new FeesController();
