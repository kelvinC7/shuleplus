import { Response, NextFunction } from "express";
import { z } from "zod";
import {
  GenderTarget,
  EducationLevel,
  SupplyMethod,
  SleeveType,
} from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { catalogService } from "../services/catalog.service";

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const variantSchema = z.object({
  size: z.string().min(1),
  color: z.string().optional(),
  sleeve: z.nativeEnum(SleeveType).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  sellingPrice: z.union([z.string(), z.number()]).optional(),
  costPrice: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  openingStock: z.number().int().nonnegative().optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  gender: z.nativeEnum(GenderTarget),
  educationLevel: z.nativeEnum(EducationLevel),
  color: z.string().optional(),
  material: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sellingPrice: z.union([z.string(), z.number()]),
  costPrice: z.union([z.string(), z.number()]),
  supplyMethod: z.nativeEnum(SupplyMethod),
  fabricMetersPerItem: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
});

const packageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive().optional(),
      }),
    )
    .optional(),
});

export class CatalogController {
  async listCategories(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await catalogService.listCategories(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = categorySchema.parse(req.body);
      const data = await catalogService.createCategory(
        req.organizationRef!,
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = categorySchema.partial().parse(req.body);
      const data = await catalogService.updateCategory(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listProducts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { categoryId, isActive, search } = req.query;
      const data = await catalogService.listProducts(req.organizationRef!, {
        categoryId: typeof categoryId === "string" ? categoryId : undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        search: typeof search === "string" ? search : undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await catalogService.getProduct(
        req.organizationRef!,
        String(req.params.id),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = productSchema.parse(req.body);
      const data = await catalogService.createProduct(
        req.organizationRef!,
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = productSchema.partial().parse(req.body);
      const data = await catalogService.updateProduct(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await catalogService.softDeleteProduct(
        req.organizationRef!,
        String(req.params.id),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createVariant(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = variantSchema.parse(req.body);
      const data = await catalogService.createVariant(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = variantSchema.partial().parse(req.body);
      const data = await catalogService.updateVariant(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listPackages(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await catalogService.listPackages(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createPackage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = packageSchema.parse(req.body);
      const data = await catalogService.createPackage(
        req.organizationRef!,
        body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updatePackage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = packageSchema.partial().parse(req.body);
      const data = await catalogService.updatePackage(
        req.organizationRef!,
        String(req.params.id),
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const catalogController = new CatalogController();
