import { Request, Response, NextFunction } from 'express';
import { publicTripService } from '../services/public-trip.service';

export class PublicTripController {
  async verifyByReference(req: Request, res: Response, next: NextFunction) {
    try {
      const reference = String(req.params.reference ?? '');
      const data = await publicTripService.getByReference(reference);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const publicTripController = new PublicTripController();
