'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Eye, Loader2, RefreshCw, Search, School, X, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import {
  fetchShuleTripSchoolRegistrationsAdmin,
  reviewShuleTripSchoolRegistrationAdmin,
  type ShuleTripSchoolRegistrationRow,
} from '@/lib/shule-trip-school-registrations-api';
import { useToast } from '@/shared/notifications';

function statusClass(status: string) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'REJECTED') return 'bg-red-100 text-red-800';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function canReview(status: string) {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'ADDITIONAL_INFO_REQUIRED';
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50/80 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#FCB038]">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-navy">{children}</div>
    </div>
  );
}

function RowDetail({ row }: { row: ShuleTripSchoolRegistrationRow }) {
  const p = (row.payload ?? {}) as Record<string, Record<string, unknown>>;
  const s1 = p.step1 ?? {};
  const s2 = p.step2 ?? {};
  const s3 = p.step3 ?? {};
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailBlock title="School">
        <p>
          <b>Name:</b> {String(s1.officialName ?? row.officialName)}
        </p>
        <p>
          <b>Code:</b> {row.schoolCode}
        </p>
        <p>
          <b>Registration #:</b> {String(s1.rebNumber ?? '—')}
        </p>
        <p>
          <b>Levels:</b> {Array.isArray(s1.levels) ? s1.levels.join(', ') : '—'}
        </p>
        <p>
          <b>Ownership / type:</b> {String(s1.ownership ?? '—')} · {String(s1.schoolType ?? '—')}
        </p>
        <p>
          <b>Contact:</b> {String(s1.email ?? '—')} · {String(s1.phone ?? '—')}
        </p>
      </DetailBlock>
      <DetailBlock title="Location">
        <p>
          {String(s2.districtName ?? '—')}, {String(s2.provinceName ?? '—')}, {String(s2.country ?? '—')}
        </p>
        <p>
          <b>Sector / cell:</b> {String(s2.sectorName ?? '—')} · {String(s2.cellName ?? '—')}
        </p>
        <p>
          <b>Address:</b> {String(s2.physicalAddress ?? '—')}
        </p>
      </DetailBlock>
      <DetailBlock title="Administration">
        <p>
          <b>Head:</b> {String(s3.headName ?? '—')} ({String(s3.headNationalId ?? '—')})
        </p>
        <p>
          <b>Coordinator:</b> {String(s3.coordinatorName ?? '—')} · {String(s3.coordinatorEmail ?? '—')}
        </p>
      </DetailBlock>
      <DetailBlock title="Portal account">
        <p>
          <b>Username:</b> {row.username}
        </p>
        <p>
          <b>Account email:</b> {row.accountEmail}
        </p>
        <p>
          <b>Reference:</b> {row.reference}
        </p>
        <p>
          <b>Submitted:</b> {new Date(row.submittedAt).toLocaleString()}
        </p>
        {row.reviewNote ? (
          <p>
            <b>Review note:</b> {row.reviewNote}
          </p>
        ) : null}
      </DetailBlock>
    </div>
  );
}

export function ShuleTripSchoolRegistrationsView() {
  const toast = useToast();
  const [rows, setRows] = useState<ShuleTripSchoolRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [active, setActive] = useState<ShuleTripSchoolRegistrationRow | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchShuleTripSchoolRegistrationsAdmin());
    } catch {
      toast.error('Could not load registrations', 'Ensure ShuleTrip API is running on port 3076.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.officialName.toLowerCase().includes(q) ||
        r.schoolCode.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.accountEmail.toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => canReview(r.status)).length,
      approved: rows.filter((r) => r.status === 'APPROVED').length,
    }),
    [rows]
  );

  async function decide(id: string, decision: string, reviewNote?: string) {
    setBusyId(id);
    try {
      const noteText = (reviewNote ?? note).trim();
      await reviewShuleTripSchoolRegistrationAdmin(id, {
        decision,
        reviewNote: noteText || undefined,
      });
      toast.success(decision === 'APPROVED' ? 'School approved' : 'Decision saved', rowLabel(id));
      setActive(null);
      setNote('');
      await load();
    } catch {
      toast.error('Action failed', 'Try again or check ShuleTrip backend logs.');
    } finally {
      setBusyId(null);
    }
  }

  function rowLabel(id: string) {
    return rows.find((r) => r.id === id)?.officialName ?? 'School';
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="ShuleTrip school registrations"
        description="Review schools that registered on the ShuleTrip portal. Approve to provision their tenant and allow login."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total', value: stats.total, icon: School },
          { label: 'Awaiting review', value: stats.pending, icon: RefreshCw },
          { label: 'Approved', value: stats.approved, icon: Check },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">{label}</p>
              <Icon className="h-5 w-5 text-[#FCB038]" />
            </div>
            <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25"
            placeholder="Search school, code, reference, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-navy"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-navy hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50/90 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted">
                    No registrations found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-navy">{row.officialName}</p>
                      <p className="text-xs text-muted">{row.schoolCode}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                    <td className="px-4 py-3">
                      <p>{row.accountEmail}</p>
                      <p className="text-xs text-muted">@{row.username}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(row.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${statusClass(row.status)}`}>
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActive(row);
                            setNote(row.reviewNote ?? '');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-navy hover:bg-white"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {canReview(row.status) ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void decide(row.id, 'APPROVED', '')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void decide(row.id, 'REJECTED', '')}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#000435]/60 p-4 backdrop-blur-sm sm:items-center">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={() => setActive(null)} />
          <div className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl">
            <div className="border-b border-navy/8 bg-gradient-to-br from-[#000435] to-[#1a2a6c] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FCB038]">ShuleTrip · School onboarding</p>
                  <h2 className="mt-1 text-xl font-bold">{active.officialName}</h2>
                  <p className="mt-1 text-sm text-white/75">{active.reference}</p>
                </div>
                <button type="button" onClick={() => setActive(null)} className="rounded-xl p-2 text-white/80 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <RowDetail row={active} />
              {canReview(active.status) ? (
                <div className="mt-6">
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Review note (optional)</label>
                  <textarea
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => void decide(active.id, 'APPROVED')}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {busyId === active.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve school
                    </button>
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => void decide(active.id, 'REJECTED')}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
