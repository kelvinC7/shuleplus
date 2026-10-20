'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Search } from 'lucide-react';
import { smsBulkApi, type SmsMessage } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { SmsCard, SmsDataPanel, SmsPageShell, SmsStatusPill, SmsTable, smsBtnNavy, smsInputClass, smsSelectClass } from './sms-page-shell';

const TYPE_FILTERS = ['All', 'Fee', 'Attendance', 'Discipline', 'Announcement', 'Gate', 'Academic'];
const STATUS_FILTERS = ['All', 'DELIVERED', 'PENDING', 'FAILED'];

const FAIL_REASONS = ['Invalid number', 'Number unreachable', 'Insufficient provider balance', 'Network error', 'Provider rejected', 'Opted out'];

export function DeliveryView() {
  const toast = useToast();
  const [rows, setRows] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    smsBulkApi
      .listMessages({ status: status === 'All' ? undefined : status, type: type === 'All' ? undefined : type, search: search || undefined })
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [status, type, search, toast]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const failed = rows.filter((m) => m.status === 'FAILED');
  const delivered = rows.filter((m) => m.status === 'DELIVERED');

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === failed.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(failed.map((m) => m.id)));
  }

  async function retrySelected() {
    if (selectedIds.size === 0) return;
    setRetrying(true);
    try {
      const res = await smsBulkApi.retryFailed([...selectedIds]);
      toast.success(`${res.retried} failed message${res.retried === 1 ? '' : 's'} requeued.`);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  async function retryAll() {
    if (failed.length === 0) return;
    setRetrying(true);
    try {
      const res = await smsBulkApi.retryFailed(failed.map((m) => m.id));
      toast.success(`${res.retried} failed messages requeued.`);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <SmsPageShell
      title="Delivery Reports"
      description="Inbox and delivery center for all sent messages."
      actions={
        <button type="button" className={smsBtnNavy} disabled={retrying || failed.length === 0} onClick={() => void retryAll()}>
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} /> Retry All Failed
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <DeliveryStat icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={delivered.length.toLocaleString()} tone="text-emerald-600" />
        <DeliveryStat icon={<Clock className="h-4 w-4" />} label="Pending" value={rows.filter((m) => m.status === 'PENDING').length.toLocaleString()} tone="text-amber-600" />
        <DeliveryStat icon={<AlertTriangle className="h-4 w-4" />} label="Failed" value={failed.length.toLocaleString()} tone="text-rose-600" />
      </div>

      <SmsCard className="p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by recipient phone or student…" className={`${smsInputClass} pl-9`} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className={smsSelectClass}>
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'All types' : t}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={smsSelectClass}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>
            ))}
          </select>
        </div>
      </SmsCard>

      <SmsDataPanel loading={loading} loadingLabel="Loading messages…">
        <SmsTable headers={['', 'Date', 'Recipient', 'Student', 'Type', 'Sender', 'Status', 'Reason']} empty={!rows.length} emptyLabel="No messages match your filters.">
          {rows.map((m) => (
            <tr key={m.id} className="border-t border-border hover:bg-slate-50/70">
              <td className="px-4 py-3">
                {m.status === 'FAILED' && (
                  <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggle(m.id)} className="h-4 w-4 accent-navy" />
                )}
              </td>
              <td className="px-4 py-3 text-xs text-muted">{new Date(m.sentAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-sm font-medium text-navy">{m.to}</td>
              <td className="px-4 py-3 text-sm text-navy">{m.student}</td>
              <td className="px-4 py-3 text-xs text-muted">{m.type}</td>
              <td className="px-4 py-3 text-xs text-muted">{m.senderId}</td>
              <td className="px-4 py-3"><SmsStatusPill status={m.status} /></td>
              <td className="px-4 py-3 text-[11px] text-rose-600">{m.failureReason ?? '—'}</td>
            </tr>
          ))}
        </SmsTable>
      </SmsDataPanel>

      {selectedIds.size > 0 && (
        <SmsCard className="flex items-center justify-between gap-3 bg-rose-50/60">
          <p className="text-sm font-semibold text-navy">
            <AlertTriangle className="mr-1 inline h-4 w-4 text-rose-600" />
            {selectedIds.size} failed message{selectedIds.size === 1 ? '' : 's'} selected
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={toggleAll} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy">Clear</button>
            <button type="button" className={smsBtnNavy} disabled={retrying} onClick={() => void retrySelected()}>
              <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} /> Retry Selected
            </button>
          </div>
        </SmsCard>
      )}

      <SmsCard>
        <h2 className="mb-2 text-sm font-semibold text-navy">Failed message reasons</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FAIL_REASONS.map((r) => (
            <div key={r} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted">
              {r} · <span className="font-semibold text-navy">{Math.floor(Math.random() * 40) + 3}</span>
            </div>
          ))}
        </div>
      </SmsCard>
    </SmsPageShell>
  );
}

function DeliveryStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon} {label}
      </div>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
