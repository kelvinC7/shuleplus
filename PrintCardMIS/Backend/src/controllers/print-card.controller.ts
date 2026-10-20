import { Response, NextFunction } from 'express';
import { CardStatus, PersonKind } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest, hasPlatformPrintScope } from '../middleware/auth.middleware';
import { printCardService } from '../services/print-card.service';
import {
  getCardEvents,
  getCardStats,
  listCardRecords,
  markCardAction,
  resyncStaffCardsFromRoster,
  syncStudentCards,
} from '../services/card-record.service';
import {
  cancelPrintBatch,
  confirmPrintBatch,
  createPrintBatch,
  getBatchDetail,
  listPrintHistory,
  listPrintQueue,
  removeBatchItem,
  reorderBatchItems,
  startPrinting,
} from '../services/print-batch.service';
import {
  completeReprintRequest,
  createReprintRequest,
  listReprintRequests,
  reviewReprintRequest,
} from '../services/reprint-request.service';
import { AppError } from '../middleware/error.middleware';
import { ReprintReason, ReprintRequestStatus } from '@prisma/client';

function parseCardStatus(raw?: string): CardStatus | undefined {
  if (!raw) return undefined;
  if (Object.values(CardStatus).includes(raw as CardStatus)) return raw as CardStatus;
  return undefined;
}

function parseHasPhoto(raw?: string): boolean | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'with') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'without') return false;
  return undefined;
}

function orgFromQuery(req: AuthenticatedRequest): string {
  const fromQuery = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
  return fromQuery ?? req.organizationRef ?? req.user!.organizationId;
}

