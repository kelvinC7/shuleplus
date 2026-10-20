import type {
  EducationLevel,
  GenderTarget,
  SupplyMethod,
  UniformProduct,
} from "@/types";

export const STOCK_UNIT_PRESETS = ["pcs", "pair", "set"] as const;

export function resolveStockUnit(form: Pick<ProductFormState, "stockUnit" | "stockUnitCustom">): string {
  if (form.stockUnit === "__other__") {
    return form.stockUnitCustom.trim() || "pcs";
  }
  return form.stockUnit.trim() || "pcs";
}

export function stockUnitToForm(value: string | undefined | null): {
  stockUnit: string;
  stockUnitCustom: string;
} {
  const raw = (value ?? "pcs").trim() || "pcs";
  if ((STOCK_UNIT_PRESETS as readonly string[]).includes(raw)) {
    return { stockUnit: raw, stockUnitCustom: "" };
  }
  return { stockUnit: "__other__", stockUnitCustom: raw };
}

export const PRODUCT_SIZES = [
  "26",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
] as const;

export const PRODUCT_COLORS = [
  "Blue",
  "White",
  "Green",
  "Black",
  "Grey",
  "Navy",
] as const;

export const EDUCATION_OPTIONS: {
  label: string;
  value: EducationLevel;
  meta: string;
}[] = [
  { label: "Nursery", value: "NURSERY", meta: "Nursery" },
  { label: "Primary", value: "PRIMARY", meta: "Primary" },
  { label: "O-Level", value: "SECONDARY", meta: "O-Level" },
  { label: "A-Level", value: "TVET", meta: "A-Level" },
];

export const GENDER_OPTIONS: { label: string; value: GenderTarget }[] = [
  { label: "Boys", value: "MALE" },
  { label: "Girls", value: "FEMALE" },
  { label: "Unisex", value: "UNISEX" },
];

export const CLASS_OPTIONS = [
  "Nursery 1",
  "Nursery 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "Senior 1",
  "Senior 2",
  "Senior 3",
  "Senior 4",
  "Senior 5",
  "Senior 6",
];

export const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"] as const;

export type WizardStepId =
  | "basic"
  | "pricing"
  | "inventory"
  | "variants"
  | "fabric"
  | "school"
  | "production"
  | "images"
  | "description";

export interface ProductVariantRow {
  key: string;
  size: string;
  color: string;
  stock: string;
  sellingPrice: string;
}

export interface ProductImageSlot {
  role: "main" | "back" | "side" | "gallery";
  dataUrl: string;
  name: string;
}

export interface ProductFormToggles {
  trackInventory: boolean;
  hasVariants: boolean;
  fabricMade: boolean;
  taxable: boolean;
  allowDiscount: boolean;
  canBeSold: boolean;
  canBePurchasedOnly: boolean;
  canBeProduced: boolean;
}

export interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  educationLevel: EducationLevel;
  educationLabel: string;
  gender: GenderTarget;
  brand: string;
  status: "ACTIVE" | "HIDDEN";
  shortDescription: string;
  sellingPrice: string;
  discountPercent: string;
  vatIncluded: boolean;
  allowManualPrice: boolean;
  taxCategory: string;
  purchaseCost: string;
  averageCost: string;
  lastPurchaseCost: string;
  preferredSupplier: string;
  openingStock: string;
  reorderLevel: string;
  maximumStock: string;
  warehouse: string;
  shelfLocation: string;
  stockUnit: string;
  stockUnitCustom: string;
  minimumSaleQty: string;
  sizeOptions: string[];
  colorOptions: string[];
  variantRows: ProductVariantRow[];
  /** Existing fabric stock-out batch (FabricIssue). */
  fabricIssueId: string;
  /** How many uniform pieces come from the selected stock-out. */
  uniformOutputQty: string;
  estimatedTailoringCost: string;
  applicableClasses: string[];
  academicYear: string;
  term: string;
  schoolBranch: string;
  productionLeadTime: string;
  tailorId: string;
  expectedProductionDays: string;
  productionBatchSize: string;
  images: ProductImageSlot[];
  logoPosition: string;
  description: string;
  careInstructions: string;
  material: string;
  toggles: ProductFormToggles;
}

