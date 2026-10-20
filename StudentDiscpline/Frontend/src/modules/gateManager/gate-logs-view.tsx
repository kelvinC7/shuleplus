'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { GatePageLayout } from '@/modules/gateManager/gate-page-layout';
import { exportGateLogsCsv, formatGateDate, formatGateTime } from '@/modules/gateManager/gate-utils';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { GateLog } from '@/types/discipline';
import { toast } from 'sonner';

export function GateLogsView() {
  const [rows, setRows] = useState<GateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await disciplineApi.gateLogs({ search: search || undefined, limit: 200 });
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load gate logs'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <GatePageLayout title="Gate Logs" subtitle="Complete audit trail of campus entry and exit">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="discipline-input pl-9" placeholder="Search student or officer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button" className="btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
        <button type="button" className="btn-secondary" disabled={!rows.length} onClick={() => exportGateLogsCsv(rows)}><Download size={16} /> Export</button>
      </div>

      <div className="hr-card overflow-hidden">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Gate</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Variance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No gate logs yet</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">{formatGateDate(r.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-[#000435]">{r.studentName}</td>
                  <td className="px-4 py-3">{r.eventType}</td>
                  <td className="px-4 py-3">{r.gate?.name ?? '—'}</td>
                  <td className="px-4 py-3">{formatGateTime(r.actualTime)}</td>
                  <td className="px-4 py-3">{r.officerName ?? '—'}</td>
                  <td className="px-4 py-3">{r.method}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.varianceLabel ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GatePageLayout>
  );
}
