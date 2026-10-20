import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, param } from '../types';
import { AppError } from '../middleware/error.middleware';
import { createIamUser } from '../clients/iam.client';
import { fetchAcademicClasses, fetchAcademicStudents } from '../clients/academic.client';

const connectSchema = z.object({
  schoolCode: z.string().min(1),
  canteenId: z.string().optional(),
});

const syncSchema = z.object({
  schoolCode: z.string().min(1).optional(),
  classId: z.string().optional(),
  className: z.string().optional(),
});

const provisionStaffSchema = z.object({
  schoolCode: z.string().optional(),
  staffList: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        role: z.string().optional(),
      })
    )
    .min(1),
});

const configureOperatorSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  role: z.string().optional(),
  schoolCode: z.string().optional(),
});

function makeCardCode(studentCode: string): string {
  const base = studentCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `CARD-${base}`;
}

const registerCanteenSchema = z.object({
  schoolName: z.string().min(1),
  schoolCode: z.string().optional(),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal('')),
  estimatedStudents: z.union([z.string(), z.number()]).optional(),
  location: z
    .object({
      province: z.string().optional(),
      district: z.string().optional(),
    })
    .optional(),
});

export const canteenController = {
  /** Public canteen registration (landing page) → onboarding request. */
  async registerCanteen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = registerCanteenSchema.parse(req.body);

      const existing = await prisma.onboardingRequest.findFirst({
        where: { schoolCode: body.schoolCode, entityType: 'CANTEEN' },
      });
      if (existing) throw new AppError(409, 'A canteen registration for this school already exists');

      const request = await prisma.onboardingRequest.create({
        data: {
          entityType: 'CANTEEN',
          schoolCode: body.schoolCode ?? null,
          status: 'PENDING',
          metadata: {
            schoolName: body.schoolName,
            contactName: body.contactName,
            contactPhone: body.contactPhone,
            contactEmail: body.contactEmail || null,
            estimatedStudents: body.estimatedStudents ?? null,
            location: body.location ?? {},
          },
        },
      });

      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  },

  /** Link a school code to a tenant (legacy connect replacement). */
  async connect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { schoolCode, canteenId } = connectSchema.parse(req.body);

      const tenant = await prisma.tenant.findFirst({
        where: { OR: [{ organizationCode: schoolCode }, { schoolCode }] },
      });

      if (!tenant) {
        throw new AppError(404, 'School code not found');
      }

      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: { schoolCode, connectedAt: new Date(), status: 'ACTIVE' },
      });

      if (canteenId) {
        await prisma.onboardingRequest.updateMany({
          where: { id: canteenId },
          data: { schoolCode, isLive: true, status: 'APPROVED', approvedAt: new Date() },
        });
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  /** Pull students from the Academic module and upsert card wallets. */
  async sync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = syncSchema.parse(req.body);
      const org = req.organizationRef!;
      const tenant = await prisma.tenant.findFirst({
        where: { OR: [{ organizationId: org }, { organizationCode: org }] },
      });
      if (!tenant) throw new AppError(403, 'Tenant not provisioned');

      let classId = body.classId;
      if (!classId && body.className) {
        const classes = await fetchAcademicClasses(tenant.organizationId);
        const target = body.className.trim().toLowerCase();
        const match = classes.find(
          (c) => c.label.toLowerCase() === target || c.name.toLowerCase() === target
        );
        classId = match?.id;
      }

      const { students } = await fetchAcademicStudents(tenant.organizationId, {
        classId,
        className: body.className,
        status: 'ACTIVE',
      });

      let created = 0;
      let updated = 0;

      for (const student of students) {
        const cardCode = makeCardCode(student.studentCode);
        const existing = await prisma.studentWallet.findUnique({
          where: { cardCode },
        });

        const data = {
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          className: student.className ?? null,
          cardCode,
          photoUrl: student.photoUrl ?? null,
          lastSyncAt: new Date(),
        };

        if (existing) {
          await prisma.studentWallet.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await prisma.studentWallet.create({
            data: { organizationId: tenant.organizationId, ...data },
          });
          created += 1;
        }
      }

      await prisma.activityLog.create({
        data: {
          organizationId: tenant.organizationId,
          userId: req.user?.sub ?? null,
          action: 'STUDENTS_SYNCED',
          metadata: { created, updated, total: students.length },
        },
      });

      res.json({
        success: true,
        data: { created, updated, total: students.length },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Create IAM users for school canteen staff. */
  async provisionStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { staffList } = provisionStaffSchema.parse(req.body);
      const org = req.organizationRef!;
      const callerToken = req.headers.authorization!.replace('Bearer ', '');

      const results: Array<{ userId: string; name: string; role: string; phone: string; tempPassword?: string }> = [];

      for (const staff of staffList) {
        const [first = 'Staff', ...rest] = staff.name.trim().split(/\s+/);
        const lastName = rest.join(' ') || first;
        const iamUser = await createIamUser(callerToken, {
          email: staff.email || `${staff.phone.replace(/[^0-9]/g, '')}@shuleplus-canteen.local`,
          firstName: first,
          lastName,
          phone: staff.phone,
          position: staff.role ?? 'Canteen Operator',
          moduleSlugs: ['canteen'],
        });

        await prisma.canteenProfile.upsert({
          where: { organizationId_userId: { organizationId: org, userId: iamUser.id } },
          create: {
            organizationId: org,
            userId: iamUser.id,
            email: staff.email || null,
            displayName: staff.name,
            phone: staff.phone,
            role: (staff.role ?? 'OPERATOR').toUpperCase(),
          },
          update: { role: (staff.role ?? 'OPERATOR').toUpperCase(), displayName: staff.name, phone: staff.phone },
        });

        results.push({
          userId: iamUser.id,
          name: staff.name,
          role: (staff.role ?? 'OPERATOR').toUpperCase(),
          phone: staff.phone,
          tempPassword: iamUser.tempPassword,
        });
      }

      res.json({ success: true, data: { accounts: results } });
    } catch (error) {
      next(error);
    }
  },

  async configureOperator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = configureOperatorSchema.parse(req.body);
      const org = req.organizationRef!;
      const callerToken = req.headers.authorization!.replace('Bearer ', '');

      const [first = 'Operator', ...rest] = body.fullName.trim().split(/\s+/);
      const lastName = rest.join(' ') || first;

      const iamUser = await createIamUser(callerToken, {
        email: body.email || `${body.phone.replace(/[^0-9]/g, '')}@shuleplus-canteen.local`,
        firstName: first,
        lastName,
        phone: body.phone,
        position: body.role ?? 'Canteen Operator',
        moduleSlugs: ['canteen'],
      });

      await prisma.canteenProfile.upsert({
        where: { organizationId_userId: { organizationId: org, userId: iamUser.id } },
        create: {
          organizationId: org,
          userId: iamUser.id,
          email: body.email || null,
          displayName: body.fullName,
          phone: body.phone,
          role: (body.role ?? 'OPERATOR').toUpperCase(),
          schoolCode: body.schoolCode ?? null,
        },
        update: { role: (body.role ?? 'OPERATOR').toUpperCase(), displayName: body.fullName, phone: body.phone },
      });

      res.json({
        success: true,
        data: { userId: iamUser.id, fullName: body.fullName, phone: body.phone, role: (body.role ?? 'OPERATOR').toUpperCase(), tempPassword: iamUser.tempPassword },
      });
    } catch (error) {
      next(error);
    }
  },

  /** List canteens (tenants). Platform admins see all, school users see their own. */
  async schools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const tenants = await prisma.tenant.findMany({
        where: user.roles.includes('super_admin') || user.roles.includes('root_admin')
          ? undefined
          : { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: tenants });
    } catch (error) {
      next(error);
    }
  },

  async schoolStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { OR: [{ id: param(req, 'id') }, { organizationId: param(req, 'id') }, { schoolCode: param(req, 'id') }] },
      });
      if (!tenant) throw new AppError(404, 'Canteen not found');

      const [walletCount, saleCount, menuCount] = await Promise.all([
        prisma.studentWallet.count({ where: { organizationId: tenant.organizationId } }),
        prisma.sale.count({ where: { organizationId: tenant.organizationId } }),
        prisma.menuItem.count({ where: { organizationId: tenant.organizationId } }),
      ]);

      res.json({ success: true, data: { walletCount, saleCount, menuCount } });
    } catch (error) {
      next(error);
    }
  },
};
