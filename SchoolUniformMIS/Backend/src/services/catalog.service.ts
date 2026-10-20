import {
  GenderTarget,
  EducationLevel,
  SupplyMethod,
  SleeveType,
  StockMovementType,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

export interface CategoryInput {
  name: string;
  description?: string;
}

export interface ProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  gender: GenderTarget;
  educationLevel: EducationLevel;
  color?: string;
  material?: string;
  description?: string;
  images?: unknown[];
  metadata?: Record<string, unknown>;
  sellingPrice: string | number;
  costPrice: string | number;
  supplyMethod: SupplyMethod;
  fabricMetersPerItem?: string | number;
  isActive?: boolean;
  variants?: Array<VariantInput & { openingStock?: number }>;
}

export interface VariantInput {
  size: string;
  color?: string;
  sleeve?: SleeveType;
  sku?: string;
  barcode?: string;
  sellingPrice?: string | number;
  costPrice?: string | number;
  isActive?: boolean;
  openingStock?: number;
}

export interface PackageInput {
  name: string;
  description?: string;
  isActive?: boolean;
  lines?: Array<{ productId: string; quantity?: number }>;
}

/** Builds a predictable variant SKU from product name + color + size, e.g. SHI-BLU-M. */
export function autoSku(
  productName: string,
  color: string | undefined,
  size: string,
): string {
  const nameCode =
    productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "PRD";
  const colorCode =
    (color ?? "STD")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "STD";
  const sizeCode = size.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "OS";
  return `${nameCode}-${colorCode}-${sizeCode}`;
}

