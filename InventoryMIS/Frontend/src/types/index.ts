export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardData {
  organizationName?: string;
  totalProducts: number;
  totalStores: number;
  totalStock: number;
  inventoryValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringSoon: number;
  expiredItems: number;
  stockReceivedToday: number;
  stockIssuedToday: number;
  pendingStockRequests: number;
  topConsumed: TopConsumedItem[];
  monthlyConsumption: MonthlyConsumption[];
  recentActivities: ActivityLog[];
  lowStockDetails?: LowStockItem[];
}

export interface TopConsumedItem {
  productId: string;
  productName: string;
  sku: string;
  totalConsumed: number;
}

export interface MonthlyConsumption {
  month: string;
  total: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  totalStock: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  metadata: any;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string;
  brand: string | null;
  unitOfMeasure: string;
  imageUrl: string | null;
  description: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  reorderLevel: number | null;
  minimumStock: number | null;
  maximumStock: number | null;
  supplierId: string | null;
  storageLocation: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
  supplier?: { id: string; name: string };
  batches?: InventoryBatch[];
  _count?: { batches: number };
}

export interface ProductStockSummary {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  unitOfMeasure: string;
  reorderLevel: number | null;
  minimumStock: number | null;
  totalStock: number;
  avgCost: number;
  totalValue: number;
  hasNearExpiry: boolean;
  hasExpired: boolean;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface Store {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: string;
  location: string | null;
  managerName: string | null;
  managerContact: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shelves?: StoreShelf[];
  _count?: { shelves: number; batches: number; products: number };
}

export interface StoreShelf {
  id: string;
  storeId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tinNumber: string | null;
  paymentMethod: string | null;
  mobileMoneyNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  contractUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number; receivings: number };
}

export interface InventoryBatch {
  id: string;
  productId: string;
  storeId: string | null;
  batchNumber: string | null;
  quantity: number;
  unitCost: number | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  receivedDate: string;
  isActive: boolean;
}

export interface StockReceiving {
  id: string;
  grnNumber: string;
  storeId: string;
  supplierId: string | null;
  invoiceNumber: string | null;
  deliveryNoteNumber: string | null;
  receivedBy: string;
  notes: string | null;
  receivedDate: string;
  createdAt: string;
  store?: { id: string; name: string };
  supplier?: { id: string; name: string };
  items?: StockReceivingItem[];
  _count?: { items: number };
}

export interface StockReceivingItem {
  id: string;
  receivingId: string;
  productId: string;
  batchNumber: string | null;
  quantity: number;
  unitCost: number | null;
  expiryDate: string | null;
  manufacturingDate: string | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface StockIssue {
  id: string;
  issueNumber: string;
  storeId: string;
  issuedTo: string;
  issuedToType: string;
  issuedToName: string;
  purpose: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  issuedBy: string | null;
  status: string;
  notes: string | null;
  issuedAt: string | null;
  createdAt: string;
  store?: { id: string; name: string };
  items?: StockIssueItem[];
  _count?: { items: number };
}

export interface StockIssueItem {
  id: string;
  issueId: string;
  productId: string;
  batchId: string | null;
  quantity: number;
  unitCost: number | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromStoreId: string;
  toStoreId: string;
  requestedBy: string;
  approvedBy: string | null;
  receivedBy: string | null;
  status: string;
  notes: string | null;
  transferredAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  fromStore?: { id: string; name: string };
  toStore?: { id: string; name: string };
  items?: StockTransferItem[];
  _count?: { items: number };
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  batchId: string | null;
  quantity: number;
  unitCost: number | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  storeId: string;
  reason: string;
  reasonDescription: string | null;
  adjustedBy: string;
  approvedBy: string | null;
  notes: string | null;
  adjustmentDate: string;
  createdAt: string;
  store?: { id: string; name: string };
  items?: StockAdjustmentItem[];
  _count?: { items: number };
}

export interface StockAdjustmentItem {
  id: string;
  adjustmentId: string;
  productId: string;
  batchId: string | null;
  expectedQty: number;
  actualQty: number;
  difference: number;
  unitCost: number | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface StockRequest {
  id: string;
  requestNumber: string;
  storeId: string;
  requestedBy: string;
  departmentName: string;
  purpose: string | null;
  status: string;
  approvedBy: string | null;
  issuedAsIssueId: string | null;
  notes: string | null;
  createdAt: string;
  store?: { id: string; name: string };
  items?: StockRequestItem[];
  _count?: { items: number };
}

export interface StockRequestItem {
  id: string;
  requestId: string;
  productId: string;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityIssued: number | null;
  notes: string | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface PhysicalStockCount {
  id: string;
  countNumber: string;
  storeId: string;
  countType: string;
  countedBy: string;
  verifiedBy: string | null;
  status: string;
  notes: string | null;
  countDate: string;
  createdAt: string;
  store?: { id: string; name: string };
  items?: PhysicalStockCountItem[];
  _count?: { items: number };
}

export interface PhysicalStockCountItem {
  id: string;
  countId: string;
  productId: string;
  systemQty: number;
  actualQty: number;
  variance: number;
  notes: string | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface Disposal {
  id: string;
  disposalNumber: string;
  storeId: string;
  disposedBy: string;
  approvedBy: string | null;
  reason: string;
  disposalMethod: string | null;
  notes: string | null;
  disposalDate: string;
  createdAt: string;
  store?: { id: string; name: string };
  items?: DisposalItem[];
  _count?: { items: number };
}

export interface DisposalItem {
  id: string;
  disposalId: string;
  productId: string;
  batchId: string | null;
  quantity: number;
  unitCost: number | null;
  product?: { id: string; name: string; sku: string; unitOfMeasure: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CategoryConsumption {
  categoryId: string;
  categoryName: string;
  totalConsumed: number;
  productCount: number;
}

export interface StockMovement {
  receivings: StockReceiving[];
  issues: StockIssue[];
  transfers: StockTransfer[];
  adjustments: StockAdjustment[];
}
