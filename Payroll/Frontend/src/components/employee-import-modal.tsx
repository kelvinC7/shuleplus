'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { payrollApi } from '@/services/payroll-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  downloadTemplate,
  parseImportFile,
  type ValidatedImportRow,
  MINIMAL_IMPORT_HEADERS,
} from '@/utils/payrollEmployeeImportTemplate';

interface Props {
  open: boolean;
  onClose: () => void;
  accountantMode?: boolean;
  onImported?: () => void;
}

const STATUS_STYLES: Record<string, { badge: string; row: string; label: string }> = {
  ready: { badge: 'bg-emerald-100 text-emerald-700', row: 'bg-white', label: '✓ Ready' },
  incomplete: { badge: 'bg-amber-100 text-amber-800', row: 'bg-amber-50/60', label: '⚠ Incomplete' },
  willUpdate: { badge: 'bg-sky-100 text-sky-800', row: 'bg-sky-50/60', label: '↻ Will update' },
  duplicate: { badge: 'bg-red-100 text-red-700', row: 'bg-red-50/70', label: '✗ Duplicate' },
};

export function EmployeeImportModal({
  open,
  onClose,
  accountantMode = true,
  onImported,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [profile, setProfile] = useState<'minimal' | 'full'>('full');
  const [matchedHeaders, setMatchedHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ValidatedImportRow[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName('');
    setRows([]);
    setStats(null);
    setResult(null);
    setDryRunResult(null);
    setMatchedHeaders([]);
  }, []);

  async function handleFile(file: File) {
    setLoading(true);
    setResult(null);
    setDryRunResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseImportFile(buffer);
      setFileName(file.name);
      setProfile(parsed.profile);
      setMatchedHeaders(parsed.matchedHeaders);

      const { data } = await payrollApi.validateImport(parsed.rows);
      setRows(data.rows);
      setStats(data.stats);
      toast.success(`${data.rows.length} row(s) parsed from file.`, 'File loaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to parse import file.'), 'Import error');
    } finally {
      setLoading(false);
    }
  }

  function removeDuplicates() {
    const dupes = new Set(rows.filter((r) => r.status === 'duplicate').map((r) => r.rowNumber));
    setRows((prev) => prev.filter((r) => !dupes.has(r.rowNumber)));
    setStats((s) =>
      s
        ? {
            ...s,
            duplicate: 0,
            total: s.total - dupes.size,
            importable: rows.filter((r) => !dupes.has(r.rowNumber) && r.status !== 'duplicate').length,
          }
        : s
    );
  }

  async function runImport(dryRun: boolean) {
    const importable = rows.filter((r) => r.status !== 'duplicate');
    if (!importable.length) return;
    setImporting(true);
    try {
      const { data } = await payrollApi.importStaff({
        rows: importable,
        dryRun,
        updateExisting: true,
      });
      const r = data.data;
      const summary = dryRun
        ? `Dry-run result: ${r.ready} ready, ${r.incomplete} incomplete, ${r.duplicate} duplicate, ${r.willUpdate} will update — total ${r.total}.`
        : `Imported: ${(r.created ?? 0) + (r.updated ?? 0)} success (${r.updated ?? 0} updated, ${r.created ?? 0} new)${r.failed ? `, ${r.failed} failed` : ''}.`;
      if (dryRun) {
        setDryRunResult(summary);
        toast.info(summary, 'Dry run complete');
      } else {
        setResult(summary);
        if (r.failed) {
          toast.warning(summary, 'Import completed with errors');
        } else {
          toast.success(summary, 'Import complete');
        }
        if (!r.failed) {
          onImported?.();
          setTimeout(() => {
            onClose();
            reset();
            router.push('/employees');
          }, 1200);
        }
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Import failed.'), 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const importableCount = rows.filter((r) => r.status !== 'duplicate').length;
  const duplicateInFile = rows.filter((r) => r.status === 'duplicate');
  const willUpdate = rows.filter((r) => r.status === 'willUpdate');
  const incomplete = rows.filter((r) => r.status === 'incomplete');
  const previewHeaders =
    profile === 'minimal'
      ? matchedHeaders.length
        ? matchedHeaders
        : MINIMAL_IMPORT_HEADERS.slice(0, 8)
      : ['First Name', 'Last Name', 'Gender', 'National ID', 'Department', 'Position Code', 'Basic Salary'];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-navy">Import payroll staff from Excel</h2>
          <button type="button" onClick={() => { onClose(); reset(); }} className="rounded-lg p-2 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {accountantMode && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <strong>Payroll import:</strong> include Basic Salary and allowance columns (T/A, H/A, Others) — saved per employee for payroll runs.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-ochre/40 bg-amber-50/50 px-4 py-2.5 text-sm font-medium text-navy transition hover:bg-amber-50">
              <Upload size={16} className="text-ochre" />
              Choose Excel file
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            <button type="button" onClick={() => downloadTemplate('minimal')} className="btn-secondary !py-2 !text-xs">
              Payroll template (with allowances)
            </button>
            <button type="button" onClick={() => downloadTemplate('full')} className="btn-secondary !py-2 !text-xs">
              Full template
            </button>
            {fileName && <span className="flex items-center gap-1 text-xs text-muted"><FileSpreadsheet size={14} /> {fileName}</span>}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="animate-spin" size={16} /> Parsing file…
            </div>
          )}

          {matchedHeaders.length > 0 && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <strong>Columns matched from your file:</strong>{' '}
              {matchedHeaders.join(' · ')}
              <p className="mt-1 text-xs text-sky-700">
                Header aliases work (RSSB NUMBER, Basic Salary, etc.). Existing staff update on import.
              </p>
            </div>
          )}

          {incomplete.length > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Incomplete profile (will still import — edit in directory after)</strong>
              <ul className="mt-2 space-y-1 text-xs">
                {incomplete.slice(0, 5).map((r) => (
                  <li key={r.rowNumber}>Row {r.rowNumber}: missing {r.optionalMissing?.join(', ') || r.missing?.join(', ')}</li>
                ))}
              </ul>
            </div>
          )}

          {willUpdate.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">
              <strong>Already in directory — will update on import</strong>
              <p className="mt-1 text-xs">{willUpdate.length} row(s) match existing staff by National ID, RSSB, phone, or email.</p>
            </div>
          )}

          {duplicateInFile.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>Duplicates in file — remove before import</strong>
                <button type="button" onClick={removeDuplicates} className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                  Remove duplicate rows
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {duplicateInFile.slice(0, 4).map((r) => (
                  <li key={r.rowNumber}>Row {r.rowNumber}: duplicate of row {r.duplicateOf}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">
                  Review before import ({rows.length} rows)
                  {profile === 'minimal' && <span className="font-normal text-muted"> · compact payroll columns</span>}
                </h3>
              </div>
              <div className="max-h-[40vh] overflow-auto rounded-xl border border-border">
                <table className="min-w-[900px] w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-left uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Row</th>
                      {previewHeaders.map((h) => (
                        <th key={h} className="px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = STATUS_STYLES[r.status] ?? STATUS_STYLES.ready;
                      return (
                        <tr key={r.rowNumber} className={`border-t border-border/50 ${st.row}`}>
                          <td className="px-3 py-2"><span className={`badge ${st.badge}`}>{st.label}</span></td>
                          <td className="px-3 py-2">{r.rowNumber}</td>
                          {previewHeaders.map((h) => {
                            const field = h.toLowerCase().includes('first') ? r.firstName
                              : h.toLowerCase().includes('last') ? r.lastName
                              : h.toLowerCase().includes('gender') ? r.gender
                              : h.includes('National') ? r.nationalId
                              : h.includes('Department') ? r.department
                              : h.includes('Position') ? r.position
                              : h.includes('Salary') ? r.basicSalary
                              : r.raw[h];
                            const empty = !field;
                            return (
                              <td key={h} className={`px-3 py-2 ${empty ? 'text-red-400' : ''}`}>
                                {field ?? '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dryRunResult && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mb-1 inline" size={16} /> {dryRunResult}
            </div>
          )}
          {result && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mb-1 inline" size={16} /> {result}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="text-xs text-muted">
            {stats && (
              <span>
                {stats.importable} importable · {stats.duplicate} duplicate · {stats.willUpdate} will update
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={importing} onClick={() => { onClose(); reset(); }} className="btn-secondary">
              Close
            </button>
            <button
              type="button"
              disabled={!importableCount || importing}
              onClick={() => runImport(true)}
              className="btn-secondary"
            >
              Dry run (validate only)
            </button>
            <button
              type="button"
              disabled={!importableCount || importing || duplicateInFile.length > 0}
              onClick={() => runImport(false)}
              className="btn-primary bg-ochre hover:bg-gold"
            >
              {importing ? (
                <><Loader2 className="animate-spin" size={16} /> Importing…</>
              ) : (
                <>Import / update {importableCount} row(s)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