export class CatalogService {
  async listCategories(organizationId: string) {
    return prisma.uniformCategory.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async createCategory(organizationId: string, input: CategoryInput) {
    const existing = await prisma.uniformCategory.findFirst({
      where: { organizationId, name: input.name },
    });
    if (existing)
      throw new AppError(400, `Category "${input.name}" already exists`);
    return prisma.uniformCategory.create({
      data: { organizationId, ...input },
    });
  }

  async updateCategory(
    organizationId: string,
    id: string,
    input: Partial<CategoryInput>,
  ) {
    const category = await prisma.uniformCategory.findFirst({
      where: { id, organizationId },
    });
    if (!category) throw new AppError(404, "Category not found");
    return prisma.uniformCategory.update({ where: { id }, data: input });
  }

  async listProducts(
    organizationId: string,
    filters: { categoryId?: string; isActive?: boolean; search?: string } = {},
  ) {
    return prisma.uniformProduct.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.isActive !== undefined
          ? { isActive: filters.isActive }
          : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { sku: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        variants: { include: { stockBalance: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProduct(organizationId: string, id: string) {
    const product = await prisma.uniformProduct.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        category: true,
        variants: { include: { stockBalance: true } },
      },
    });
    if (!product) throw new AppError(404, "Product not found");
    return product;
  }

  async createProduct(organizationId: string, input: ProductInput) {
    const { variants = [], ...productInput } = input;

    return prisma.$transaction(async (tx) => {
      const product = await tx.uniformProduct.create({
        data: {
          organizationId,
          name: productInput.name,
          sku: productInput.sku,
          barcode: productInput.barcode,
          categoryId: productInput.categoryId,
          gender: productInput.gender,
          educationLevel: productInput.educationLevel,
          color: productInput.color,
          material: productInput.material,
          description: productInput.description,
          images: (productInput.images ?? []) as object,
          metadata: (productInput.metadata ?? {}) as object,
          sellingPrice: String(productInput.sellingPrice),
          costPrice: String(productInput.costPrice),
          supplyMethod: productInput.supplyMethod,
          fabricMetersPerItem:
            productInput.fabricMetersPerItem !== undefined
              ? String(productInput.fabricMetersPerItem)
              : undefined,
          isActive: productInput.isActive ?? true,
        },
      });

      for (const v of variants) {
        const sku =
          v.sku ??
          autoSku(product.name, v.color ?? product.color ?? undefined, v.size);
        const existing = await tx.uniformVariant.findFirst({
          where: { organizationId, sku },
        });
        if (existing)
          throw new AppError(400, `Variant SKU "${sku}" already exists`);

        const variant = await tx.uniformVariant.create({
          data: {
            organizationId,
            productId: product.id,
            size: v.size,
            color: v.color ?? product.color,
            sleeve: v.sleeve ?? SleeveType.NA,
            sku,
            barcode: v.barcode,
            sellingPrice:
              v.sellingPrice !== undefined
                ? String(v.sellingPrice)
                : String(product.sellingPrice),
            costPrice:
              v.costPrice !== undefined
                ? String(v.costPrice)
                : String(product.costPrice),
            isActive: v.isActive ?? true,
          },
        });

        const opening = Math.max(0, Math.floor(v.openingStock ?? 0));
        await tx.stockBalance.create({
          data: {
            organizationId,
            variantId: variant.id,
            available: opening,
          },
        });

        if (opening > 0) {
          await tx.stockMovement.create({
            data: {
              organizationId,
              variantId: variant.id,
              type: StockMovementType.IN,
              quantity: opening,
              reference: product.sku ?? product.id,
              notes: "Opening stock on product create",
            },
          });
        }
      }

      if (productInput.supplyMethod === "FABRIC_TAILORING") {
        const meta = (productInput.metadata ?? {}) as Record<string, unknown>;
        const issueId =
          typeof meta.fabricIssueId === "string" ? meta.fabricIssueId.trim() : "";
        const output = Math.floor(Number(meta.uniformOutputQty) || 0);
        if (issueId) {
          const issue = await tx.fabricIssue.findFirst({
            where: { id: issueId, organizationId },
          });
          if (!issue) throw new AppError(404, "Fabric stock-out not found");
          if (output > 0) {
            await tx.fabricIssue.update({
              where: { id: issueId },
              data: { expectedPieces: output },
            });
          }
        }
      }

      return tx.uniformProduct.findFirstOrThrow({
        where: { id: product.id },
        include: {
          category: true,
          variants: { include: { stockBalance: true } },
        },
      });
    });
  }

  async updateProduct(
    organizationId: string,
    id: string,
    input: Partial<ProductInput>,
  ) {
    const product = await prisma.uniformProduct.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!product) throw new AppError(404, "Product not found");

    const { variants, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (input.sellingPrice !== undefined)
      data.sellingPrice = String(input.sellingPrice);
    if (input.costPrice !== undefined) data.costPrice = String(input.costPrice);
    if (input.fabricMetersPerItem !== undefined)
      data.fabricMetersPerItem = String(input.fabricMetersPerItem);
    if (input.images !== undefined) data.images = input.images as object;
    if (input.metadata !== undefined) data.metadata = input.metadata as object;

    return prisma.$transaction(async (tx) => {
      await tx.uniformProduct.update({ where: { id }, data });

      if (variants) {
        for (const v of variants) {
          const color = v.color ?? product.color ?? null;
          let variant = await tx.uniformVariant.findFirst({
            where: {
              organizationId,
              productId: id,
              size: v.size,
              color,
            },
            include: { stockBalance: true },
          });

          if (!variant) {
            const sku =
              v.sku ?? autoSku(product.name, color ?? undefined, v.size);
            const existingSku = await tx.uniformVariant.findFirst({
              where: { organizationId, sku },
            });
            if (existingSku)
              throw new AppError(400, `Variant SKU "${sku}" already exists`);

            variant = await tx.uniformVariant.create({
              data: {
                organizationId,
                productId: id,
                size: v.size,
                color: color ?? undefined,
                sleeve: v.sleeve ?? SleeveType.NA,
                sku,
                barcode: v.barcode,
                sellingPrice:
                  v.sellingPrice !== undefined
                    ? String(v.sellingPrice)
                    : String(product.sellingPrice),
                costPrice:
                  v.costPrice !== undefined
                    ? String(v.costPrice)
                    : String(product.costPrice),
                isActive: v.isActive ?? true,
              },
              include: { stockBalance: true },
            });

            const opening = Math.max(0, Math.floor(v.openingStock ?? 0));
            await tx.stockBalance.create({
              data: {
                organizationId,
                variantId: variant.id,
                available: opening,
              },
            });
            if (opening > 0) {
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  variantId: variant.id,
                  type: StockMovementType.IN,
                  quantity: opening,
                  reference: product.sku ?? product.id,
                  notes: "Opening stock on variant create (product update)",
                },
              });
            }
            continue;
          }

          await tx.uniformVariant.update({
            where: { id: variant.id },
            data: {
              ...(v.sellingPrice !== undefined
                ? { sellingPrice: String(v.sellingPrice) }
                : {}),
              ...(v.costPrice !== undefined
                ? { costPrice: String(v.costPrice) }
                : {}),
              ...(v.isActive !== undefined ? { isActive: v.isActive } : {}),
              ...(v.barcode !== undefined ? { barcode: v.barcode } : {}),
            },
          });

          if (v.openingStock !== undefined) {
            const target = Math.max(0, Math.floor(v.openingStock));
            const current = variant.stockBalance?.available ?? 0;
            const diff = target - current;

            if (variant.stockBalance) {
              await tx.stockBalance.update({
                where: { variantId: variant.id },
                data: { available: target },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  organizationId,
                  variantId: variant.id,
                  available: target,
                },
              });
            }

            if (diff !== 0) {
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  variantId: variant.id,
                  type: diff > 0 ? StockMovementType.IN : StockMovementType.OUT,
                  quantity: Math.abs(diff),
                  reference: product.sku ?? product.id,
                  notes: "Stock set on product update",
                },
              });
            }
          }
        }
      }

      return tx.uniformProduct.findFirstOrThrow({
        where: { id },
        include: {
          category: true,
          variants: { include: { stockBalance: true } },
        },
      });
    });
  }

  async softDeleteProduct(organizationId: string, id: string) {
    const product = await prisma.uniformProduct.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!product) throw new AppError(404, "Product not found");
    await prisma.uniformProduct.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: "Product deleted" };
  }

  async createVariant(
    organizationId: string,
    productId: string,
    input: VariantInput,
  ) {
    const product = await prisma.uniformProduct.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
    });
    if (!product) throw new AppError(404, "Product not found");

    const sku =
      input.sku ??
      autoSku(
        product.name,
        input.color ?? product.color ?? undefined,
        input.size,
      );
    const existing = await prisma.uniformVariant.findFirst({
      where: { organizationId, sku },
    });
    if (existing)
      throw new AppError(400, `Variant SKU "${sku}" already exists`);

    const variant = await prisma.uniformVariant.create({
      data: {
        organizationId,
        productId,
        size: input.size,
        color: input.color ?? product.color,
        sleeve: input.sleeve ?? SleeveType.NA,
        sku,
        barcode: input.barcode,
        sellingPrice:
          input.sellingPrice !== undefined
            ? String(input.sellingPrice)
            : undefined,
        costPrice:
          input.costPrice !== undefined ? String(input.costPrice) : undefined,
        isActive: input.isActive ?? true,
      },
    });

    const opening = Math.max(0, Math.floor(input.openingStock ?? 0));
    await prisma.stockBalance.create({
      data: { organizationId, variantId: variant.id, available: opening },
    });

    if (opening > 0) {
      await prisma.stockMovement.create({
        data: {
          organizationId,
          variantId: variant.id,
          type: StockMovementType.IN,
          quantity: opening,
          reference: product.sku ?? product.id,
          notes: "Opening stock on variant create",
        },
      });
    }

    return variant;
  }

  async updateVariant(
    organizationId: string,
    id: string,
    input: Partial<VariantInput>,
  ) {
    const variant = await prisma.uniformVariant.findFirst({
      where: { id, organizationId },
    });
    if (!variant) throw new AppError(404, "Variant not found");

    const data: Record<string, unknown> = { ...input };
    if (input.sellingPrice !== undefined)
      data.sellingPrice = String(input.sellingPrice);
    if (input.costPrice !== undefined) data.costPrice = String(input.costPrice);

    return prisma.uniformVariant.update({ where: { id }, data });
  }

  async listPackages(organizationId: string) {
    return prisma.uniformPackage.findMany({
      where: { organizationId },
      include: { lines: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPackage(organizationId: string, input: PackageInput) {
    return prisma.uniformPackage.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
        lines: input.lines?.length
          ? {
              create: input.lines.map((line) => ({
                organizationId,
                productId: line.productId,
                quantity: line.quantity ?? 1,
              })),
            }
          : undefined,
      },
      include: { lines: { include: { product: true } } },
    });
  }

  async updatePackage(
    organizationId: string,
    id: string,
    input: Partial<PackageInput>,
  ) {
    const pkg = await prisma.uniformPackage.findFirst({
      where: { id, organizationId },
    });
    if (!pkg) throw new AppError(404, "Package not found");

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.lines) {
      data.lines = {
        deleteMany: {},
        create: input.lines.map((line) => ({
          organizationId,
          productId: line.productId,
          quantity: line.quantity ?? 1,
        })),
      };
    }

    return prisma.uniformPackage.update({
      where: { id },
      data,
      include: { lines: { include: { product: true } } },
    });
  }
}

export const catalogService = new CatalogService();
