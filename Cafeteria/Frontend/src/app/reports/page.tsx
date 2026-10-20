'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { FileText, Download } from 'lucide-react';
import { exportToPdf, exportToExcel } from '@/lib/export-utils';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';

const REPORT_TABS = [
  { id: 'daily', label: 'Daily Meal Report' },
  { id: 'weekly', label: 'Weekly Meal Report' },
  { id: 'waste', label: 'Food Waste Report' },
  { id: 'staff', label: 'Kitchen Staff Report' },
  { id: 'budget', label: 'Budget Report' },
];

function flattenRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map((row) =>
      typeof row === 'object' && row
        ? Object.fromEntries(
            Object.entries(row as Record<string, unknown>).map(([k, v]) => [
              k,
              typeof v === 'object' && v !== null ? JSON.stringify(v) : v,
            ])
          )
        : { value: row }
    );
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['productions', 'waste', 'staff', 'items', 'rows']) {
      if (Array.isArray(obj[key])) return flattenRows(obj[key]);
    }
    return [obj];
  }
  return [];
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const now = new Date(dateTo);
        let data: unknown;
        if (activeTab === 'waste') {
          data = await cafeteriaApi.reports.waste(dateFrom, dateTo);
        } else if (activeTab === 'staff') {
          data = await cafeteriaApi.reports.staff();
        } else if (activeTab === 'budget') {
          data = await cafeteriaApi.reports.budget(now.getMonth() + 1, now.getFullYear());
        } else {
          data = await cafeteriaApi.reports.production(dateFrom, dateTo);
        }
        if (!cancelled) setRows(flattenRows(data));
      } catch {
        if (!cancelled) {
          setRows([]);
          toast.error('Could not load kitchen report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, dateFrom, dateTo]);

  const handleExportPdf = () => {
    if (rows.length === 0) { alert('No data to export'); return; }
    const keys = Object.keys(rows[0]);
    exportToPdf({
      title: REPORT_TABS.find(t => t.id === activeTab)?.label || 'Report',
      columns: keys.map(k => ({ header: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), accessor: k })),
      data: rows,
      fileName: `${activeTab}-report`,
    });
  };

  const handleExportExcel = () => {
    if (rows.length === 0) { alert('No data to export'); return; }
    const keys = Object.keys(rows[0]);
    exportToExcel({
      title: REPORT_TABS.find(t => t.id === activeTab)?.label || 'Report',
      columns: keys.map(k => ({ header: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), accessor: k })),
      data: rows,
      fileName: `${activeTab}-report`,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">Live kitchen production, waste, staff and budget</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Download className="h-4 w-4" /> PDF
            </button>
            <button onClick={handleExportExcel} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Download className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {REPORT_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-4">{REPORT_TABS.find(t => t.id === activeTab)?.label}</h2>
          <p className="text-sm text-muted-foreground mb-4">Period: {dateFrom} to {dateTo}</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading kitchen data…</p>
          ) : rows.length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {Object.keys(rows[0]).map((key) => (
                      <th key={key} className="text-left px-4 py-3 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-4 py-3">{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No kitchen records for this period</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
