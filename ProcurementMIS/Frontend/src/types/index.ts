export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardData {
  totalPRs: number;
  pendingApprovals: number;
  approvedOrders: number;
  poIssued: number;
  totalSuppliers: number;
  contractsExpiring: number;
  ordersInTransit: number;
  deliveredOrders: number;
  cancelledOrders: number;
  monthlyCost: number;
  costChange: number;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  prChange: number;
  monthlySpending: MonthlySpending[];
  spendingByDepartment: DepartmentSpending[];
  spendingByCategory: CategorySpending[];
  topPurchasedItems: TopPurchasedItem[];
  statusDistribution: StatusDistribution[];
  recentActivities: ActivityLog[];
}

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface DepartmentSpending {
  department: string;
  total: number;
}

export interface CategorySpending {
  category: string;
  total: number;
}

export interface TopPurchasedItem {
  itemName: string;
  totalQty: number;
  orderCount: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: any;
  createdAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  headUserId: string | null;
  headName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ProcurementCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface PurchaseRequest {
  id: string;
  organizationId: string;
  prNumber: string;
  requestType: string;
  departmentId: string;
  departmentOther?: string | null;
  academicYear?: string | null;
  term?: string | null;
  requestedBy: string;
  requestedByName: string | null;
  purpose: string | null;
  project: string | null;
  budgetLine: string | null;
  priority: string;
  neededDate: string;
  status: string;
  totalEstimate: number | null;
  currentApprover: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string };
  items?: PurchaseRequestItem[];
  approvals?: PRApproval[];
  _count?: { items: number };
}

export interface PurchaseRequestItem {
  id: string;
  prId: string;
  itemName: string;
  description: string | null;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  estimatedTotal: number;
  categoryId: string | null;
  preferredSupplierId: string | null;
  warehouseLocation: string | null;
  availableStock: number | null;
  category?: { id: string; name: string };
}

export interface PRApproval {
  id: string;
  prId: string;
  stage: string;
  approverId: string;
  approverName: string | null;
  approverEmail: string | null;
  status: string;
  comment: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  poNumber: string;
  prId: string | null;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string | null;
  deliveryAddress: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCost: number;
  totalAmount: number;
  paymentTerms: string | null;
  notes: string | null;
  status: string;
  paymentStatus: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; companyName: string };
  purchaseRequest?: {
    id: string;
    prNumber: string;
    requestedByName?: string | null;
    department?: { id: string; name: string };
  };
  items?: PurchaseOrderItem[];
  goodsReceivings?: GoodsReceiving[];
  _count?: { items: number };
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  itemName: string;
  description: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQty: number | null;
}

export interface Supplier {
  id: string;
  organizationId: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  alternativePhone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tinNumber: string | null;
  registrationNumber: string | null;
  website: string | null;
  logoUrl: string | null;
  paymentTerms: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  mobileMoneyNumber: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contracts?: Contract[];
  purchaseOrders?: PurchaseOrder[];
  performanceRecords?: SupplierPerformance[];
  _count?: { purchaseOrders: number; contracts: number };
}

export interface SupplierPerformance {
  id: string;
  supplierId: string;
  deliverySpeed: number | null;
  qualityRating: number | null;
  priceScore: number | null;
  responseTime: number | null;
  reliability: number | null;
  lateDeliveries: number | null;
  completedOrders: number | null;
  rejectedItems: number | null;
  overallRating: number | null;
  period: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  organizationId: string;
  contractNumber: string;
  supplierId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  value: number | null;
  status: string;
  signedBy: string | null;
  renewalTerms: string | null;
  notes: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; companyName: string };
}

export interface Budget {
  id: string;
  organizationId: string;
  departmentId: string | null;
  name: string;
  year: number;
  period: string;
  totalBudget: number;
  spent: number;
  reserved: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  year: number;
  totalBudget: number;
  totalSpent: number;
  totalReserved: number;
  remaining: number;
  utilization: number;
  alerts: BudgetAlert[];
  budgets: Budget[];
}

export interface BudgetAlert {
  budgetId: string;
  name: string;
  utilization: number;
  status: string;
}

export interface GoodsReceiving {
  id: string;
  organizationId: string;
  grnNumber: string;
  poId: string;
  receivedBy: string;
  receivedByName: string | null;
  receivedDate: string;
  notes: string | null;
  inspectionNotes: string | null;
  barcode: string | null;
  status: string;
  createdAt: string;
  items?: GoodsReceivingItem[];
  purchaseOrder?: PurchaseOrder;
}

export interface GoodsReceivingItem {
  id: string;
  grnId: string;
  poItemId: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  damagedQty: number;
  condition: string | null;
  qualityStatus: string | null;
  warehouseLocation: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: string | null;
  manufacturingDate?: string | null;
  warrantyMonths?: number | null;
  itemNotes?: string | null;
}

export interface GrnSummary {
  totalReceipts: number;
  receivedToday: number;
  pendingInspection: number;
  partiallyReceived: number;
  fullyReceived: number;
  rejectedItems: number;
  totalReceivedValue: number;
}

export interface PoReceivingLineItem {
  poItemId: string;
  itemName: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  orderedQty: number;
  previouslyReceived: number;
  remainingQty: number;
}

export interface PoReceivingContext {
  purchaseOrder: PurchaseOrder;
  lineItems: PoReceivingLineItem[];
}

export interface GoodsReturn {
  id: string;
  organizationId: string;
  returnNumber: string;
  grnId: string;
  poId: string | null;
  supplierId: string | null;
  reason: string;
  reasonDescription: string | null;
  resolution: string | null;
  status: string;
  returnValue: number | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  items?: GoodsReturnItem[];
  grn?: GoodsReceiving;
}

export interface GoodsReturnItem {
  id: string;
  returnId: string;
  grnItemId: string | null;
  itemName: string;
  receivedQty: number;
  returnQty: number;
  unitPrice: number | null;
  reason: string | null;
}

export interface ReturnSummary {
  totalReturns: number;
  pendingReturns: number;
  approvedReturns: number;
  itemsReturned: number;
  returnValue: number;
  awaitingReplacement: number;
  creditNotes: number;
  supplierReturnRate: { supplier: string; rate: number; value: number }[];
  topReturnedItems: { itemName: string; qty: number }[];
  returnReasons: { reason: string; percentage: number }[];
}

export interface GrnReturnLineItem {
  grnItemId: string;
  itemName: string;
  receivedQty: number;
  returnableQty: number;
  unitPrice: number;
}

export interface GrnReturnContext {
  grn: GoodsReceiving;
  lineItems: GrnReturnLineItem[];
}

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SupplierSummary {
  activeSuppliers: number;
  preferredSuppliers: number;
  blacklistedSuppliers: number;
  totalSuppliers: number;
  contractsExpiring: number;
  averageRating: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
