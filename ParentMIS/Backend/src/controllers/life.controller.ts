import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { communicationService } from '../services/communication.service';
import { teacherChatService } from '../services/teacher-chat.service';
import { lifeService } from '../services/life.service';
import { storeService } from '../services/store.service';
import { getRequestedStudent } from '../utils/student-param';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';

export class CommunicationController {
  async inbox(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const parentId = req.user!.sub;
      const requested = getRequestedStudent(req);
      const [inbox, teachers, threads] = await Promise.all([
        communicationService.getInbox(orgId, parentId, requested),
        teacherChatService.listTeachersForChild(orgId, parentId, requested).catch(() => ({
          className: '',
          teachers: [],
        })),
        teacherChatService.listThreads(orgId, parentId, requested).catch(() => []),
      ]);
      res.json({
        success: true,
        data: {
          ...inbox,
          classTeachers: teachers,
          chatThreads: threads,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async send(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await communicationService.sendMessage(
        req.organizationRef!,
        req.user!.sub,
        req.body,
        getRequestedStudent(req)
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await communicationService.markRead(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.id),
        getRequestedStudent(req)
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async openTeacherChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!String(req.body.teacherUserId ?? '').trim()) {
        throw new AppError(400, 'teacherUserId is required');
      }
      const data = await teacherChatService.openOrCreateThread(
        req.organizationRef!,
        req.user!.sub,
        {
          teacherUserId: String(req.body.teacherUserId),
          teacherName: String(req.body.teacherName ?? 'Teacher'),
          teacherPhone: req.body.teacherPhone,
          teacherEmail: req.body.teacherEmail,
          subjects: Array.isArray(req.body.subjects) ? req.body.subjects.map(String) : [],
        },
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTeacherChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await teacherChatService.getThread(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.threadId),
        'PARENT'
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async sendTeacherChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parent = await prisma.parentAccount.findUnique({ where: { id: req.user!.sub } });
      const parentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : 'Parent';
      const data = await teacherChatService.sendFromParent(
        req.organizationRef!,
        req.user!.sub,
        String(req.params.threadId),
        String(req.body.body ?? ''),
        parentName
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class TeacherChatServiceController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      const teacherUserIds = String(req.query.teacherUserIds ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!organizationId || !teacherUserId) {
        throw new AppError(400, 'organizationId and teacherUserId are required');
      }
      const alternates = teacherUserIds.filter((id) => id !== teacherUserId);
      const teacherEmail = String(req.query.teacherEmail ?? '').trim() || undefined;
      const teacherName = String(req.query.teacherName ?? '').trim() || undefined;
      const data = await teacherChatService.listThreadsForTeacher(
        organizationId,
        teacherUserId,
        alternates,
        teacherEmail,
        teacherName
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const teacherUserId = String(req.query.teacherUserId ?? '');
      const teacherUserIds = String(req.query.teacherUserIds ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const threadId = String(req.params.threadId ?? '');
      if (!organizationId || !teacherUserId || !threadId) {
        throw new AppError(400, 'organizationId, teacherUserId and threadId are required');
      }
      const teacherEmail = String(req.query.teacherEmail ?? '').trim() || undefined;
      const teacherName = String(req.query.teacherName ?? '').trim() || undefined;
      const alternates = teacherUserIds.filter((id) => id !== teacherUserId);
      const thread = await teacherChatService.findThreadForTeacher(
        threadId,
        organizationId,
        teacherUserId,
        alternates,
        teacherEmail,
        teacherName
      );
      if (!thread) throw new AppError(404, 'Conversation not found');
      const data = await teacherChatService.getThread(organizationId, null, threadId, 'TEACHER');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async contacts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const className = String(req.query.className ?? '').trim() || undefined;
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      const data = await teacherChatService.listContactsForTeacher(organizationId, className);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async open(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body.organizationId ?? '');
      const teacherUserId = String(req.body.teacherUserId ?? '');
      const teacherName = String(req.body.teacherName ?? 'Teacher');
      const studentId = String(req.body.studentId ?? '');
      const parentId = String(req.body.parentId ?? '');
      if (!organizationId || !teacherUserId || !studentId || !parentId) {
        throw new AppError(400, 'organizationId, teacherUserId, studentId and parentId are required');
      }
      const data = await teacherChatService.openThreadForTeacher(organizationId, teacherUserId, {
        studentId,
        parentId,
        teacherName,
        teacherPhone: req.body.teacherPhone ?? null,
        teacherEmail: req.body.teacherEmail ?? null,
        subjects: Array.isArray(req.body.subjects) ? req.body.subjects.map(String) : [],
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.body.organizationId ?? '');
      const teacherUserId = String(req.body.teacherUserId ?? '');
      const teacherName = String(req.body.teacherName ?? 'Teacher');
      const threadId = String(req.params.threadId ?? '');
      const extraIds = Array.isArray(req.body.teacherUserIds)
        ? req.body.teacherUserIds.map(String)
        : [];
      const teacherEmail = String(req.body.teacherEmail ?? '').trim() || undefined;
      if (!organizationId || !teacherUserId || !threadId) {
        throw new AppError(400, 'organizationId, teacherUserId and threadId are required');
      }
      const alternates = extraIds.filter((id: string) => id && id !== teacherUserId);
      const data = await teacherChatService.sendFromTeacher(
        organizationId,
        teacherUserId,
        threadId,
        String(req.body.body ?? ''),
        teacherName,
        alternates,
        teacherEmail
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class LifeController {
  async discipline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.discipline(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async documents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.documents(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async events(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.events(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async health(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.health(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async homework(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.homework(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async permissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.permissions(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async leave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.leave(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async submitLeave(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await lifeService.submitLeave(
        req.organizationRef!,
        req.user!.sub,
        req.body,
        getRequestedStudent(req)
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export class StoreController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await storeService.list(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await storeService.createOrder(
        req.organizationRef!,
        req.user!.sub,
        req.body,
        getRequestedStudent(req)
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const communicationController = new CommunicationController();
export const teacherChatServiceController = new TeacherChatServiceController();
export const lifeController = new LifeController();
export const storeController = new StoreController();
