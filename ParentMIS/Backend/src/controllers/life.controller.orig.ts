import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { communicationService } from '../services/communication.service';
import { lifeService } from '../services/life.service';
import { storeService } from '../services/store.service';
import { getRequestedStudent } from '../utils/student-param';

export class CommunicationController {
  async inbox(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await communicationService.getInbox(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
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
export const lifeController = new LifeController();
export const storeController = new StoreController();
