'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react';
import { api, ensureAccessToken } from '@/lib/api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  SmsCard,
  SmsDataPanel,
  SmsPageShell,
  SmsStatCard,
  SmsStatusPill,
  smsBtnNavy,
  smsBtnOutline,
  smsInputClass,
} from '@/components/super-admin/sms-bulk/sms-page-shell';

type Stats = {
  pendingApproval: number;
  pendingPayment: number;
  activated: number;
  rejected: number;
};

type PurchaseRow = {
  id: string;
  purchaseRef: string;
  status: string;
  paymentStatus: string;
  totalAmountRwf: number;
  totalSegments: number;
  organizationName: string;
  organizationCode: string | null;
  parentPhoneMasked: string;
  payerPhoneMasked: string;
  momoReference: string | null;
  paymentSubmittedAt: string | null;
  packageTitle: string;
  packageKind: string | null;
  lineCount: number;
  creditsActivated: boolean;
  createdAt: string;
  rejectionReason?: string | null;
  lines?: Array<{
    studentName: string;
    studentCode?: string | null;
    className?: string | null;
    schoolName?: string | null;
    amountRwf: number;
    segmentAllowance: number;
  }>;
};

const TABS = [
  { id: 'review', label: 'Needs review', desc: 'MoMo reference submitted' },
  { id: 'awaiting_payment', label: 'Awaiting payment', desc: 'Order created, no reference yet' },
  { id: 'recent', label: 'Recent', desc: 'Last activity' },
] as const;