export function emptyProductForm(): ProductFormState {
  return {
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    educationLevel: "PRIMARY",
    educationLabel: "Primary",
    gender: "UNISEX",
    brand: "ShulePlus",
    status: "ACTIVE",
    shortDescription: "",
    sellingPrice: "",
    discountPercent: "0",
    vatIncluded: true,
    allowManualPrice: false,
    taxCategory: "Standard",
    purchaseCost: "",
    averageCost: "",
    lastPurchaseCost: "",
    preferredSupplier: "",
    openingStock: "0",
    reorderLevel: "20",
    maximumStock: "500",
    warehouse: "Main Store",
    shelfLocation: "",
    stockUnit: "pcs",
    stockUnitCustom: "",
    minimumSaleQty: "1",
    sizeOptions: ["28", "30", "32"],
    colorOptions: ["Blue"],
    variantRows: [],
    fabricIssueId: "",
    uniformOutputQty: "",
    estimatedTailoringCost: "",
    applicableClasses: [],
    academicYear: new Date().getFullYear().toString(),
    term: "",
    schoolBranch: "",
    productionLeadTime: "7",
    tailorId: "",
    expectedProductionDays: "5",
    productionBatchSize: "20",
    images: [],
    logoPosition: "Left chest",
    description: "",
    careInstructions: "",
    material: "",
    toggles: {
      trackInventory: true,
      hasVariants: true,
      fabricMade: false,
      taxable: false,
      allowDiscount: false,
      canBeSold: true,
      canBePurchasedOnly: false,
      canBeProduced: false,
    },
  };
}

export function productToForm(p: UniformProduct): ProductFormState {
  const meta =
    (p as UniformProduct & { metadata?: Record<string, unknown> }).metadata ??
    {};
  const base = emptyProductForm();
  return {
    ...base,
    name: p.name,
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    categoryId: p.categoryId ?? "",
    educationLevel: p.educationLevel,
    educationLabel: String(meta.educationLabel ?? p.educationLevel),
    gender: p.gender,
    brand: String(meta.brand ?? "ShulePlus"),
    status: p.isActive ? "ACTIVE" : "HIDDEN",
    shortDescription: String(meta.shortDescription ?? ""),
    sellingPrice: String(p.sellingPrice),
    discountPercent: String(meta.discountPercent ?? "0"),
    vatIncluded: Boolean(meta.vatIncluded ?? true),
    allowManualPrice: Boolean(meta.allowManualPrice ?? false),
    taxCategory: String(meta.taxCategory ?? "Standard"),
    purchaseCost: String(p.costPrice),
    averageCost: String(meta.averageCost ?? p.costPrice),
    lastPurchaseCost: String(meta.lastPurchaseCost ?? p.costPrice),
    preferredSupplier: String(meta.preferredSupplier ?? ""),
    openingStock: String(meta.openingStock ?? "0"),
    reorderLevel: String(meta.reorderLevel ?? "20"),
    maximumStock: String(meta.maximumStock ?? "500"),
    warehouse: String(meta.warehouse ?? "Main Store"),
    shelfLocation: String(meta.shelfLocation ?? ""),
    ...stockUnitToForm(String(meta.stockUnit ?? "pcs")),
    minimumSaleQty: String(meta.minimumSaleQty ?? "1"),
    fabricIssueId: String(meta.fabricIssueId ?? ""),
    uniformOutputQty: String(
      meta.uniformOutputQty ?? meta.expectedPieces ?? "",
    ),
    estimatedTailoringCost: String(meta.estimatedTailoringCost ?? ""),
    applicableClasses: Array.isArray(meta.applicableClasses)
      ? (meta.applicableClasses as string[])
      : [],
    academicYear: String(meta.academicYear ?? new Date().getFullYear()),
    term: String(meta.term ?? ""),
    schoolBranch: String(meta.schoolBranch ?? ""),
    productionLeadTime: String(meta.productionLeadTime ?? "7"),
    tailorId: String(meta.tailorId ?? ""),
    expectedProductionDays: String(meta.expectedProductionDays ?? "5"),
    productionBatchSize: String(meta.productionBatchSize ?? "20"),
    images: Array.isArray(p.images)
      ? (p.images as ProductImageSlot[]).filter(
          (i) => i && typeof i === "object" && "dataUrl" in i,
        )
      : [],
    logoPosition: String(meta.logoPosition ?? "Left chest"),
    description: String(
      (p as UniformProduct & { description?: string }).description ??
        meta.description ??
        "",
    ),
    careInstructions: String(meta.careInstructions ?? ""),
    material: p.material ?? "",
    toggles: {
      trackInventory: Boolean(meta.trackInventory ?? true),
      hasVariants: (p.variants?.length ?? 0) > 0,
      fabricMade: p.supplyMethod === "FABRIC_TAILORING",
      taxable: Boolean(meta.taxable ?? false),
      allowDiscount: Boolean(meta.allowDiscount ?? true),
      canBeSold: Boolean(meta.canBeSold ?? true),
      canBePurchasedOnly: Boolean(meta.canBePurchasedOnly ?? false),
      canBeProduced: Boolean(meta.canBeProduced ?? false),
    },
    variantRows:
      p.variants?.map((v) => ({
        key: v.id,
        size: v.size,
        color: v.color ?? "Blue",
        stock: String(v.stockBalance?.available ?? 0),
        sellingPrice: String(v.sellingPrice ?? p.sellingPrice),
      })) ?? [],
    sizeOptions: [
      ...new Set(p.variants?.map((v) => v.size) ?? base.sizeOptions),
    ],
    colorOptions: [
      ...new Set(
        p.variants?.map((v) => v.color ?? "Blue") ?? base.colorOptions,
      ),
    ],
  };
}

