'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileDown, RefreshCw, Search } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { TransportRecordsTable, type RecordsColumn } from '@/components/transport-records-table';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/contexts/auth-context';
import { transportApi, type BoardingEvent } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime, formatDate } from '@/utils/format';
import { downloadTransportReportPdf } from '@/utils/transport-report-pdf';

function eventDisplay(r: BoardingEvent) {
  return r.eventType ?? r.type;
}

export function BoardingRecordsView() {
  const toast = useToast();
  const { organizationName } = useAuth();
  const [allRows, setAllRows] = useState<BoardingEvent[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (query?: string) => {
      setLoading(true);
      try {
        const { data } = await transportApi.boarding(query?.trim() || undefined);
        setAllRows(data.data ?? []);
        setPage(1);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load records'));
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(term) ||
        (r.studentCode?.toLowerCase().includes(term) ?? false) ||
        (r.cardNumber?.toLowerCase().includes(term) ?? false) ||
        (r.busCode?.toLowerCase().includes(term) ?? false)
    );
  }, [allRows, q]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const boarding = allRows.filter((r) => r.type === 'BOARDING').length;
  const exit = allRows.filter((r) => r.type === 'EXIT').length;

  const columns: RecordsColumn<BoardingEvent>[] = useMemo(
    () => [
      {
        key: 'learner',
        header: 'Learner',
        render: (r) => (
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight text-[#000435]">{r.studentName}</p>
            {r.studentCode || r.cardNumber ? (
              <p className="mt-0.5 truncate text-xs text-muted">{r.studentCode ?? r.cardNumber}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        hideOnMobile: true,
        render: (r) => <span className="text-muted">{r.studentCode ?? r.cardNumber ?? ''}</span>,
      },
      {
        key: 'event',
        header: 'Event',
        mobileRole: 'chip',
        render: (r) => <StatusBadge status={eventDisplay(r)} />,
      },
      {
        key: 'bus',
        header: 'Bus / route',
        mobileRole: 'plain',
        mobileHideLabel: true,
        render: (r) => (
          <div>
            <p className="font-semibold text-[#000435]">{r.busCode ?? 'No bus'}</p>
            {r.routeName ? <p className="mt-0.5 text-xs leading-snug text-muted">{r.routeName}</p> : null}
          </div>
        ),
      },
      {
        key: 'stop',
        header: 'Stop',
        hideOnMobile: true,
        render: (r) => <span className="text-muted">{r.stopName ?? ''}</span>,
      },
      {
        key: 'time',
        header: 'Time',
        mobileRole: 'footer',
        render: (r) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDate(r.scannedAt)} · {formatTime(r.scannedAt)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        mobileRole: 'header-trailing',
        render: (r) => <StatusBadge status={r.outcome === 'OK' ? 'SENT' : 'FAILED'} />,
      },
    ],
    []
  );

  async function exportPdf() {
    setExporting(true);
    try {
      await downloadTransportReportPdf({
        meta: {
          organizationName: organizationName ?? 'School',
          reportTitle: 'Boarding Records',
          subtitle: 'RFID, QR, and manual transport events',
          filterSummary: q.trim() ? `Search: ${q.trim()}` : `Total records: ${filtered.length}`,
        },
        filename: `boarding-records-${formatDate(new Date()).replace(/\//g, '-')}.pdf`,
        head: ['#', 'Learner', 'Code', 'Event', 'Bus', 'Route', 'Stop', 'Date', 'Time', 'Outcome'],
        body: filtered.map((r, i) => [
          String(i + 1),
          r.studentName,
          r.studentCode ?? r.cardNumber ?? '',
          String(eventDisplay(r)),
          r.busCode ?? '',
          r.routeName ?? '',
          r.stopName ?? '',
          formatDate(r.scannedAt),
          formatTime(r.scannedAt),
          r.outcome,
        ]),
      });
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'PDF export failed'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <TransportPageLayout
      actions={
        <div className="flex w-full flex-col gap-3">
          <form
            className="flex min-w-0 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input w-full pl-9"
                placeholder="Search learner, code, bus…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button type="submit" className="btn-primary shrink-0 px-4">
              Search
            </button>
          </form>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              className="btn-primary col-span-2 min-h-[44px] sm:col-span-1 sm:w-auto"
              disabled={exporting || filtered.length === 0}
              onClick={() => void exportPdf()}
            >
              <FileDown size={16} />
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <Link href="/route-attendance" className="btn-secondary min-h-[44px] justify-center sm:w-auto">
              Attendance
            </Link>
            <button
              type="button"
              className="btn-secondary min-h-[44px] justify-center sm:w-auto"
              aria-label="Refresh"
              onClick={() => void load(q)}
            >
              <RefreshCw size={16} />
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>
      }
      kpis={[
        { label: 'Records', value: filtered.length },
        { label: 'Boarding', value: boarding },
        { label: 'Exit', value: exit },
      ]}
    >
      <TransportRecordsTable
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        loading={loading}
        emptyMessage="No boarding records found."
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </TransportPageLayout>
  );
}
