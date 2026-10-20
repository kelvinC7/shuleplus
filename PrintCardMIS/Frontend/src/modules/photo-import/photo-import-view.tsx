'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanSearch,
  Upload,
  XCircle,
} from 'lucide-react';
import { SchoolScopeBar } from '@/components/school-scope-bar';
import { ToastHost, useToasts } from '@/components/toast';
import { usePrintCardSchools } from '@/hooks/use-print-card-schools';
import { getToken } from '@/shared/auth-token';
import {
  confirmPhotoImportJob,
  createPhotoImportJob,
  fetchPhotoImportJob,
  fetchPhotoImportJobs,
  photoImportReportUrl,
  type PhotoImportJob,
  type PhotoImportRow,
  type PhotoImportRowStatus,
} from '@/services/print-card-api';

const TABS: { key: PhotoImportRowStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'MATCHED', label: 'Matched' },
  { key: 'IMPORTED', label: 'Imported' },
  { key: 'MISSING', label: 'Missing' },
  { key: 'UNKNOWN', label: 'Unknown' },
  { key: 'SKIPPED', label: 'Skipped' },
  { key: 'DUPLICATE', label: 'Duplicate' },
  { key: 'INVALID', label: 'Invalid' },
  { key: 'FAILED', label: 'Failed' },
];

function jobStatusTone(status: string) {
  if (status === 'READY' || status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'FAILED') return 'bg-red-100 text-red-800';
  if (status === 'IMPORTING' || status === 'ANALYZING' || status === 'QUEUED') {
    return 'bg-sky-100 text-sky-800';
  }
  return 'bg-slate-100 text-slate-700';
}

