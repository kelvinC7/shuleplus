import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationService, notificationHub } from '../services/notification.service';

const disciplineEventSchema = z.object({
  organizationId: z.string().min(1),
  studentCode: z.string().min(1),
  studentName: z.string().optional(),
  eventType: z.string().optional(),
  points: z.number().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

const feeEventSchema = z.object({
  organizationId: z.string().min(1),
  studentCode: z.string().min(1),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  eventType: z.string().min(1),
  priority: z.string().optional(),
  link: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const attendanceEventSchema = z
  .object({
    organizationId: z.string().min(1),
    studentCode: z.string().optional(),
    studentId: z.string().optional(),
    studentName: z.string().optional(),
    title: z.string().min(1),
    body: z.string().min(1),
    eventType: z.string().min(1),
    priority: z.string().optional(),
    link: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((v) => Boolean(v.studentCode || v.studentId), {
    message: 'studentCode or studentId is required',
  });

export class NotificationController {
  async ingestDisciplineEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const event = disciplineEventSchema.parse(req.body);
      const result = await notificationService.ingestDisciplineEvent(event);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async ingestFeeEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const event = feeEventSchema.parse(req.body);
      const result = await notificationService.ingestFeeEvent(event);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async ingestAttendanceEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const event = attendanceEventSchema.parse(req.body);
      const result = await notificationService.ingestAttendanceEvent(event);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async ingestExamEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const event = feeEventSchema.parse(req.body);
      const result = await notificationService.ingestExamEvent(event);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.getPreferences(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.updatePreferences(
        req.organizationRef!,
        req.user!.sub,
        req.body
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.listForParent(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markRead(req.organizationRef!, req.user!.sub, String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await notificationService.markAllRead(req.organizationRef!, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async stream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const parentId = req.user!.sub;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    res.write(`retry: 5000\n\n`);
    send({ type: 'connected', parentId });

    const unsubscribe = notificationHub.subscribe(parentId, (payload) => {
      send({ type: 'notification', payload });
    });

    const heartbeat = setInterval(() => {
      send({ type: 'ping', at: new Date().toISOString() });
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }
}

export const notificationController = new NotificationController();
