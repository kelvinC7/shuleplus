import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope, param } from '../types';
import { AppError } from '../middleware/error.middleware';
import { createIamUser } from '../clients/iam.client';

const registerSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  vehicleType: z.string().optional(),
  plateNumber: z.string().optional(),
  idNumber: z.string().optional(),
  supplierId: z.string().min(1),
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

const createDeliverySchema = z.object({
  driverId: z.string().min(1),
  supplierId: z.string().min(1),
  orderIds: z.array(z.string()).min(1),
  destination: z.string().optional(),
  destinationSchoolCode: z.string().optional(),
  estimatedArrival: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const deliveryStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  location: z
    .object({ lat: z.number(), lng: z.number(), address: z.string().optional() })
    .optional(),
});

function generateDriverCode() {
  return `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateDeliveryCode() {
  return `DLV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export const driverController = {
  /** Resolve the driver record for the authenticated IAM user. */
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await prisma.canteenProfile.findUnique({
        where: { organizationId_userId: { organizationId: req.user!.organizationId, userId: req.user!.sub } },
      });
      if (!profile?.driverId) throw new AppError(404, 'Driver profile not found');

      const driver = await prisma.driver.findUnique({
        where: { id: profile.driverId },
        include: { supplier: { select: { companyName: true, phone: true, email: true } } },
      });
      if (!driver) throw new AppError(404, 'Driver not found');
      res.json({ success: true, data: driver });
    } catch (error) {
      next(error);
    }
  },

  /** Register a driver + create their IAM user account. */
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

      const driverCode = generateDriverCode();
      const [first = 'Driver', ...rest] = body.fullName.trim().split(/\s+/);
      const lastName = rest.join(' ') || first;

      const iamUser = await createIamUser(req.headers.authorization!.replace('Bearer ', ''), {
        email: `${body.phone.replace(/[^0-9]/g, '')}@shuleplus-canteen.local`,
        firstName: first,
        lastName,
        phone: body.phone,
        position: 'Canteen Driver',
        moduleSlugs: ['canteen'],
      });

      const driver = await prisma.driver.create({
        data: {
          id: driverCode,
          driverCode,
          supplierId: body.supplierId,
          fullName: body.fullName,
          phone: body.phone,
          vehicleType: body.vehicleType ?? null,
          plateNumber: body.plateNumber ?? null,
          idNumber: body.idNumber ?? null,
          status: 'ACTIVE',
        },
      });

      await prisma.canteenProfile.create({
        data: {
          organizationId: req.user?.organizationId ?? '',
          userId: iamUser.id,
          email: null,
          displayName: body.fullName,
          phone: body.phone,
          role: 'DRIVER',
          supplierId: body.supplierId,
          driverId: driver.id,
        },
      });

      res.status(201).json({
        success: true,
        data: { ...driver, account: { phone: body.phone, tempPassword: iamUser.tempPassword } },
      });
    } catch (error) {
      next(error);
    }
  },

  async bySupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const drivers = await prisma.driver.findMany({
        where: { supplierId: param(req, 'supplierId') },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: drivers });
    } catch (error) {
      next(error);
    }
  },

  async updateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { lat, lng, address } = locationSchema.parse(req.body);
      const driver = await prisma.driver.update({
        where: { id: param(req, 'driverId') },
        data: { currentLocation: { lat, lng, address } },
      });
      res.json({ success: true, data: driver });
    } catch (error) {
      next(error);
    }
  },

  async createDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createDeliverySchema.parse(req.body);
      const driver = await prisma.driver.findUnique({ where: { id: body.driverId } });
      if (!driver) throw new AppError(404, 'Driver not found');

      const deliveryCode = generateDeliveryCode();

      const delivery = await prisma.$transaction(async (tx) => {
        const created = await tx.delivery.create({
          data: {
            id: deliveryCode,
            deliveryCode,
            driverId: body.driverId,
            supplierId: body.supplierId,
            orderIds: body.orderIds,
            destination: body.destination ?? null,
            destinationSchoolCode: body.destinationSchoolCode ?? null,
            estimatedArrival: body.estimatedArrival ? new Date(body.estimatedArrival) : null,
            status: 'ASSIGNED',
            notes: body.notes ?? null,
          },
        });

        await tx.driver.update({
          where: { id: body.driverId },
          data: { currentDeliveryId: created.id, isAvailable: false },
        });

        await tx.purchaseOrder.updateMany({
          where: { id: { in: body.orderIds } },
          data: { deliveryId: created.id, deliveryStatus: 'ASSIGNED', status: 'DISPATCHED' },
        });

        return created;
      });

      res.status(201).json({ success: true, data: delivery });
    } catch (error) {
      next(error);
    }
  },

  async updateDeliveryStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, location } = deliveryStatusSchema.parse(req.body);
      const delivery = await prisma.delivery.findUnique({ where: { id: param(req, 'deliveryId') } });
      if (!delivery) throw new AppError(404, 'Delivery not found');

      const updateData: Record<string, unknown> = { status };
      if (location) updateData.currentLocation = location;
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
        await prisma.driver.update({
          where: { id: delivery.driverId },
          data: { currentDeliveryId: null, isAvailable: true },
        });
        const orderIds = Array.isArray(delivery.orderIds) ? (delivery.orderIds as string[]) : [];
        if (orderIds.length) {
          await prisma.purchaseOrder.updateMany({
            where: { id: { in: orderIds } },
            data: { deliveryStatus: 'DELIVERED', status: 'DELIVERED' },
          });
        }
      }
      if (status === 'CANCELLED') {
        await prisma.driver.update({
          where: { id: delivery.driverId },
          data: { currentDeliveryId: null, isAvailable: true },
        });
      }

      const updated = await prisma.delivery.update({
        where: { id: delivery.id },
        data: updateData,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async deliveriesBySupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const deliveries = await prisma.delivery.findMany({
        where: { supplierId: param(req, 'supplierId') },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: deliveries });
    } catch (error) {
      next(error);
    }
  },

  async deliveriesByDriver(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const deliveries = await prisma.delivery.findMany({
        where: { driverId: param(req, 'driverId') },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: deliveries });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const drivers = org
        ? await prisma.driver.findMany({ where: { supplier: { purchaseOrders: { some: { organizationId: org } } } }, take: 100 })
        : await prisma.driver.findMany({ take: 100 });
      res.json({ success: true, data: drivers });
    } catch (error) {
      next(error);
    }
  },

  async deliveries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const deliveries = org
        ? await prisma.delivery.findMany({
            where: { purchaseOrders: { some: { organizationId: org } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
        : await prisma.delivery.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
      res.json({ success: true, data: deliveries });
    } catch (error) {
      next(error);
    }
  },

  async getDriver(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: param(req, 'driverId') },
        include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 20 } },
      });
      if (!driver) throw new AppError(404, 'Driver not found');
      res.json({ success: true, data: driver });
    } catch (error) {
      next(error);
    }
  },
};
