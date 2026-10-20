'use client';

import { useCallback, useEffect, useState } from 'react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { transportApi, type ReportsSummary, type TransportSettings, type ParentNotification } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatRwf } from '@/utils/format';

export function ReportsView() {
  const toast = useToast();
  const [data, setData] = useState<ReportsSummary | null>(null);
  const load = useCallback(async () => {
    try {
      const { data: res } = await transportApi.reportsSummary();
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load reports'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const f = data?.finance;
  return (
    <TransportPageLayout
      kpis={[
        { label: 'Students', value: data?.students.total ?? 0 },
        { label: 'On bus', value: data?.students.onBus ?? 0 },
        { label: 'Revenue', value: formatRwf(f?.revenue) },
        { label: 'Fuel + maint.', value: formatRwf((f?.fuelCost ?? 0) + (f?.maintenanceCost ?? 0)) },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Bus utilization</h2>
          <div className="space-y-3">
            {(data?.buses ?? []).map((b) => (
              <div key={b.code}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{b.code}</span>
                  <span>{b.used} / {b.capacity} · {b.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(b.percent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hr-card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Financial</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Billed</dt><dd className="font-semibold">{formatRwf(f?.billed)}</dd></div>
            <div className="flex justify-between"><dt>Collected</dt><dd className="font-semibold">{formatRwf(f?.revenue)}</dd></div>
            <div className="flex justify-between"><dt>Fuel</dt><dd className="font-semibold">{formatRwf(f?.fuelCost)}</dd></div>
            <div className="flex justify-between"><dt>Maintenance</dt><dd className="font-semibold">{formatRwf(f?.maintenanceCost)}</dd></div>
            <div className="flex justify-between"><dt>Efficiency km/L</dt><dd className="font-semibold">{f?.efficiency ?? 0}</dd></div>
            <div className="flex justify-between border-t border-border pt-2"><dt>Net</dt><dd className="font-bold">{formatRwf(f?.profit)}</dd></div>
          </dl>
        </div>
        <div className="hr-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Boarding trends</h2>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {(data?.boardingTrends ?? []).map((d) => (
              <div key={d.day} className="rounded-xl bg-slate-50 p-3">
                <p className="font-bold text-navy">{d.day.slice(0, 3)}</p>
                <p className="mt-1 text-lg font-extrabold">{d.boarded}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TransportPageLayout>
  );
}

export function SettingsView() {
  const toast = useToast();
  const [s, setS] = useState<TransportSettings | null>(null);
  const [notes, setNotes] = useState<ParentNotification[]>([]);

  const load = useCallback(async () => {
    try {
      const [st, n] = await Promise.all([transportApi.settingsGet(), transportApi.notifications()]);
      setS(st.data.data);
      setNotes(n.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load settings'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!s) return;
    try {
      await transportApi.settingsPut(s);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    }
  }

  if (!s) return <p className="text-sm text-muted">Loading…</p>;

  const toggle = (key: keyof TransportSettings) =>
    setS({ ...s, [key]: !s[key] } as TransportSettings);

  return (
    <TransportPageLayout>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card space-y-3 p-5">
          <h2 className="text-sm font-bold uppercase text-navy">Notification settings</h2>
          {(['enableParentNotify', 'enableSms', 'enableEmail', 'enablePush', 'enableWhatsapp', 'requireReconciliation', 'allowWrongBus'] as const).map((k) => (
            <label key={k} className="flex items-center justify-between text-sm">
              <span>{k.replace(/enable|require|allow/g, ' ').replace(/([A-Z])/g, ' $1')}</span>
              <input type="checkbox" checked={Boolean(s[k])} onChange={() => toggle(k)} />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">Morning start<input className="input mt-1" value={s.morningStart} onChange={(e) => setS({ ...s, morningStart: e.target.value })} /></label>
            <label className="text-xs">School arrival<input className="input mt-1" value={s.schoolArrival} onChange={(e) => setS({ ...s, schoolArrival: e.target.value })} /></label>
            <label className="text-xs">Afternoon start<input className="input mt-1" value={s.afternoonStart} onChange={(e) => setS({ ...s, afternoonStart: e.target.value })} /></label>
            <label className="text-xs">Home arrival<input className="input mt-1" value={s.homeArrival} onChange={(e) => setS({ ...s, homeArrival: e.target.value })} /></label>
          </div>
          <button type="button" className="btn-primary" onClick={() => void save()}>Save rules</button>
        </div>
        <div className="hr-card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Parent notifications</h2>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-semibold">{n.title} · {n.studentName}</p>
                <p className="text-xs text-muted">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TransportPageLayout>
  );
}

export function PermissionsView() {
  return (
    <TransportPageLayout>
      <div className="hr-card p-6 text-sm text-muted">
        Transport access is controlled from Organization Admin module licenses and RFID card status
        (active, blocked, lost, suspended). Lost or blocked cards automatically suspend boarding until
        a replacement is issued.
      </div>
    </TransportPageLayout>
  );
}
