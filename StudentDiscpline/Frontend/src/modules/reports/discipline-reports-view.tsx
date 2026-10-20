'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DisciplineCase, GateLog, PermissionRequest } from '@/types/discipline';
import { toast } from 'sonner';

function csvDownload(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const body = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

export function DisciplineReportsView() {
  const [tab, setTab] = useState<'cases' | 'gate' | 'permissions'>('cases');
  const [cases, setCases] = useState<DisciplineCase[]>([]);
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [classFilter, setClassFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, g, p] = await Promise.all([
        disciplineApi.cases(),
        disciplineApi.gateLogs({ limit: 500 }),
        disciplineApi.permissions(),
      ]);
      setCases(c.data.data ?? []);
      setLogs(g.data.data ?? []);
      setPermissions(p.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load reports'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const classes = useMemo(
    () => Array.from(new Set(cases.map((c) => c.className).filter(Boolean))).sort(),
    [cases]
  );
  const filteredCases = classFilter ? cases.filter((c) => c.className === classFilter) : cases;
  const overdue = logs.filter((l) => (l.varianceLabel ?? '').toLowerCase().includes('overdue')).length;

  const exportRows =
    tab === 'cases'
      ? filteredCases.map((c) => ({
          caseNumber: c.caseNumber,
          student: c.studentName,
          className: c.className,
          type: c.markName ?? c.category,
          points: c.appliedPoints,
          status: c.status,
          date: c.incidentDate,
        }))
      : tab === 'gate'
        ? logs.map((l) => ({
            date: l.createdAt,
            student: l.studentName,
            event: l.eventType,
            gate: l.gate?.name,
            officer: l.officerName,
            method: l.method,
          }))
        : permissions.map((p) => ({
            student: p.studentName,
            type: p.permissionType,
            status: p.status,
            from: p.departureDate,
            to: p.expectedReturnDate,
          }));

  return (
    <DisciplinePageLayout
      title="Reports"
      subtitle="Cases by class, gate exits, overdue and CSV export"
      kpis={[
        { label: 'Cases', value: filteredCases.length },
        { label: 'Gate events', value: logs.length },
        { label: 'Overdue flags', value: overdue },
        { label: 'Permissions', value: permissions.length },
      ]}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(['cases', 'gate', 'permissions'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab(id)}
          >
            {id === 'cases' ? 'Cases by class' : id === 'gate' ? 'Gate exits' : 'Permissions'}
          </button>
        ))}
        {tab === 'cases' && (
          <select className="discipline-input max-w-xs" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="btn-secondary ml-auto"
          disabled={!exportRows.length}
          onClick={() => csvDownload(`discipline-${tab}.csv`, exportRows as Record<string, unknown>[])}
        >
          <Download size={16} /> Export CSV
        </button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Print / PDF
        </button>
      </div>

      <div className="hr-card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              {exportRows[0]
                ? Object.keys(exportRows[0]).map((k) => (
                    <th key={k} className="px-4 py-3">{k}</th>
                  ))
                : <th className="px-4 py-3">No rows</th>}
            </tr>
          </thead>
          <tbody>
            {exportRows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500">No data for this report</td></tr>
            ) : (
              exportRows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-4 py-2.5">{v == null ? '—' : String(v)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DisciplinePageLayout>
  );
}
