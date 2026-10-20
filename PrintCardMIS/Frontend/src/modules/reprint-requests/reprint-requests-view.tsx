'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  completeReprintRequest,
  fetchReprintRequests,
  fetchSchools,
  formatPrintDate,
  reviewReprintRequest,
  type PrintCardSchool,
  type ReprintReason,
  type ReprintRequest,
  type ReprintRequestStatus,
} from '@/services/print-card-api';

const STATUS_OPTIONS: { value: ReprintRequestStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PRINTED', label: 'Printed' },
  { value: 'COMPLETED', label: 'Completed' },
];

function statusLabel(status: ReprintRequestStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

const REASON_OPTIONS: { value: ReprintReason | ''; label: string }[] = [
  { value: '', label: 'All reasons' },
  { value: 'LOST', label: 'Lost' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'STORED', label: 'Stored' },
  { value: 'INCORRECT_INFORMATION', label: 'Incorrect Information' },
  { value: 'OTHER', label: 'Other' },
];

function statusTone(status: ReprintRequestStatus): string {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-900';
  if (status === 'APPROVED') return 'bg-blue-100 text-blue-800';
  if (status === 'REJECTED') return 'bg-red-100 text-red-800';
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-700';
}

function reasonLabel(reason: ReprintReason): string {
  return REASON_OPTIONS.find((r) => r.value === reason)?.label ?? reason;
}

export function ReprintRequestsView() {
  const { session } = useAuth();
  const isPlatform = session?.canSelectSchools ?? session?.isSuperAdmin ?? false;

  const [schools, setSchools] = useState<PrintCardSchool[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [status, setStatus] = useState<ReprintRequestStatus | ''>('');
  const [reason, setReason] = useState<ReprintReason | ''>('');
  const [personKind, setPersonKind] = useState<'STUDENT' | 'STAFF' | ''>('');
  const [rows, setRows] = useState<ReprintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!isPlatform) return;
    void fetchSchools().then(setSchools).catch(() => setSchools([]));
  }, [isPlatform]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReprintRequests({
        organizationId: organizationId || undefined,
        status: status || undefined,
        reason: reason || undefined,
        personKind: personKind || undefined,
      });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, status, reason, personKind]);

  useEffect(() => {
    void load();
  }, [load]);

  const detail = rows.find((r) => r.id === detailId) ?? null;

  async function handleReview(action: 'APPROVE' | 'REJECT') {
    if (!detail) return;
    if (action === 'REJECT' && !rejectReason.trim()) {
      alert('Rejection reason is required');
      return;
    }
    setActing(true);
    try {
      await reviewReprintRequest(detail.id, action, action === 'REJECT' ? rejectReason.trim() : undefined);
      setDetailId(null);
      setRejectReason('');
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  async function handleComplete() {
    if (!detail) return;
    setActing(true);
    try {
      await completeReprintRequest(detail.id);
      setDetailId(null);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy">Reprint Requests</h1>
        <p className="mt-1 text-sm text-muted">
          {isPlatform ? 'Review replacement card requests from all schools.' : 'Track your school’s reprint requests.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-white p-4">
        {isPlatform && (
          <label className="min-w-[180px] space-y-1">
            <span className="text-[11px] font-bold uppercase text-muted">School</span>
            <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="input">
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-muted">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ReprintRequestStatus | '')} className="input">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-muted">Card type</span>
          <select value={personKind} onChange={(e) => setPersonKind(e.target.value as 'STUDENT' | 'STAFF' | '')} className="input">
            <option value="">All</option>
            <option value="STUDENT">Student</option>
            <option value="STAFF">Staff</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-muted">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value as ReprintReason | '')} className="input">
            {REASON_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Card holder</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-navy">{row.cardRecord?.fullName ?? '—'}</td>
                    <td className="px-4 py-3">{row.personKind === 'STUDENT' ? 'Student' : 'Staff'}</td>
                    <td className="px-4 py-3">{reasonLabel(row.reason)}</td>
                    <td className="px-4 py-3 text-muted">{formatPrintDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetailId(row.id)}
                        className="text-xs font-semibold text-navy hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">No reprint requests match your filters.</p>
            )}
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-navy">Request Details</h2>
              <button type="button" onClick={() => setDetailId(null)} className="rounded-lg p-2 text-muted hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="space-y-3 p-5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Name</dt><dd className="font-medium">{detail.cardRecord?.fullName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">ID</dt><dd className="font-mono">{detail.cardRecord?.personCode}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Reason</dt><dd>{reasonLabel(detail.reason)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Status</dt><dd>{statusLabel(detail.status)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Requested</dt><dd>{formatPrintDate(detail.createdAt)}</dd></div>
              {detail.description && (
                <div><dt className="text-muted">Description</dt><dd className="mt-1 rounded-lg bg-slate-50 p-3">{detail.description}</dd></div>
              )}
              {detail.cardRecord && (
                <>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Print count</dt><dd>{detail.cardRecord.printCount}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Last printed</dt><dd>{formatPrintDate(detail.cardRecord.lastPrintedAt)}</dd></div>
                </>
              )}
              {detail.rejectionReason && (
                <div><dt className="text-muted">Rejection reason</dt><dd className="mt-1 text-red-700">{detail.rejectionReason}</dd></div>
              )}
            </dl>
            {isPlatform && detail.status === 'PENDING' && (
              <div className="space-y-3 border-t border-border px-5 py-4">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase text-muted">Rejection reason (if rejecting)</span>
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input" placeholder="Required when rejecting…" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void handleReview('APPROVE')}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void handleReview('REJECT')}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            )}
            {isPlatform && (detail.status === 'APPROVED' || detail.status === 'PRINTED') && (
              <div className="border-t border-border px-5 py-4">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void handleComplete()}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
                >
                  Mark Completed
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
