'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Recycle, X } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { AssetsModal, AssetPicker, FormField } from '@/components/assets-modal';
import { AssetsDetailRow } from '@/components/assets-detail-row';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi } from '@/services/assets-api';
import { useOpsPage } from '@/hooks/use-ops-page';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate } from '@/utils/format';
import type { AssetReplacement, AssetRow } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);

export function ReplacementsView() {
  const toast = useToast();
  const [rows, setRows] = useState<AssetReplacement[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<AssetReplacement | null>(null);
  const [editing, setEditing] = useState<AssetReplacement | null>(null);
  const [saving, setSaving] = useState(false);
  const { page, setPage, pageSize, setPageSize, total, totalPages, applyMeta } = useOpsPage(20);
  const [form, setForm] = useState({
    oldAssetId: '',
    reason: 'Damaged beyond repair',
    replacementMode: 'register' as 'register' | 'existing',
    existingAssetId: '',
    assetName: '',
    category: '',
    registerYear: new Date().getFullYear(),
    purchasePrice: 0,
    location: '',
    effectiveDate: today(),
    oldAssetAction: 'Retire',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, rRes] = await Promise.all([
        assetsApi.replacements({ page, limit: pageSize }),
        assetsApi.registerList({ limit: 200 }),
      ]);
      setRows(repRes.data.data ?? []);
      applyMeta(repRes.data);
      setAssets(rRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load replacements'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applyMeta, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const oldAsset = assets.find((a) => a.id === form.oldAssetId);

  async function saveEdit() {
    if (!editing) return;
    const editOldAsset = assets.find((a) => a.id === editing.oldAssetId);
    setSaving(true);
    try {
      await assetsApi.updateReplacement(editing.id, {
        reason: [form.reason, form.notes, `Action: ${form.oldAssetAction}`].filter(Boolean).join(' · '),
        pendingPayload: {
          assetName: form.assetName || undefined,
          category: form.category || editOldAsset?.categoryName,
          registerYear: form.registerYear,
          purchasePrice: form.purchasePrice,
          location: form.location || editOldAsset?.location,
          effectiveDate: form.effectiveDate,
          replacementMode: form.replacementMode,
          existingAssetId: form.existingAssetId || undefined,
        },
      });
      toast.success('Replacement request updated.', 'Updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update request'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: AssetReplacement) {
    if (!window.confirm('Delete this replacement request?')) return;
    try {
      await assetsApi.deleteReplacement(row.id);
      toast.success('Request deleted.', 'Deleted');
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Error');
    }
  }

  function openEdit(row: AssetReplacement) {
    const payload = (row.pendingPayload ?? {}) as Record<string, unknown>;
    setForm({
      oldAssetId: row.oldAssetId,
      reason: row.reason?.split(' · ')[0] ?? 'Damaged beyond repair',
      replacementMode: (payload.replacementMode as 'register' | 'existing') ?? 'register',
      existingAssetId: String(payload.existingAssetId ?? ''),
      assetName: String(payload.assetName ?? ''),
      category: String(payload.category ?? row.oldAsset?.categoryName ?? ''),
      registerYear: Number(payload.registerYear ?? new Date().getFullYear()),
      purchasePrice: Number(payload.purchasePrice ?? 0),
      location: String(payload.location ?? row.oldAsset?.location ?? ''),
      effectiveDate: String(payload.effectiveDate ?? today()),
      oldAssetAction: 'Retire',
      notes: '',
    });
    setEditing(row);
  }

  async function create() {
    if (!form.oldAssetId) {
      toast.error('Select the asset to replace');
      return;
    }
    setSaving(true);
    try {
      await assetsApi.createReplacement({
        oldAssetId: form.oldAssetId,
        reason: [form.reason, form.notes, `Action: ${form.oldAssetAction}`].filter(Boolean).join(' · '),
        pendingPayload: {
          assetName: form.assetName || undefined,
          category: form.category || oldAsset?.categoryName,
          registerYear: form.registerYear,
          purchasePrice: form.purchasePrice,
          location: form.location || oldAsset?.location,
          effectiveDate: form.effectiveDate,
          replacementMode: form.replacementMode,
          existingAssetId: form.existingAssetId || undefined,
        },
      });
      toast.success('Replacement request created.', 'Created');
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create request'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function approve(id: string) {
    try {
      await assetsApi.approveReplacement(id);
      toast.success('Replacement approved.', 'Approved');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Approve failed'), 'Error');
    }
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason (optional)') ?? undefined;
    try {
      await assetsApi.rejectReplacement(id, { reason });
      toast.success('Replacement rejected.', 'Rejected');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Reject failed'), 'Error');
    }
  }

  const columns: AssetsTableColumn<AssetReplacement>[] = useMemo(
    () => [
      {
        key: 'old',
        header: 'Current Asset',
        render: (r) => (
          <div>
            <p className="font-semibold text-navy">{r.oldAsset?.assetName ?? r.oldAssetId}</p>
            <p className="text-xs text-muted">{r.oldAsset?.assetCode}</p>
          </div>
        ),
      },
      { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusBadge status={r.status} />,
      },
      { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) },
    ],
    []
  );

  const isPending = (r: AssetReplacement) => r.status === 'Pending' || r.status === 'AwaitingAsset';

  return (
    <AssetsPageLayout
      title="Replacements"
      subtitle="Replace obsolete, damaged or lost assets while preserving audit history"
      actions={
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Replace Asset
        </button>
      }
      kpis={[
        { label: 'Requests', value: total },
        {
          label: 'Pending (page)',
          value: rows.filter((r) => r.status === 'Pending' || r.status === 'AwaitingAsset').length,
        },
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
        emptyMessage="No replacement requests"
        onView={setViewing}
        onEdit={openEdit}
        onDelete={(row) => void remove(row)}
        canEdit={isPending}
        canDelete={isPending}
      />

      <AssetsModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Replacement Details"
        icon={<Recycle size={18} />}
        footer={
          viewing ? (
            <>
              {isPending(viewing) && (
                <>
                  <button type="button" className="btn-secondary text-emerald-700" onClick={() => void approve(viewing.id)}>
                    <Check size={16} /> Approve
                  </button>
                  <button type="button" className="btn-secondary text-red-600" onClick={() => void reject(viewing.id)}>
                    <X size={16} /> Reject
                  </button>
                </>
              )}
              <button type="button" className="btn-primary" onClick={() => setViewing(null)}>
                Close
              </button>
            </>
          ) : undefined
        }
      >
        {viewing ? (
          <div className="space-y-1">
            <AssetsDetailRow label="Current asset" value={`${viewing.oldAsset?.assetCode ?? ''} · ${viewing.oldAsset?.assetName ?? ''}`} />
            <AssetsDetailRow label="Reason" value={viewing.reason} />
            <AssetsDetailRow label="Status" value={<StatusBadge status={viewing.status} />} />
            <AssetsDetailRow label="Created" value={formatDate(viewing.createdAt)} />
            {viewing.rejectReason ? (
              <AssetsDetailRow label="Reject reason" value={viewing.rejectReason} />
            ) : null}
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Replacement Request"
        icon={<Recycle size={18} />}
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
        <div className="space-y-4">
          <FormField label="Replacement Reason">
            <select className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              <option>Damaged beyond repair</option>
              <option>Obsolete</option>
              <option>Lost / missing</option>
              <option>Upgraded</option>
              <option>Warranty replacement</option>
            </select>
          </FormField>
          <FormField label="New Asset Name">
            <input className="input" value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} />
          </FormField>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </div>
      </AssetsModal>

      <AssetsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Replace Asset"
        subtitle="Link a new asset to replace the current one"
        icon={<Recycle size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void create()}>
              {saving ? 'Submitting…' : 'Confirm Replacement'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Current Asset" required>
            <AssetPicker
              assets={assets}
              value={form.oldAssetId}
              onChange={(id) => {
                const asset = assets.find((a) => a.id === id);
                setForm({
                  ...form,
                  oldAssetId: id,
                  category: asset?.categoryName ?? form.category,
                  location: asset?.location ?? form.location,
                });
              }}
            />
          </FormField>

          <FormField label="Replacement Reason" required>
            <select
              className="input"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            >
              <option>Damaged beyond repair</option>
              <option>Obsolete</option>
              <option>Lost / missing</option>
              <option>Upgraded</option>
              <option>Warranty replacement</option>
            </select>
          </FormField>

          <FormField label="New Asset">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  form.replacementMode === 'register'
                    ? 'border-primary bg-amber-50 font-semibold'
                    : 'border-border'
                }`}
                onClick={() => setForm({ ...form, replacementMode: 'register' })}
              >
                Register new asset
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  form.replacementMode === 'existing'
                    ? 'border-primary bg-amber-50 font-semibold'
                    : 'border-border'
                }`}
                onClick={() => setForm({ ...form, replacementMode: 'existing' })}
              >
                Use existing asset
              </button>
            </div>
          </FormField>

          {form.replacementMode === 'existing' ? (
            <FormField label="Select Replacement Asset">
              <AssetPicker
                assets={assets.filter((a) => a.id !== form.oldAssetId)}
                value={form.existingAssetId}
                onChange={(id) => setForm({ ...form, existingAssetId: id })}
              />
            </FormField>
          ) : (
            <>
              <FormField label="New Asset Name">
                <input
                  className="input"
                  value={form.assetName}
                  onChange={(e) => setForm({ ...form, assetName: e.target.value })}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Category">
                  <input
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </FormField>
                <FormField label="Purchase Price">
                  <input
                    className="input"
                    type="number"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                  />
                </FormField>
              </div>
              <FormField label="Location">
                <input
                  className="input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </FormField>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Effective Date">
              <input
                className="input"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              />
            </FormField>
            <FormField label="Old Asset Action">
              <select
                className="input"
                value={form.oldAssetAction}
                onChange={(e) => setForm({ ...form, oldAssetAction: e.target.value })}
              >
                <option>Retire</option>
                <option>Mark as replaced</option>
                <option>Dispose</option>
              </select>
            </FormField>
          </div>

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
