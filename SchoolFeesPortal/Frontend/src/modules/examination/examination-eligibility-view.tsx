'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';

export type EligibilityView = 'lists' | 'exceptions' | 'published' | 'reports';

type AcademicContext = {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  classes: { id: string; name: string; label: string }[];
};

type StudentRow = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  totalFees: number;
  paidAmount: number;
  balance: number;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID';
  financialStatus: 'CLEARED' | 'NOT_CLEARED';
  decision: 'AUTO_ALLOWED' | 'NOT_ALLOWED' | 'MANUALLY_ALLOWED' | 'MANUALLY_BLOCKED';
  exceptionReason: string | null;
  exceptionNote: string | null;
  exceptionReference: string | null;
  exceptionByName: string | null;
  exceptionAt: string | null;
  allowed: boolean;
};

type Totals = {
  total: number;
  autoCleared: number;
  notCleared: number;
  manualAllowed: number;
  manualBlocked: number;
  allowed: number;
  blocked: number;
};

type PublishedInfo = {
  id: string;
  version: number;
  versionLabel: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
};

type Preview = {
  academicYear: string;
  term: string;
  className: string;
  examName: string;
  draftId: string;
  published: PublishedInfo | null;
  reasons: string[];
  structure?: { id: string; name: string; className: string | null; totalAmount: number } | null;
  totals: Totals;
  students: StudentRow[];
};

type ClassStatus = {
  className: string;
  status: 'DRAFT' | 'PUBLISHED';
  version: number;
  versionLabel: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
  studentCount: number;
};

const EXAMS = [
  'End of Term Examination',
  'Mid-Term Examination',
  'Mock Examination',
];

const FILTERS = [
  { value: 'all', label: 'All Students' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'NOT_CLEARED', label: 'Not Cleared' },
  { value: 'MANUALLY_ALLOWED', label: 'Manually Allowed' },
  { value: 'MANUALLY_BLOCKED', label: 'Manually Blocked' },
] as const;

