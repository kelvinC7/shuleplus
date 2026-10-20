import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, param } from '../types';
import { AppError } from '../middleware/error.middleware';

export const notificationController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await prisma.canteenNotification.findMany({
        where: { organizationId: req.organizationRef! },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const updated = await prisma.canteenNotification.updateMany({
        where: { id: param(req, 'id'), organizationId: req.organizationRef! },
        data: { isRead: true },
      });
      res.json({ success: true, data: { updated: updated.count } });
    } catch (error) {
      next(error);
    }
  },

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const updated = await prisma.canteenNotification.updateMany({
        where: { organizationId: req.organizationRef!, isRead: false },
        data: { isRead: true },
      });
      res.json({ success: true, data: { updated: updated.count } });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { title, message, type } = req.body as { title?: string; message?: string; type?: string };
      if (!title || !message) throw new AppError(400, 'title and message are required');
      const notification = await prisma.canteenNotification.create({
        data: {
          organizationId: req.organizationRef!,
          title,
          message,
          type: type ?? 'general',
        },
      });
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },
};
