'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { StatusBadge } from '@/components/status-badge';
import {
  transportApi,
  type TransportFee,
  type FuelRecord,
  type MaintenanceRecord,
  type BusDocument,
  type Bus,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatRwf, formatDate } from '@/utils/format';

export function FeesView() {
  const toast = useToast();
  const [rows, setRows] = useState<TransportFee[]>([]);
  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.fees();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load fees'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TransportPageLayout
      kpis={[
        { label: 'Billed', value: formatRwf(rows.reduce((s, r) => s + r.amountRwf, 0)) },
        { label: 'Collected', value: formatRwf(rows.reduce((s, r) => s + r.paidRwf, 0)) },
        { label: 'Balance', value: formatRwf(rows.reduce((s, r) => s + (r.amountRwf - r.paidRwf), 0)) },
      ]}
    >
      <div className="hr-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Year / term</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">{r.studentName}</td>
                <td className="px-4 py-3">{r.academicYear} · {r.term}</td>
                <td className="px-4 py-3">{r.routeName}</td>
                <td className="px-4 py-3">{formatRwf(r.amountRwf)}</td>
                <td className="px-4 py-3">{formatRwf(r.paidRwf)}</td>
                <td className="px-4 py-3">{formatRwf(r.amountRwf - r.paidRwf)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TransportPageLayout>
  );
}

export function FuelView() {
  const toast = useToast();
  const [rows, setRows] = useState<FuelRecord[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [form, setForm] = useState({ busId: '', litres: '', costRwf: '', mileageKm: '', driverName: '' });
  const load = useCallback(async () => {
    try {
      const [f, b] = await Promise.all([transportApi.fuel(), transportApi.buses()]);
      setRows(f.data.data ?? []);
      setBuses(b.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load fuel'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createFuel({
        ...form,
        litres: Number(form.litres),
        costRwf: Number(form.costRwf),
        mileageKm: form.mileageKm ? Number(form.mileageKm) : undefined,
      });
      toast.success('Fuel recorded');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  const litres = rows.reduce((s, r) => s + r.litres, 0);
  const cost = rows.reduce((s, r) => s + r.costRwf, 0);

  return (
    <TransportPageLayout kpis={[{ label: 'Litres', value: litres.toFixed(0) }, { label: 'Cost', value: formatRwf(cost) }]}>
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-5">
        <select className="input" value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
          <option value="">Bus</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
        </select>
        <input className="input" placeholder="Litres" value={form.litres} onChange={(e) => setForm({ ...form, litres: e.target.value })} />
        <input className="input" placeholder="Cost RWF" value={form.costRwf} onChange={(e) => setForm({ ...form, costRwf: e.target.value })} />
        <input className="input" placeholder="Mileage" value={form.mileageKm} onChange={(e) => setForm({ ...form, mileageKm: e.target.value })} />
        <button className="btn-primary" type="submit">Add</button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card flex justify-between p-4 text-sm">
            <span className="font-semibold">{r.bus?.code} · {r.litres} L</span>
            <span>{formatRwf(r.costRwf)}</span>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function MaintenanceView() {
  const toast = useToast();
  const [rows, setRows] = useState<MaintenanceRecord[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [form, setForm] = useState({ busId: '', kind: 'SERVICE', title: '', notes: '' });
  const load = useCallback(async () => {
    try {
      const [m, b] = await Promise.all([transportApi.maintenance(), transportApi.buses()]);
      setRows(m.data.data ?? []);
      setBuses(b.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load maintenance'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createMaintenance(form);
      toast.success('Logged');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout>
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-4">
        <select className="input" value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
          <option value="">Bus</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
        </select>
        <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {['OIL', 'TIRES', 'BRAKES', 'ENGINE', 'INSURANCE', 'INSPECTION', 'SERVICE', 'OTHER'].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <button className="btn-primary" type="submit">Add</button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card p-4">
            <p className="font-bold">{r.bus?.code} · {r.title}</p>
            <p className="text-xs text-muted">{r.kind} {r.dueAt ? `· due ${formatDate(r.dueAt)}` : ''} {r.notes ? `· ${r.notes}` : ''}</p>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function DocumentsView() {
  const toast = useToast();
  const [rows, setRows] = useState<BusDocument[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [form, setForm] = useState({ busId: '', kind: 'INSURANCE', title: '' });
  const load = useCallback(async () => {
    try {
      const [d, b] = await Promise.all([transportApi.documents(), transportApi.buses()]);
      setRows(d.data.data ?? []);
      setBuses(b.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load documents'));
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createDocument(form);
      toast.success('Saved');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout>
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-4">
        <select className="input" value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
          <option value="">Bus</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
        </select>
        <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {['INSURANCE', 'INSPECTION', 'REGISTRATION', 'PHOTO', 'OTHER'].map((k) => <option key={k}>{k}</option>)}
        </select>
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <button className="btn-primary" type="submit">Add</button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card flex justify-between p-4">
            <span className="font-semibold">{r.bus?.code} · {r.title}</span>
            <StatusBadge status={r.kind} />
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}