function money(n: number) {
  return `${Number(n || 0).toLocaleString()} RWF`;
}

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function StatusDot({ tone, label }: { tone: 'green' | 'red' | 'amber' | 'slate'; label: string }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-800',
    red: 'bg-rose-50 text-rose-800',
    amber: 'bg-[#FFF6E8] text-[#B45309]',
    slate: 'bg-slate-100 text-slate-700',
  };
  const bars = {
    green: 'bg-emerald-600',
    red: 'bg-rose-600',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${colors[tone]}`}>
      <span className={`h-3.5 w-1 rounded-full ${bars[tone]}`} />
      {label}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: StudentRow['decision'] }) {
  if (decision === 'AUTO_ALLOWED') return <StatusDot tone="green" label="Allowed" />;
  if (decision === 'MANUALLY_ALLOWED') return <StatusDot tone="amber" label="Manually Allowed" />;
  if (decision === 'MANUALLY_BLOCKED') return <StatusDot tone="slate" label="Blocked" />;
  return <StatusDot tone="red" label="Not Allowed" />;
}

export function ExaminationEligibilityView({ view = 'lists' }: { view?: EligibilityView }) {
  const toast = useToast();
  const [ctx, setCtx] = useState<AcademicContext | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [classes, setClasses] = useState<ClassStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>(view === 'exceptions' ? 'MANUALLY_ALLOWED' : 'all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    className: '',
    examName: EXAMS[0],
  });
  const [drawer, setDrawer] = useState<StudentRow | null>(null);
  const [allow, setAllow] = useState(true);
  const [reason, setReason] = useState('Parent payment agreement');
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    void api.get('/structures/academic-context').then(({ data }) => {
      const c = data.data as AcademicContext;
      setCtx(c);
      setFilters((f) => ({
        ...f,
        academicYear: f.academicYear || c.currentAcademicYear || c.academicYears[0] || '',
        term: f.term || c.currentTerm || c.terms[0] || '',
        className: f.className || c.classes[0]?.label || c.classes[0]?.name || '',
      }));
    });
  }, []);

  const load = useCallback(async () => {
    if (!filters.academicYear || !filters.term || !filters.className) return;
    setLoading(true);
    try {
      const [{ data }, classRes] = await Promise.all([
        api.get('/examination-eligibility', { params: filters }),
        api.get('/examination-eligibility/classes', {
          params: { academicYear: filters.academicYear, term: filters.term, examName: filters.examName },
        }),
      ]);
      setPreview(data.data as Preview);
      setClasses((classRes.data.data ?? []) as ClassStatus[]);
      setPage(1);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load examination eligibility');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (preview?.students ?? []).filter((r) => {
      if (filter === 'CLEARED' && r.financialStatus !== 'CLEARED') return false;
      if (filter === 'PARTIAL' && r.paymentStatus !== 'PARTIAL') return false;
      if (filter === 'NOT_CLEARED' && (r.financialStatus !== 'NOT_CLEARED' || r.paymentStatus === 'PARTIAL')) return false;
      if (filter === 'MANUALLY_ALLOWED' && r.decision !== 'MANUALLY_ALLOWED') return false;
      if (filter === 'MANUALLY_BLOCKED' && r.decision !== 'MANUALLY_BLOCKED') return false;
      if (view === 'exceptions' && r.decision !== 'MANUALLY_ALLOWED' && r.decision !== 'MANUALLY_BLOCKED') return false;
      if (!q) return true;
      return r.studentName.toLowerCase().includes(q) || r.studentCode.toLowerCase().includes(q);
    });
  }, [preview, search, filter, view]);

  const paged = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  const totals = preview?.totals ?? {
    total: 0, autoCleared: 0, notCleared: 0, manualAllowed: 0, manualBlocked: 0, allowed: 0, blocked: 0,
  };

  function openException(row: StudentRow) {
    setDrawer(row);
    setAllow(row.decision !== 'MANUALLY_BLOCKED');
    setReason(row.exceptionReason || 'Parent payment agreement');
    setNote(row.exceptionNote || '');
    setReference(row.exceptionReference || '');
  }

  async function saveException() {
    if (!drawer) return;
    if (reason === 'Other' && !note.trim()) {
      toast.error('Explain why this exception is being granted');
      return;
    }
    setSaving(true);
    try {
      await api.post('/examination-eligibility/exception', {
        ...filters,
        studentId: drawer.studentId,
        studentCode: drawer.studentCode,
        studentName: drawer.studentName,
        allow,
        reason,
        note,
        reference,
      });
      toast.success(allow ? 'Examination exception recorded' : 'Student blocked from this examination');
      setDrawer(null);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save exception');
    } finally {
      setSaving(false);
    }
  }

  async function publishLists() {
    setPublishing(true);
    try {
      const { data } = await api.post('/examination-eligibility/publish', filters);
      toast.success(`Published ${data.data?.versionLabel || 'examination list'} · parents are being notified`);
      setPublishOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not publish lists');
    } finally {
      setPublishing(false);
    }
  }

  async function notifyNotAllowed() {
    if (!totals.blocked) {
      toast.info('No not-allowed students to notify');
      return;
    }
    setNotifying(true);
    try {
      const { data } = await api.post('/examination-eligibility/notify', {
        ...filters,
        onlyBlocked: true,
      });
      const sent = data.data?.parentsNotified ?? 0;
      toast.success(`Notification sent to ${sent} parent${sent === 1 ? '' : 's'} of not-allowed students`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not send notifications');
    } finally {
      setNotifying(false);
    }
  }

  function exportCsv() {
    const header = ['Student', 'Code', 'Class', 'Total Fees', 'Paid', 'Balance', 'Payment', 'Automatic Status', 'Final Decision', 'Reason', 'Reference'];
    const lines = rows.map((r) => [
      r.studentName,
      r.studentCode,
      r.className,
      r.totalFees,
      r.paidAmount,
      r.balance,
      r.paymentStatus ?? '',
      r.financialStatus,
      r.decision,
      r.exceptionReason ?? '',
      r.exceptionReference ?? '',
    ].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-eligibility-${filters.className}-${filters.term}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: FeesTableColumn<StudentRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-semibold text-navy">{r.studentName}</p>
          <p className="text-xs text-muted">{r.studentCode}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Code', render: (r) => <span className="text-slate-500">{r.studentCode}</span> },
    { key: 'class', header: 'Class', render: (r) => r.className },
    { key: 'fees', header: 'Total Fees', render: (r) => <span className="font-semibold tabular-nums text-navy">{money(r.totalFees)}</span> },
    { key: 'paid', header: 'Paid', render: (r) => <span className={`tabular-nums ${r.paidAmount > 0 ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>{money(r.paidAmount)}</span> },
    {
      key: 'balance',
      header: 'Balance',
      render: (r) => (
        <span className={`font-semibold tabular-nums ${r.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
          {money(r.balance)}
        </span>
      ),
    },
    { key: 'final', header: 'Final Decision', render: (r) => <DecisionBadge decision={r.decision} /> },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <button
          type="button"
          className="min-w-[88px] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-center text-[11px] font-semibold leading-tight text-navy hover:border-navy/30"
          onClick={(e) => { e.stopPropagation(); openException(r); }}
        >
          {r.financialStatus === 'NOT_CLEARED' ? (
            <span className="flex flex-col items-center">
              <span>+</span>
              <span>Allow Entry</span>
            </span>
          ) : (
            'Review'
          )}
        </button>
      ),
    },
  ];

  const title =
    view === 'exceptions' ? 'Manual Exceptions'
    : view === 'published' ? 'Published Lists'
    : view === 'reports' ? 'Examination Clearance Reports'
    : 'Examination Eligibility';

  const classOptions = ctx?.classes ?? [];
  const classBoard = classOptions.map((c) => {
    const label = c.label || c.name;
    const row = classes.find((x) => x.className.toLowerCase() === label.toLowerCase());
    return { label, status: row?.status ?? 'DRAFT', versionLabel: row?.versionLabel, publishedAt: row?.publishedAt };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>{title}</FeesPageTitle>
          <p className="text-sm text-muted">
            Manage students cleared to sit examinations. Teachers only see the published decision — not raw fees.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="btn-primary" onClick={() => setPublishOpen(true)}>
            Publish Lists
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Academic Year"
            value={filters.academicYear}
            onChange={(v) => setFilters((f) => ({ ...f, academicYear: v }))}
            options={(ctx?.academicYears ?? []).map((y) => ({ value: y, label: y }))}
          />
          <FilterSelect
            label="Term"
            value={filters.term}
            onChange={(v) => setFilters((f) => ({ ...f, term: v }))}
            options={(ctx?.terms ?? []).map((t) => ({ value: t, label: t }))}
          />
          <ClassPicker
            label="Class"
            value={filters.className}
            classes={classBoard}
            onChange={(v) => setFilters((f) => ({ ...f, className: v }))}
          />
          <FilterSelect
            label="Exam"
            value={filters.examName}
            onChange={(v) => setFilters((f) => ({ ...f, examName: v }))}
            options={EXAMS.map((e) => ({ value: e, label: e }))}
          />
        </div>
        {preview?.structure ? (
          <p className="mt-3 text-xs text-muted">
            Total fees from <span className="font-semibold text-navy">{preview.structure.name}</span>
            {preview.structure.className ? ` · ${preview.structure.className}` : ''}
            {' · '}{money(preview.structure.totalAmount)}
          </p>
        ) : preview ? (
          <p className="mt-3 text-xs text-amber-800">No active fee structure found for this year, term and class.</p>
        ) : null}
      </div>

      <StatsGrid columns={4}>
        <StatCard label="Total Students" value={totals.total} hint={`${filters.className || 'Class'} roster`} />
        <StatCard label="Cleared Automatically" value={totals.autoCleared} valueClassName="text-emerald-700" hint={pct(totals.autoCleared, totals.total)} />
        <StatCard label="Not Cleared" value={totals.notCleared} valueClassName="text-rose-700" hint={pct(totals.notCleared, totals.total)} />
        <StatCard label="Manual Exceptions" value={totals.manualAllowed} valueClassName="text-amber-700" hint={pct(totals.manualAllowed, totals.total)} />
      </StatsGrid>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              filter === f.value ? 'bg-navy text-white' : 'bg-white text-navy border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
            placeholder="Search student..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <FeesDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.studentId}
        page={page}
        totalPages={Math.max(1, Math.ceil(rows.length / pageSize))}
        total={rows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={loading}
        emptyMessage="No students match this examination list."
        onRowClick={openException}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm">
        <p className="text-muted">
          <strong className="text-navy">{totals.total}</strong> students ·
          <span className="text-emerald-700"> {totals.autoCleared} automatic</span> ·
          <span className="text-amber-700"> {totals.manualAllowed} manual</span> ·
          <span className="text-rose-700"> {totals.blocked} not allowed</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={notifying || !totals.blocked}
            onClick={() => void notifyNotAllowed()}
          >
            {notifying ? 'Sending…' : `Send Notification (${totals.blocked} not allowed)`}
          </button>
          <button type="button" className="btn-primary" onClick={() => setPublishOpen(true)}>Publish Lists</button>
        </div>
      </div>

      {drawer ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setDrawer(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Examination Exception</p>
                <h3 className="text-lg font-bold text-navy">Allow examination entry</h3>
              </div>
              <button type="button" className="rounded-lg p-1 text-muted hover:bg-slate-100" onClick={() => setDrawer(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="font-semibold text-navy">{drawer.studentName}</p>
            <p className="text-sm text-muted">{drawer.studentCode} · {drawer.className}</p>
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm">
              <p className="font-bold text-rose-700">Fee Status</p>
              <p className="mt-1 text-rose-800">Balance: {money(drawer.balance)}</p>
              <p className="mt-1 text-xs text-rose-700">Financial eligibility stays unpaid. This does not mark the student as paid.</p>
            </div>
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-navy">Allow student to sit examination?</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={!allow} onChange={() => setAllow(false)} /> No
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={allow} onChange={() => setAllow(true)} /> Yes
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-navy">Reason</span>
                <select className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {(preview?.reasons ?? ['Parent payment agreement', 'Other']).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-navy">Additional explanation {reason === 'Other' ? '(required)' : ''}</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Parent agreed to clear balance after examination."
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-navy">Agreement / Reference</span>
                <input
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="AG-2026-014"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setDrawer(null)}>Cancel</button>
              <button type="button" disabled={saving} className="btn-primary flex-1" onClick={() => void saveException()}>
                {allow ? 'Allow Examination' : 'Block Examination'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {publishOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPublishOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3">
              <h3 className="text-lg font-bold text-navy">Ready to Publish</h3>
              <p className="text-sm text-muted">{filters.className} · {filters.term} · {filters.academicYear}</p>
            </div>
            <dl className="space-y-1.5 text-sm">
              <Row k="Total Students" v={totals.total} />
              <Row k="Automatically Cleared" v={totals.autoCleared} />
              <Row k="Manually Allowed" v={totals.manualAllowed} />
              <Row k="Not Allowed" v={totals.blocked} />
            </dl>
            <p className="mt-4 text-sm text-muted">
              After publishing, Teacher Portal and Invigilator Desk can scan student smart-card QR codes to see Allowed or Not Allowed.
              Parents receive in-app, web push, email, and SMS (if SMS is enabled on Super Admin). Teachers cannot override the list.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setPublishOpen(false)}>Cancel</button>
              <button type="button" disabled={publishing} className="btn-primary flex-1" onClick={() => void publishLists()}>
                Publish Lists
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="font-bold text-navy">{v}</dd>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <div className="relative mt-1">
        <select
          className="w-full appearance-none rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 pr-9 text-sm font-medium text-navy outline-none transition focus:border-navy/30 focus:bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function ClassPicker({
  label,
  value,
  classes,
  onChange,
}: {
  label: string;
  value: string;
  classes: Array<{ label: string; status: 'DRAFT' | 'PUBLISHED' }>;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = classes.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="block" ref={box}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative mt-1 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-left text-sm font-medium text-navy outline-none transition hover:bg-white focus:border-navy/30 focus:bg-white"
      >
        <span>{value || 'Select class'}</span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {open ? (
        <div className="relative z-30">
          <div className="absolute left-0 right-0 top-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy/30"
                placeholder="Search class..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => { onChange(c.label); setOpen(false); setQ(''); }}
                  className={`flex w-full px-3 py-2 text-left text-sm font-medium ${
                    c.label === value ? 'bg-navy text-white' : 'text-navy hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              {!filtered.length ? <p className="px-3 py-4 text-sm text-muted">No class matches.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
