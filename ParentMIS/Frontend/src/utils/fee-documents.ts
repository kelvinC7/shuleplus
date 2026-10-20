export type SchoolBranding = {
  schoolName: string;
  organizationCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  logoUrl?: string | null;
  stampUrl?: string | null;
  signatureUrl?: string | null;
};

export type ReceiptViewData = {
  receiptNumber: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  amountPaid: number;
  outstanding: number;
  method: string;
  issuedAt: string;
  reference?: string | null;
  lineItems?: Array<{ description: string; amount: number }>;
  qrCode?: string | null;
  voided?: boolean;
};

export type StatementViewData = {
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  statements: Array<{
    term: string;
    academicYear?: string;
    description: string;
    items?: Array<{ description: string; amount: number }>;
    amount: number;
    paid: number;
    balance: number;
    status: string;
  }>;
  payments: Array<{
    date: string;
    description: string;
    amount: number;
    method: string;
    receiptNumber?: string | null;
  }>;
};
