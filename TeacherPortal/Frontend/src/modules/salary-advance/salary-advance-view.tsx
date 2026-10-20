'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Droplets,
  Loader2,
  Plus,
  ShoppingBag,
  Smartphone,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { AdvanceStatusBadge, formatRwf } from '@/components/advance-status-badge';
import { AdvanceEligibilityCard } from '@/components/advance-eligibility-card';
import {
  cancelAdvanceRequest,
  createAdvanceRequest,
  fetchCatalog,
  fetchEligibility,
  fetchMyPayroll,
  fetchMyRequests,
} from '@/services/teacher-api';
import { SALARY_ADVANCE } from '@/config/salary-advance-brand';
import type {
  ShuleAvanceCatalog,
  ShuleAvanceCatalogItem,
  ShuleAvanceEligibility,
  ShuleAvanceRequest,
} from '@/types';

const REPAYMENT_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

const SERVICE_ICONS: Record<string, typeof Zap> = {
  zap: Zap,
  smartphone: Smartphone,
  droplets: Droplets,
  'shopping-bag': ShoppingBag,
  wallet: Wallet,
};

function pickServiceIcon(slug: string | null, icon: string | null) {
  if (icon && SERVICE_ICONS[icon]) return SERVICE_ICONS[icon];
  if (slug?.includes('power')) return Zap;
  if (slug?.includes('airtime')) return Smartphone;
  return Wallet;
}

type ModalMode = 'cashout' | 'service' | null;

export function SalaryAdvanceView() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [eligibility, setEligibility] = useState<ShuleAvanceEligibility | null>(null);
  const [catalog, setCatalog] = useState<ShuleAvanceCatalog | null>(null);
  const [requests, setRequests] = useState<ShuleAvanceRequest[]>([]);
  const [payroll, setPayroll] = useState<{ net_salary_rwf: number; employee_number?: string | null; synced_at?: string | null } | null>(null);

  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedService, setSelectedService] = useState<ShuleAvanceCatalogItem | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [term, setTerm] = useState(3);
  const [cashoutSlug, setCashoutSlug] = useState('general');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [elig, cat, req, pay] = await Promise.all([
        fetchEligibility(),
        fetchCatalog(),
        fetchMyRequests(),
        fetchMyPayroll(),
      ]);
      setEligibility(elig);
      setCatalog(cat);
      setRequests(req);
      setPayroll(pay);
      if (cat.cashout[0]) setCashoutSlug(cat.cashout[0].slug);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load Salary Advance Management';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCashout() {
    setModal('cashout');
    setSelectedService(null);
    setAmount('');
    setReason('');
    setTerm(3);
  }

  function openService(item: ShuleAvanceCatalogItem) {
    setModal('service');
    setSelectedService(item);
    setAmount('');
    setReason('');
    setTerm(6);
  }

  function closeModal() {
    setModal(null);
    setSelectedService(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eligibility?.allowed) return;

    const amountRwf = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amountRwf || amountRwf <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createAdvanceRequest({
        request_type: modal === 'cashout' ? 'cashout' : 'service',
        amount_rwf: amountRwf,
        repayment_term_months: term,
        reason: reason || undefined,
        cashout_category_slug: modal === 'cashout' ? cashoutSlug : undefined,
        service_category: modal === 'service' ? selectedService?.slug : undefined,
      });
      setSuccess(result.message ?? 'Request submitted');
      closeModal();
      await loadAll();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit request';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this pending request?')) return;
    try {
      await cancelAdvanceRequest(id);
      setSuccess('Request cancelled');
      await loadAll();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to cancel';
      setError(message);
    }
  }

  const monthlyDeduction =
    amount && term > 0
      ? Math.ceil(parseInt(amount.replace(/\D/g, ''), 10) / term) || 0
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading {SALARY_ADVANCE.name}…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">{SALARY_ADVANCE.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Salary advances repaid through payroll deduction (1–18 months)
          </p>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          disabled={!eligibility?.allowed}
          onClick={openCashout}
        >
          <Plus className="h-4 w-4" />
          Request cashout
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-success/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {eligibility ? (
        <AdvanceEligibilityCard
          eligibility={eligibility}
          employeeNumber={payroll?.employee_number}
          syncedAt={payroll?.synced_at}
        />
      ) : null}

      {eligibility?.allowed ? (
      <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EligibilityCard
          label="Net salary"
          value={formatRwf(eligibility?.net_salary_rwf ?? payroll?.net_salary_rwf ?? 0)}
        />
        <EligibilityCard
          label={`Monthly cap (${eligibility?.max_percent ?? 25}%)`}
          value={formatRwf(eligibility?.monthly_cap_rwf ?? 0)}
        />
        <EligibilityCard
          label="Used this month"
          value={formatRwf(eligibility?.monthly_requested_rwf ?? 0)}
        />
        <EligibilityCard
          label="Remaining"
          value={formatRwf(eligibility?.monthly_remaining_rwf ?? 0)}
          highlight
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-navy">Instant approval limit</p>
          <p className="mt-2 text-2xl font-bold text-navy">
            {formatRwf(eligibility?.auto_approval_remaining_rwf ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Cashouts at or below this amount may be auto-approved
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-navy">Payroll snapshot</p>
          <p className="mt-2 text-2xl font-bold text-navy">
            {formatRwf(payroll?.net_salary_rwf ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted">Synced from Payroll — not stored locally</p>
        </div>
      </div>
      </>
      ) : null}

      {catalog && catalog.services.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-navy">Catalog services</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.services.map((item) => {
              const Icon = pickServiceIcon(item.slug, item.icon);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!eligibility?.allowed}
                  onClick={() => openService(item)}
                  className="rounded-2xl border border-border bg-white p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-navy">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-semibold text-navy">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-navy">My requests</h2>
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
            No salary advance requests yet. Request a cashout or select a catalog service above.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Term</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const pending = ['pending_accountant', 'sent_to_manager'].includes(req.status);
                  return (
                    <tr key={req.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 capitalize text-navy">
                        {req.requestType}
                        {req.serviceCategory ? ` · ${req.serviceCategory}` : ''}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatRwf(req.amountRwf)}</td>
                      <td className="px-4 py-3">{req.repaymentTermMonths} mo</td>
                      <td className="px-4 py-3">
                        <AdvanceStatusBadge status={req.status} />
                        {req.autoApproved && (
                          <span className="ml-1 text-[10px] text-emerald-600">auto</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pending && (
                          <button
                            type="button"
                            onClick={() => handleCancel(req.id)}
                            className="text-xs font-semibold text-danger hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/50"
            onClick={closeModal}
            aria-label="Close"
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy">
                {modal === 'cashout' ? 'Request cashout' : selectedService?.name}
              </h3>
              <button type="button" onClick={closeModal} className="text-muted hover:text-navy">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modal === 'cashout' && catalog && catalog.cashout.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Category</label>
                  <select
                    className="input"
                    value={cashoutSlug}
                    onChange={(e) => setCashoutSlug(e.target.value)}
                  >
                    {catalog.cashout.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Amount (RWF)</label>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  Repayment term (months)
                </label>
                <select
                  className="input"
                  value={term}
                  onChange={(e) => setTerm(parseInt(e.target.value, 10))}
                >
                  {REPAYMENT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} month{m === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
                {monthlyDeduction > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    ≈ {formatRwf(monthlyDeduction)}/month payroll deduction
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Reason</label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EligibilityCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlight ? 'border-primary bg-primary/5' : 'border-border bg-white'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold text-navy">{value}</p>
    </div>
  );
}