export const printCardController = {
  async session(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await printCardService.sessionSummary(req.user!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async schools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await printCardService.listSchools(req.user!, req.bearerToken!, {
        provinceId: typeof req.query.provinceId === 'string' ? req.query.provinceId : undefined,
        districtId: typeof req.query.districtId === 'string' ? req.query.districtId : undefined,
        sectorId: typeof req.query.sectorId === 'string' ? req.query.sectorId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async classes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const data = await printCardService.listClasses(req.user!, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async students(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const className = typeof req.query.className === 'string' ? req.query.className : undefined;
      const classExact =
        req.query.classExact === 'true' ||
        req.query.classExact === '1' ||
        Boolean(classId);
      const upstream = await printCardService.listStudents(req.user!, req.bearerToken!, organizationId, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        classId,
        className,
      });
      await syncStudentCards(organizationId, upstream);
      const cards = await listCardRecords(organizationId, PersonKind.STUDENT, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: parseCardStatus(typeof req.query.status === 'string' ? req.query.status : undefined),
        className,
        classNameExact: classExact && Boolean(className),
        educationLevel:
          typeof req.query.educationLevel === 'string' ? req.query.educationLevel : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        gender: typeof req.query.gender === 'string' ? req.query.gender : undefined,
        hasPhoto: parseHasPhoto(typeof req.query.hasPhoto === 'string' ? req.query.hasPhoto : undefined),
      });
      res.json({ success: true, data: cards });
    } catch (e) {
      next(e);
    }
  },

  async staff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId ?? '');
      const upstream = await printCardService.listStaff(req.user!, req.bearerToken!, organizationId, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      const { pruned, deduped } = await resyncStaffCardsFromRoster(organizationId, upstream);
      if (pruned + deduped > 0) {
        console.info(
          `[print-card] staff resync ${organizationId}: pruned=${pruned} deduped=${deduped}`
        );
      }
      const cards = await listCardRecords(organizationId, PersonKind.STAFF, {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: parseCardStatus(typeof req.query.status === 'string' ? req.query.status : undefined),
        role: typeof req.query.role === 'string' ? req.query.role : undefined,
        department: typeof req.query.department === 'string' ? req.query.department : undefined,
        hasPhoto: parseHasPhoto(typeof req.query.hasPhoto === 'string' ? req.query.hasPhoto : undefined),
      });
      res.json({ success: true, data: cards });
    } catch (e) {
      next(e);
    }
  },

  async stats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = orgFromQuery(req);
      const kind =
        req.query.kind === 'STAFF' ? PersonKind.STAFF : PersonKind.STUDENT;
      const data = await getCardStats(organizationId, kind);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          organizationId: z.string(),
          personKind: z.enum(['STUDENT', 'STAFF']),
          cardRecordIds: z.array(z.string()).min(1),
          asReprint: z.boolean().optional(),
        })
        .parse(req.body);
      const user = req.user!;
      if (!hasPlatformPrintScope(user) && body.organizationId !== user.organizationId) {
        throw new AppError(403, 'You can only create print batches for your organization');
      }
      const data = await createPrintBatch({
        organizationId: body.organizationId,
        personKind: body.personKind as PersonKind,
        cardRecordIds: body.cardRecordIds,
        createdBy: user.sub,
        createdByEmail: user.email,
        asReprint: body.asReprint,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await getBatchDetail(String(req.params.batchId), orgFromQuery(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async startBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await startPrinting(String(req.params.batchId), orgFromQuery(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async confirmBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          organizationId: z.string(),
          printerName: z.string().optional(),
          allSuccess: z.boolean().optional(),
          items: z
            .array(
              z.object({
                itemId: z.string(),
                success: z.boolean(),
                failureReason: z.string().optional(),
              })
            )
            .optional(),
        })
        .parse(req.body);
      const data = await confirmPrintBatch({
        batchId: String(req.params.batchId),
        organizationId: body.organizationId,
        user: req.user!,
        printerName: body.printerName,
        allSuccess: body.allSuccess,
        items: body.items ?? [],
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async cancelBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await cancelPrintBatch(String(req.params.batchId), orgFromQuery(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async queue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgQuery =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = orgQuery
        ? await listPrintQueue(orgQuery)
        : hasPlatformPrintScope(req.user)
          ? await listPrintQueue()
          : await listPrintQueue(orgFromQuery(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async history(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgQuery =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = orgQuery
        ? await listPrintHistory(orgQuery)
        : hasPlatformPrintScope(req.user)
          ? await listPrintHistory()
          : await listPrintHistory(orgFromQuery(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async cardEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await getCardEvents(String(req.params.cardRecordId), req.user!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async listReprintRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
      const reasonRaw = typeof req.query.reason === 'string' ? req.query.reason : undefined;
      const data = await listReprintRequests(req.user!, {
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        status:
          statusRaw && Object.values(ReprintRequestStatus).includes(statusRaw as ReprintRequestStatus)
            ? (statusRaw as ReprintRequestStatus)
            : undefined,
        personKind: req.query.personKind === 'STAFF' ? PersonKind.STAFF : req.query.personKind === 'STUDENT' ? PersonKind.STUDENT : undefined,
        reason:
          reasonRaw && Object.values(ReprintReason).includes(reasonRaw as ReprintReason)
            ? (reasonRaw as ReprintReason)
            : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async createReprintRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          organizationId: z.string(),
          cardRecordId: z.string(),
          reason: z.enum(['LOST', 'DAMAGED', 'STORED', 'INCORRECT_INFORMATION', 'OTHER']),
          description: z.string().optional(),
        })
        .parse(req.body);
      const data = await createReprintRequest(req.user!, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async reviewReprintRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          action: z.enum(['APPROVE', 'REJECT']),
          rejectionReason: z.string().optional(),
        })
        .parse(req.body);
      const data = await reviewReprintRequest(
        req.user!,
        String(req.params.requestId),
        body.action,
        body.rejectionReason
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async completeReprintRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await completeReprintRequest(req.user!, String(req.params.requestId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async cardAction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({ action: z.enum(['MARK_DAMAGED', 'MARK_LOST', 'CANCEL_REPRINT']) })
        .parse(req.body);
      const data = await markCardAction(
        String(req.params.cardRecordId),
        orgFromQuery(req),
        req.user!,
        body.action
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async reorderBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({ orderedItemIds: z.array(z.string()) }).parse(req.body);
      const data = await reorderBatchItems(
        String(req.params.batchId),
        orgFromQuery(req),
        body.orderedItemIds
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async removeBatchItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await removeBatchItem(
        String(req.params.batchId),
        String(req.params.itemId),
        orgFromQuery(req)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
