'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { PageShell, KpiGrid, Panel, filterSelectClass } from '@/components/attendance-ui';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { ListPagination } from '@/components/list-pagination';
import { AttendanceStatusIndicators } from '@/modules/attendance/records/attendance-status-indicators';
import {
  attendanceApi,
  type AnalyticsData,
  type AttendanceRecord,
} from '@/services/attendance-api';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';
import { attendanceRowsToCsv, downloadCsv, printReportTable } from '@/utils/export-table';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

async function fetchAllRecords(
  params: Record<string, string | number | undefined>,
  maxPages = 20
): Promise<AttendanceRecord[]> {
  const limit = 100;
  const all: AttendanceRecord[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await attendanceApi.attendance({ ...params, page, limit });
    const batch = data.data?.items ?? [];
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export function ReportsCenterView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'term' });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [personType, setPersonType] = useState<'ALL' | 'STUDENT' | 'STAFF'>('ALL');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const filterKey = JSON.stringify({ params, status, personType });
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        ...params,
        status: status || undefined,
        personType: personType === 'ALL' ? undefined : personType,
      };
      const [an, att] = await Promise.all([
        attendanceApi.analytics({
          ...params,
          personType: personType === 'ALL' ? undefined : personType,
        }),
        attendanceApi.attendance({ ...query, page, limit }),
      ]);
      setAnalytics(an.data.data);
      const payload = att.data.data;
      setRows(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
      setTotalPages(payload?.totalPages ?? 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  }, [params, personType, status, page, limit, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = analytics?.kpis;
  const periodLabel = filterSummary(filters, academic);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const query = {
        ...params,
        status: status || undefined,
        personType: personType === 'ALL' ? undefined : personType,
      };
      const all = await fetchAllRecords(query);
      const csv = attendanceRowsToCsv(all, analytics?.period?.label);
      downloadCsv(`attendance-report-${params.from ?? params.date ?? 'export'}.csv`, csv);
      toast.success(`Exported ${all.length} rows`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = () => {
    printReportTable('Attendance report', periodLabel);
  };

  return (
    <PageShell
      title="Attendance Reports"
      subtitle={`Shule+ · ${periodLabel}`}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" className="btn-secondary" disabled={exporting} onClick={() => void exportExcel()}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button type="button" className="btn-primary" onClick={exportPdf}>
            <FileDown size={16} /> PDF
          </button>
        </>
      }
    >
      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter
        searchPlaceholder="Search name, code, card"
        extra={
          <>
            <select
              className={filterSelectClass}
              value={personType}
              onChange={(e) => setPersonType(e.target.value as 'ALL' | 'STUDENT' | 'STAFF')}
            >
              <option value="ALL">Everyone</option>
              <option value="STUDENT">Students</option>
              <option value="STAFF">Staff</option>
            </select>
            <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="ENTERED_ONLY">Entered only</option>
            </select>
          </>
        }
      />

      <KpiGrid
        columns={4}
        items={[
          { label: 'Records', value: loading ? '…' : (kpis?.totalRecords ?? total).toLocaleString() },
          { label: 'Present', value: loading ? '…' : kpis?.present ?? 0 },
          { label: 'Late', value: loading ? '…' : kpis?.late ?? 0 },
          { label: 'Absent', value: loading ? '…' : kpis?.absent ?? 0 },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-muted">Student rate</p>
          <p className="text-2xl font-extrabold text-navy">{loading ? '…' : `${kpis?.studentAttendanceRate ?? 0}%`}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-muted">Staff rate</p>
          <p className="text-2xl font-extrabold text-navy">{loading ? '…' : `${kpis?.staffAttendanceRate ?? 0}%`}</p>
        </div>
      </div>

      <Panel title="Detail">
        <div id="report-print-root" className="overflow-x-auto print:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Person</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Exit</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    Loading
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    No records for this filter
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs">{r.lessonDate}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{r.studentName}</p>
                      {r.studentCode ? (
                        <p className="font-mono text-[10px] text-muted">{r.studentCode}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{r.className || '·'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAttendanceTime(r.entryTime)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAttendanceTime(r.exitTime)}</td>
                    <td className="px-4 py-3 text-xs">{formatDurationMins(r.durationMins)}</td>
                    <td className="px-4 py-3">
                      <AttendanceStatusIndicators
                        attendanceStatus={r.attendanceStatus ?? r.display?.attendanceStatus}
                        punctuality={r.punctuality ?? r.display?.punctuality}
                        checkoutStatus={r.checkoutStatus ?? r.display?.checkoutStatus}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </Panel>
    </PageShell>
  );
}
