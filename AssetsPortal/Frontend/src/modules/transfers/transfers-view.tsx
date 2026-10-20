'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { AssetsModal, AssetPicker, FormField } from '@/components/assets-modal';
import { AssetsDetailRow } from '@/components/assets-detail-row';
import { assetsApi } from '@/services/assets-api';
import { useOpsPage } from '@/hooks/use-ops-page';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate } from '@/utils/format';
import type { AssetRow, AssetTransfer } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);

export function TransfersView() {
  const toast = useToast();
  const [rows, setRows] = useState<AssetTransfer[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<AssetTransfer | null>(null);
  const [editing, setEditing] = useState<AssetTransfer | null>(null);
  const [saving, setSaving] = useState(false);
  const { page, setPage, pageSize, setPageSize, total, totalPages, applyMeta } = useOpsPage(20);
  const [form, setForm] = useState({
    assetId: '',
    toDepartment: '',
    toLocation: '',
    receivedBy: '',
    transferDate: today(),
    reason: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        assetsApi.transfers({ page, limit: pageSize }),
        assetsApi.registerList({ limit: 200 }),
      ]);
      setRows(tRes.data.data ?? []);
      applyMeta(tRes.data);
      setAssets(rRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load transfers'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applyMeta, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAsset = assets.find((a) => a.id === form.assetId);

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await assetsApi.updateTransfer(editing.id, {
        toLocation: form.toLocation || undefined,
        toDepartment: form.toDepartment || undefined,
        transferDate: form.transferDate || undefined,
        receivedBy: form.receivedBy || undefined,
        reason: [form.reason, form.notes].filter(Boolean).join(' — ') || undefined,
      });
      toast.success('Transfer updated.', 'Updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update transfer'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: AssetTransfer) {
    if (!window.confirm('Delete this transfer record?')) return;
    try {
      await assetsApi.deleteTransfer(row.id);
      toast.success('Transfer deleted.', 'Deleted');
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Error');
    }
  }

  function openEdit(row: AssetTransfer) {
    const [reason = '', notes = ''] = (row.reason ?? '').split(' — ');
    setForm({
      assetId: row.assetId,
      toDepartment: row.toDepartment ?? '',
      toLocation: row.toLocation ?? '',
      receivedBy: row.receivedBy ?? '',
      transferDate: row.transferDate?.slice(0, 10) ?? today(),
      reason,
      notes,
    });
    setEditing(row);
  }

  async function create() {
    if (!form.assetId) {
      toast.error('Select an asset');
      return;
    }
    setSaving(true);
    try {
      await assetsApi.createTransfer({
        assetId: form.assetId,
        toLocation: form.toLocation || undefined,
        toDepartment: form.toDepartment || undefined,
        transferDate: form.transferDate || undefined,
        receivedBy: form.receivedBy || undefined,
        reason: [form.reason, form.notes].filter(Boolean).join(' — ') || undefined,
      });
      toast.success('Transfer recorded.', 'Created');
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create transfer'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  const columns: AssetsTableColumn<AssetTransfer>[] = useMemo(
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
      {
        key: 'from',
        header: 'From',
        render: (r) => r.fromLocation || r.fromDepartment || '—',
      },
      {
        key: 'to',
        header: 'To',
        render: (r) => (
          <div>
            <p>{r.toLocation || '—'}</p>
            {r.toDepartment ? <p className="text-xs text-muted">{r.toDepartment}</p> : null}
          </div>
        ),
      },
      { key: 'date', header: 'Date', render: (r) => formatDate(r.transferDate) },
      { key: 'by', header: 'Received by', render: (r) => r.receivedBy || '—' },
      { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
    ],
    []
  );

  return (
    <AssetsPageLayout
      title="Asset Transfers"
      subtitle="Controlled movement between departments and locations"
      actions={
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Transfer Asset
        </button>
      }
      kpis={[{ label: 'Transfers', value: total }]}
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
        emptyMessage="No transfers recorded"
        onView={setViewing}
        onEdit={openEdit}
        onDelete={(row) => void remove(row)}
      />

      <AssetsModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Transfer Details"
        icon={<ArrowRightLeft size={18} />}
        footer={
          <button type="button" className="btn-primary" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing ? (
          <div className="space-y-1">
            <AssetsDetailRow label="Asset" value={`${viewing.asset?.assetCode ?? ''} · ${viewing.asset?.assetName ?? ''}`} />
            <AssetsDetailRow label="From" value={viewing.fromLocation || viewing.fromDepartment} />
            <AssetsDetailRow label="To location" value={viewing.toLocation} />
            <AssetsDetailRow label="To department" value={viewing.toDepartment} />
            <AssetsDetailRow label="Date" value={formatDate(viewing.transferDate)} />
            <AssetsDetailRow label="Received by" value={viewing.receivedBy} />
            <AssetsDetailRow label="Authorized by" value={viewing.authorizedBy} />
            <AssetsDetailRow label="Reason" value={viewing.reason} />
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Transfer"
        icon={<ArrowRightLeft size={18} />}
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
            <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-navy">{editing.asset?.assetName}</p>
              <p className="text-xs text-muted">{editing.asset?.assetCode}</p>
            </div>
            <FormField label="Transfer To (Department)">
              <input className="input" value={form.toDepartment} onChange={(e) => setForm({ ...form, toDepartment: e.target.value })} />
            </FormField>
            <FormField label="New Location">
              <input className="input" value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} />
            </FormField>
            <FormField label="New Custodian">
              <input className="input" value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} />
            </FormField>
            <FormField label="Transfer Date">
              <input className="input" type="date" value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} />
            </FormField>
            <FormField label="Reason">
              <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </FormField>
            <FormField label="Notes">
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Transfer Asset"
        subtitle="Move asset custody to a new location or department"
        icon={<ArrowRightLeft size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void create()}>
              {saving ? 'Saving…' : 'Confirm Transfer'}
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

          {selectedAsset ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase text-sky-800">Current location</p>
              <p className="font-medium text-navy">
                {selectedAsset.location || selectedAsset.locationLabel || 'Unspecified'}
              </p>
            </div>
          ) : null}

          <FormField label="Transfer To (Department)">
            <select
              className="input"
              value={form.toDepartment}
              onChange={(e) => setForm({ ...form, toDepartment: e.target.value })}
            >
              <option value="">Select department</option>
              <option>Academic Department</option>
              <option>Administration</option>
              <option>Science Department</option>
              <option>Finance</option>
              <option>Operations</option>
            </select>
          </FormField>

          <FormField label="New Location" required>
            <input
              className="input"
              placeholder="e.g. S2 Block"
              value={form.toLocation}
              onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
            />
          </FormField>

          <FormField label="New Custodian">
            <input
              className="input"
              placeholder="Person receiving the asset"
              value={form.receivedBy}
              onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
            />
          </FormField>

          <FormField label="Transfer Date">
            <input
              className="input"
              type="date"
              value={form.transferDate}
              onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
            />
          </FormField>

          <FormField label="Reason">
            <input
              className="input"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>
      </AssetsModal>
    </AssetsPageLayout>
  );
}
