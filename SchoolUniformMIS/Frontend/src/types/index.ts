export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardKpis {
  uniformsInStock: number;
  fabricRolls: number | null;
  tailors: number | null;
  studentsWithUniform: number;
  studentsMissing: number;
  salesToday: number;
  profitThisMonth: number;
  lossThisMonth: number;
  lowStockCount: number;
}

export interface DashboardLowStockItem {
  variantId: string;
  productName: string;
  size: string;
  available: number;
}

export interface DashboardSummary {
  organizationId?: string;
  organizationName?: string;
  kpis: DashboardKpis;
  lowStockItems: DashboardLowStockItem[];
  charts: {
    monthlySales: { month: string; total: number }[];
    fabricUsage: { fabric: string; metersUsed: number }[];
    distributionByClass: { className: string; count: number }[];
  };
}

export interface SchoolUniformSettings {
  id: string;
  organizationId: string;
  enableFabricManagement: boolean;
  enableTailoring: boolean;
  enableBarcode: boolean;
  enableQrCodes: boolean;
  enableAutoStockAlerts: boolean;
  enableInstallments: boolean;
  enableDiscounts: boolean;
  enableParentNotifications: boolean;
  enableTrackOwnership: boolean;
  enableMissingAlerts: boolean;
  enableSizeRecommendations: boolean;
  receiptSignatureUrl?: string | null;
  receiptStampUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GenderTarget = "MALE" | "FEMALE" | "UNISEX";
export type EducationLevel =
  "NURSERY" | "PRIMARY" | "SECONDARY" | "TVET" | "ALL";
export type SupplyMethod = "READY_MADE" | "FABRIC_TAILORING";
export type SleeveType = "SHORT" | "LONG" | "NA";
export type ProductionStatus =
  "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type DistributionStatus = "PAID" | "PENDING" | "FREE";
export type ReturnStatus = "COMPLETED" | "REFUNDED" | "PARTIAL";
export type ReturnCondition = "NEW" | "GOOD" | "DAMAGED" | "WORN" | "DEFECTIVE";
export type PaymentMethod = "CASH" | "BANK" | "MOBILE_MONEY" | "CARD";
export type PaymentStatus = "PAID" | "PARTIAL" | "PENDING";
export type StockMovementType =
  | "IN"
  | "OUT"
  | "ADJUST"
  | "RESERVE"
  | "RELEASE"
  | "DAMAGE"
  | "SALE"
  | "DISTRIBUTION";
export type CustomerType = "STUDENT" | "PARENT" | "WALK_IN";

export interface UniformCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface StockBalance {
  id: string;
  variantId: string;
  available: number;
  reserved: number;
  sold: number;
  damaged: number;
  updatedAt: string;
  isLowStock?: boolean;
  variant?: UniformVariant;
}

export interface UniformVariant {
  id: string;
  organizationId: string;
  productId: string;
  size: string;
  color?: string | null;
  sleeve: SleeveType;
  sku: string;
  barcode?: string | null;
  sellingPrice?: string | null;
  costPrice?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockBalance?: StockBalance | null;
  product?: UniformProduct;
}

export interface UniformProduct {
  id: string;
  organizationId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  gender: GenderTarget;
  educationLevel: EducationLevel;
  color?: string | null;
  material?: string | null;
  description?: string | null;
  images: unknown[];
  metadata?: Record<string, unknown> | null;
  sellingPrice: string;
  costPrice: string;
  supplyMethod: SupplyMethod;
  fabricMetersPerItem?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: UniformCategory | null;
  variants?: UniformVariant[];
}

export interface UniformPackageLine {
  id: string;
  packageId: string;
  productId: string;
  quantity: number;
  product?: UniformProduct;
}

export interface UniformPackage {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lines: UniformPackageLine[];
}

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface Fabric {
  id: string;
  organizationId: string;
  name: string;
  supplierId?: string | null;
  rollNumber?: string | null;
  metersTotal: string;
  metersRemaining: string;
  cost: string;
  color?: string | null;
  quality?: string | null;
  warehouse?: string | null;
  academicYear?: string | null;
  purchaseDate?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;
}

export interface FabricPurchase {
  id: string;
  organizationId: string;
  fabricId?: string | null;
  name: string;
  supplierId?: string | null;
  meters: string;
  cost: string;
  purchaseDate: string;
  notes?: string | null;
  createdAt: string;
  fabric?: Fabric | null;
  supplier?: Supplier | null;
}

export interface FabricSummary {
  kpis: {
    fabricTypes: number;
    totalMeters: number;
    stockValue: number;
    lowStock: number;
    usedMeters: number;
    expectedUniforms: number;
    productionCost: number;
    estimatedRevenue: number;
  };
  fabrics: Fabric[];
  issues: FabricIssue[];
  purchases: FabricPurchase[];
  orders: ProductionOrder[];
  charts: {
    usageByFabric: { fabric: string; metersUsed: number; remaining: number }[];
    monthlyPurchases: {
      label: string;
      meters: number;
      cost: number;
      date: string;
    }[];
  };
}

export interface FabricIssue {
  id: string;
  organizationId: string;
  fabricId: string;
  tailorId?: string | null;
  meters: string;
  expectedPieces?: number | null;
  issuedAt: string;
  notes?: string | null;
  createdAt: string;
  fabric?: Fabric;
  tailor?: Tailor | null;
}

export interface Tailor {
  id: string;
  organizationId: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionReceipt {
  id: string;
  orderId: string;
  receivedQty: number;
  damagedQty: number;
  unfinishedQty: number;
  receivedAt: string;
  notes?: string | null;
}

export interface ProductionOrder {
  id: string;
  organizationId: string;
  tailorId: string;
  fabricId?: string | null;
  metersIssued: string;
  expectedOutput: number;
  deliveryDate?: string | null;
  tailoringCost: string;
  status: ProductionStatus;
  productId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  tailor?: Tailor;
  fabric?: Fabric | null;
  product?: UniformProduct | null;
  receipts?: ProductionReceipt[];
}

export interface StudentMeasurement {
  id: string;
  studentId: string;
  height?: string | null;
  weight?: string | null;
  chest?: string | null;
  waist?: string | null;
  hip?: string | null;
  shoulder?: string | null;
  leg?: string | null;
  sleeve?: string | null;
  shirtSize?: string | null;
  trouserSize?: string | null;
  skirtSize?: string | null;
  dressSize?: string | null;
  sweaterSize?: string | null;
  shoeSize?: string | null;
  sportSize?: string | null;
  hatSize?: string | null;
  beltSize?: string | null;
  sizes?: { id?: string; label: string; value: string }[] | null;
  history?: Array<{
    year: string;
    at?: string;
    sizes?: { id?: string; label: string; value: string }[];
    shirtSize?: string | null;
    trouserSize?: string | null;
    shoeSize?: string | null;
    sweaterSize?: string | null;
    height?: string | number | null;
    weight?: string | number | null;
  }> | null;
  updatedAt: string;
}

export interface StudentUniformItem {
  id: string;
  studentId: string;
  productId: string;
  variantId?: string | null;
  owned: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product?: UniformProduct;
  variant?: UniformVariant | null;
}

export interface UniformStudent {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  className?: string | null;
  academicYear?: string | null;
  academicStudentId?: string | null;
  gender?: string | null;
  phone?: string | null;
  notes?: string | null;
  profileMeta?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  measurement?: StudentMeasurement | null;
  items?: StudentUniformItem[];
  /** Alias used by some views */
  uniformItems?: StudentUniformItem[];
  distributions?: UniformDistribution[];
  reservations?: unknown[];
  sales?: UniformSale[];
}

export interface AcademicStudentResult {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
  classId?: string;
  gender?: string | null;
  studentCode?: string;
}

export interface UniformDistribution {
  id: string;
  organizationId: string;
  receiptId?: string | null;
  studentId: string;
  variantId: string;
  quantity: number;
  unitPrice?: string | number;
  academicYear?: string | null;
  issuedBy?: string | null;
  issuedAt: string;
  status: DistributionStatus;
  notes?: string | null;
  createdAt: string;
  student?: UniformStudent;
  variant?: UniformVariant;
  receipt?: DistributionReceipt | null;
}

export interface DistributionReceipt {
  id: string;
  organizationId: string;
  receiptNumber: string;
  studentId: string;
  saleId?: string | null;
  academicYear?: string | null;
  term?: string | null;
  status: DistributionStatus;
  itemCount: number;
  totalQty: number;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  paid: string | number;
  balance: string | number;
  notes?: string | null;
  issuedBy?: string | null;
  issuedAt: string;
  createdAt: string;
  student?: UniformStudent;
  lines?: UniformDistribution[];
  returns?: UniformReturn[];
}

export interface UniformReturnLine {
  id: string;
  returnId: string;
  distributionId?: string | null;
  variantId: string;
  quantity: number;
  reason?: string | null;
  exchangeVariantId?: string | null;
  variant?: UniformVariant;
}

export interface UniformReturn {
  id: string;
  organizationId: string;
  returnNumber: string;
  receiptId: string;
  studentId: string;
  reason?: string | null;
  condition: ReturnCondition;
  status: ReturnStatus;
  refundAmount: string | number;
  restock: boolean;
  replaceItem: boolean;
  exchange: boolean;
  notes?: string | null;
  processedBy?: string | null;
  processedAt: string;
  createdAt: string;
  student?: UniformStudent;
  receipt?: DistributionReceipt;
  lines?: UniformReturnLine[];
}

export interface ReturnAnalytics {
  todayReturns: number;
  mostReturnedItem: { name: string; count: number } | null;
  mostCommonReason: { reason: string; count: number } | null;
  refundAmount: number;
  itemsReturnedToStock: number;
}

export interface SaleLine {
  id: string;
  saleId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  variant?: UniformVariant;
}

export interface Payment {
  id: string;
  organizationId: string;
  saleId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface UniformSale {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  customerType: CustomerType;
  studentId?: string | null;
  customerName?: string | null;
  discount: string;
  tax: string;
  total: string;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  lines: SaleLine[];
  payments: Payment[];
  student?: UniformStudent | null;
}

export interface OutstandingPayment {
  id: string;
  saleId: string;
  invoiceNumber: string;
  student?: UniformStudent | null;
  customerName?: string | null;
  total: string;
  paid: number;
  outstanding: number;
  /** Remaining balance (same as outstanding; views may use either) */
  balance: number;
  paymentStatus: PaymentStatus;
}

export interface ReportResult<T = Record<string, unknown>> {
  type: string;
  rows: T[];
}
