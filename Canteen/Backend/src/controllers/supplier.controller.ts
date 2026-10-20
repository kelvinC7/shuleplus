import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, param } from '../types';
import { AppError } from '../middleware/error.middleware';
import { createIamUser } from '../clients/iam.client';

const registerSchema = z.object({
  businessName: z.string().min(1),
  companyName: z.string().optional(),
  category: z.string().optional(),
  tinNumber: z.string().optional(),
  contactPerson: z.string().min(1),
  fullName: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  province: z.string().optional(),
  district: z.string().optional(),
  location: z
    .object({
      province: z.string().optional(),
      district: z.string().optional(),
    })
    .optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

const approveSchema = z.object({
  supplierId: z.string().min(1),
});

const provisionStaffSchema = z.object({
  supplierId: z.string().min(1),
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

function generateSupplierId() {
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `SUP-${seq}`;
}

export const supplierController = {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const supplierId = generateSupplierId();

      const province = body.province ?? body.location?.province ?? null;
      const district = body.district ?? body.location?.district ?? null;

      const supplier = await prisma.supplier.create({
        data: {
          id: supplierId,
          supplierCode: supplierId,
          companyName: body.companyName || body.businessName,
          businessName: body.businessName,
          category: body.category ?? null,
          tinNumber: body.tinNumber ?? null,
          contactPerson: body.contactPerson || body.fullName || '',
          phone: body.phone,
          email: body.email || null,
          province,
          district,
          logoUrl: body.logoUrl || null,
          status: 'PENDING',
          createdById: req.user?.sub ?? null,
        },
      });

      await prisma.onboardingRequest.create({
        data: {
          organizationId: req.user?.organizationId ?? '',
          entityType: 'supplier',
          status: 'PENDING',
          supplierId,
          metadata: { ...body, source: 'supplier_onboarding' },
        },
      });

      await prisma.activityLog.create({
        data: {
          organizationId: req.user?.organizationId ?? '',
          userId: req.user?.sub ?? null,
          action: 'SUPPLIER_REGISTERED',
          metadata: { supplierId },
        },
      });

      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  },

  /** Approve a supplier and create the IAM user for the contact person. */
  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { supplierId } = approveSchema.parse(req.body);
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

      let iamUser: { id: string; tempPassword?: string } | null = null;

      if (supplier.email) {
        const [first = 'Supplier', ...rest] = (supplier.contactPerson ?? 'Staff')
          .trim()
          .split(/\s+/);
        const lastName = rest.join(' ') || first;
        iamUser = await createIamUser(req.headers.authorization!.replace('Bearer ', ''), {
          email: supplier.email,
          firstName: first,
          lastName,
          phone: supplier.phone ?? undefined,
          position: 'Supplier Contact Person',
          moduleSlugs: ['canteen'],
        });
      }

      const updated = await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplierId },
          data: {
            status: 'ACTIVE',
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        prisma.onboardingRequest.updateMany({
          where: { supplierId },
          data: { status: 'APPROVED', approvedAt: new Date(), approvedById: req.user?.sub },
        }),
      ]);

      if (iamUser) {
        await prisma.supplierStaff.create({
          data: {
            supplierId,
            userId: iamUser.id,
            email: supplier.email ?? null,
            phone: supplier.phone ?? null,
            fullName: supplier.contactPerson ?? null,
            role: 'admin',
          },
        });
      }

      await prisma.activityLog.create({
        data: {
          organizationId: req.user?.organizationId ?? '',
          userId: req.user?.sub ?? null,
          action: 'SUPPLIER_APPROVED',
          metadata: { supplierId },
        },
      });

      res.json({
        success: true,
        data: {
          ...updated[0],
          account: iamUser
            ? { userId: iamUser.id, email: supplier.email, phone: supplier.phone, tempPassword: iamUser.tempPassword }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Create IAM users for supplier staff and link them to the supplier. */
  async provisionStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { supplierId, staffList } = provisionStaffSchema.parse(req.body);
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

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
          position: staff.role ?? 'Supplier Staff',
          moduleSlugs: ['canteen'],
        });

        await prisma.supplierStaff.create({
          data: {
            supplierId,
            userId: iamUser.id,
            email: staff.email || null,
            phone: staff.phone,
            fullName: staff.name,
            role: (staff.role ?? 'staff').toLowerCase(),
          },
        });

        results.push({
          userId: iamUser.id,
          name: staff.name,
          role: (staff.role ?? 'staff').toLowerCase(),
          phone: staff.phone,
          tempPassword: iamUser.tempPassword,
        });
      }

      res.json({ success: true, data: { supplierId, accounts: results } });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
      const suppliers = await prisma.supplier.findMany({
        where: status ? { status: status as never } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: param(req, 'supplierId') },
        include: {
          products: true,
          staff: true,
          drivers: true,
        },
      });
      if (!supplier) throw new AppError(404, 'Supplier not found');
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplier = await prisma.supplier.findUnique({ where: { id: param(req, 'supplierId') } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

      const allowed = [
        'companyName',
        'businessName',
        'category',
        'tinNumber',
        'contactPerson',
        'phone',
        'email',
        'province',
        'district',
        'logoUrl',
      ];
      const data: Record<string, unknown> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      const updated = await prisma.supplier.update({
        where: { id: param(req, 'supplierId') },
        data,
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  /** Suspend (soft delete) a supplier. */
  async suspend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplier = await prisma.supplier.findUnique({ where: { id: param(req, 'supplierId') } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

      const nextStatus = supplier.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const updated = await prisma.supplier.update({
        where: { id: param(req, 'supplierId') },
        data: { status: nextStatus },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const staff = await prisma.supplierStaff.findFirst({
        where: { userId: user.sub },
        include: { supplier: true },
      });
      if (!staff) throw new AppError(404, 'Supplier profile not found for this user');
      res.json({ success: true, data: { ...staff, supplier: staff.supplier } });
    } catch (error) {
      next(error);
    }
  },
};
