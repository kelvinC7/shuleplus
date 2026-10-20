'use client';

import { useEffect, useState } from 'react';
import { X, Download, Printer, Send } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import {
  ModernReceiptCard,
  type ReceiptViewData,
  type SchoolBranding,
} from '@/modules/collections/modern-receipt-card';
import { downloadReceiptAsPdf, printReceiptPdf } from '@/utils/download-receipt-pdf';

type ReceiptDetail = {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  amountPaid: number;
  outstanding: number;
  method: string;
  qrCode: string | null;
  issuedAt: string;
  lineItems: Array<{ description: string; amount: number }>;
  payment: {
    reference: string | null;
    status: string;
    reversedAt: string | null;
    notes: string | null;
  } | null;
};

type Props = {
  receiptId: string | null;
  onClose: () => void;
  onOpenStudent?: (studentId: string) => void;
};

export function ReceiptDetailDrawer({ receiptId, onClose, onOpenStudent }: Props) {
  const toast = useToast();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [branding, setBranding] = useState<SchoolBranding | null>(null);
  const [verify, setVerify] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    void api.get('/organization/branding').then(({ data }) => setBranding(data.data ?? null));
  }, []);

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null);
      setVerify(null);
      return;
    }
    setLoading(true);
    void api
      .get(`/receipts/${receiptId}`)
      .then(async ({ data }) => {
        const r = data.data as ReceiptDetail;
        setReceipt(r);
        if (r.receiptNumber) {
          const v = await api.get(`/receipts/verify/${encodeURIComponent(r.receiptNumber)}`);
          setVerify({ valid: v.data.data?.valid ?? false, message: v.data.data?.message ?? '' });
        }
      })
      .finally(() => setLoading(false));
    requestAnimationFrame(() => setEntered(true));
  }, [receiptId]);

  if (!receiptId) return null;

  const voided = receipt?.payment?.status === 'REVERSED';

  const viewData: ReceiptViewData | null = receipt
    ? {
        receiptNumber: receipt.receiptNumber,
        studentName: receipt.studentName,
        studentCode: receipt.studentCode,
        className: receipt.className,
        amountPaid: receipt.amountPaid,
        outstanding: receipt.outstanding,
        method: receipt.method,
        issuedAt: receipt.issuedAt,
        reference: receipt.payment?.reference,
        lineItems: receipt.lineItems,
        qrCode: receipt.qrCode,
        voided,
        verifyValid: verify?.valid,
        verifyMessage: verify?.message,
        accountStatus: receipt.outstanding <= 0 ? 'PAID' : 'PARTIAL',
        paymentStatus: voided ? 'REVERSED' : 'COMPLETED',
      }
    : null;

  async function downloadPdf() {
    if (!viewData) return;
    try {
      await downloadReceiptAsPdf(viewData, branding);
      toast.success('Receipt PDF downloaded');
    } catch {
      toast.error('Could not generate receipt PDF');
    }
  }

  async function printPdf() {
    if (!viewData) return;
    try {
      await printReceiptPdf(viewData, branding);
    } catch {
      toast.error('Print failed');
    }
  }

  async function sendToParent() {
    if (!receiptId) return;
    try {
      const { data } = await api.post(`/receipts/${receiptId}/send`);
      toast.success(`Sent to ${data.data?.sent ?? 0} channel(s)`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not send to parent');
    }
  }

  async function voidReceipt() {
    if (!receiptId) return;
    const reason = window.prompt('Reason for voiding this receipt?')?.trim();
    if (!reason) return;
    try {
      await api.post(`/receipts/${receiptId}/void`, { reason });
      toast.success('Receipt voided — audit record kept');
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not void receipt');
    }
  }

  return (
    <div className="fixed inset-0 z-[84] flex justify-end">
      <button type="button" className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className={`relative flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-[-12px_0_40px_rgba(0,4,53,0.14)] transition-transform duration-300 ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-b border-border bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Digital receipt</p>
              <h2 className="text-lg font-bold text-navy">{loading ? 'Loading…' : receipt?.receiptNumber}</h2>
              {receipt?.studentCode ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => onOpenStudent?.(receipt.studentCode!)}
                >
                  {receipt.studentName}
                </button>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-white" />
          ) : viewData ? (
            <ModernReceiptCard branding={branding} receipt={viewData} />
          ) : null}

          {voided && receipt?.payment ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm">
              <p className="font-semibold text-red-800">Reversal record</p>
              <p className="mt-1 text-muted">{receipt.payment.notes ?? 'Duplicate or correction'}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border bg-white px-5 py-4">
          <button type="button" className="btn-secondary text-xs" onClick={() => void downloadPdf()}>
            <Download size={14} /> Download PDF
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => void printPdf()}>
            <Printer size={14} /> Print
          </button>
          {!voided ? (
            <>
              <button type="button" className="btn-secondary text-xs" onClick={() => void sendToParent()}>
                <Send size={14} /> Send to Parent
              </button>
              <button type="button" className="btn-secondary text-xs !text-red-700" onClick={() => void voidReceipt()}>
                Void / Reverse
              </button>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
