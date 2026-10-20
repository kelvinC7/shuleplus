'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';

function flattenRows(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map((row) =>
      row && typeof row === 'object' ? (row as Record<string, unknown>) : { value: row }
    );
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return flattenRows(obj.data);
    if (Array.isArray(obj.byCategory)) return flattenRows(obj.byCategory);
    if (Array.isArray(obj.years)) return flattenRows(obj.years);
    if (obj.kpis && typeof obj.kpis === 'object') {
      return Object.entries(obj.kpis as Record<string, unknown>).map(([key, value]) => ({
        metric: key,
        value,
      }));
    }
    return [obj];
  }
  return [{ value: payload }];
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const escape = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n');
}

export function ReportDetailView({ type }: { type: string }) {
  const toast = useToast();
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assetsApi.report(type);
      setPayload(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load report'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [type, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => flattenRows(payload), [payload]);
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    return Array.from(keys).slice(0, 12);
  }, [rows]);

  function exportCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets-report-${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AssetsPageLayout
      actions={
        <>
          <Link href="/reports" className="btn-secondary">
            <ArrowLeft size={16} /> All reports
          </Link>
          <button type="button" className="btn-primary" onClick={exportCsv} disabled={!rows.length}>
            <Download size={16} /> Export CSV
          </button>
        </>
      }
      kpis={[
        { label: 'Report', value: type },
        { label: 'Rows', value: rows.length },
      ]}
    >
      <div className="hr-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80">
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-xs font-medium capitalize tracking-[0.04em] text-muted">
                    {col.replace(/([A-Z])/g, ' $1')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-muted">
                    No data for this report
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/70 last:border-0">
                    {columns.map((col) => {
                      const v = row[col];
                      const display =
                        v == null
                          ? '—'
                          : typeof v === 'object'
                            ? JSON.stringify(v)
                            : String(v);
                      return (
                        <td key={col} className="max-w-[240px] truncate px-4 py-3 text-navy">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AssetsPageLayout>
  );
}