export function autoProductCode(name: string, categoryName?: string): string {
  const cat =
    (categoryName ?? "UNI")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "UNI";
  const nm =
    name
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "PRD";
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `${cat}-${nm}-${seq}`;
}

export function rebuildVariantRows(
  form: ProductFormState,
): ProductVariantRow[] {
  const rows: ProductVariantRow[] = [];
  for (const size of form.sizeOptions) {
    for (const color of form.colorOptions) {
      const existing = form.variantRows.find(
        (r) => r.size === size && r.color === color,
      );
      rows.push({
        key: `${size}-${color}`,
        size,
        color,
        stock: existing?.stock ?? form.openingStock ?? "0",
        sellingPrice: existing?.sellingPrice || form.sellingPrice || "0",
      });
    }
  }
  return rows;
}

export function calcTotalVariantStock(form: Pick<ProductFormState, "variantRows" | "toggles" | "openingStock">): number {
  if (form.toggles.hasVariants) {
    return form.variantRows.reduce((s, r) => s + (Number(r.stock) || 0), 0);
  }
  return Number(form.openingStock) || 0;
}

export function calcFormMetrics(form: ProductFormState) {
  const selling = Number(form.sellingPrice) || 0;
  const cost = Number(form.purchaseCost) || 0;
  const discount = form.toggles.allowDiscount
    ? Number(form.discountPercent) || 0
    : 0;
  const netSelling = selling * (1 - discount / 100);
  const tailoring = Number(form.estimatedTailoringCost) || 0;
  const productionCost = form.toggles.fabricMade ? cost + tailoring : cost;
  const profit = netSelling - productionCost;
  const margin = netSelling > 0 ? (profit / netSelling) * 100 : 0;
  const stock = form.toggles.hasVariants
    ? form.variantRows.reduce((s, r) => s + (Number(r.stock) || 0), 0)
    : Number(form.openingStock) || 0;
  const stockValue = stock * productionCost;
  const reorderLevel = Number(form.reorderLevel) || 0;
  const lowStock = stock > 0 && stock <= reorderLevel;

  return {
    selling,
    cost,
    netSelling,
    productionCost,
    profit,
    margin,
    stock,
    stockValue,
    lowStock,
    reorderQty: 0,
  };
}

