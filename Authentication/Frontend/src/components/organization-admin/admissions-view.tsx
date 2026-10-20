'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Search,
} from 'lucide-react';
import {
  orgAdminApi,
  type AdmissionApplicationSummary,
  type AdmissionSettings,
} from '@/lib/org-admin-api';
import { useToast } from '@/shared/notifications';
import { AdmissionSettingsModal } from './admission-settings-modal';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'DOCUMENTS_VERIFICATION', label: 'Documents Verification' },
  { value: 'ASSESSMENT_INTERVIEW', label: 'Assessment / Interview' },
  { value: 'ADMISSION_APPROVED', label: 'Admission Approved' },
  { value: 'FEE_PAYMENT', label: 'Fee Payment' },
  { value: 'ENROLLED', label: 'Enrolled' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700 ring-slate-200',
  UNDER_REVIEW: 'bg-primary/15 text-navy ring-primary/25',
  DOCUMENTS_VERIFICATION: 'bg-amber-50 text-[#402A00] ring-amber-200',
  ASSESSMENT_INTERVIEW: 'bg-orange-50 text-orange-900 ring-orange-200',
  ADMISSION_APPROVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  FEE_PAYMENT: 'bg-primary/20 text-navy ring-primary/30',
  ENROLLED: 'bg-navy/10 text-navy ring-navy/15',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'}`}
    >
      {label}
    </span>
  );
}

function PagerButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function AdmissionsView() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdmissionSettings | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [applications, setApplications] = useState<AdmissionApplicationSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdmissionApplicationSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, appsRes] = await Promise.all([
        orgAdminApi.getAdmissionSettings(),
        orgAdminApi.listAdmissionApplications(statusFilter || undefined),
      ]);
      setSettings(settingsRes.data.data);
      setApplications(appsRes.data.data);
    } catch {
      toast.error('Failed to load admissions data', 'Error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (a) =>
        a.applicationNumber.toLowerCase().includes(q) ||
        (a.studentName ?? '').toLowerCase().includes(q) ||
        a.admissionLevel.toLowerCase().includes(q) ||
        a.classApplying.toLowerCase().includes(q),
    );
  }, [applications, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const rangeEnd = Math.min(pageStart + pageSize, filtered.length);
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageRows.some((r) => r.id === id)));
    } else {
      const pageIds = pageRows.map((r) => r.id);
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  }

  async function handleToggleEnabled() {
    if (!settings) return;
    setSaving(true);
    try {
      const { data } = await orgAdminApi.updateAdmissionSettings({
        enabled: !settings.enabled,
      });
      setSettings(data.data);
      toast.success(
        data.data.enabled ? 'Parents can now apply on babyeyi.rw' : 'Admissions hidden on babyeyi.rw',
        data.data.enabled ? 'Admissions enabled' : 'Admissions disabled',
      );
    } catch {
      toast.error('Failed to update settings', 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings(updated: AdmissionSettings) {
    setSaving(true);
    try {
      const { data } = await orgAdminApi.updateAdmissionSettings(updated);
      setSettings(data.data);
      setSettingsModalOpen(false);
      toast.success('Admission settings saved', 'Saved');
    } catch {
      toast.error('Failed to save settings', 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(applicationId: string, status: string) {
    try {
      const { data } = await orgAdminApi.updateAdmissionStatus(applicationId, { status });
      setApplications((list) => list.map((a) => (a.id === applicationId ? data.data : a)));
      if (selected?.id === applicationId) setSelected(data.data);
      toast.success('Application status updated', 'Updated');
    } catch {
      toast.error('Failed to update status', 'Error');
    }
  }

  async function bulkUpdateStatus(status: string) {
    const count = selectedIds.length;
    for (const id of selectedIds) {
      await orgAdminApi.updateAdmissionStatus(id, { status });
    }
    await load();
    setSelectedIds([]);
    toast.success(`${count} application(s) updated`, 'Bulk update');
  }

  if (loading && !settings) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        Loading admissions…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Enable card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-navy to-[#0A0F5C] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <h1 className="font-montserrat text-lg font-semibold text-white sm:text-xl">Admissions</h1>
              <p className="text-xs text-white/65 sm:text-sm">
                Online applications on babyeyi.rw
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              disabled={!settings}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
            >
              Configure settings
            </button>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <span className="text-xs font-medium text-white/80">
                {settings?.enabled ? 'Live' : 'Off'}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleToggleEnabled()}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${settings?.enabled ? 'bg-primary' : 'bg-white/25'}`}
                aria-pressed={settings?.enabled}
                aria-label={settings?.enabled ? 'Disable admissions' : 'Enable admissions'}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${settings?.enabled ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            </div>
          </div>
        </div>

        {settings?.applicationDeadline || settings?.estimatedFee != null ? (
          <div className="flex flex-wrap gap-4 px-4 py-3 text-xs sm:px-5">
            {settings.applicationDeadline ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-navy">
                Deadline: {new Date(settings.applicationDeadline).toLocaleString()}
              </span>
            ) : null}
            {settings.estimatedFee != null ? (
              <span className="rounded-full bg-navy/5 px-3 py-1 font-semibold text-navy">
                Est. fee: {settings.estimatedFee.toLocaleString()} Frw
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Applications table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-montserrat text-base font-semibold text-navy sm:text-lg">Applications</h2>
            <p className="text-xs text-slate-500 sm:text-sm">{filtered.length} registered</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-56 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search reference or student…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-[#f4f6fb] py-2 pl-9 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={`h-10 rounded-xl border px-3 text-sm font-medium outline-none transition ${
                statusFilter
                  ? 'border-primary/40 bg-primary/10 text-navy'
                  : 'border-slate-200 bg-white text-navy hover:border-slate-300'
              }`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-primary/5 px-4 py-2.5 text-sm sm:px-5">
            <span className="font-semibold text-navy">{selectedIds.length} selected</span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-slate-50"
              onClick={() => void bulkUpdateStatus('UNDER_REVIEW')}
            >
              Mark under review
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-slate-50"
              onClick={() => void bulkUpdateStatus('DOCUMENTS_VERIFICATION')}
            >
              Verify documents
            </button>
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-navy"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="bg-navy">
                <th className="w-12 px-4 py-3.5 sm:px-5">
                  <button
                    type="button"
                    aria-label="Select all on page"
                    onClick={toggleSelectAll}
                    className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition ${
                      allPageSelected
                        ? 'border-primary bg-primary text-navy'
                        : 'border-primary/70 bg-transparent'
                    }`}
                  >
                    {allPageSelected ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : null}
                  </button>
                </th>
                {['Reference', 'Student', 'Level / Class', 'Type', 'Status', 'Submitted'].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary sm:px-4"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <p className="text-sm font-medium text-navy">No applications yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Enable admissions and share your school on babyeyi.rw.
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((app) => {
                  const isSelected = selectedIds.includes(app.id);
                  const submitted = app.submittedAt
                    ? new Date(app.submittedAt)
                    : null;

                  return (
                    <tr
                      key={app.id}
                      className={`cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70 ${
                        isSelected ? 'bg-primary/[0.04]' : ''
                      }`}
                      onClick={() => setSelected(app)}
                    >
                      <td className="px-4 py-3.5 sm:px-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, app.id]
                                : prev.filter((id) => id !== app.id),
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        <span className="font-mono text-xs font-bold text-navy">{app.applicationNumber}</span>
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-primary">
                            {initials(app.studentName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-navy">
                              {app.studentName ?? '—'}
                            </p>
                            <p className="truncate text-xs text-slate-500">{app.admissionType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        <p className="text-sm font-medium text-navy">{app.admissionLevel}</p>
                        <p className="text-xs text-slate-500">{app.classApplying}</p>
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {app.admissionType}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        {submitted ? (
                          <>
                            <p className="text-xs font-medium text-slate-600">
                              {submitted.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {submitted.toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Draft</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Show
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-navy outline-none focus:border-primary/40"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            entries
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs text-slate-500">
              {filtered.length === 0
                ? '0 of 0'
                : `${pageStart + 1}-${rangeEnd} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-1">
              <PagerButton label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="size-3.5" />
              </PagerButton>
              <PagerButton
                label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </PagerButton>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '…' ? (
                    <span key={`e-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                        item === currentPage
                          ? 'bg-navy text-primary'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <PagerButton
                label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </PagerButton>
              <PagerButton
                label="Last page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="size-3.5" />
              </PagerButton>
            </div>
          </div>
        </div>
      </div>

      {settings ? (
        <AdmissionSettingsModal
          open={settingsModalOpen}
          settings={settings}
          saving={saving}
          onClose={() => setSettingsModalOpen(false)}
          onSave={(updated) => void handleSaveSettings(updated)}
        />
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="bg-navy px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-primary">{selected.applicationNumber}</p>
                  <h3 className="text-lg font-bold text-white">{selected.studentName ?? 'Applicant'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <StatusBadge status={selected.status} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Level</span>
                  <p className="font-semibold text-navy">{selected.admissionLevel}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Class</span>
                  <p className="font-semibold text-navy">{selected.classApplying}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Year / Term</span>
                  <p className="font-semibold text-navy">{selected.academicYear} · {selected.termOfEntry}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</span>
                  <p className="font-semibold text-navy">{selected.admissionType}</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Update status
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-navy outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  value={selected.status}
                  onChange={(e) => void handleStatusUpdate(selected.id, e.target.value)}
                >
                  {STATUS_OPTIONS.filter((s) => s.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {selected.interviewAt ? (
                <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-navy">
                  Interview: {new Date(selected.interviewAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
