'use client';

import Link from 'next/link';
import type { FeeSummary, WalletSummary } from '@/types';

function fmt(amount: number, currency: string) {
  return `${amount.toLocaleString()} ${currency}`;
}

export function YoFeesWalletRow({
  fees,
  wallet,
  termLabel,
}: {
  fees: FeeSummary;
  wallet: WalletSummary;
  termLabel: string;
}) {
  const currency = fees.currency || wallet.currency || 'RWF';
  const due = fees.outstanding ?? 0;
  const billed = fees.totalBilled ?? 0;
  const paid = fees.totalPaid ?? 0;
  const pct = billed > 0 ? Math.min(100, Math.round((paid / billed) * 100)) : due <= 0 ? 100 : 0;

  const recentSpend = wallet.recentTransactions?.[0];
  const spentHint = recentSpend
    ? `Last purchase ${fmt(Math.abs(recentSpend.amount ?? 0), currency)}`
    : wallet.lastTopUpAmount
      ? `Last top-up ${fmt(wallet.lastTopUpAmount, currency)}`
      : 'Top up for canteen & store';

  return (
    <div className="grid gap-4 min-[700px]:grid-cols-[1.6fr_1fr]">
      <section className="flex flex-col gap-4 rounded-[24px] bg-gradient-to-br from-[#13213D] to-[#24396A] p-6 text-white shadow-[0_14px_34px_rgba(19,33,61,0.25)]">
        <div>
          <p className="text-[13px] font-semibold text-[#a9b7d6]">Fees due · {termLabel || 'This term'}</p>
          <p className="mt-1.5 text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            {fmt(due, currency)}
          </p>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-lg bg-white/20">
            <div
              className="h-full rounded-lg bg-[var(--yo-amber)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs font-semibold text-[#c9d1e3]">
            <span>{pct}% paid</span>
            <span>
              {fmt(paid, currency)} of {fmt(billed || due + paid, currency)}
            </span>
          </div>
        </div>
        <Link
          href="/fees"
          className="yo-btn inline-flex w-full justify-center bg-[var(--yo-amber)] text-[var(--yo-navy)] min-[700px]:w-auto min-[700px]:self-start"
        >
          Pay fees
        </Link>
      </section>

      <section className="hr-card flex flex-col justify-between gap-4 rounded-[24px] p-6">
        <div>
          <p className="text-[13px] font-semibold text-[var(--yo-muted)]">ShuleCard balance</p>
          <p className="mt-1.5 text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold tracking-[-0.03em] text-[var(--yo-navy)]">
            {fmt(wallet.balance ?? 0, currency)}
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--yo-muted)]">{spentHint}</p>
        </div>
        <Link
          href="/profile"
          className="yo-btn yo-btn-line inline-flex w-full justify-center border-[var(--yo-line)] bg-white min-[700px]:w-auto min-[700px]:self-start"
        >
          Top up card
        </Link>
      </section>
    </div>
  );
}
