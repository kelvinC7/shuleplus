'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ScanLine } from 'lucide-react';
import { PageShell, KpiGrid, Panel, PersonAvatar } from '@/components/attendance-ui';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { ListPagination } from '@/components/list-pagination';
import { GeneralStatusBadge } from '@/modules/attendance/records/general-status-badge';
import { TapDeskModal } from '@/modules/tap/tap-desk-modal';
import { attendanceApi, type AttendanceRecord } from '@/services/attendance-api';
import { formatAttendanceTime } from '@/utils/format-attendance-time';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

function isEntryRow(r: AttendanceRecord) {
  return Boolean(r.entryTime) || r.direction === 'ENTRY' || ['PRESENT', 'LATE', 'ENTERED_ONLY'].includes(r.status);
}

function isLateRow(r: AttendanceRecord) {
  return r.punctuality === 'LATE' || r.status === 'LATE';
}

function isStaffRow(r: AttendanceRecord) {
  return r.personType === 'STAFF' || Boolean(r.level?.startsWith('STAFF:'));
}

function groupLabel(r: AttendanceRecord) {
  if (isStaffRow(r)) return r.staffRole ?? r.groupLabel ?? r.className ?? '—';
  return r.groupLabel ?? r.className ?? '—';
}

export function EntryAttendanceView() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'today' });
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: att } = await attendanceApi.attendance({
        ...params,
        page,
        limit,
        sortBy: 'checkin',
        sortDir: 'desc',
      });
      const payload = att.data;
      const items = (payload?.items ?? []).filter(isEntryRow);
      setRows(items);
      setTotal(payload?.total ?? items.length);
      setTotalPages(payload?.totalPages ?? 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load entry attendance'));
    } finally {
      setLoading(false);
    }
  }, [params, page, limit, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [params]);

  const periodLabel = filterSummary(filters, academic);
  const arrived = useMemo(() => rows.filter((r) => !isLateRow(r) && r.entryTime).length, [rows]);
  const late = useMemo(() => rows.filter(isLateRow).length, [rows]);

  return (
    <PageShell
      title="Entry"
      subtitle={periodLabel}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
            <ScanLine size={16} /> Manual entry
          </button>
        </>
      }
    >
      <KpiGrid
        columns={3}
        items={[
          { label: 'Arrived', value: loading ? '—' : arrived + late },
          { label: 'Late', value: loading ? '—' : late },
          { label: 'On time', value: loading ? '—' : arrived },
        ]}
      />

      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter
        searchPlaceholder="Search student, class, card…"
      />

      <TapDeskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        direction="ENTRY"
        onSuccess={() => {
          void load();
        }}
      />

      <Panel title="Arrivals">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs text-muted">
                <th className="px-3 py-2.5 font-semibold">Person</th>
                <th className="px-3 py-2.5 font-semibold">Class / position</th>
                <th className="px-3 py-2.5 font-semibold">Entry</th>
                <th className="px-3 py-2.5 font-semibold">Gate</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar name={r.studentName} photoUrl={r.photoUrl} size={36} />
                        <div>
                          <p className="font-semibold text-navy">{r.studentName}</p>
                          {r.studentCode ? (
                            <p className="font-mono text-[10px] text-muted">{r.studentCode}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">{groupLabel(r)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.entryTime)}</td>
                    <td className="px-3 py-3 text-xs">{r.gateName || r.deviceCode || '—'}</td>
                    <td className="px-3 py-3">
                      <GeneralStatusBadge row={r} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No arrivals for this period.</p>
          ) : null}
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
