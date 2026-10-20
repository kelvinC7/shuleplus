'use client';

import { useState } from 'react';
import { Wallet, Plus, CreditCard, ArrowDownCircle, ArrowUpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatCurrency, formatTime } from '@/lib/format';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  balanceAfter: number;
}

interface WalletResponse {
  balance: number;
  currency: string;
  cardNumber: string;
  studentName: string;
  lastTopUp: string | null;
  lastTopUpAmount: number | null;
  recentTransactions: WalletTransaction[];
}

const TOP_UP_PRESETS = [5000, 10000, 20000, 50000];

export default function ShuleCardPage() {
  const { data, loading, error, reload } = useStudentFetch<WalletResponse>('/wallet');
  const { studentParams } = useAuth();
  const [amount, setAmount] = useState<string>('10000');
  const [method, setMethod] = useState('Mobile Money');
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wallet = data;

  const topUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setTopUpError('Enter a valid top-up amount.');
      return;
    }
    setSubmitting(true);
    setTopUpError(null);
    setSuccess(null);
    try {
      await api.post('/wallet/topup', { amount: value, method, ...studentParams });
      setSuccess(`${formatCurrency(value, wallet?.currency ?? 'RWF')} added to your ShuleCard.`);
      reload();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Top-up failed. Please try again.';
      setTopUpError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Smart ShuleCard"
        title="ShuleCard Wallet"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Card visual */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ) : error ? (
            <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load wallet" description={error} />
          ) : wallet ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy to-navy-light p-6 text-white shadow-soft-lg sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-primary/10 blur-2xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">ShuleCard</p>
                  <p className="mt-1 text-xl font-bold">{wallet.studentName}</p>
                </div>
                <CreditCard className="size-8 text-primary/70" />
              </div>

              <p className="relative mt-8 font-mono text-lg tracking-[0.2em] text-white/90">
                {wallet.cardNumber || '•••• •••• •••• ••••'}
              </p>

              <div className="relative mt-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Available Balance</p>
                  <p className="mt-1 text-3xl font-bold text-primary">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </p>
                </div>
                {wallet.lastTopUp && (
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">Last Top-up</p>
                    <p className="mt-1 text-sm font-semibold text-white/90">
                      {formatCurrency(wallet.lastTopUpAmount ?? 0, wallet.currency)}
                    </p>
                    <p className="text-xs text-white/60">{formatDate(wallet.lastTopUp)}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Transactions */}
          <div className="hr-card mt-6 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-bold text-navy">Recent Transactions</h2>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {wallet?.recentTransactions?.length ?? 0} entries
              </span>
            </div>
            {!wallet || wallet.recentTransactions.length === 0 ? (
              <div className="p-8">
                <EmptyState title="No transactions yet" description="Top-ups and purchases will appear here." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/70">
                    <th className="px-6 py-3 text-left font-semibold text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.recentTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-navy">{t.description}</p>
                        <p className="text-xs text-slate-400">{formatTime(t.date)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', t.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                          {t.type === 'CREDIT' ? <ArrowDownCircle className="size-3.5" /> : <ArrowUpCircle className="size-3.5" />}
                          {t.type}
                        </span>
                      </td>
                      <td className={cn('px-4 py-3.5 text-right font-bold', t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600')}>
                        {t.type === 'CREDIT' ? '+' : '-'}{t.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-navy">{t.balanceAfter.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top-up form */}
        <div className="lg:col-span-2">
          <div className="hr-card p-6">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-primary" />
              <h2 className="font-bold text-navy">Top Up Card</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Add funds to your child's ShuleCard instantly.</p>

            <form onSubmit={topUp} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount (RWF)</label>
                <input
                  type="number"
                  min="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  placeholder="e.g. 10,000"
                />
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {TOP_UP_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(String(p))}
                      className={cn(
                        'rounded-xl border px-2 py-2 text-xs font-bold transition-all',
                        Number(amount) === p
                          ? 'border-primary bg-primary/15 text-ochre'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-primary/40'
                      )}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              {topUpError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{topUpError}</p>
              )}
              {success && (
                <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" /> {success}
                  </span>
                </p>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Top Up Now
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="hr-card mt-6 p-6">
            <h2 className="font-bold text-navy">How it works</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-500">
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-ochre">1</span>
                Top up any amount using mobile money or bank transfer.
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-ochre">2</span>
                Your child uses the card for canteen, store and transport.
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-ochre">3</span>
                Track spending in real time on this page.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
