'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { AssetsModal, AssetPicker, FormField } from '@/components/assets-modal';
import { AssetsDetailRow, buildAssignmentNotes, parseAssignmentNotes } from '@/components/assets-detail-row';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi } from '@/services/assets-api';
import { useOpsPage } from '@/hooks/use-ops-page';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate } from '@/utils/format';
import type { AssetAssignment, AssetRow } from '@/types';

const today = () => new Date().toISOString().slice(0, 10);

export function AssignmentsView() {
  const toast = useToast();
  const [rows, setRows] = useState<AssetAssignment[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<AssetAssignment | null>(null);
  const [editing, setEditing] = useState<AssetAssignment | null>(null);
  const [saving, setSaving] = useState(false);
  const { page, setPage, pageSize, setPageSize, total, totalPages, applyMeta } = useOpsPage(20);
  const [form, setForm] = useState({
    assetId: '',
    assigneeType: 'Teacher / Staff',
    assigneeName: '',
    department: '',
    location: '',
    assignDate: today(),
    expectedReturnDate: '',
    conditionCode: 'Good',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, rRes] = await Promise.all([
        assetsApi.assignments({ page, limit: pageSize }),
        assetsApi.registerList({ limit: 200 }),
      ]);
      setRows(aRes.data.data ?? []);
      applyMeta(aRes.data);
      setAssets(rRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load assignments'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, applyMeta, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEdit() {
    if (!editing) return;
    if (!form.assigneeName.trim()) {
      toast.error('Assignee name is required');
      return;
    }
    setSaving(true);
    try {
      await assetsApi.updateAssignment(editing.id, {
        assigneeName: form.assigneeName.trim(),
        department: form.department || undefined,
        location: form.location || undefined,
        assignDate: form.assignDate || undefined,
        expectedReturnDate: form.expectedReturnDate || undefined,
        notes: buildAssignmentNotes(form.assigneeType, form.conditionCode, form.notes),
      });
      toast.success('Assignment updated.', 'Updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update assignment'), 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: AssetAssignment) {
    if (!window.confirm('Delete this assignment record? This cannot be undone.')) return;
    try {
      await assetsApi.deleteAssignment(row.id);
      toast.success('Assignment deleted.', 'Deleted');
      if (viewing?.id === row.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete assignment'), 'Error');
    }
  }

  function openEdit(row: AssetAssignment) {
    const parsed = parseAssignmentNotes(row.notes);
    setForm({
      assetId: row.assetId,
      assigneeType: parsed.assigneeType,
      assigneeName: row.assigneeName ?? '',
      department: row.department ?? '',
      location: row.location ?? '',
      assignDate: row.assignDate?.slice(0, 10) ?? today(),
      expectedReturnDate: row.expectedReturnDate?.slice(0, 10) ?? '',
      conditionCode: parsed.conditionCode,
      notes: parsed.extraNotes,
    });
    setEditing(row);
  }

  async function create() {
    if (!form.assetId) {
      toast.error('Select an asset');
      return;
    }
    if (!form.assigneeName.trim()) {
      toast.error('Assignee name is required');
      return;
    }
    setSaving(true);
    try {
      await assetsApi.createAssignment({
        assetId: form.assetId,
        assigneeName: form.assigneeName.trim(),
        department: form.department || undefined,
        location: form.location || undefined,
        assignDate: form.assignDate || undefined,
        expectedReturnDate: form.expectedReturnDate || undefined,
        notes: buildAssignmentNotes(form.assigneeType, form.conditionCode, form.notes),
      });
      toast.success('Assignment created.', 'Created');
      setShowModal(false);
      setForm({
        assetId: '',
        assigneeType: 'Teacher / Staff',
        assigneeName: '',
        department: '',
        location: '',
        assignDate: today(),
        expectedReturnDate: '',
        conditionCode: 'Good',
        notes: '',
      });
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create assignment'), 'Error');
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
      { key: 'dept', header: 'Department', render: (r) => r.department || '—' },
      { key: 'assigned', header: 'Date', render: (r) => formatDate(r.assignDate) },
      {
        key: 'condition',
        header: 'Condition',
        render: (r) => r.notes?.split(' · ')[1] ?? 'Good',
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  const active = rows.filter((r) => r.status === 'Active' || r.status === 'Overdue').length;

  return (
    <AssetsPageLayout
      title="Asset Assignments"
      subtitle="Track which employee, teacher, department or location currently holds each asset"
      actions={
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Assign Asset
        </button>
      }
      kpis={[
        { label: 'Total', value: total },
        { label: 'Active (page)', value: active },
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
        emptyMessage="No assignments yet"
        onView={setViewing}
        onEdit={openEdit}
        onDelete={(row) => void remove(row)}
        canEdit={(row) => row.status === 'Active' || row.status === 'Overdue'}
      />

      <AssetsModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Assignment Details"
        subtitle={viewing?.asset?.assetCode}
        icon={<UserCheck size={18} />}
        footer={
          viewing ? (
            <>
              {(viewing.status === 'Active' || viewing.status === 'Overdue') && (
                <button type="button" className="btn-secondary" onClick={() => { openEdit(viewing); setViewing(null); }}>
                  Edit
                </button>
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
            <AssetsDetailRow label="Asset" value={`${viewing.asset?.assetCode ?? ''} · ${viewing.asset?.assetName ?? ''}`} />
            <AssetsDetailRow label="Assigned to" value={viewing.assigneeName} />
            <AssetsDetailRow label="Department" value={viewing.department} />
            <AssetsDetailRow label="Location" value={viewing.location} />
            <AssetsDetailRow label="Assigned" value={formatDate(viewing.assignDate)} />
            <AssetsDetailRow label="Expected return" value={formatDate(viewing.expectedReturnDate)} />
            <AssetsDetailRow label="Condition" value={parseAssignmentNotes(viewing.notes).conditionCode} />
            <AssetsDetailRow label="Status" value={<StatusBadge status={viewing.status} />} />
            <AssetsDetailRow label="Notes" value={parseAssignmentNotes(viewing.notes).extraNotes || viewing.notes} />
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Assignment"
        subtitle={editing?.asset?.assetName}
        icon={<UserCheck size={18} />}
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
            <FormField label="Assign To">
              <select className="input" value={form.assigneeType} onChange={(e) => setForm({ ...form, assigneeType: e.target.value })}>
                <option>Teacher / Staff</option>
                <option>Department</option>
                <option>Location custodian</option>
              </select>
            </FormField>
            <FormField label="Person / Custodian" required>
              <input className="input" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Department">
                <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </FormField>
              <FormField label="Location">
                <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Assignment Date">
                <input className="input" type="date" value={form.assignDate} onChange={(e) => setForm({ ...form, assignDate: e.target.value })} />
              </FormField>
              <FormField label="Expected Return">
                <input className="input" type="date" value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Condition">
              <select className="input" value={form.conditionCode} onChange={(e) => setForm({ ...form, conditionCode: e.target.value })}>
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
              </select>
            </FormField>
            <FormField label="Notes">
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
          </div>
        ) : null}
      </AssetsModal>

      <AssetsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Assign Asset"
        subtitle="Link an asset to a custodian"
        icon={<UserCheck size={18} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void create()}>
              {saving ? 'Saving…' : 'Confirm Assignment'}
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

          <FormField label="Assign To" required>
            <select
              className="input"
              value={form.assigneeType}
              onChange={(e) => setForm({ ...form, assigneeType: e.target.value })}
            >
              <option>Teacher / Staff</option>
              <option>Department</option>
              <option>Location custodian</option>
            </select>
          </FormField>

          <FormField label="Person / Custodian" required>
            <input
              className="input"
              placeholder="e.g. Jean Claude"
              value={form.assigneeName}
              onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department">
              <select
                className="input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select department</option>
                <option>Academic</option>
                <option>Administration</option>
                <option>Finance</option>
                <option>Science</option>
                <option>Operations</option>
              </select>
            </FormField>
            <FormField label="Location">
              <input
                className="input"
                placeholder="e.g. Administration"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Assignment Date" required>
              <input
                className="input"
                type="date"
                value={form.assignDate}
                onChange={(e) => setForm({ ...form, assignDate: e.target.value })}
              />
            </FormField>
            <FormField label="Expected Return">
              <input
                className="input"
                type="date"
                value={form.expectedReturnDate}
                onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Condition">
            <select
              className="input"
              value={form.conditionCode}
              onChange={(e) => setForm({ ...form, conditionCode: e.target.value })}
            >
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </FormField>

          <FormField label="Notes">
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>
      </AssetsModal>
    </AssetsPageLayout>
  );
}
