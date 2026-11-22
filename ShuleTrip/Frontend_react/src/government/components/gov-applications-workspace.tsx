import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
  Loader2,
  PenLine,
  Search,
  Stamp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { useGovApplications } from '@/government/hooks/use-gov-applications';
import type { GovTripRow } from '@/government/components/gov-applications-table';
import { StatusBadge } from '@/components/ui/badge';
import { tripStatusFilterOptions } from '@/shared/trip-status';
import { currentGateLabel, tripMovedPastPageStage, tripOpenForSignOnPage } from '@/government/utils/trip-row-sign';

const PAGE_SIZE = 8;

const inputCls =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25';

export type GovApplicationsWorkspaceProps = {
  title: string;
  description: string;
  stage?: string;
  status?: string;
  queue?: 'actionable';
  emptyMessage: string;
  signActionLabel?: string;
  /** When false, only View is shown (e.g. authorized / monitoring lists). */
  showSignAction?: boolean;
};

function matchSearch(row: GovTripRow, q: string) {
  const hay = [
    row.reference,
    row.title,
    row.destination ?? '',
    row.tenant.organizationName,
    row.tenant.district ?? '',
    row.tenant.sector ?? '',
    row.academicYear ?? '',
    row.term ?? '',
    row.status,
    row.currentStageKey ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function sameDay(iso: string | null | undefined, dateInput: string) {
  if (!iso || !dateInput) return true;
  const d = new Date(iso);
  const f = new Date(dateInput + 'T12:00:00');
  return d.getFullYear() === f.getFullYear() && d.getMonth() === f.getMonth() && d.getDate() === f.getDate();
}

function uniqueSorted(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function GovApplicationsWorkspace({
  title,
  description,
  stage,
  status,
  emptyMessage,
  signActionLabel = 'Review & sign',
  queue,
  showSignAction = true,
}: GovApplicationsWorkspaceProps) {
  const { rows, loading } = useGovApplications({ stage, status, queue });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [dateKind, setDateKind] = useState<'departure' | 'submitted'>('departure');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const statusOptions = useMemo(() => tripStatusFilterOptions(), []);

  const schoolOptions = useMemo(() => uniqueSorted(rows.map((r) => r.tenant.organizationName)), [rows]);
  const sectorOptions = useMemo(() => uniqueSorted(rows.map((r) => r.tenant.sector)), [rows]);
  const yearOptions = useMemo(() => uniqueSorted(rows.map((r) => r.academicYear)), [rows]);
  const termOptions = useMemo(() => uniqueSorted(rows.map((r) => r.term)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (schoolFilter !== 'all' && r.tenant.organizationName !== schoolFilter) return false;
      if (sectorFilter !== 'all' && (r.tenant.sector ?? '') !== sectorFilter) return false;
      if (yearFilter !== 'all' && (r.academicYear ?? '') !== yearFilter) return false;
      if (termFilter !== 'all' && (r.term ?? '') !== termFilter) return false;
      if (dateFilter) {
        const iso = dateKind === 'departure' ? r.departAt : r.submittedAt;
        if (!sameDay(iso, dateFilter)) return false;
      }
      if (q && !matchSearch(r, q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
    });
  }, [rows, search, statusFilter, schoolFilter, sectorFilter, yearFilter, termFilter, dateFilter, dateKind]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
    setSchoolFilter('all');
    setSectorFilter('all');
    setYearFilter('all');
    setTermFilter('all');
    setDateFilter('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => {
    const learners = filtered.reduce((n, r) => n + r._count.participants, 0);
    const docs = filtered.reduce((n, r) => n + r._count.documents, 0);
    const stamped = filtered.filter((r) => (r.approvals?.length ?? 0) > 0).length;
    return {
      total: filtered.length,
      learners,
      docs,
      stamped,
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Trips in this list', value: stats.total, icon: FileCheck, tone: 'navy' },
          { label: 'Learners covered', value: stats.learners, icon: Users, tone: 'blue' },
          { label: 'Evidence documents', value: stats.docs, icon: Stamp, tone: 'amber' },
          { label: 'With prior signatures', value: stats.stamped, icon: PenLine, tone: 'green' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-extrabold text-[#000435]">{value}</p>
              </div>
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                  tone === 'amber'
                    ? 'bg-[#FCB038]/20 text-[#000435]'
                    : tone === 'green'
                      ? 'bg-emerald-100 text-emerald-800'
                      : tone === 'blue'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-[#000435] text-[#FCB038]'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-slate-50/90 px-4 py-4 sm:px-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search reference, school, trip, destination…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              School
              <select className={`${inputCls} mt-1 py-2 text-xs`} value={schoolFilter} onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}>
                <option value="all">All schools</option>
                {schoolOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Sector
              <select className={`${inputCls} mt-1 py-2 text-xs`} value={sectorFilter} onChange={(e) => { setSectorFilter(e.target.value); setPage(1); }}>
                <option value="all">All sectors</option>
                {sectorOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Academic year
              <select className={`${inputCls} mt-1 py-2 text-xs`} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}>
                <option value="all">All years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Term
              <select className={`${inputCls} mt-1 py-2 text-xs`} value={termFilter} onChange={(e) => { setTermFilter(e.target.value); setPage(1); }}>
                <option value="all">All terms</option>
                {termOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Date type
              <select className={`${inputCls} mt-1 py-2 text-xs`} value={dateKind} onChange={(e) => { setDateKind(e.target.value as 'departure' | 'submitted'); setPage(1); }}>
                <option value="departure">Departure date</option>
                <option value="submitted">Submitted date</option>
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Specific date
              <input type="date" className={`${inputCls} mt-1 py-2 text-xs`} value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Status
              <select className={`${inputCls} mt-1 py-2 text-xs`} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
              {sectorOptions.length === 0 && schoolOptions.length > 0 ? ' · sectors appear when set on school tenants' : ''}
            </p>
            <button type="button" onClick={resetFilters} className="text-xs font-bold text-[#000435] underline-offset-2 hover:underline">
              Reset filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FCB038]" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-navy">No applications match</p>
            <p className="mt-1 text-sm text-slate-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-[#000435] text-xs uppercase tracking-wide text-white/85">
                  <tr>
                    <th className="w-12 px-3 py-3.5 font-bold">#</th>
                    <th className="px-4 py-3.5 font-bold">Reference</th>
                    <th className="px-4 py-3.5 font-bold">School</th>
                    <th className="px-4 py-3.5 font-bold">Trip</th>
                    <th className="px-4 py-3.5 font-bold">Submitted</th>
                    <th className="px-4 py-3.5 font-bold">Departure</th>
                    <th className="px-4 py-3.5 font-bold">Manifest</th>
                    <th className="px-4 py-3.5 font-bold">Prior signatures</th>
                    <th className="px-4 py-3.5 font-bold">Status</th>
                    <th className="px-4 py-3.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t, idx) => {
                    const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="px-3 py-3.5 text-xs font-bold text-slate-400">{rowNum}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#000435]">{t.reference}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{t.tenant.organizationName}</p>
                          <p className="text-xs text-slate-500">
                            {[t.tenant.district, t.tenant.sector].filter(Boolean).join(' · ') || 'Jurisdiction unset'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-500">{t.destination ?? 'No destination'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {t.submittedAt
                            ? new Date(t.submittedAt).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {t.departAt
                            ? new Date(t.departAt).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          <span className="font-semibold">{t._count.participants}</span>
                          <span className="text-slate-400"> learners · </span>
                          <span className="font-semibold">{t._count.documents}</span>
                          <span className="text-slate-400"> docs</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {(t.approvals?.filter((a) => a.decision === 'APPROVED').length ?? 0) > 0 ? (
                            <div className="space-y-1">
                              {t.approvals!
                                .filter((a) => a.decision === 'APPROVED')
                                .slice(-2)
                                .map((a) => (
                                <div
                                  key={`${a.stampReference ?? a.stageLabel}`}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-[10px]"
                                >
                                  <span className="font-bold text-emerald-900">{a.signatureName ?? 'Signed'}</span>
                                  {a.stampReference ? (
                                    <span className="mt-0.5 block font-mono text-emerald-800/80">{a.stampReference}</span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">None yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <Link
                              to={`/government/review/${t.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-navy hover:bg-slate-50"
                              title="View file"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {showSignAction && t.status === 'CORRECTION_REQUESTED' ? (
                              <span className="inline-flex max-w-[9rem] items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-bold leading-tight text-amber-950">
                                Awaiting school corrections
                              </span>
                            ) : showSignAction && tripOpenForSignOnPage(t, stage) ? (
                              <Link
                                to={`/government/review/${t.id}?attest=1`}
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-sm hover:brightness-105 ${
                                  t.status === 'RESUBMITTED'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-[#FCB038] text-[#000435]'
                                }`}
                                title="Open attestation & signature"
                              >
                                <PenLine className="h-3.5 w-3.5" />
                                {t.status === 'RESUBMITTED' ? 'Review resubmission' : signActionLabel}
                              </Link>
                            ) : showSignAction && tripMovedPastPageStage(t, stage) ? (
                              <span className="inline-flex max-w-[9rem] flex-col rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold leading-tight text-slate-700">
                                <span>Processed</span>
                                <span className="font-medium text-slate-500">Now at {currentGateLabel(t.currentStageKey)}</span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row sm:px-6">
              <p className="text-xs text-slate-500">
                Page {safePage} of {totalPages} · showing {paginated.length} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
