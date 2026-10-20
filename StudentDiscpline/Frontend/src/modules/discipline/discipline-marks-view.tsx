'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Ban,
  Plus,
  Scale,
  Search,
  Trash2,
  Pencil,
} from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { DisciplineDataTable, type DisciplineTableColumn, PillBadge } from '@/components/discipline-data-table';
import { DisciplineModal, FormField } from '@/components/discipline-modal';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DisciplineMark, MarkType } from '@/types/discipline';
import { signedMarkPoints } from '@/types/discipline';
import { toast } from 'sonner';

const CATEGORIES = ['Attendance', 'Uniform', 'Serious', 'Conduct', 'Property', 'Academic', 'Reward', 'General'];

const emptyForm = () => ({
  name: '',
  description: '',
  category: 'General',
  type: 'DEDUCTION' as MarkType,
  points: 2,
  status: 'Active',
});

function formatSigned(type: MarkType, points: number) {
  const signed = signedMarkPoints(type, points);
  return signed > 0 ? `+${signed}` : `${signed}`;
}

export function DisciplineMarksView() {
  const { confirm, dialog } = useConfirmDialog();
  const [rows, setRows] = useState<DisciplineMark[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, rewards: 0, deductions: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<DisciplineMark | null>(null);
  const [editing, setEditing] = useState<DisciplineMark | null>(null);
  const [menuRow, setMenuRow] = useState<DisciplineMark | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [marksRes, statsRes] = await Promise.all([
        disciplineApi.marks({
          search: search || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          sort: sort || undefined,
        }),
        disciplineApi.markStats(),
      ]);
      setRows(marksRes.data.data ?? []);
      setStats(statsRes.data.data ?? { total: 0, active: 0, rewards: 0, deductions: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load discipline marks'));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(row: DisciplineMark) {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? '',
      category: row.category,
      type: row.type,
      points: row.points,
      status: row.status,
    });
    setShowModal(true);
    setMenuRow(null);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Mark name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await disciplineApi.updateMark(editing.id, form);
        toast.success('Rule updated');
      } else {
        await disciplineApi.createMark(form);
        toast.success('Rule created');
      }
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: DisciplineMark) {
    const next = row.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await disciplineApi.updateMark(row.id, { status: next });
      toast.success(next === 'Active' ? 'Rule enabled' : 'Rule disabled');
      setMenuRow(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    }
  }

  async function remove(row: DisciplineMark) {
    const ok = await confirm({
      title: 'Delete discipline rule',
      subtitle: row.name,
      message: `This will permanently remove "${row.name}" from your mark rules. Rules used in cases cannot be deleted.`,
      confirmLabel: 'Delete rule',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await disciplineApi.deleteMark(row.id);
      toast.success('Rule deleted');
      setMenuRow(null);
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  }

  const previewText = useMemo(() => {
    const signed = signedMarkPoints(form.type, form.points);
    const verb = form.type === 'REWARD' ? 'Award' : 'Deduct';
    return `${verb} ${Math.abs(signed)} point${Math.abs(signed) === 1 ? '' : 's'} when this case is applied.`;
  }, [form.type, form.points]);

  const columns: DisciplineTableColumn<DisciplineMark>[] = useMemo(
    () => [
      {
        key: 'rule',
        header: 'Rule',
        render: (r) => (
          <div>
            <p className="font-semibold text-[#000435]">{r.name}</p>
            {r.description ? <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p> : null}
          </div>
        ),
      },
      { key: 'category', header: 'Category', render: (r) => <PillBadge tone="blue">{r.category}</PillBadge> },
      {
        key: 'marks',
        header: 'Marks',
        render: (r) => (
          <span className={`font-semibold ${r.type === 'REWARD' ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatSigned(r.type, r.points)}
          </span>
        ),
      },
      { key: 'usage', header: 'Usage', render: (r) => `${r.usageCount} case${r.usageCount === 1 ? '' : 's'}` },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ],
    []
  );

  return (
    <DisciplinePageLayout
      title="Discipline Marks"
      subtitle="Manage the points used to measure student discipline"
      actions={
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Rule
        </button>
      }
      kpis={[
        { label: 'Total Rules', value: stats.total },
        { label: 'Active Rules', value: stats.active },
        { label: 'Reward Rules', value: stats.rewards },
        { label: 'Deduction Rules', value: stats.deductions },
      ]}
    >
      <div className="hr-card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="discipline-input pl-9"
            placeholder="Search discipline rule…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="discipline-input w-auto min-w-[130px]" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          <option value="REWARD">Reward</option>
          <option value="DEDUCTION">Deduction</option>
        </select>
        <select className="discipline-input w-auto min-w-[130px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select className="discipline-input w-auto min-w-[130px]" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Sort by name</option>
          <option value="marks">Sort by marks</option>
          <option value="usage">Sort by usage</option>
        </select>
      </div>

      <DisciplineDataTable
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        selected={selected}
        onSelectRow={(id) => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onSelectAll={() => {
          if (allSelected) setSelected(new Set());
          else setSelected(new Set(paged.map((r) => r.id)));
        }}
        allSelected={allSelected}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        loading={loading}
        emptyMessage="No discipline rules yet"
        emptyAction={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add first rule
          </button>
        }
        onView={setViewing}
        onEdit={openEdit}
        onMore={setMenuRow}
      />

      {menuRow ? (
        <div className="fixed inset-0 z-[60]" onClick={() => setMenuRow(null)}>
          <div
            className="absolute right-8 top-1/2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => { setViewing(menuRow); setMenuRow(null); }}>
              <Eye size={14} /> View
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => openEdit(menuRow)}>
              <Pencil size={14} /> Edit
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => void toggleStatus(menuRow)}>
              <Ban size={14} /> {menuRow.status === 'Active' ? 'Disable' : 'Enable'}
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => void remove(menuRow)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ) : null}

      <DisciplineModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Discipline Mark' : 'Add Discipline Mark'}
        subtitle="Configure how points are applied for this case type"
        icon={<Scale size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mark Name" required>
            <input className="discipline-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Late Coming" />
          </FormField>
          <FormField label="Category">
            <select className="discipline-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description">
              <textarea className="discipline-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe when this rule applies…" />
            </FormField>
          </div>
          <FormField label="Mark Type">
            <select className="discipline-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MarkType })}>
              <option value="DEDUCTION">Deduction</option>
              <option value="REWARD">Reward</option>
            </select>
          </FormField>
          <FormField label="Marks">
            <input className="discipline-input" type="number" min={1} max={100} value={form.points} onChange={(e) => setForm({ ...form, points: Math.max(1, Number(e.target.value) || 1) })} />
          </FormField>
          {editing ? (
            <FormField label="Status">
              <select className="discipline-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          ) : null}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
          <p className="mt-1 font-semibold text-[#000435]">{form.name.trim() || 'Rule name'}</p>
          <p className="mt-1 text-sm text-slate-600">{previewText}</p>
        </div>
      </DisciplineModal>

      <DisciplineModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Rule Details"
        subtitle={viewing?.name}
        icon={<Scale size={18} />}
        footer={
          viewing ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit</button>
              <button type="button" className="btn-primary" onClick={() => setViewing(null)}>Close</button>
            </>
          ) : undefined
        }
      >
        {viewing ? (
          <div className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs uppercase text-slate-500">Category</p><p className="font-semibold">{viewing.category}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Type</p><p>{viewing.type === 'REWARD' ? 'Reward' : 'Deduction'}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Marks</p><p className="font-semibold">{formatSigned(viewing.type, viewing.points)}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Usage</p><p>{viewing.usageCount} cases</p></div>
              <div><p className="text-xs uppercase text-slate-500">Status</p><StatusBadge status={viewing.status} /></div>
              <div><p className="text-xs uppercase text-slate-500">Default</p><p>{viewing.isDefault ? 'Yes' : 'Custom'}</p></div>
            </div>
            {viewing.description ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Description</p>
                <p className="mt-1">{viewing.description}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DisciplineModal>
      {dialog}
    </DisciplinePageLayout>
  );
}
