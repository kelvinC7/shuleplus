'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { AssetsModal, FormField } from '@/components/assets-modal';
import { AssetsDetailRow, parseAssignmentNotes } from '@/components/assets-detail-row';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi } from '@/services/assets-api';
import { useOpsPage } from '@/hooks/use-ops-page';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate } from '@/utils/format';
import type { AssetAssignment } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);

export function ReturnsView() {
  const toast = useToast();
  const [rows, setRows] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<AssetAssignment | null>(null);
  const [editingReturn, setEditingReturn] = useState<AssetAssignment | null>(null);
  const [returning, setReturning] = useState<AssetAssignment | null>(null);
  const [saving, setSaving] = useState(false);
  const { page, setPage, pageSize, setPageSize, total, totalPages, applyMeta } = useOpsPage(20);
  const [form, setForm] = useState({
    returnDate: today(),
    returnCondition: 'Good',
    damageFlags: [] as string[],
    returnReason: 'End of assignment',
    returnNotes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assetsApi.assignments({ page, limit: pageSize });
      setRows(data.data ?? []);
      applyMeta(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load assignments'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applyMeta, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReturns = rows.filter((r) => r.status === 'Active' || r.status === 'Overdue');
  const closed = rows.filter((r) => r.status === 'Returned');

  function toggleFlag(flag: string) {
    setForm((f) => ({
      ...f,
      damageFlags: f.damageFlags.includes(flag)
        ? f.damageFlags.filter((x) => x !== flag)
        : [...f.damageFlags, flag],
    }));
  }

  async function saveReturnEdit() {
    if (!editingReturn) return;
    setSaving(true);
    try {
      await assetsApi.updateAssignment(editingReturn.id, {
        returnCondition: form.returnCondition,
        returnNotes: form.returnNotes || undefined,
        returnDate: form.returnDate || undefined,
      });
      toast.success('Return record updated.', 'Updated');
      setEditingReturn(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: AssetAssignment) {
    if (!window.confirm('Delete this assignment/return record?')) return;
    try {
      await assetsApi.deleteAssignment(row.id);
      toast.success('Record deleted.', 'Deleted');
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Error');
    }
  }

  function openEdit(row: AssetAssignment) {
    if (row.status === 'Active' || row.status === 'Overdue') {
      setReturning(row);
      setForm({
        returnDate: today(),
        returnCondition: 'Good',
        damageFlags: [],
        returnReason: 'End of assignment',
        returnNotes: '',
      });
      return;
    }
    setEditingReturn(row);
    setForm({
      returnDate: row.returnDate?.slice(0, 10) ?? today(),
      returnCondition: row.returnCondition?.split(';')[0]?.trim() ?? 'Good',
      damageFlags: [],
      returnReason: 'End of assignment',
      returnNotes: row.returnNotes ?? '',
    });
  }

  async function submitReturn() {
    if (!returning) return;
    setSaving(true);
    try {
      const condition = [
        form.returnCondition,
        ...form.damageFlags,
        form.returnReason,
      ]
        .filter(Boolean)
        .join('; ');
      await assetsApi.returnAssignment(returning.id, {
        returnCondition: condition,
        returnNotes: form.returnNotes || undefined,
        returnDate: form.returnDate || undefined,
      });
      toast.success('Asset returned.', 'Returned');
      setReturning(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Return failed'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  const columns: AssetsTableColumn<AssetAssignment>[] = useMemo(
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
      { key: 'assignee', header: 'Assigned To', render: (r) => r.assigneeName || '—' },
      { key: 'due', header: 'Expected', render: (r) => formatDate(r.expectedReturnDate) },
      { key: 'returned', header: 'Returned', render: (r) => formatDate(r.returnDate) },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  return (
    <AssetsPageLayout
      title="Asset Returns"
      subtitle="Process returns from active assignments"
      kpis={[
        { label: 'Awaiting return', value: openReturns.length },
        { label: 'Returned', value: closed.length },
        { label: 'Total', value: total },
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
        emptyMessage="No assignment returns to process"
        onView={setViewing}
        onEdit={openEdit}
        onDelete={(row) => void remove(row)}
      />

      <AssetsModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Return Details"
        icon={<Undo2 size={18} />}
        footer={
          <button type="button" className="btn-primary" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing ? (
          <div className="space-y-1">
            <AssetsDetailRow label="Asset" value={`${viewing.asset?.assetCode ?? ''} · ${viewing.asset?.assetName ?? ''}`} />
            <AssetsDetailRow label="Assigned to" value={viewing.assigneeName} />
            <AssetsDetailRow label="Expected return" value={formatDate(viewing.expectedReturnDate)} />
            <AssetsDetailRow label="Returned on" value={formatDate(viewing.returnDate)} />
            <AssetsDetailRow label="Return condition" value={viewing.returnCondition} />
            <AssetsDetailRow label="Return notes" value={viewing.returnNotes} />
            <AssetsDetailRow label="Status" value={<StatusBadge status={viewing.status} />} />
            <AssetsDetailRow label="Assignment notes" value={parseAssignmentNotes(viewing.notes).extraNotes || viewing.notes} />
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={Boolean(editingReturn)}
        onClose={() => setEditingReturn(null)}
        title="Edit Return Record"
        icon={<Undo2 size={18} />}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditingReturn(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveReturnEdit()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Return Condition">
            <select className="input" value={form.returnCondition} onChange={(e) => setForm({ ...form, returnCondition: e.target.value })}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
              <option>Damaged</option>
            </select>
          </FormField>
          <FormField label="Notes">
            <textarea className="input" rows={3} value={form.returnNotes} onChange={(e) => setForm({ ...form, returnNotes: e.target.value })} />
          </FormField>
        </div>
      </AssetsModal>

      <AssetsModal
        open={Boolean(returning)}
        onClose={() => setReturning(null)}
        title="Return Asset"
        subtitle="Close an active assignment and restore asset availability"
        icon={<Undo2 size={18} />}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setReturning(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void submitReturn()}
            >
              {saving ? 'Processing…' : 'Confirm Return'}
            </button>
          </>
        }
      >
        {returning ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-muted">Asset</p>
              <p className="font-semibold text-navy">
                {returning.asset?.assetCode} · {returning.asset?.assetName}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase text-muted">Currently assigned to</p>
              <p className="text-sm text-navy">{returning.assigneeName ?? '—'}</p>
            </div>

            <FormField label="Return Date" required>
              <input
                className="input"
                type="date"
                value={form.returnDate}
                onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
              />
            </FormField>

            <FormField label="Return Condition" required>
              <select
                className="input"
                value={form.returnCondition}
                onChange={(e) => setForm({ ...form, returnCondition: e.target.value })}
              >
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
                <option>Damaged</option>
              </select>
            </FormField>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted">Condition details</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {['No damage', 'Minor damage', 'Major damage', 'Missing accessories'].map((flag) => (
                  <label
                    key={flag}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.damageFlags.includes(flag)}
                      onChange={() => toggleFlag(flag)}
                    />
                    {flag}
                  </label>
                ))}
              </div>
            </div>

            <FormField label="Return Reason">
              <select
                className="input"
                value={form.returnReason}
                onChange={(e) => setForm({ ...form, returnReason: e.target.value })}
              >
                <option>End of assignment</option>
                <option>Transfer to another custodian</option>
                <option>Maintenance required</option>
                <option>Staff departure</option>
                <option>Other</option>
              </select>
            </FormField>

            <FormField label="Notes">
              <textarea
                className="input"
                rows={3}
                value={form.returnNotes}
                onChange={(e) => setForm({ ...form, returnNotes: e.target.value })}
              />
            </FormField>
          </div>
        ) : null}
      </AssetsModal>
    </AssetsPageLayout>
  );
}
