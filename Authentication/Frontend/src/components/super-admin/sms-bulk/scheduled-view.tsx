'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Pause, Trash2 } from 'lucide-react';
import { smsBulkApi, type SmsScheduled } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { SmsDataPanel, SmsPageShell, SmsStatusPill, SmsTable } from './sms-page-shell';

export function ScheduledSmsView() {
  const toast = useToast();
  const [rows, setRows] = useState<SmsScheduled[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smsBulkApi
      .scheduled()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  function pause(item: SmsScheduled) {
    toast.info(`“${item.name}” paused.`);
  }

  function remove(item: SmsScheduled) {
    toast.success(`“${item.name}” removed.`);
    setRows((prev) => prev.filter((r) => r.id !== item.id));
  }

  return (
    <SmsPageShell title="Scheduled SMS" description="Messages queued for delivery at a future date and time.">
      <SmsDataPanel loading={loading} loadingLabel="Loading scheduled messages…">
        <SmsTable headers={['Name', 'Audience', 'Recipients', 'Scheduled for', 'Status', 'Actions']} empty={!rows.length} emptyLabel="Nothing scheduled.">
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-border hover:bg-slate-50/70">
              <td className="px-4 py-3 font-semibold text-navy">{s.name}</td>
              <td className="px-4 py-3 text-sm text-muted">{s.audience}</td>
              <td className="px-4 py-3">{s.recipients.toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-navy">
                  <CalendarClock className="h-4 w-4 text-muted" /> {s.date} · {s.time}
                </span>
              </td>
              <td className="px-4 py-3"><SmsStatusPill status={s.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button type="button" title="Pause" onClick={() => pause(s)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-navy transition hover:bg-slate-50">
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" title="Delete" onClick={() => remove(s)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </SmsTable>
      </SmsDataPanel>
    </SmsPageShell>
  );
}
