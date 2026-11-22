export type SmsPackageKind = 'TERM' | 'ACADEMIC_YEAR';

export type SmsPackage = {
  id: string;
  kind: SmsPackageKind;
  title: string;
  priceRwf: number;
  segmentAllowance: number;
  validityDays: number;
  description?: string | null;
};

export type SmsPortalConfig = {
  enabled: boolean;
  momoPayeeNumber: string | null;
  momoUssdTemplate: string | null;
  defaultAllocation: 'CHILD' | 'FAMILY';
  packages: SmsPackage[];
};

export type SmsUsageSummary = {
  totalPurchased: number;
  totalRemaining: number;
  totalUsed: number;
  pendingPurchases: number;
  balances: Array<{
    id: string;
    studentId: string | null;
    segmentsGranted: number;
    segmentsUsed: number;
    segmentsRemaining: number;
    expiresAt: string | null;
  }>;
};

export type SmsPurchaseRow = {
  id: string;
  purchaseRef: string;
  status: string;
  paymentStatus: string;
  totalAmountRwf: number;
  totalSegments: number;
  creditsActivated: boolean;
  createdAt: string;
  packageTitle?: string;
  packageKind?: SmsPackageKind | null;
  lines?: Array<{ studentName: string; className?: string | null }>;
};

export type SmsMessageRow = {
  id: string;
  status: string;
  messageBody: string;
  segments: number;
  studentSummary?: string | null;
  failureReason?: string | null;
  createdAt: string;
};
