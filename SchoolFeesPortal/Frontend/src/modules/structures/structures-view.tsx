'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { PillBadge } from '@/components/fees-data-table';
import type { FeeStructure } from '@/types';
import { StructureFormModal } from './structure-form-modal';
import { StructureDetailDrawer } from './structure-detail-drawer';
import { MenuItem, StructureActionsMenu } from './structure-actions-menu';

type Summary = {
  activeStructures: number;
  academicYears: number;
  classesCovered: number;
  totalFeeItems: number;
};

type AcademicContext = {
  academicYears: string[];
  terms: string[];
  classes: { id: string; label: string }[];
};

export function StructuresView() {
  const toast = useToast();
  const [rows, setRows] = useState<FeeStructure[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ctx, setCtx] = useState<AcademicContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [filters, setFilters] = useState({
    academicYear: 'all',
    term: 'all',
    className: 'all',
    status: 'all',
    source: 'all',
    search: '',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [dupYear, setDupYear] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [drawerRefresh, setDrawerRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.academicYear !== 'all') params.academicYear = filters.academicYear;
      if (filters.term !== 'all') params.term = filters.term;
      if (filters.className !== 'all') params.className = filters.className;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.source !== 'all') params.source = filters.source;
      if (filters.search.trim()) params.search = filters.search.trim();

      const [listRes, summaryRes] = await Promise.all([
        api.get('/structures', { params }),
        api.get('/structures/summary'),
      ]);
      setRows(listRes.data.data ?? []);
      setSummary(summaryRes.data.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void api.get('/structures/academic-context').then(({ data }) => setCtx(data.data));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDuplicate(id: string) {
    const row = rows.find((r) => r.id === id);
    try {
      await api.post(`/structures/${id}/duplicate`, {
        academicYear: dupYear || row?.academicYear,
        term: row?.term,
        className: row?.className,
        copyItems: true,
      });
      setDuplicateId(null);
      toast.success('Fee structure duplicated.');
      void load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not duplicate structure.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/structures/${id}`);
      setDeleteId(null);
      if (viewId === id) setViewId(null);
      toast.success('Fee structure deleted.');
      void load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not delete structure.');
    }
  }

  async function setStructureStatus(id: string, status: 'ACTIVE' | 'ARCHIVED') {
    try {
      await api.put(`/structures/${id}`, { status });
      setDeactivateId(null);
      toast.success(status === 'ACTIVE' ? 'Fee structure activated.' : 'Fee structure deactivated.');
      setDrawerRefresh((k) => k + 1);
      void load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Could not update structure status.');
    }
  }

  async function handleExport() {
    try {
      const params: Record<string, string> = {};
      if (filters.academicYear !== 'all') params.academicYear = filters.academicYear;
      if (filters.term !== 'all') params.term = filters.term;
      if (filters.className !== 'all') params.className = filters.className;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.source !== 'all') params.source = filters.source;
      if (filters.search.trim()) params.search = filters.search.trim();

      const { data } = await api.get('/structures/export', { params, responseType: 'blob' });
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fee-structures-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} structure(s) to CSV.`);
    } catch {
      toast.error('Could not export fee structures.');
    }
  }

  function openView(row: FeeStructure) {
    setMenuId(null);
    setViewId(row.id);
  }

  function openEdit(row: FeeStructure) {
    setMenuId(null);
    setViewId(null);
    setEditing(row);
    setModalOpen(true);
  }

  const columns: FeesTableColumn<FeeStructure>[] = [
    {
      key: 'name',
      header: 'Structure',
      render: (r) => (
        <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openView(r);
              }}
              className="truncate text-left font-semibold text-navy transition hover:text-primary hover:underline"
            >
              {r.name}
            </button>
            <p className="truncate text-xs text-muted">{r.code}</p>
          </div>
      ),
    },
    { key: 'year', header: 'Academic Year', render: (r) => <span className="text-[#344054]">{r.academicYear}</span> },
    { key: 'term', header: 'Term', render: (r) => <span className="text-muted">{r.term}</span> },
    {
      key: 'class',
      header: 'Class',
      render: (r) =>
        r.className ? (
          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {r.className}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (r) => (
        <span className="inline-flex min-w-[2rem] justify-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-navy">
          {r.itemCount ?? r.items?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Total',
      render: (r) => (
        <span className="font-bold tabular-nums text-navy">{Number(r.totalAmount).toLocaleString()} RWF</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (r) => (
        <PillBadge tone={r.source === 'BABYEYI' ? 'violet' : r.source === 'MIXED' ? 'amber' : 'blue'}>
          {r.source ?? 'SCHOOL'}
        </PillBadge>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'updated',
      header: 'Updated',
      render: (r) =>
        r.updatedAt ? (
          <span className="text-xs text-[#344054]">
            {new Date(r.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="View structure"
            onClick={() => openView(r)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-muted transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-navy hover:shadow-sm"
          >
            <Eye size={15} />
          </button>
          <StructureActionsMenu
            open={menuId === r.id}
            onToggle={() => setMenuId((id) => (id === r.id ? null : r.id))}
            onClose={() => setMenuId(null)}
          >
            <MenuItem icon={<Eye size={15} />} label="View details" onClick={() => openView(r)} />
            <MenuItem icon={<Pencil size={15} />} label="Edit" onClick={() => openEdit(r)} />
            <MenuItem
              icon={<Copy size={15} />}
              label="Duplicate"
              onClick={() => {
                setMenuId(null);
                setDuplicateId(r.id);
                setDupYear(r.academicYear);
              }}
            />
            {r.status === 'ACTIVE' ? (
              <MenuItem
                icon={<Ban size={15} />}
                label="Deactivate"
                tone="warning"
                onClick={() => {
                  setMenuId(null);
                  setDeactivateId(r.id);
                }}
              />
            ) : (
              <MenuItem
                icon={<CheckCircle2 size={15} />}
                label="Activate"
                tone="success"
                onClick={() => void setStructureStatus(r.id, 'ACTIVE')}
              />
            )}
            <div className="my-1 border-t border-border" />
            <MenuItem
              icon={<Trash2 size={15} />}
              label="Delete"
              tone="danger"
              onClick={() => {
                setMenuId(null);
                setDeleteId(r.id);
              }}
            />
          </StructureActionsMenu>
        </div>
      ),
    },
  ];

  const paged = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>Fee Structures</FeesPageTitle>
          <p className="text-sm text-muted">
            Configure and manage school fees payable by students for each academic year, term and class.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => void handleExport()} disabled={loading || rows.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Create Fee Structure
          </button>
        </div>
      </div>

      {summary ? (
        <StatsGrid columns={4}>
          <StatCard label="Active Structures" value={summary.activeStructures} />
          <StatCard label="Academic Years" value={summary.academicYears} />
          <StatCard label="Classes Covered" value={summary.classesCovered} />
          <StatCard label="Total Fee Items" value={summary.totalFeeItems} />
        </StatsGrid>
      ) : null}

      <div className="hr-card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.academicYear}
            onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}
          >
            <option value="all">All years</option>
            {(ctx?.academicYears ?? []).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.term}
            onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}
          >
            <option value="all">All terms</option>
            {(ctx?.terms ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.className}
            onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value }))}
          >
            <option value="all">All classes</option>
            {(ctx?.classes ?? []).map((c) => (
              <option key={c.id} value={c.label}>{c.label}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            className="rounded-xl border border-border px-3 py-2 text-sm"
            value={filters.source}
            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
          >
            <option value="all">All sources</option>
            <option value="SCHOOL">School</option>
            <option value="BABYEYI">Babyeyi</option>
            <option value="MIXED">Mixed</option>
          </select>
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm"
              placeholder="Search fee structure…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() =>
              setFilters({
                academicYear: 'all',
                term: 'all',
                className: 'all',
                status: 'all',
                source: 'all',
                search: '',
              })
            }
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      <FeesDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        page={page}
        totalPages={Math.max(1, Math.ceil(rows.length / pageSize))}
        total={rows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={openView}
        loading={loading}
        emptyMessage="No fee structures match your filters"
        emptyAction={
          <button type="button" className="btn-primary text-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Create Fee Structure
          </button>
        }
      />

      <StructureDetailDrawer
        structureId={viewId}
        refreshToken={drawerRefresh}
        onClose={() => setViewId(null)}
        onEdit={openEdit}
        onDuplicate={(r) => {
          setViewId(null);
          setDuplicateId(r.id);
          setDupYear(r.academicYear);
        }}
        onDeactivate={(r) => setDeactivateId(r.id)}
        onActivate={(r) => void setStructureStatus(r.id, 'ACTIVE')}
      />

      <StructureFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
      />

      {duplicateId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Duplicate Fee Structure</h3>
            <label className="mt-4 block text-sm">
              <span className="text-muted">New academic year</span>
              <input
                className="mt-1 w-full rounded-xl border border-border px-3 py-2"
                value={dupYear}
                onChange={(e) => setDupYear(e.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setDuplicateId(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={() => void handleDuplicate(duplicateId)}>
                <Copy size={14} /> Create duplicate
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deactivateId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Deactivate structure?</h3>
            <p className="mt-2 text-sm text-muted">
              Students will no longer be auto-billed from this structure. Existing bills are kept. You can re-activate
              later.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setDeactivateId(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary !bg-amber-600"
                onClick={() => void setStructureStatus(deactivateId, 'ARCHIVED')}
              >
                <Ban size={14} /> Deactivate
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Delete structure?</h3>
            <p className="mt-2 text-sm text-muted">
              This cannot be undone if students have payments on this structure. Consider deactivating instead.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button type="button" className="btn-primary !bg-red-600" onClick={() => void handleDelete(deleteId)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