function rowStatusMeta(status: PhotoImportRowStatus): { label: string; className: string } {
  switch (status) {
    case 'MATCHED':
      return { label: 'Matched', className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' };
    case 'IMPORTED':
      return { label: 'Imported', className: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300' };
    case 'MISSING':
      return { label: 'Missing photo', className: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' };
    case 'UNKNOWN':
      return { label: 'Unknown', className: 'bg-orange-50 text-orange-900 ring-1 ring-orange-200' };
    case 'DUPLICATE':
      return { label: 'Duplicate', className: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200' };
    case 'INVALID':
      return { label: 'Invalid', className: 'bg-red-50 text-red-800 ring-1 ring-red-200' };
    case 'SKIPPED':
      return { label: 'Skipped', className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' };
    case 'FAILED':
      return { label: 'Failed', className: 'bg-red-100 text-red-900 ring-1 ring-red-300' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700' };
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressPanel({
  title,
  subtitle,
  percent,
  tone = 'navy',
}: {
  title: string;
  subtitle?: string;
  percent: number;
  tone?: 'navy' | 'emerald';
}) {
  const bar = tone === 'emerald' ? 'bg-emerald-600' : 'bg-navy';
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-navy">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        <span className="tabular-nums text-2xl font-bold text-navy">{pct}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${accent ?? 'text-navy'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function FileDrop({
  label,
  hint,
  accept,
  file,
  onFile,
  icon: Icon,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  icon: typeof FileSpreadsheet;
}) {
  return (
    <label className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 transition hover:border-navy/35 hover:bg-white">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy shadow-sm ring-1 ring-slate-200">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{label}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
      <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        {file ? (
          <span className="font-medium text-navy">
            {file.name} · {formatBytes(file.size)}
          </span>
        ) : (
          <span>Click to choose file</span>
        )}
      </div>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function ResultsTable({ rows }: { rows: PhotoImportRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <XCircle className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-muted">No students in this filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <th className="px-4 py-3 font-bold">Status</th>
            <th className="px-4 py-3 font-bold">Photo ID</th>
            <th className="px-4 py-3 font-bold">Student</th>
            <th className="px-4 py-3 font-bold">Code</th>
            <th className="px-4 py-3 font-bold">File</th>
            <th className="px-4 py-3 font-bold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = rowStatusMeta(r.status);
            return (
              <tr key={r.id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{r.photoId ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.studentName ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.studentCode ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.fileName ?? '—'}</td>
                <td className="max-w-[280px] px-4 py-3 text-xs text-slate-500">{r.message ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PhotoImportView() {
  const {
    schools,
    selectedSchool,
    setSelectedSchool,
    canSelectSchools,
    viewAllSchools,
    setViewAllSchools,
    loading: schoolsLoading,
  } = usePrintCardSchools();
  const [jobs, setJobs] = useState<PhotoImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<PhotoImportJob | null>(null);
  const [excel, setExcel] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const photoIdRegex = 'numbers-only';
  const [policy, setPolicy] = useState<'ONLY_MISSING' | 'REPLACE'>('ONLY_MISSING');
  const [tab, setTab] = useState<PhotoImportRowStatus | 'ALL'>('ALL');
  const [busy, setBusy] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'importing'>('idle');
  const toasts = useToasts();

  useEffect(() => {
    if (viewAllSchools && selectedSchool) setViewAllSchools(false);
  }, [viewAllSchools, selectedSchool, setViewAllSchools]);

  const orgId = selectedSchool?.id;

  const loadJobs = useCallback(async () => {
    if (!orgId) {
      setJobs([]);
      setActiveJob(null);
      return;
    }
    setLoadingJobs(true);
    try {
      const rows = await fetchPhotoImportJobs(orgId);
      setJobs(rows);
      setActiveJob((prev) => {
        if (prev && rows.some((j) => j.id === prev.id)) return prev;
        return rows[0] ?? null;
      });
    } catch {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, [orgId]);

  const refreshActive = useCallback(async () => {
    if (!orgId || !activeJob) return;
    try {
      const prevStatus = activeJob.status;
      const fresh = await fetchPhotoImportJob(activeJob.id, orgId);
      setActiveJob(fresh);
      setJobs((prev) => prev.map((j) => (j.id === fresh.id ? { ...j, ...fresh, rows: undefined } : j)));
      if (fresh.status === 'READY' || fresh.status === 'COMPLETED' || fresh.status === 'FAILED') {
        setUploadPhase('idle');
        setUploadPercent(0);
      }
      if (prevStatus !== 'READY' && fresh.status === 'READY') {
        toasts.success(
          'Analysis ready',
          `${fresh.stats?.matched ?? 0} matched. Review the table, then click Upload photos.`
        );
      }
      if (prevStatus !== 'COMPLETED' && fresh.status === 'COMPLETED') {
        toasts.success('Upload finished', 'Photos were applied in Student Management.');
      }
      if (prevStatus !== 'FAILED' && fresh.status === 'FAILED') {
        toasts.error('Job failed', fresh.errorMessage ?? 'Analysis or upload failed.');
      }
    } catch {
      /* ignore */
    }
  }, [orgId, activeJob, toasts]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!activeJob) return;
    if (!['QUEUED', 'ANALYZING', 'IMPORTING'].includes(activeJob.status)) return;
    if (activeJob.status === 'QUEUED' || activeJob.status === 'ANALYZING') setUploadPhase('analyzing');
    if (activeJob.status === 'IMPORTING') setUploadPhase('importing');
    const t = setInterval(() => void refreshActive(), 1500);
    return () => clearInterval(t);
  }, [activeJob?.id, activeJob?.status, refreshActive]);

  useEffect(() => {
    if (activeJob?.id && orgId && !activeJob.buckets) void refreshActive();
  }, [activeJob?.id, activeJob?.buckets, orgId, refreshActive]);

  useEffect(() => {
    if (activeJob?.status === 'COMPLETED') setTab('ALL');
    else if (activeJob?.status === 'READY') setTab('MATCHED');
  }, [activeJob?.id, activeJob?.status]);

  const stats = activeJob?.stats;
  const allRows = activeJob?.rows ?? [];

  const tabRows = useMemo(() => {
    if (!activeJob) return [];
    if (tab === 'ALL') return allRows;
    if (activeJob.buckets?.[tab]) return activeJob.buckets[tab];
    return allRows.filter((r) => r.status === tab);
  }, [activeJob, tab, allRows]);

  const importProgress = useMemo(() => {
    const matched = stats?.matched ?? 0;
    const done = (stats?.imported ?? 0) + (stats?.skipped ?? 0) + (stats?.failed ?? 0);
    if (activeJob?.status === 'COMPLETED') return 100;
    if (matched <= 0) return activeJob?.status === 'IMPORTING' ? 8 : 0;
    return Math.min(99, Math.round((done / matched) * 100));
  }, [stats, activeJob?.status]);

  async function onAnalyze() {
    if (!orgId || !excel || !zip) {
      toasts.error('Missing files', 'Select a school, Excel (with PHOTO ID), and ZIP of photos.');
      return;
    }
    setBusy(true);
    setUploadPercent(0);
    setUploadPhase('uploading');
    try {
      const form = new FormData();
      form.append('organizationId', orgId);
      form.append('photoIdRegex', photoIdRegex);
      form.append('excel', excel);
      form.append('zip', zip);
      const job = await createPhotoImportJob(form, (pct) => setUploadPercent(pct));
      setUploadPercent(100);
      setUploadPhase('analyzing');
      toasts.info('Upload complete', 'Analyzing Photo IDs… Upload photos only after you review matches.');
      setExcel(null);
      setZip(null);
      await loadJobs();
      const detailed = await fetchPhotoImportJob(job.id, orgId);
      setActiveJob(detailed);
      if (detailed.status === 'READY') {
        setUploadPhase('idle');
        toasts.success(
          'Analysis ready',
          `${detailed.stats?.matched ?? 0} matched. Click Upload photos when ready.`
        );
      }
    } catch (err: unknown) {
      setUploadPhase('idle');
      const ax = err as {
        message?: string;
        code?: string;
        response?: { status?: number; data?: { message?: string } | string };
      };
      const status = ax.response?.status;
      const dataMsg =
        typeof ax.response?.data === 'string'
          ? ax.response.data
          : ax.response?.data?.message;
      let msg = dataMsg ?? ax.message ?? 'Failed to start analysis';
      if (status === 413 || /request entity too large|413/i.test(String(msg))) {
        msg =
          'ZIP is too large for the server upload limit (currently ~12MB on nginx). Ask admin to set client_max_body_size 512m on printcard-api, then retry.';
      } else if (ax.code === 'ECONNABORTED' || /timeout/i.test(String(msg))) {
        msg = 'Upload timed out. Check network, or ask admin to raise nginx proxy timeouts for printcard-api.';
      }
      toasts.error('Analyze failed', msg);
    } finally {
      setBusy(false);
    }
  }

  async function onUploadPhotos() {
    if (!orgId || !activeJob) return;
    if (activeJob.status !== 'READY') {
      toasts.info('Analyze first', 'Wait until the job is READY, then upload.');
      return;
    }
    setBusy(true);
    setUploadPhase('importing');
    try {
      await confirmPhotoImportJob(activeJob.id, orgId, policy);
      toasts.info('Uploading photos', 'Writing matched photos into Student Management…');
      await refreshActive();
      await loadJobs();
    } catch (err: unknown) {
      setUploadPhase('idle');
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to upload photos';
      toasts.error('Upload failed', msg);
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadReport() {
    if (!orgId || !activeJob) return;
    const url = photoImportReportUrl(activeJob.id, orgId);
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      toasts.error('Download failed', 'Could not download report');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `photo-import-${activeJob.id.slice(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (schoolsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  const isCompleted = activeJob?.status === 'COMPLETED';
  const isImporting = activeJob?.status === 'IMPORTING' || uploadPhase === 'importing';
  const showFileUploadProgress = uploadPhase === 'uploading';
  const showAnalyzeProgress =
    uploadPhase === 'analyzing' || activeJob?.status === 'QUEUED' || activeJob?.status === 'ANALYZING';

  return (
    <div className="space-y-6">
      <ToastHost toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Print Card</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy">Photo Import</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            1) Analyze Excel + ZIP (match only). 2) Review results. 3) Click Upload photos to save into
            Student Management. Excel must include a PHOTO ID column.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadJobs()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <SchoolScopeBar
        schools={schools}
        selectedSchool={selectedSchool}
        onSchoolChange={setSelectedSchool}
        canSelectSchools={canSelectSchools}
        viewAllSchools={viewAllSchools}
        onViewAllChange={setViewAllSchools}
      />

      {(showFileUploadProgress || showAnalyzeProgress || isImporting) && (
        <ProgressPanel
          title={
            showFileUploadProgress
              ? 'Uploading Excel & ZIP…'
              : showAnalyzeProgress
                ? 'Analyzing Photo IDs…'
                : 'Uploading photos to Student Management…'
          }
          subtitle={
            showFileUploadProgress
              ? 'Sending files to the server (analyze only — nothing written to students yet)'
              : showAnalyzeProgress
                ? 'Matching filename numbers to Excel PHOTO ID'
                : `${stats?.imported ?? 0} imported · ${stats?.skipped ?? 0} skipped · ${stats?.failed ?? 0} failed`
          }
          percent={
            showFileUploadProgress ? uploadPercent : showAnalyzeProgress ? Math.max(12, uploadPercent) : importProgress
          }
          tone={isImporting ? 'emerald' : 'navy'}
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy/5 text-navy">
            <ImagePlus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-navy">Step 1 — Analyze</h2>
            <p className="text-xs text-muted">
              Match only. Photos are not uploaded until you click Upload photos on a READY job.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FileDrop
            label="Student Excel"
            hint="Full names + PHOTO ID"
            accept=".xlsx,.xls,.csv"
            file={excel}
            onFile={setExcel}
            icon={FileSpreadsheet}
          />
          <FileDrop
            label="Photos ZIP"
            hint="e.g. ANMP0059.png"
            accept=".zip"
            file={zip}
            onFile={setZip}
            icon={FileArchive}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl text-xs text-muted">
            Matching uses <span className="font-semibold text-navy">numbers only</span>. Use Excel with
            columns <code className="font-mono">Full names</code> +{' '}
            <code className="font-mono">PHOTO ID</code> (e.g. Gashonga{' '}
            <code className="font-mono">babyclasssystemupload.xlsx</code>). Excel{' '}
            <code className="font-mono">2738</code> ↔ file <code className="font-mono">2L7A2738.JPG</code>.
          </div>
          <button
            type="button"
            disabled={busy || !orgId || !excel || !zip}
            onClick={() => void onAnalyze()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {busy && uploadPhase === 'uploading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanSearch className="h-4 w-4" />
            )}
            Analyze
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">History</h3>
          {loadingJobs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">No imports yet.</p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((j) => {
                const active = activeJob?.id === j.id;
                return (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveJob(j);
                        void fetchPhotoImportJob(j.id, orgId!).then(setActiveJob);
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                        active ? 'bg-navy text-white shadow-sm' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-navy'}`}>
                        {new Date(j.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            active ? 'bg-white/15 text-white' : jobStatusTone(j.status)
                          }`}
                        >
                          {j.status}
                        </span>
                        {j.status === 'COMPLETED' && (
                          <CheckCircle2 className={`h-3.5 w-3.5 ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="space-y-4">
          {!activeJob ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-muted shadow-sm">
              Select or run an analysis to see results.
            </div>
          ) : (
            <>
              {isCompleted && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Import completed</p>
                    <p className="text-xs text-emerald-800/80">
                      {(stats?.imported ?? 0).toLocaleString()} photos saved ·{' '}
                      {(stats?.skipped ?? 0).toLocaleString()} skipped ·{' '}
                      {(stats?.failed ?? 0).toLocaleString()} failed
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${jobStatusTone(activeJob.status)}`}
                  >
                    {activeJob.status}
                  </span>
                  <span className="text-xs text-muted">Job {activeJob.id.slice(0, 8)}</span>
                  {activeJob.errorMessage && (
                    <span className="text-xs text-red-600">{activeJob.errorMessage}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onDownloadReport()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Report
                  </button>
                  {activeJob.status === 'READY' && (
                    <>
                      <select
                        value={policy}
                        onChange={(e) => setPolicy(e.target.value as 'ONLY_MISSING' | 'REPLACE')}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="ONLY_MISSING">Only missing photos</option>
                        <option value="REPLACE">Replace existing</option>
                      </select>
                      <button
                        type="button"
                        disabled={busy || (stats?.matched ?? 0) < 1}
                        onClick={() => void onUploadPhotos()}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload photos
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <KpiCard label="Excel" value={stats?.excelRows ?? 0} />
                <KpiCard label="ZIP photos" value={stats?.photosInZip ?? 0} />
                <KpiCard label="Matched" value={stats?.matched ?? 0} accent="text-emerald-700" />
                <KpiCard label="Missing" value={stats?.missing ?? 0} accent="text-amber-700" />
                <KpiCard label="Unknown" value={stats?.unknown ?? 0} accent="text-orange-700" />
                <KpiCard label="Imported" value={stats?.imported ?? 0} accent="text-emerald-800" />
                <KpiCard label="Failed" value={stats?.failed ?? 0} accent="text-red-700" />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-bold text-navy">
                      {isCompleted ? 'Completed student results' : 'Validation results'}
                    </h3>
                    <p className="text-xs text-muted">
                      {tabRows.length.toLocaleString()} row{tabRows.length === 1 ? '' : 's'} shown
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
                  {TABS.map((t) => {
                    const count =
                      t.key === 'ALL'
                        ? allRows.length
                        : activeJob.buckets?.[t.key]?.length ??
                          allRows.filter((r) => r.status === t.key).length;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                          tab === t.key ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                        {count > 0 ? ` (${count})` : ''}
                      </button>
                    );
                  })}
                </div>
                <ResultsTable rows={tabRows} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
