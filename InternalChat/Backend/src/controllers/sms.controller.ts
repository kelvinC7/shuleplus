import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getUsageSummary } from '../services/sms/quota.service';
import {
  getCampaignRecipients,
  listCampaigns,
  listDeliveryReport,
  listParentSmsHistory,
  previewCampaign,
  sendCampaign,
} from '../services/sms/campaign.service';
import { loadStudentDirectory } from '../services/sms/recipient-resolver.service';
import { SmsCampaignMode, SmsParentTarget } from '../generated/prisma';
import { prisma } from '../config/database';

const sendSchema = z.object({
  mode: z.enum(['SELECTED_STUDENTS', 'CUSTOM_NUMBERS', 'BULK_CLASS', 'BULK_SCHOOL']),
  message: z.string().min(1).max(800),
  template: z.string().max(1200).optional(),
  parentTarget: z.enum(['FATHER', 'MOTHER', 'BOTH']).optional(),
  className: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  customNumbers: z.array(z.string()).optional(),
});

function orgId(req: AuthenticatedRequest) {
  return req.organizationRef ?? req.user!.organizationId;
}

async function schoolName(organizationId: string) {
  const t = await prisma.tenant.findFirst({ where: { organizationId } });
  return t?.organizationName ?? 'School';
}

export const smsController = {
  async usage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await getUsageSummary(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async students(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q ?? '').trim().toLowerCase();
      const className = String(req.query.className ?? '').trim();
      let rows = await loadStudentDirectory(orgId(req));
      if (className) rows = rows.filter((r) => (r.className ?? '').trim() === className);
      if (q) {
        rows = rows.filter(
          (r) =>
            r.studentName.toLowerCase().includes(q) ||
            r.studentCode.toLowerCase().includes(q) ||
            r.studentId.toLowerCase().includes(q)
        );
      }
      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  },

  async classes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rows = await loadStudentDirectory(orgId(req));
      const set = new Set<string>();
      for (const r of rows) if (r.className?.trim()) set.add(r.className.trim());
      res.json({ success: true, data: [...set].sort() });
    } catch (e) {
      next(e);
    }
  },

  async preview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = sendSchema.parse(req.body);
      const data = await previewCampaign({
        organizationId: orgId(req),
        schoolName: await schoolName(orgId(req)),
        senderUserId: req.user!.sub,
        senderEmail: req.user!.email,
        mode: body.mode as SmsCampaignMode,
        parentTarget: body.parentTarget as SmsParentTarget | undefined,
        className: body.className,
        studentIds: body.studentIds,
        customNumbers: body.customNumbers,
        message: body.message,
        template: body.template,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async send(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = sendSchema.parse(req.body);
      const data = await sendCampaign({
        organizationId: orgId(req),
        schoolName: await schoolName(orgId(req)),
        senderUserId: req.user!.sub,
        senderEmail: req.user!.email,
        mode: body.mode as SmsCampaignMode,
        parentTarget: body.parentTarget as SmsParentTarget | undefined,
        className: body.className,
        studentIds: body.studentIds,
        customNumbers: body.customNumbers,
        message: body.message,
        template: body.template,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async campaigns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await listCampaigns(orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async campaignRecipients(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await getCampaignRecipients(String(req.params.id), orgId(req));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async parentHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const phone = String(req.query.phone ?? '').trim();
      if (!phone) {
        res.status(400).json({ success: false, message: 'phone query is required' });
        return;
      }
      const data = await listParentSmsHistory(orgId(req), phone);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async deliveryReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined;
      const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined;
      const data = await listDeliveryReport({
        organizationId: orgId(req),
        campaignId: String(req.query.campaignId ?? '').trim() || undefined,
        status: String(req.query.status ?? 'ALL'),
        student: String(req.query.student ?? ''),
        term: String(req.query.term ?? 'ALL'),
        dateFrom: dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : undefined,
        dateTo: dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