function formatMoney(n: number) {
  return `RWF ${n.toLocaleString()}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function ParentPurchasesApprovalView() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('review');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PurchaseRow | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('Not signed in');
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, listRes] = await Promise.all([
        api.get<{ data: Stats }>('/super-admin/sms/parent-purchases/stats', { headers }),
        api.get<{ data: PurchaseRow[] }>('/super-admin/sms/parent-purchases', {
          headers,
          params: { bucket: tab, search: debouncedSearch || undefined },
        }),
      ]);
      setStats(statsRes.data.data);
      setRows(listRes.data.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load parent purchases');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingTotal = useMemo(
    () => (stats?.pendingApproval ?? 0) + (stats?.pendingPayment ?? 0),
    [stats]
  );

  async function activate(purchaseId: string) {
    setActing(true);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('Not signed in');
      await api.post(
        `/super-admin/sms/parent-purchases/${encodeURIComponent(purchaseId)}/activate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payment verified — SMS credits activated');
      setSelected(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Activation failed');
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    if (!selected || rejectReason.trim().length < 3) {
      toast.error('Enter a short reason for the parent');
      return;
    }
    setActing(true);
    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('Not signed in');
      await api.post(
        `/super-admin/sms/parent-purchases/${encodeURIComponent(selected.id)}/reject`,
        { reason: rejectReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Purchase rejected — parent can retry with a valid reference');
      setRejectOpen(false);
      setRejectReason('');
      setSelected(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setActing(false);
    }
  }

  const canReview = selected?.status === 'PENDING_APPROVAL';

  return (
    <SmsPageShell
      title="Parent SMS purchases"
      description="Verify MTN Mobile Money payments from the parent portal and activate SMS credits once — no duplicates."
      actions={
        <button type="button" className={smsBtnOutline} onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SmsStatCard
          icon={<Clock className="h-5 w-5" />}
          label="Awaiting review"
          value={stats?.pendingApproval ?? '—'}
          hint="Reference submitted"
          tone="amber"
        />
        <SmsStatCard
          icon={<Smartphone className="h-5 w-5" />}
          label="Awaiting payment"
          value={stats?.pendingPayment ?? '—'}
          hint="No MoMo reference yet"
          tone="sky"
        />
        <SmsStatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Activated"
          value={stats?.activated ?? '—'}
          hint="Credits granted"
          tone="emerald"
        />
        <SmsStatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Rejected"
          value={stats?.rejected ?? '—'}
          hint="Not verified"
          tone="rose"
        />
      </div>

      {pendingTotal > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p>
            <strong>{pendingTotal}</strong> parent purchase{pendingTotal === 1 ? '' : 's'} need attention. Only
            activate after you confirm the MoMo transaction — USSD dial alone is not proof of payment.
          </p>
        </div>
      ) : null}

      <SmsCard className="space-y-4 !p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t.id ? 'bg-navy text-white' : 'bg-slate-100 text-navy hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={`${smsInputClass} pl-9`}
              placeholder="Reference, school, student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <SmsDataPanel loading={loading}>
          {rows.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted">No purchases in this view.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-navy">{row.purchaseRef}</span>
                        <SmsStatusPill status={statusLabel(row.status)} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        {row.organizationName}
                        {row.organizationCode ? ` · ${row.organizationCode}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {row.packageTitle} · {row.lineCount} child{row.lineCount === 1 ? '' : 'ren'} ·{' '}
                        {formatWhen(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start sm:items-end">
                      <p className="text-base font-semibold text-navy">{formatMoney(row.totalAmountRwf)}</p>
                      <p className="text-xs text-muted">{row.totalSegments.toLocaleString()} segments</p>
                      {row.momoReference ? (
                        <p className="mt-1 font-mono text-[11px] text-sky-800">Ref: {row.momoReference}</p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SmsDataPanel>
      </SmsCard>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40 backdrop-blur-[2px]">
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-lg"
            role="dialog"
            aria-labelledby="purchase-detail-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Purchase review</p>
                <h2 id="purchase-detail-title" className="text-lg font-semibold text-navy">
                  {selected.purchaseRef}
                </h2>
                <p className="text-sm text-muted">{selected.organizationName}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailTile label="Amount" value={formatMoney(selected.totalAmountRwf)} />
                <DetailTile label="Segments" value={selected.totalSegments.toLocaleString()} />
                <DetailTile label="Payment" value={statusLabel(selected.paymentStatus)} />
                <DetailTile label="Package" value={selected.packageTitle} />
              </div>

              <div className="rounded-xl border border-border bg-slate-50/80 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mobile money</p>
                <p className="mt-2">
                  Payer: <strong>{selected.payerPhoneMasked}</strong>
                </p>
                <p className="mt-1">
                  Parent line: <strong>{selected.parentPhoneMasked}</strong>
                </p>
                {selected.momoReference ? (
                  <p className="mt-2 font-mono text-base font-semibold text-navy">{selected.momoReference}</p>
                ) : (
                  <p className="mt-2 text-muted">No transaction reference submitted yet.</p>
                )}
                {selected.paymentSubmittedAt ? (
                  <p className="mt-1 text-xs text-muted">Submitted {formatWhen(selected.paymentSubmittedAt)}</p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Children & allocation</p>
                <ul className="space-y-2">
                  {(selected.lines ?? []).map((line, i) => (
                    <li key={i} className="rounded-lg border border-border px-3 py-2.5 text-sm">
                      <p className="font-semibold text-navy">{line.studentName}</p>
                      <p className="text-xs text-muted">
                        {[line.className, line.studentCode, line.schoolName].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-1 text-xs">
                        {formatMoney(line.amountRwf)} · {line.segmentAllowance} segments
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.rejectionReason ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{selected.rejectionReason}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row">
              {canReview ? (
                <>
                  <button
                    type="button"
                    className={`${smsBtnNavy} flex-1`}
                    disabled={acting}
                    onClick={() => void activate(selected.id)}
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Verify & activate credits
                  </button>
                  <button
                    type="button"
                    className={`${smsBtnOutline} flex-1 border-rose-200 text-rose-800 hover:bg-rose-50`}
                    disabled={acting}
                    onClick={() => setRejectOpen(true)}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <p className="text-center text-sm text-muted sm:flex-1">
                  {selected.status === 'PENDING_PAYMENT'
                    ? 'Waiting for the parent to submit a MoMo reference.'
                    : 'This purchase is already finalized.'}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {rejectOpen && selected ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-navy">Reject payment</h3>
            <p className="mt-1 text-sm text-muted">
              The parent will see this reason in their purchase history and can try again with a valid reference.
            </p>
            <textarea
              className={`${smsInputClass} mt-3 min-h-[88px] resize-y`}
              placeholder="e.g. Transaction ID not found on MTN statement"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={smsBtnOutline} onClick={() => setRejectOpen(false)} disabled={acting}>
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={acting}
                onClick={() => void reject()}
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SmsPageShell>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
