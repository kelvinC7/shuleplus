import { api } from '@/services/api';
import type { ReceiptViewData, SchoolBranding } from '@/utils/fee-documents';
import { receiptPublicUrl } from '@/utils/receipt-qr';

export type PaymentLike = {
  date: string;
  description?: string;
  amount: number;
  method?: string;
  reference?: string | null;
  receiptUrl?: string | null;
  receiptNumber?: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  remainingBalance?: number;
  previousBalance?: number;
  lineItems?: Array<{ description: string; amount: number }>;
};

export async function loadParentReceipt(
  payment: PaymentLike,
  fallback?: { studentName?: string | null; studentCode?: string | null; className?: string | null; branding?: SchoolBranding | null }
): Promise<{ receipt: ReceiptViewData; branding: SchoolBranding | null }> {
  const number =
    payment.receiptNumber ||
    (payment.receiptUrl?.match(/\/r\/([^/?#]+)/)?.[1] && decodeURIComponent(payment.receiptUrl.match(/\/r\/([^/?#]+)/)![1]));

  if (number) {
    try {
      const { data } = await api.get<{ success: boolean; data: ReceiptViewData & { branding?: SchoolBranding | null } }>(
        `/fees/receipts/${encodeURIComponent(number)}`
      );
      const remote = (data as { data?: ReceiptViewData & { branding?: SchoolBranding | null } }).data ?? data;
      if (remote && 'receiptNumber' in remote) {
        return { receipt: remote, branding: remote.branding ?? fallback?.branding ?? null };
      }
    } catch {
      /* use local fields */
    }
  }

  const receiptNumber = number || payment.reference || 'RECEIPT';
  return {
    branding: fallback?.branding ?? null,
    receipt: {
      receiptNumber,
      studentName: payment.studentName || fallback?.studentName || 'Student',
      studentCode: payment.studentCode || fallback?.studentCode,
      className: payment.className || fallback?.className,
      academicYear: payment.academicYear,
      term: payment.term,
      amountPaid: payment.amount,
      outstanding: payment.remainingBalance ?? 0,
      method: payment.method || 'CASH',
      issuedAt: payment.date,
      reference: payment.reference,
      lineItems: payment.lineItems?.length
        ? payment.lineItems
        : [{ description: payment.description || 'School Fees', amount: payment.amount }],
      qrCode: receiptPublicUrl(receiptNumber, payment.receiptUrl),
    },
  };
}
