'use client';

import { useEffect, useState } from 'react';
import { resolvePublicAssetUrl } from '@/utils/asset-url';
import { generateReceiptQrDataUrl, receiptPublicUrl } from '@/utils/receipt-qr';

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
  verifyValid?: boolean;
  verifyMessage?: string;
  accountStatus?: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_PAID';
  paymentStatus?: 'COMPLETED' | 'PENDING' | 'REVERSED';
};

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function amount(n: number) {
  return Math.round(n).toLocaleString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[32%_1fr] gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-bold text-navy">{value || '—'}</span>
    </div>
  );
}

function ReceiptQr({ value }: { value: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    void generateReceiptQrDataUrl(value).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className="h-[112px] w-[112px] animate-pulse rounded-lg bg-slate-100" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Scan to verify receipt" width={112} height={112} className="rounded-lg bg-white" />
  );
}

type Props = {
  branding: SchoolBranding | null;
  receipt: ReceiptViewData;
  compact?: boolean;
};

export function ModernReceiptCard({ branding, receipt, compact }: Props) {
  const logo = resolvePublicAssetUrl(branding?.logoUrl);
  const stamp = resolvePublicAssetUrl(branding?.stampUrl);
  const signature = resolvePublicAssetUrl(branding?.signatureUrl);
  const lines = receipt.lineItems?.length
    ? receipt.lineItems
    : [{ description: 'School fees', amount: receipt.amountPaid }];
  const previousBalance = receipt.amountPaid + receipt.outstanding;
  const verifyUrl = receiptPublicUrl(receipt.receiptNumber, receipt.qrCode);
  const contactParts = [
    branding?.phone,
    branding?.email,
    branding?.address,
    branding?.district,
  ].filter(Boolean);

  return (
    <article
      id="modern-receipt-print"
      className={`bg-white px-6 py-5 text-navy ${
        compact ? '' : 'rounded-2xl border border-border shadow-[0_8px_30px_rgba(0,4,53,0.08)]'
      }`}
      style={{ width: '210mm', maxWidth: '100%' }}
    >
      <header className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ShulePlus" className="mx-auto h-14 w-auto object-contain" />
        <h1 className="mt-3 text-xl font-bold tracking-tight">FEE RECEIPT</h1>
        <p className="mt-1 text-sm font-bold text-muted">{receipt.receiptNumber}</p>
        {receipt.voided ? (
          <span className="mt-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
            VOIDED
          </span>
        ) : null}
      </header>

      <div className="mt-5 grid gap-4 rounded-xl bg-slate-100 p-4 sm:grid-cols-2">
        <div className="flex gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt="School logo"
              className="h-14 w-14 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
            />
          ) : null}
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">School</p>
            <p className="mt-0.5 text-sm font-bold">{branding?.schoolName ?? 'School'}</p>
            {contactParts.length > 0 ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{contactParts.join(' · ')}</p>
            ) : null}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Date issued</p>
          <p className="mt-0.5 text-sm font-bold">{formatDate(receipt.issuedAt)}</p>
          {receipt.accountStatus === 'PAID' && !receipt.voided ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700">Fully paid</p>
          ) : null}
          {receipt.accountStatus === 'PARTIAL' && !receipt.voided ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">Partial payment</p>
          ) : null}
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-3">
          <p className="text-sm font-bold">STUDENT DETAILS</p>
          <span className="mt-1 block h-0.5 w-12 rounded-full bg-primary" />
        </div>
        <div className="space-y-2">
          <DetailRow label="Student" value={receipt.studentName} />
          <DetailRow label="Class" value={receipt.className ?? ''} />
          <DetailRow label="Student code" value={receipt.studentCode ?? ''} />
          {receipt.academicYear || receipt.term ? (
            <DetailRow
              label="Period"
              value={[receipt.academicYear, receipt.term].filter(Boolean).join(' · ')}
            />
          ) : null}
          <DetailRow label="Payment method" value={receipt.method.replace(/_/g, ' ')} />
          {receipt.reference ? <DetailRow label="Reference" value={receipt.reference} /> : null}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-navy text-[10px] uppercase tracking-wide text-white">
              <th className="px-3 py-2.5 font-semibold">Fee item</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item, i) => (
              <tr key={`${item.description}-${i}`} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium">{item.description}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums">{amount(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Previous balance</span>
          <span className="font-bold tabular-nums">{money(previousBalance)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Amount paid</span>
          <span className="font-bold tabular-nums">{money(receipt.amountPaid)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Balance remaining</span>
          <span className="font-bold tabular-nums">{money(receipt.outstanding)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-4 py-3">
          <span className="text-sm font-bold">TOTAL PAID</span>
          <span className="text-base font-bold tabular-nums">{money(receipt.amountPaid)}</span>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-border pt-5">
        {verifyUrl ? (
          <div className="flex items-center gap-3">
            <ReceiptQr value={verifyUrl} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Scan to verify</p>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-[11px] font-semibold text-primary hover:underline"
              >
                Open modern receipt
              </a>
              {receipt.verifyValid != null ? (
                <p className={`mt-1 text-[11px] font-semibold ${receipt.verifyValid ? 'text-emerald-700' : 'text-red-700'}`}>
                  {receipt.verifyValid ? 'Verified receipt' : 'Invalid receipt'}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <span />
        )}

        <div className="ml-auto text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">School Fees Office</p>
          <div className="mt-2 flex items-end justify-end gap-3">
            {signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature} alt="Signature" className="h-12 max-w-[120px] object-contain" />
            ) : (
              <div className="h-12 w-28 border-b border-border" />
            )}
            {stamp ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stamp} alt="Official stamp" className="h-16 w-16 object-contain" />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
