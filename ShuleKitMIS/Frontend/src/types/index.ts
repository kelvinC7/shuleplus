export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  kitCount: number;
  requestCount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  deliveredCount: number;
  collected: number;
  status: string;
}

export type KitStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'DELIVERED' | 'CANCELLED';
export type DeliveryMethod = 'AT_SCHOOL' | 'AT_HOME';
export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type ParentRelation = 'FATHER' | 'MOTHER' | 'GUARDIAN';

export interface KitRequirement {
  id: string;
  kitId: string;
  organizationId: string;
  title: string;
  quantity: number;
  unitPrice: string;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Kit {
  id: string;
  organizationId: string;
  name: string;
  gradeLevel: string;
  description: string | null;
  imageUrl: string | null;
  amount: string;
  status: KitStatus;
  createdAt: string;
  updatedAt: string;
  requirements: KitRequirement[];
  academicYear?: string | null;
  term?: string | null;
}

export interface KitRequestItem {
  id: string;
  requestId: string;
  requirementId: string | null;
  title: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  createdAt: string;
}

export interface KitRequestPayment {
  id: string;
  requestId: string;
  organizationId: string;
  paymentNumber: string;
  amount: string;
  method: PaymentMethod;
  status: 'PENDING' | 'COMPLETED' | 'REFUNDED';
  reference: string | null;
  paidBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface KitRequest {
  id: string;
  organizationId: string;
  requestNumber: string;
  kitId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  gradeLevel: string | null;
  parentName: string;
  parentPhone: string | null;
  parentRelation: ParentRelation;
  deliveryMethod: DeliveryMethod;
  subtotal: string;
  homeFee: string;
  total: string;
  status: RequestStatus;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
  kit: Kit | null;
  payments: KitRequestPayment[];
  items: KitRequestItem[];
}

export interface LookupParent {
  role: ParentRelation;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface LookupResult {
  id: string;
  organizationId: string;
  studentUid: string;
  shuleCode?: string | null;
  studentCode: string | null;
  sdmCode: string | null;
  registrationNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | null;
  photoUrl: string | null;
  status: string;
  schoolName: string;
  schoolCode?: string | null;
  organizationCode?: string | null;
  district?: string | null;
  province?: string | null;
  sector?: string | null;
  className: string | null;
  classLabel: string | null;
  classId: string | null;
  educationLevel?: string | null;
  academicYear: string | null;
  term: string | null;
  parents: LookupParent[];
  outstandingBalance: number | null;
  lastPayment: { amount: number; date: string; reference: string } | null;
}

export interface PublicRequestStatus {
  requestNumber: string;
  status: RequestStatus;
  studentName: string;
  className: string | null;
  gradeLevel: string | null;
  kitName: string | null;
  deliveryMethod: DeliveryMethod;
  subtotal: string;
  homeFee: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: KitRequestItem[];
  payments: Array<{
    paymentNumber: string;
    amount: string;
    method: PaymentMethod;
    status: 'PENDING' | 'COMPLETED' | 'REFUNDED';
    reference: string | null;
    verifiedAt: string | null;
  }>;
}
