import { Router } from "express";
import { AppError } from "../middleware/error";
import {
  createDeal,
  deleteDeal,
  listDeals,
  toPublicDeal,
  updateDeal,
} from "../services/deals-catalog.service";
import { listPlatformRequests } from "../services/platform.service";
import { getProfitPolicy, setProfitPolicy } from "../services/platform-policy.service";

export const platformRouter = Router();

platformRouter.get("/policy", (_req, res) => {
  return res.json({ success: true, data: getProfitPolicy() });
});

platformRouter.put("/policy", (req, res, next) => {
  try {
    const percent = Number(req.body?.profitPercent);
    const data = setProfitPolicy(percent);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error instanceof Error ? new AppError(400, error.message) : error);
  }
});

platformRouter.get("/requests", async (req, res, next) => {
  try {
    const school = typeof req.query.school === "string" ? req.query.school : undefined;
    const data = await listPlatformRequests(school);
    return res.json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
});

platformRouter.get("/deals", (_req, res) => {
  return res.json({ success: true, data: listDeals().map(toPublicDeal) });
});

platformRouter.post("/deals", (req, res, next) => {
  try {
    const body = req.body as {
      name?: string;
      shortDescription?: string;
      description?: string;
      price_rwf?: number;
      imageDataUrl?: string;
    };
    const row = createDeal({
      name: String(body.name || ""),
      shortDescription: body.shortDescription,
      description: body.description,
      price_rwf: body.price_rwf,
      imageDataUrl: body.imageDataUrl,
    });
    return res.status(201).json({ success: true, data: toPublicDeal(row) });
  } catch (error) {
    return next(error instanceof Error ? new AppError(400, error.message) : error);
  }
});

platformRouter.patch("/deals/:id", (req, res, next) => {
  try {
    const updated = updateDeal(req.params.id, req.body ?? {});
    if (!updated) return next(new AppError(404, "Deal not found"));
    return res.json({ success: true, data: toPublicDeal(updated) });
  } catch (error) {
    return next(error instanceof Error ? new AppError(400, error.message) : error);
  }
});

platformRouter.delete("/deals/:id", (req, res, next) => {
  try {
    if (!deleteDeal(req.params.id)) return next(new AppError(404, "Deal not found"));
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});
