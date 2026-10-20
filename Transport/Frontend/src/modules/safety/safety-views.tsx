'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { StatusBadge } from '@/components/status-badge';
import {
  transportApi,
  type SafetyAlert,
  type Student,
  type Emergency,
  type Incident,
  type Bus,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

export function AlertsView() {
  const toast = useToast();
  const [rows, setRows] = useState<SafetyAlert[]>([]);
  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.alerts();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load alerts'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TransportPageLayout kpis={[{ label: 'Open', value: rows.filter((r) => !r.resolved).length }]}>
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="hr-card flex items-start justify-between gap-3 p-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <StatusBadge status={a.severity} />
                <StatusBadge status={a.type} />
              </div>
              <p className="font-bold text-navy">{a.title}</p>
              <p className="text-sm text-muted">{a.message}</p>
              <p className="mt-1 text-[11px] text-muted">{formatTime(a.createdAt)}</p>
            </div>
            {!a.resolved ? (
              <button type="button" className="btn-secondary text-xs" onClick={() => void transportApi.resolveAlert(a.id).then(load)}>
                Resolve
              </button>
            ) : (
              <StatusBadge status="COMPLETED" />
            )}
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function MissingView() {
  const toast = useToast();
  const [rows, setRows] = useState<Student[]>([]);
  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.missing();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load missing students'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TransportPageLayout kpis={[{ label: 'Missing / expected', value: rows.length }]}>
      <div className="hr-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Stop</th>
              <th className="px-4 py-3">Bus</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-semibold">{s.studentName}</p>
                  <p className="text-xs text-muted">{s.studentCode}</p>
                </td>
                <td className="px-4 py-3">{s.pickupStop?.name ?? '—'}</td>
                <td className="px-4 py-3">{s.morningBus?.code ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={s.liveState} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TransportPageLayout>
  );
}

export function EmergenciesView() {
  const toast = useToast();
  const [rows, setRows] = useState<Emergency[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [form, setForm] = useState({ busId: '', type: 'ACCIDENT', notes: '', location: '' });

  const load = useCallback(async () => {
    try {
      const [e, b] = await Promise.all([transportApi.emergencies(), transportApi.buses()]);
      setRows(e.data.data ?? []);
      setBuses(b.data.data ?? []);
      if (!form.busId && b.data.data?.[0]) setForm((f) => ({ ...f, busId: b.data.data[0].id }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load emergencies'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.raiseEmergency(form);
      toast.success('Emergency alert sent to administrators');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Send failed'));
    }
  }

  return (
    <TransportPageLayout>
      <form onSubmit={(e) => void send(e)} className="hr-card mb-4 space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-rose-700">Emergency</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase text-muted">Bus</span>
            <select className="input" value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>{b.code}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase text-muted">Type</span>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['ACCIDENT', 'MEDICAL', 'MECHANICAL', 'SECURITY', 'OTHER'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase text-muted">Location</span>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase text-muted">Notes</span>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <button type="submit" className="btn-primary bg-rose-600 text-white">
          Send emergency alert
        </button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card flex items-center justify-between p-4">
            <div>
              <p className="font-bold text-navy">{r.bus?.code} · {r.type}</p>
              <p className="text-sm text-muted">{r.location} · {r.studentCount ?? 0} students · {r.driverName}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {r.status !== 'RESOLVED' ? (
                <button type="button" className="btn-secondary text-xs" onClick={() => void transportApi.resolveEmergency(r.id).then(load)}>
                  Resolve
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function IncidentsView() {
  const toast = useToast();
  const [rows, setRows] = useState<Incident[]>([]);
  const [form, setForm] = useState({ title: '', detail: '', busCode: '', driverName: '' });
  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.incidents();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load incidents'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createIncident(form);
      toast.success('Incident logged');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout>
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-2">
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="Bus code" value={form.busCode} onChange={(e) => setForm({ ...form, busCode: e.target.value })} />
        <input className="input sm:col-span-2" placeholder="Detail" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
        <button type="submit" className="btn-primary">Log incident</button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card p-4">
            <p className="font-bold">{r.title}</p>
            <p className="text-sm text-muted">{r.detail}</p>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}
