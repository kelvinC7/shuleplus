import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { reportsService } from "../services/reports.service";

export class ReportsController {
  async run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.run(
        req.organizationRef!,
        String(req.params.type),
        {
          dateFrom:
            typeof req.query.dateFrom === "string"
              ? req.query.dateFrom
              : undefined,
          dateTo:
            typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
          status:
            typeof req.query.status === "string" ? req.query.status : undefined,
          search:
            typeof req.query.search === "string" ? req.query.search : undefined,
        },
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
