'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ModernReceiptCard,
  type ReceiptViewData,
  type SchoolBranding,
} from '@/modules/collections/modern-receipt-card';
import { resolveFeesApiUrl } from '@/lib/resolve-api-url';

type PublicReceipt = ReceiptViewData & { branding?: SchoolBranding | null };

export default function PublicReceiptPage() {
  const params = useParams<{ receiptNumber: string }>();
  const receiptNumber = decodeURIComponent(params.receiptNumber ?? '');
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!receiptNumber) return;
    setLoading(true);
    void fetch(`${resolveFeesApiUrl()}/public/receipts/${encodeURIComponent(receiptNumber)}`)
      .then(async (res) => {
        const json = (await res.json()) as { success?: boolean; data?: PublicReceipt; message?: string };
        if (!res.ok || !json.data) {
          throw new Error(json.message ?? 'Receipt not found');
        }
        setReceipt(json.data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Receipt not found');
      })
      .finally(() => setLoading(false));
  }, [receiptNumber]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Shule+ verified receipt
        </p>
        {loading ? (
          <div className="h-[520px] animate-pulse rounded-2xl bg-white shadow-sm" />
        ) : error || !receipt ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-navy">Receipt not found</h1>
            <p className="mt-2 text-sm text-muted">{error || 'This receipt number is not valid.'}</p>
          </div>
        ) : (
          <ModernReceiptCard branding={receipt.branding ?? null} receipt={receipt} />
        )}
      </div>
    </main>
  );
}