export function buildWizardSteps(
  form: ProductFormState,
  fabricEnabled: boolean,
): { id: WizardStepId; label: string }[] {
  const steps: { id: WizardStepId; label: string }[] = [
    { id: "basic", label: "Basic" },
    { id: "pricing", label: "Pricing" },
  ];
  if (form.toggles.trackInventory)
    steps.push({ id: "inventory", label: "Stock" });
  if (form.toggles.hasVariants)
    steps.push({ id: "variants", label: "Variants" });
  if (form.toggles.fabricMade && fabricEnabled)
    steps.push({ id: "fabric", label: "Fabric" });
  steps.push({ id: "images", label: "Photos" });
  steps.push({ id: "description", label: "Notes" });
  return steps;
}

export function toApiPayload(
  form: ProductFormState,
  draft: boolean,
  period?: { year: string; term: string },
) {
  const metrics = calcFormMetrics(form);
  const supplyMethod: SupplyMethod = form.toggles.fabricMade
    ? "FABRIC_TAILORING"
    : "READY_MADE";
  const isActive = draft ? false : form.status === "ACTIVE";

  const metadata = {
    educationLabel: form.educationLabel,
    brand: form.brand,
    shortDescription: form.shortDescription,
    discountPercent: form.discountPercent,
    vatIncluded: form.vatIncluded,
    allowManualPrice: form.allowManualPrice,
    taxCategory: form.taxCategory,
    averageCost: form.averageCost,
    lastPurchaseCost: form.lastPurchaseCost,
    preferredSupplier: form.preferredSupplier,
    openingStock: form.openingStock,
    reorderLevel: form.reorderLevel,
    maximumStock: form.maximumStock,
    warehouse: form.warehouse,
    shelfLocation: form.shelfLocation,
    stockUnit: resolveStockUnit(form),
    minimumSaleQty: form.minimumSaleQty,
    fabricIssueId: form.fabricIssueId || undefined,
    fabricId: undefined,
    uniformOutputQty: form.uniformOutputQty || undefined,
    estimatedTailoringCost: form.estimatedTailoringCost,
    applicableClasses: form.applicableClasses,
    academicYear: period?.year || form.academicYear || undefined,
    term: period?.term || form.term || undefined,
    productionLeadTime: form.productionLeadTime,
    tailorId: form.tailorId,
    expectedProductionDays: form.expectedProductionDays,
    productionBatchSize: form.productionBatchSize,
    careInstructions: form.careInstructions,
    trackInventory: form.toggles.trackInventory,
    taxable: form.toggles.taxable,
    allowDiscount: form.toggles.allowDiscount,
    canBeSold: form.toggles.canBeSold,
    canBePurchasedOnly: form.toggles.canBePurchasedOnly,
    canBeProduced: form.toggles.canBeProduced,
  };

  const variants = form.toggles.hasVariants
    ? form.variantRows.map((r) => ({
        size: r.size,
        color: r.color,
        sellingPrice: Number(r.sellingPrice) || metrics.selling,
        costPrice: metrics.productionCost,
        openingStock: form.toggles.trackInventory ? Number(r.stock) || 0 : 0,
      }))
    : form.toggles.trackInventory
      ? [
          {
            size: "OS",
            color: form.colorOptions[0] ?? "Standard",
            sellingPrice: metrics.selling,
            costPrice: metrics.productionCost,
            openingStock: Number(form.openingStock) || 0,
          },
        ]
      : [
          {
            size: "OS",
            color: form.colorOptions[0] ?? "Standard",
            sellingPrice: metrics.selling,
            costPrice: metrics.productionCost,
            openingStock: 0,
          },
        ];

  return {
    name: form.name.trim(),
    sku: form.sku.trim() || undefined,
    barcode: form.barcode.trim() || undefined,
    categoryId: undefined,
    gender: form.gender,
    educationLevel: form.educationLevel,
    color: form.colorOptions[0] ?? undefined,
    material: form.material || undefined,
    description: form.description || form.shortDescription || undefined,
    images: form.images,
    metadata,
    sellingPrice: metrics.selling,
    costPrice: metrics.productionCost,
    supplyMethod,
    fabricMetersPerItem: undefined,
    isActive,
    variants,
  };
}
