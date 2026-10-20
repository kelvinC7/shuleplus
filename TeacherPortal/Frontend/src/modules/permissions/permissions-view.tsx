'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Plus, RefreshCw, X, XCircle } from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  createPermissionRequest,
  fetchPermissions,
  fetchPermissionSummary,
  fetchPermissionTypes,
  workApiError,
  type PermissionRequest,
} from '@/services/teacher-work-api';

const STATUS_FILTERS = ['all', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
const OTHER_PERMISSION_TYPE = 'Other';

export function PermissionsView() {
  const { term, academicYear, setTerm, setAcademicYear, settings } = useAcademicSettings();
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [rows, setRows] = useState<PermissionRequest[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<PermissionRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionType, setPermissionType] = useState('');
  const [otherPermissionType, setOtherPermissionType] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  function openRequestModal() {
    setPermissionType('');
    setOtherPermissionType('');
    setAttachmentName('');
    setModalOpen(true);
  }

  function closeRequestModal() {
    setModalOpen(false);
    setPermissionType('');
    setOtherPermissionType('');
    setAttachmentName('');
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, list, t] = await Promise.all([
        fetchPermissionSummary(),
        fetchPermissions({ status: statusFilter === 'all' ? undefined : statusFilter }),
        fetchPermissionTypes(),
      ]);
      setSummary(s);
      setRows(list);
      setTypes(t);
    } catch (err) {
      setError(workApiError(err, 'Could not load permissions'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedType = String(fd.get('permissionType'));
    const resolvedType =
      selectedType === OTHER_PERMISSION_TYPE
        ? String(fd.get('otherPermissionType') || '').trim()
        : selectedType;
    if (selectedType === OTHER_PERMISSION_TYPE && !resolvedType) {
      setError('Please specify the permission type');
      return;
    }
    setSubmitting(true);
    try {
      await createPermissionRequest({
        permissionType: resolvedType,
        startDate: String(fd.get('startDate')),
        endDate: String(fd.get('endDate') || fd.get('startDate')),
        startTime: String(fd.get('startTime') || '') || undefined,
        endTime: String(fd.get('endTime') || '') || undefined,
        reason: String(fd.get('reason')),
        details: String(fd.get('details') || '') || undefined,
        attachmentName: attachmentName || undefined,
        academicYear,
        term,
      });
      closeRequestModal();
      await load();
    } catch (err) {
      setError(workApiError(err, 'Could not submit request'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 pb-8 sm:space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy sm:text-2xl">Permissions & Leave</h1>
            <p className="mt-1 text-sm text-muted">Request permission or leave and track approval status.</p>
          </div>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openRequestModal}>
            <Plus className="h-4 w-4" /> Request Permission
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select className="input py-2 text-sm" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {(settings?.academicYears ?? [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input py-2 text-sm" value={term} onChange={(e) => setTerm(e.target.value)}>
            {(settings?.terms ?? [term]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Kpi label="Requests" value={summary.total} />
        <Kpi label="Pending" value={summary.pending} tone="amber" />
        <Kpi label="Approved" value={summary.approved} tone="emerald" />
        <Kpi label="Rejected" value={summary.rejected} tone="red" />
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                statusFilter === s ? 'border-navy bg-navy text-white' : 'border-border text-muted'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
        <button type="button" className="btn-secondary inline-flex items-center gap-1 text-sm" onClick={() => void load()}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold text-navy">No permission requests yet</p>
          <button type="button" className="btn-primary mt-4" onClick={openRequestModal}>Request Permission</button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setDetail(row)}
              className="w-full rounded-xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">#{row.reference} · {row.permissionType}</p>
                  <p className="text-sm text-muted">
                    {row.startDate.slice(0, 10)}
                    {row.endDate !== row.startDate ? ` → ${row.endDate.slice(0, 10)}` : ''}
                    {row.startTime ? ` · ${row.startTime}${row.endTime ? `–${row.endTime}` : ''}` : ' · Full day'}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
            </button>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <form onSubmit={(e) => void handleSubmit(e)} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy">Request Permission</h3>
              <button type="button" onClick={closeRequestModal}><X className="h-5 w-5 text-muted" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">Permission Type *
                <select
                  name="permissionType"
                  className="input mt-1 w-full"
                  required
                  value={permissionType}
                  onChange={(e) => {
                    setPermissionType(e.target.value);
                    if (e.target.value !== OTHER_PERMISSION_TYPE) setOtherPermissionType('');
                  }}
                >
                  <option value="">Select type</option>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {permissionType === OTHER_PERMISSION_TYPE ? (
                <label className="block text-sm">Specify permission type *
                  <input
                    name="otherPermissionType"
                    className="input mt-1 w-full"
                    placeholder="e.g. Family ceremony, court appearance…"
                    value={otherPermissionType}
                    onChange={(e) => setOtherPermissionType(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">Start Date *
                  <input name="startDate" type="date" className="input mt-1 w-full" required />
                </label>
                <label className="block text-sm">End Date
                  <input name="endDate" type="date" className="input mt-1 w-full" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">Start Time
                  <input name="startTime" type="time" className="input mt-1 w-full" />
                </label>
                <label className="block text-sm">End Time
                  <input name="endTime" type="time" className="input mt-1 w-full" />
                </label>
              </div>
              <label className="block text-sm">Reason *
                <textarea name="reason" className="input mt-1 min-h-[72px] w-full" required />
              </label>
              <label className="block text-sm">Additional Details
                <textarea name="details" className="input mt-1 min-h-[56px] w-full" />
              </label>
              <label className="block text-sm">
                Supporting document <span className="font-normal text-muted">(optional)</span>
                <input
                  type="file"
                  className="input mt-1 w-full file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? '')}
                />
                {attachmentName ? (
                  <p className="mt-1 text-xs text-muted">Selected: {attachmentName}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted">Attach a medical note or other proof if you have one.</p>
                )}
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={closeRequestModal}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex justify-between">
              <h3 className="font-bold text-navy">#{detail.reference}</h3>
              <button type="button" onClick={() => setDetail(null)}><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-sm text-muted">{detail.permissionType}</p>
            <StatusBadge status={detail.status} className="mt-2" />
            <p className="mt-3 text-sm">{detail.reason}</p>
            <Timeline entries={detail.timeline} />
            {detail.rejectReason ? <p className="mt-3 text-sm text-red-700">Rejected: {detail.rejectReason}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Timeline({ entries }: { entries: PermissionRequest['timeline'] }) {
  if (!entries?.length) return null;
  return (
    <div className="mt-4 space-y-2 border-l-2 border-border pl-4">
      {entries.map((e, i) => (
        <div key={i} className="text-sm">
          <p className="font-semibold text-navy">{e.status}</p>
          <p className="text-xs text-muted">{new Date(e.at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-900 border-amber-200',
    UNDER_REVIEW: 'bg-sky-50 text-sky-800 border-sky-200',
    APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-800 border-red-200',
  };
  const icon = status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : Clock;
  const Icon = icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status] ?? 'border-border'} ${className}`}>
      <Icon className="h-3 w-3" /> {status.replace('_', ' ')}
    </span>
  );
}

function Kpi({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'emerald' | 'amber' | 'red' }) {
  const c = { default: 'text-navy', emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700' };
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
      <p className={`text-xl font-extrabold ${c[tone]}`}>{value}</p>
    </div>
  );
}
