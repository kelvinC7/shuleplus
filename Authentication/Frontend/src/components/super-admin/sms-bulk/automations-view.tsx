'use client';

import { useEffect, useState } from 'react';
import { Bell, CalendarClock, Plus, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { smsBulkApi, type SmsAutomation } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { SmsCard, SmsDataPanel, SmsPageShell, SmsSectionTitle, SmsStatusPill, smsBtnPrimary, smsInputClass, smsSelectClass } from './sms-page-shell';

const AUTOMATION_TRIGGERS = [
  { label: 'Fee Reminder — 7 days before deadline', value: 'fee-7' },
  { label: 'Fee Reminder — 2 days before deadline', value: 'fee-2' },
  { label: 'Fee Reminder — on deadline', value: 'fee-due' },
  { label: 'Payment Confirmation', value: 'payment' },
  { label: 'Attendance — absent today', value: 'absent' },
  { label: 'Student Check-Out (Gate Management)', value: 'checkout' },
  { label: 'Student Check-In / Return (Gate)', value: 'checkin' },
  { label: 'Discipline incident', value: 'discipline' },
  { label: 'Exam Results published', value: 'results' },
];

export function AutomationsView() {
  const toast = useToast();
  const [rows, setRows] = useState<SmsAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: AUTOMATION_TRIGGERS[0].value, audience: '' });

  useEffect(() => {
    smsBulkApi
      .automations()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  function toggle(a: SmsAutomation) {
    setRows((prev) => prev.map((r) => (r.id === a.id ? { ...r, enabled: !r.enabled } : r)));
    toast.success(`“${a.name}” ${a.enabled ? 'paused' : 'enabled'}.`);
  }

  function create() {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const trigger = AUTOMATION_TRIGGERS.find((t) => t.value === form.trigger);
    setRows((prev) => [
      {
        id: `aut-${Date.now()}`,
        name: form.name,
        trigger: trigger?.label ?? form.trigger,
        schedule: 'Immediate',
        audience: form.audience || 'All parents',
        enabled: true,
        nextRun: 'On event',
      },
      ...prev,
    ]);
    toast.success(`Automation “${form.name}” created.`);
    setShowForm(false);
    setForm({ name: '', trigger: AUTOMATION_TRIGGERS[0].value, audience: '' });
  }

  return (
    <SmsPageShell
      title="Automations"
      description="Automatic SMS triggered by fees, attendance, gate, discipline, and results events."
      actions={
        <button type="button" className={smsBtnPrimary} onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> New Automation
        </button>
      }
    >
      {showForm && (
        <SmsCard>
          <SmsSectionTitle>Create automation</SmsSectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Name</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Fee Reminder — 7 days before" className={`${smsInputClass} mt-1`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Trigger</span>
              <select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))} className={`${smsSelectClass} mt-1 w-full`}>
                {AUTOMATION_TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Audience</span>
              <input value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} placeholder="e.g. Parents → Unpaid fees" className={`${smsInputClass} mt-1`} />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-navy" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="button" className={smsBtnPrimary} onClick={create}>Create automation</button>
          </div>
        </SmsCard>
      )}

      <SmsDataPanel loading={loading} loadingLabel="Loading automations…">
        {rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted">No automations configured.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.enabled ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-muted'}`}>
                  <Zap className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{a.name}</p>
                    <SmsStatusPill status={a.enabled ? 'Active' : 'Inactive'} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" /> Trigger: {a.trigger}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {a.schedule} · {a.audience}</span>
                    {a.lastRun ? <span className="ml-2">· Last run {new Date(a.lastRun).toLocaleDateString()}</span> : null}
                    <span className="ml-2">· Next: {a.nextRun}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    a.enabled
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-border bg-white text-muted'
                  }`}
                >
                  {a.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {a.enabled ? 'Enabled' : 'Paused'}
                </button>
              </div>
            ))}
          </div>
        )}
      </SmsDataPanel>
    </SmsPageShell>
  );
}
