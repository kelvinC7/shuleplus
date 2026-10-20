'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Plus, Wrench } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { AssetsModal, AssetPicker, FormField } from '@/components/assets-modal';
import { AssetsDetailRow } from '@/components/assets-detail-row';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi } from '@/services/assets-api';
import { useOpsPage } from '@/hooks/use-ops-page';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate, formatRwf } from '@/utils/format';
import type { AssetMaintenance, AssetRow } from '@/types';

export function MaintenanceView() {
  const toast = useToast();
  const [rows, setRows] = useState<AssetMaintenance[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<AssetMaintenance | null>(null);
  const [editing, setEditing] = useState<AssetMaintenance | null>(null);
  const [extendId, setExtendId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { page, setPage, pageSize, setPageSize, total, totalPages, applyMeta } = useOpsPage(20);
  const [form, setForm] = useState({
    assetId: '',
    issueType: 'Electrical',
    priority: 'Medium',
    description: '',
    provider: 'Internal',
    estimatedCost: 0,
    dueDate: '',
  });
  const [extendForm, setExtendForm] = useState({ newDueDate: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        assetsApi.maintenance({ page, limit: pageSize }),
        assetsApi.registerList({ limit: 200 }),
      ]);
      setRows(mRes.data.data ?? []);
      applyMeta(mRes.data);
      setAssets(rRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load maintenance'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applyMeta, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      open: rows.filter((r) => r.status === 'Open' || r.status === 'Pending').length,
      inProgress: rows.filter((r) => r.status === 'InProgress').length,
      completed: rows.filter((r) => r.status === 'Completed').length,
      overdue: rows.filter((r) => r.status === 'Overdue').length,
    }),
    [rows]
  );

  async function saveEdit() {
    if (!editing) return;
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    setSaving(true);
    try {
      await assetsApi.updateMaintenance(editing.id, {
        description: `[${form.issueType}] ${form.description.trim()}`,
        priority: form.priority || undefined,
        dueDate: form.dueDate || undefined,
        estimatedCost: Number(form.estimatedCost) || undefined,
        provider: form.provider || undefined,
      });
      toast.success('Maintenance ticket updated.', 'Updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: AssetMaintenance) {
    if (!window.confirm('Delete this maintenance ticket?')) return;
    try {
      await assetsApi.deleteMaintenance(row.id);
      toast.success('Ticket deleted.', 'Deleted');
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Error');
    }
  }

  function parseIssue(description: string) {
    const match = description.match(/^\[(.+?)\]\s*(.*)$/);
    return { issueType: match?.[1] ?? 'General', text: match?.[2] ?? description };
  }

  function openEdit(row: AssetMaintenance) {
    const parsed = parseIssue(row.description);
    setForm({
      assetId: row.assetId,
      issueType: parsed.issueType,
      priority: row.priority ?? 'Medium',
      description: parsed.text,
      provider: row.provider ?? 'Internal',
      estimatedCost: row.estimatedCost ?? 0,
      dueDate: row.dueDate?.slice(0, 10) ?? '',
    });
    setEditing(row);
  }

  async function create() {
    if (!form.assetId || !form.description.trim()) {
      toast.error('Asset and problem description are required');
      return;
    }
    setSaving(true);
    try {
      await assetsApi.createMaintenance({
        assetId: form.assetId,
        description: `[${form.issueType}] ${form.description.trim()}`,
        priority: form.priority || undefined,
        dueDate: form.dueDate || undefined,
        estimatedCost: Number(form.estimatedCost) || undefined,
        provider: form.provider || undefined,
      });
      toast.success('Maintenance request created.', 'Created');
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create ticket'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function extend() {
    if (!extendId || !extendForm.newDueDate) {
      toast.error('New due date is required');
      return;
    }
    try {
      await assetsApi.extendMaintenance(extendId, {
        newDueDate: extendForm.newDueDate,
        reason: extendForm.reason || undefined,
      });
      toast.success('Due date extended.', 'Updated');
      setExtendId(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to extend'), 'Error');
    }
  }

  const columns: AssetsTableColumn<AssetMaintenance>[] = useMemo(
    () => [
      {
        key: 'asset',
        header: 'Asset',
        render: (r) => (
          <div>
            <p className="font-semibold text-navy">{r.asset?.assetName ?? r.assetId}</p>
            <p className="text-xs text-muted">{r.asset?.assetCode}</p>
          </div>
        ),
      },
      { key: 'desc', header: 'Problem', render: (r) => r.description },
      {
        key: 'provider',
        header: 'Provider',
        render: (r) => r.provider ?? 'Internal',
      },
      {
        key: 'priority',
        header: 'Priority',
        render: (r) => (
          <span
            className={
              r.priority === 'High' || r.priority === 'Critical'
                ? 'font-semibold text-red-600'
                : r.priority === 'Medium'
                  ? 'text-amber-700'
                  : 'text-muted'
            }
          >
            {r.priority || '—'}
          </span>
        ),
      },
      { key: 'due', header: 'Due', render: (r) => formatDate(r.dueDate) },
      {
        key: 'cost',
        header: 'Est. cost',
        render: (r) => (r.estimatedCost != null ? formatRwf(r.estimatedCost) : '—'),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusBadge status={r.status || 'Open'} />,
      },
    ],
    []
  );

  return (
    <AssetsPageLayout
      title="Maintenance"
      subtitle="Track repairs, service providers and completion"
      actions={
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Request
        </button>
      }
      kpis={[
        { label: 'Open', value: stats.open },
        { label: 'In Progress', value: stats.inProgress },
        { label: 'Completed', value: stats.completed },
        { label: 'Overdue', value: stats.overdue },
      ]}
    >
      <AssetsDataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={loading}
        emptyMessage="No maintenance tickets"
        onView={setViewing}
        onEdit={openEdit}
        onDelete={(row) => void remove(row)}
      />

      <AssetsModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Maintenance Details"
        icon={<Wrench size={18} />}
        footer={
          viewing ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setExtendId(viewing.id);
                  setExtendForm({ newDueDate: viewing.dueDate?.slice(0, 10) ?? '', reason: '' });
                }}
              >
                <CalendarPlus size={16} /> Extend due date
              </button>
              <button type="button" className="btn-primary" onClick={() => setViewing(null)}>
                Close
              </button>
            </>
          ) : undefined
        }
      >
        {viewing ? (
          <div className="space-y-1">
            <AssetsDetailRow label="Asset" value={`${viewing.asset?.assetCode ?? ''} · ${viewing.asset?.assetName ?? ''}`} />
            <AssetsDetailRow label="Problem" value={viewing.description} />
            <AssetsDetailRow label="Provider" value={viewing.provider ?? 'Internal'} />
            <AssetsDetailRow label="Priority" value={viewing.priority} />
            <AssetsDetailRow label="Due date" value={formatDate(viewing.dueDate)} />
            <AssetsDetailRow label="Est. cost" value={viewing.estimatedCost != null ? formatRwf(viewing.estimatedCost) : '—'} />
            <AssetsDetailRow label="Status" value={<StatusBadge status={viewing.status || 'Open'} />} />
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Maintenance Ticket"
        icon={<Wrench size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEdit()}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <FormField label="Issue Type">
              <select className="input" value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })}>
                <option>Electrical</option>
                <option>Mechanical</option>
                <option>Software / ICT</option>
                <option>Structural</option>
                <option>General</option>
              </select>
            </FormField>
            <FormField label="Priority">
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </FormField>
            <FormField label="Problem Description" required>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Maintenance Provider">
                <select className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                  <option>Internal</option>
                  <option>External</option>
                </select>
              </FormField>
              <FormField label="Estimated Cost (RWF)">
                <input className="input" type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })} />
              </FormField>
              <FormField label="Expected Completion">
                <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </FormField>
            </div>
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Maintenance Request"
        subtitle="Log a repair or service issue for an asset"
        icon={<Wrench size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void create()}>
              {saving ? 'Creating…' : 'Create Request'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Asset" required>
            <AssetPicker
              assets={assets}
              value={form.assetId}
              onChange={(id) => setForm({ ...form, assetId: id })}
            />
          </FormField>

          <FormField label="Issue Type" required>
            <select
              className="input"
              value={form.issueType}
              onChange={(e) => setForm({ ...form, issueType: e.target.value })}
            >
              <option>Electrical</option>
              <option>Mechanical</option>
              <option>Software / ICT</option>
              <option>Structural</option>
              <option>General</option>
            </select>
          </FormField>

          <FormField label="Priority">
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </FormField>

          <FormField label="Problem Description" required>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Maintenance Provider">
              <select
                className="input"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              >
                <option>Internal</option>
                <option>External</option>
              </select>
            </FormField>
            <FormField label="Estimated Cost (RWF)">
              <input
                className="input"
                type="number"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <FormField label="Expected Completion">
            <input
              className="input"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </FormField>
        </div>
      </AssetsModal>

      <AssetsModal
        open={Boolean(extendId)}
        onClose={() => setExtendId(null)}
        title="Extend Due Date"
        icon={<CalendarPlus size={18} />}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setExtendId(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void extend()}>
              Extend
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="New Due Date" required>
            <input
              className="input"
              type="date"
              value={extendForm.newDueDate}
              onChange={(e) => setExtendForm({ ...extendForm, newDueDate: e.target.value })}
            />
          </FormField>
          <FormField label="Reason">
            <textarea
              className="input"
              rows={2}
              value={extendForm.reason}
              onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })}
            />
          </FormField>
        </div>
      </AssetsModal>
    </AssetsPageLayout>
  );
}
