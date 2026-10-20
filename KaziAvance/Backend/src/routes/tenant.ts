import { Router } from "express";
import { createTenant } from "../services/tenant.service";
import { AppError } from "../middleware/error";

export const tenantRouter = Router();

tenantRouter.post("/create", async (req, res, next) => {
  const { organizationId, organizationName, organizationCode } = req.body as {
    organizationId?: string;
    organizationName?: string;
    organizationCode?: string;
  };

  if (!organizationId || !organizationName) {
    return next(new AppError(400, "organizationId and organizationName are required"));
  }

  try {
    const tenant = await createTenant({
      organizationId,
      organizationName,
      organizationCode
    });

    return res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    return next(error);
  }
});
