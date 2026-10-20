'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, ShieldAlert } from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { DisciplineDataTable, type DisciplineTableColumn, PillBadge } from '@/components/discipline-data-table';
import { DisciplineModal } from '@/components/discipline-modal';
import { StatusBadge } from '@/components/status-badge';
import { RegisterCaseModal } from '@/modules/discipline/register-case-modal';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { CaseStats, DisciplineCase } from '@/types/discipline';
import { toast } from 'sonner';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPoints(value?: number | null) {
  if (value == null) return '—';
  return value > 0 ? `+${value}` : `${value}`;
}

export function DisciplineCasesView() {
  const { confirm, dialog } = useConfirmDialog();
  const [rows, setRows] = useState<DisciplineCase[]>([]);
  const [stats, setStats] = useState<CaseStats>({ total: 0, thisMonth: 0, pending: 0, resolved: 0, pointsDeducted: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showRegister, setShowRegister] = useState(false);
  const [viewing, setViewing] = useState<DisciplineCase | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, statsRes] = await Promise.all([
        disciplineApi.cases({ search: search || undefined, status: statusFilter || undefined }),
        disciplineApi.caseStats(),
      ]);
      setRows(casesRes.data.data ?? []);
      setStats(statsRes.data.data ?? { total: 0, thisMonth: 0, pending: 0, resolved: 0, pointsDeducted: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load cases'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  async function remove(row: DisciplineCase) {
    const ok = await confirm({
      title: 'Delete discipline case',
      subtitle: row.caseNumber,
      message: `Delete case ${row.caseNumber} for ${row.studentName}? This action cannot be undone.`,
      confirmLabel: 'Delete case',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await disciplineApi.deleteCase(row.id);
      toast.success('Case deleted');
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  }

  const columns: DisciplineTableColumn<DisciplineCase>[] = useMemo(
    () => [
      { key: 'case', header: 'Case #', render: (r) => <span className="font-mono font-semibold text-[#000435]">{r.caseNumber}</span> },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.incidentDate) },
      {
        key: 'student',
        header: 'Student',
        render: (r) => (
          <div>
            <p className="font-semibold text-[#000435]">{r.studentName}</p>
            <p className="text-xs text-slate-500">{r.studentCode ?? '—'}</p>
          </div>
        ),
      },
      { key: 'class', header: 'Class', render: (r) => r.className },
      {
        key: 'caseType',
        header: 'Case Type',
        render: (r) => <PillBadge tone="blue">{r.markName ?? r.customCaseName ?? r.category}</PillBadge>,
      },
      {
        key: 'points',
        header: 'Points',
        render: (r) => (
          <span className={`font-semibold ${(r.appliedPoints ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatPoints(r.appliedPoints)}
          </span>
        ),
      },
      {
        key: 'score',
        header: 'Score',
        render: (r) =>
          r.scoreAfter != null ? (
            <span className="text-sm">{r.scoreBefore ?? '—'} → <strong>{r.scoreAfter}</strong></span>
          ) : (
            '—'
          ),
      },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ],
    []
  );

  return (
    <DisciplinePageLayout
      title="Discipline Cases"
      subtitle="Record, track and manage student discipline incidents"
      actions={
        <button type="button" className="btn-primary" onClick={() => setShowRegister(true)}>
          <Plus size={16} /> Register Case
        </button>
      }
      kpis={[
        { label: 'Total Cases', value: stats.total.toLocaleString() },
        { label: 'This Month', value: stats.thisMonth },
        { label: 'Pending Cases', value: stats.pending },
        { label: 'Points Deducted', value: stats.pointsDeducted.toLocaleString() },
      ]}
    >
      <div className="hr-card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="discipline-input pl-9"
            placeholder="Search student, case number or rule…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="discipline-input w-auto min-w-[140px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="Under Review">Under Review</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      <DisciplineDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        loading={loading}
        emptyMessage="No discipline cases yet"
        emptyAction={
          <button type="button" className="btn-primary" onClick={() => setShowRegister(true)}>
            <Plus size={16} /> Register first case
          </button>
        }
        onView={setViewing}
        onMore={(row) => void remove(row)}
      />

      <RegisterCaseModal open={showRegister} onClose={() => setShowRegister(false)} onSaved={() => void load()} />

      <DisciplineModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Case Details"
        subtitle={viewing?.caseNumber}
        icon={<ShieldAlert size={18} />}
        size="lg"
        footer={
          viewing ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" className="btn-secondary" onClick={() => window.print()}>Print case sheet</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  try {
                    await disciplineApi.notifyCase(viewing.id, ['SMS', 'InApp']);
                    toast.success('Parent notified');
                  } catch (err) {
                    toast.error(getApiErrorMessage(err, 'Could not notify parent'));
                  }
                }}
              >
                Notify parent
              </button>
              <label className="btn-secondary cursor-pointer">
                Attach evidence
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={() => toast.success('Evidence attached to this session — print with the case sheet')}
                />
              </label>
              <button type="button" className="btn-primary" onClick={() => setViewing(null)}>Close</button>
            </div>
          ) : undefined
        }
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs uppercase text-slate-500">Student</p><p className="font-semibold">{viewing.studentName}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Class</p><p className="font-semibold">{viewing.className}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Case Type</p><p>{viewing.markName ?? viewing.customCaseName ?? viewing.category}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Points Applied</p><p className="font-semibold">{formatPoints(viewing.appliedPoints)}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Score</p><p>{viewing.scoreBefore ?? '—'} → {viewing.scoreAfter ?? '—'}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Status</p><StatusBadge status={viewing.status} /></div>
              <div><p className="text-xs uppercase text-slate-500">Date</p><p>{formatDate(viewing.incidentDate)}{viewing.incidentTime ? ` at ${viewing.incidentTime}` : ''}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Location</p><p>{viewing.location ?? '—'}</p></div>
            </div>
            {viewing.description ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Description</p>
                <p className="mt-1">{viewing.description}</p>
              </div>
            ) : null}
            {viewing.actionsTaken && viewing.actionsTaken.length > 0 ? (
              <div>
                <p className="text-xs uppercase text-slate-500">Actions Taken</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {viewing.actionsTaken.map((a) => (
                    <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{a}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {viewing.actionNotes ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Action Notes</p>
                <p className="mt-1">{viewing.actionNotes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DisciplineModal>
      {dialog}
    </DisciplinePageLayout>
  );
}
