'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw, Search } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { TransportRecordsTable, type RecordsColumn } from '@/components/transport-records-table';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type ParentNotification } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime, formatDate } from '@/utils/format';

function eventLabel(raw?: string | null) {
  if (!raw) return '';
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ParentNotificationsView() {
  const toast = useToast();
  const [rows, setRows] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await transportApi.notifications();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((n) => {
      if (statusFilter && n.status !== statusFilter) return false;
      if (channelFilter && n.channel !== channelFilter) return false;
      if (!q) return true;
      return (
        n.studentName.toLowerCase().includes(q) ||
        (n.studentCode?.toLowerCase().includes(q) ?? false) ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, channelFilter]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const delivered = rows.filter((r) => r.status === 'DELIVERED' || r.status === 'SENT').length;
  const failed = rows.filter((r) => r.status === 'FAILED').length;
  const queued = rows.filter((r) => r.status === 'QUEUED' || r.status === 'RETRYING' || r.status === 'SENDING').length;

  const columns: RecordsColumn<ParentNotification>[] = useMemo(
    () => [
      {
        key: 'learner',
        header: 'Learner',
        render: (n) => (
          <div>
            <p className="font-semibold text-[#000435]">{n.studentName}</p>
            {n.studentCode ? <p className="text-xs text-muted md:hidden">{n.studentCode}</p> : null}
          </div>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        hideOnMobile: true,
        render: (n) => <span className="text-muted">{n.studentCode ?? ''}</span>,
      },
      {
        key: 'channel',
        header: 'Channel',
        render: (n) => (
          <div>
            <StatusBadge status={n.channel} />
            {n.eventType ? <p className="mt-1 text-[10px] text-muted">{eventLabel(n.eventType)}</p> : null}
          </div>
        ),
      },
      {
        key: 'message',
        header: 'Message',
        render: (n) => (
          <div className="max-w-md">
            <p className="font-medium text-navy">{n.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{n.message}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (n) => <StatusBadge status={n.status} />,
      },
      {
        key: 'created',
        header: 'Sent',
        render: (n) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted">
            {formatDate(n.createdAt)}
            <br />
            {formatTime(n.createdAt)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <TransportPageLayout
      actions={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input w-full pl-9"
              placeholder="Search learner or message…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Status filter"
          >
            <option value="">All statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="QUEUED">Queued</option>
            <option value="SENDING">Sending</option>
            <option value="RETRYING">Retrying</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            className="input w-full sm:w-auto"
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Channel filter"
          >
            <option value="">All channels</option>
            <option value="APP">App</option>
            <option value="PUSH">Push</option>
            <option value="SMS">SMS</option>
          </select>
          <button type="button" className="btn-secondary shrink-0" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      }
      kpis={[
        { label: 'Total', value: rows.length, icon: <Bell size={20} /> },
        { label: 'Delivered', value: delivered },
        { label: 'Pending', value: queued },
        { label: 'Failed', value: failed },
      ]}
    >
      <TransportRecordsTable
        columns={columns}
        rows={pageRows}
        rowKey={(n) => n.id}
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        loading={loading}
        emptyMessage="No parent notifications yet. They appear when attendance events notify parents."
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </TransportPageLayout>
  );
}
