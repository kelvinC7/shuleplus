export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

/** Role profile resolved from the canteen backend (`/me/profile`). */
export interface CanteenProfile {
  id: string;
  organizationId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  role: string;
  supplierId: string | null;
  driverId: string | null;
  schoolCode: string | null;
  supplier?: Supplier | null;
  driver?: Driver | null;
}

export interface Tenant {
  id: string;
  organizationId: string;
  organizationCode: string | null;
  organizationName: string;
  schoolCode: string | null;
  schoolProfile: Record<string, unknown> | null;
  status: string;
  connectedAt: string | null;
  createdAt: string;
}

export interface Wallet {
  id: string;
  organizationId: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string | null;
  cardCode: string;
  photoUrl: string | null;
  balanceRwf: string;
  status: string;
  lastSyncAt: string | null;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  status: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
}

export interface SaleItem {
  name: string;
  quantity: number;
  unitPrice: number;
  menuItemId?: string;
}

export interface Sale {
  id: string;
  saleNumber: string | null;
  walletId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  amount: string;
  items: SaleItem[] | null;
  operatorName: string | null;
  schoolCode: string | null;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  organizationId: string;
  name: string;
  category: string | null;
  price: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  supplierCode: string;
  companyName: string;
  businessName: string | null;
  category: string | null;
  tinNumber: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  province: string | null;
  district: string | null;
  logoUrl: string | null;
  status: string;
  approvedAt: string | null;
  createdAt: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  category: string | null;
  unit: string | null;
  price: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; productId?: string }> | null;
  totalAmount: string;
  notes: string | null;
  createdByName: string | null;
  deliveryId: string | null;
  deliveryStatus: string | null;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  organizationId: string;
  name: string;
  quantity: string;
  unit: string | null;
  reorderLevel: string | null;
}

export interface Driver {
  id: string;
  driverCode: string;
  supplierId: string;
  fullName: string;
  phone: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  status: string;
  isAvailable: boolean;
  currentLocation: { lat: number; lng: number; address?: string } | null;
  supplier?: { companyName: string; phone?: string | null; email?: string | null } | null;
  createdAt: string;
}

export interface Delivery {
  id: string;
  deliveryCode: string;
  driverId: string;
  supplierId: string;
  orderIds: string[] | null;
  destination: string | null;
  destinationSchoolCode: string | null;
  status: string;
  currentLocation: { lat: number; lng: number; address?: string } | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface CashoutRequest {
  id: string;
  organizationId: string;
  canteenId: string | null;
  schoolCode: string | null;
  amount: string;
  method: string;
  status: string;
  operatorName: string | null;
  processedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface OnboardingRequest {
  id: string;
  organizationId: string | null;
  entityType: string;
  status: string;
  metadata: Record<string, unknown> | null;
  supplierId: string | null;
  schoolCode: string | null;
  isLive: boolean;
  createdAt: string;
}

export interface CanteenNotification {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardCounts {
  canteens?: number;
  suppliers?: number;
  pendingSuppliers?: number;
  wallets?: number;
  sales?: number;
  salesToday?: number;
  totalBalance?: number | string;
  menuItems?: number;
  inventoryItems?: number;
  pendingOrders?: number;
  unreadNotifications?: number;
}

export interface DashboardData {
  scope: 'platform' | 'organization';
  counts: DashboardCounts;
  recentSales: Sale[];
  canteens?: Tenant[];
  recentTransactions?: WalletTransaction[];
  notifications?: CanteenNotification[];
}
