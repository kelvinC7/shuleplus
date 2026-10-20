import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { platformCatalogService } from '../services/platform-catalog.service';
import { platformOpsService } from '../services/platform-ops.service';
import { RequestStatus } from '../generated/prisma';

export class PlatformController {
  // Categories
  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.listCategories(
        typeof req.query.status === 'string' ? req.query.status : undefined
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.createCategory(req.body ?? {});
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.updateCategory(String(req.params.id), req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.deleteCategory(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // Products
  async listProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const data = await platformCatalogService.listProducts({
        status: typeof q.status === 'string' ? q.status : undefined,
        categoryId: typeof q.categoryId === 'string' ? q.categoryId : undefined,
        search: typeof q.search === 'string' ? q.search : undefined,
        customEligible: q.customEligible === 'true' ? true : q.customEligible === 'false' ? false : undefined,
        featured: q.featured === 'true' ? true : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.getProduct(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.createProduct(req.body ?? {});
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.updateProduct(String(req.params.id), req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.deleteProduct(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // Pricing
  async listPricing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.listPricingRules();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async upsertPricing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.upsertPricingRule(req.body ?? {});
      res.status(req.body?.id ? 200 : 201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deletePricing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.deletePricingRule(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // Standard kits
  async listStandardKits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const data = await platformCatalogService.listStandardKits({
        organizationId: typeof q.organizationId === 'string' ? q.organizationId : undefined,
        district: typeof q.district === 'string' ? q.district : undefined,
        academicYear: typeof q.academicYear === 'string' ? q.academicYear : undefined,
        term: typeof q.term === 'string' ? q.term : undefined,
        className: typeof q.className === 'string' ? q.className : undefined,
        status: typeof q.status === 'string' ? q.status : undefined,
        search: typeof q.search === 'string' ? q.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getStandardKit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.getStandardKit(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateStandardKit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.updateStandardKit(String(req.params.id), req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteStandardKit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.deleteStandardKit(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // District kits
  async districtOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.listDistrictOptions(
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async districtSchools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const district = String(req.params.district ?? '');
      const data = await platformCatalogService.listDistrictSchools(
        district,
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolCirculars(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.listSchoolCirculars(String(req.params.organizationId), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async previewImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformCatalogService.previewCircular(String(req.params.circularId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async importCircular(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const circularId = String(req.body?.circularId ?? req.params.circularId ?? '');
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : undefined;
      const items = rawItems?.map((row: Record<string, unknown>) => ({
        sourceItemKey: String(row.sourceItemKey ?? ''),
        unitPrice: Number(row.unitPrice ?? 0),
        imageUrl: row.imageUrl == null || row.imageUrl === '' ? null : String(row.imageUrl),
      }));
      const data = await platformCatalogService.importCircular(circularId, items);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // Orders / deliveries / reports / settings
  async dashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.dashboard();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const data = await platformOpsService.listOrders({
        status: typeof q.status === 'string' ? q.status : undefined,
        orderType: typeof q.orderType === 'string' ? q.orderType : undefined,
        district: typeof q.district === 'string' ? q.district : undefined,
        organizationId: typeof q.organizationId === 'string' ? q.organizationId : undefined,
        academicYear: typeof q.academicYear === 'string' ? q.academicYear : undefined,
        search: typeof q.search === 'string' ? q.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.getOrder(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = String(req.body?.status ?? '') as RequestStatus;
      const data = await platformOpsService.updateOrderStatus(String(req.params.id), status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async refundOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.refundOrder(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listDeliveries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const data = await platformOpsService.listDeliveries({
        status: typeof q.status === 'string' ? q.status : undefined,
        district: typeof q.district === 'string' ? q.district : undefined,
        search: typeof q.search === 'string' ? q.search : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.updateDelivery(String(req.params.id), req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.getSettings();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformOpsService.updateSettings(req.body ?? {});
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const platformController = new PlatformController();
