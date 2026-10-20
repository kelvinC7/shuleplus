'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type Bus, type Crew, type Route, type Student, type RfidCard, type Trip, type RfidDevice } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase text-muted">{label}</span>
      {children}
    </label>
  );
}

export function BusesView() {
  const toast = useToast();
  const [rows, setRows] = useState<Bus[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', plateNumber: '', busType: 'School Bus', capacity: '40' });

  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.buses();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load buses'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createBus({ ...form, capacity: Number(form.capacity) });
      toast.success('Bus registered');
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout
      actions={
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Register bus
        </button>
      }
      kpis={[
        { label: 'Fleet', value: rows.length },
        { label: 'Active', value: rows.filter((b) => b.status === 'ACTIVE').length },
        { label: 'Maintenance', value: rows.filter((b) => b.status === 'MAINTENANCE').length },
      ]}
    >
      {open ? (
        <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-4">
          <Field label="Code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Plate"><input className="input" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} /></Field>
          <Field label="Capacity"><input className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn-primary w-full" type="submit">Save</button></div>
        </form>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((b) => (
          <div key={b.id} className="hr-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-extrabold text-navy">{b.code}</p>
                <p className="text-xs text-muted">{b.plateNumber} · {b.busType}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-muted">Capacity</dt><dd className="font-semibold">{b.currentStudents ?? 0} / {b.capacity}</dd></div>
              <div><dt className="text-muted">Driver</dt><dd className="font-semibold">{b.driver?.name ?? '—'}</dd></div>
              <div><dt className="text-muted">Attendant</dt><dd className="font-semibold">{b.attendant?.name ?? '—'}</dd></div>
              <div><dt className="text-muted">Route</dt><dd className="font-semibold">{b.route?.name ?? '—'}</dd></div>
              <div><dt className="text-muted">GPS</dt><dd className="font-semibold">{b.lastLocation ?? '—'}</dd></div>
              <div><dt className="text-muted">Mileage</dt><dd className="font-semibold">{b.mileageKm?.toLocaleString()} km</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function RoutesView() {
  const toast = useToast();
  const [rows, setRows] = useState<Route[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', direction: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.routes();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load routes'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createRoute(form);
      toast.success('Route created');
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout
      actions={
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New route
        </button>
      }
    >
      {open ? (
        <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Direction"><input className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn-primary w-full" type="submit">Save</button></div>
        </form>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="hr-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-extrabold uppercase text-navy">{r.name}</p>
                <p className="text-xs text-muted">{r.direction}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <ol className="mt-4 space-y-1 text-sm">
              {(r.stops ?? []).map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-primary">
                    {s.sequence}
                  </span>
                  {s.name}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              {r._count?.assignments ?? 0} students · {r.distanceKm ?? '—'} km · ETA {r.etaMinutes ?? '—'} min
            </p>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function StudentsView() {
  const toast = useToast();
  const [rows, setRows] = useState<Student[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.students(q || undefined);
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load students'));
    }
  }, [q, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TransportPageLayout
      kpis={[
        { label: 'Assigned', value: rows.length },
        { label: 'On bus', value: rows.filter((s) => s.liveState === 'ON_BUS').length },
        { label: 'Missing', value: rows.filter((s) => s.liveState === 'MISSING').length },
      ]}
    >
      <input className="input mb-4 max-w-sm" placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="hr-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Pickup</th>
              <th className="px-4 py-3">Morning</th>
              <th className="px-4 py-3">Afternoon</th>
              <th className="px-4 py-3">Guardian</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-semibold text-navy">{s.studentName}</p>
                  <p className="text-xs text-muted">{s.studentCode} · {s.className}</p>
                </td>
                <td className="px-4 py-3">{s.pickupStop?.name ?? '—'}</td>
                <td className="px-4 py-3">{s.morningBus?.code ?? '—'}</td>
                <td className="px-4 py-3">{s.afternoonBus?.code ?? '—'}</td>
                <td className="px-4 py-3">{s.guardianName ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={s.liveState} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TransportPageLayout>
  );
}

export function CrewView() {
  const toast = useToast();
  const [drivers, setDrivers] = useState<Crew[]>([]);
  const [attendants, setAttendants] = useState<Crew[]>([]);
  const [form, setForm] = useState({ kind: 'driver', name: '', phone: '', licenseNumber: '' });

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([transportApi.drivers(), transportApi.attendants()]);
      setDrivers(d.data.data ?? []);
      setAttendants(a.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load crew'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      if (form.kind === 'driver') await transportApi.createDriver(form);
      else await transportApi.createAttendant(form);
      toast.success('Saved');
      setForm({ kind: form.kind, name: '', phone: '', licenseNumber: '' });
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout>
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-5">
        <Field label="Role">
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="driver">Driver</option>
            <option value="attendant">Attendant</option>
          </select>
        </Field>
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="License"><input className="input" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></Field>
        <div className="flex items-end"><button className="btn-primary w-full" type="submit">Add</button></div>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Drivers</h2>
          {drivers.map((d) => (
            <div key={d.id} className="mb-2 flex justify-between rounded-xl border border-border px-3 py-2">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-muted">{d.phone} · {d.licenseNumber}</p>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
        <div className="hr-card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase text-navy">Attendants</h2>
          {attendants.map((d) => (
            <div key={d.id} className="mb-2 flex justify-between rounded-xl border border-border px-3 py-2">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-muted">{d.phone}</p>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      </div>
    </TransportPageLayout>
  );
}

export function CardsView() {
  const toast = useToast();
  const [rows, setRows] = useState<RfidCard[]>([]);
  const [form, setForm] = useState({ cardNumber: '', studentCode: '', studentName: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.cards({ limit: 80 });
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load cards'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createCard({ ...form, activate: true });
      toast.success('Card assigned');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await transportApi.updateCardStatus(id, status);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    }
  }

  return (
    <TransportPageLayout
      kpis={[
        { label: 'Cards', value: rows.length },
        { label: 'Active', value: rows.filter((c) => c.status === 'ACTIVE').length },
        { label: 'Lost / blocked', value: rows.filter((c) => c.status === 'LOST' || c.status === 'BLOCKED').length },
      ]}
    >
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-4">
        <Field label="RFID"><input className="input font-mono" value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value.toUpperCase() })} /></Field>
        <Field label="Student code"><input className="input" value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} /></Field>
        <Field label="Student name"><input className="input" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} /></Field>
        <div className="flex items-end"><button className="btn-primary w-full" type="submit">Assign card</button></div>
      </form>
      <div className="space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="hr-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-mono font-bold text-navy">{c.cardNumber}</p>
              <p className="text-sm">{c.studentName} · {c.studentCode}</p>
              <p className="text-xs text-muted">Scans {c.usageCount ?? 0} · Last {formatTime(c.lastUsedAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              {['ACTIVE', 'BLOCKED', 'LOST', 'INACTIVE', 'DAMAGED'].map((s) => (
                <button key={s} type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void setStatus(c.id, s)}>
                  {s}
                </button>
              ))}
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void transportApi.replaceCard(c.id).then(load)}>
                Replace
              </button>
            </div>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function TripsView() {
  const toast = useToast();
  const [rows, setRows] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState('');

  const load = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([transportApi.trips(), transportApi.buses()]);
      setRows(t.data.data ?? []);
      setBuses(b.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load trips'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function prepare() {
    try {
      await transportApi.prepareTrip({ busId });
      toast.success('Trip prepared — boarding open');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Prepare failed'));
    }
  }

  return (
    <TransportPageLayout
      actions={
        <div className="flex gap-2">
          <select className="input" value={busId} onChange={(e) => setBusId(e.target.value)}>
            <option value="">Select bus</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>{b.code}</option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={() => void prepare()} disabled={!busId}>
            Prepare trip
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {rows.map((t) => (
          <div key={t.id} className="hr-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-extrabold text-navy">{t.bus.code} · {t.direction.replace('_', ' ')}</p>
              <p className="text-xs text-muted">
                {t.boardedCount}/{t.expectedCount} boarded · {t.missingCount} missing · {t.lastLocation ?? '—'}
              </p>
            </div>
            <StatusBadge status={t.status} />
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}

export function DevicesView() {
  const toast = useToast();
  const [rows, setRows] = useState<RfidDevice[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [form, setForm] = useState({ deviceCode: '', name: '', busId: '' });

  const load = useCallback(async () => {
    try {
      const [d, b] = await Promise.all([transportApi.devices(), transportApi.buses()]);
      setRows(d.data.data ?? []);
      setBuses(b.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load devices'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await transportApi.createDevice(form);
      toast.success('Device registered');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    }
  }

  return (
    <TransportPageLayout>
      <form onSubmit={(e) => void create(e)} className="hr-card mb-4 grid gap-3 p-5 sm:grid-cols-4">
        <Field label="Code"><input className="input font-mono" value={form.deviceCode} onChange={(e) => setForm({ ...form, deviceCode: e.target.value.toUpperCase() })} /></Field>
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Bus">
          <select className="input" value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
            <option value="">Unassigned</option>
            {buses.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><button className="btn-primary w-full" type="submit">Save</button></div>
      </form>
      <div className="space-y-2">
        {rows.map((d) => (
          <div key={d.id} className="hr-card flex items-center justify-between p-4">
            <div>
              <p className="font-mono font-bold">{d.deviceCode}</p>
              <p className="text-sm">{d.name} · {d.bus?.code ?? 'No bus'}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={d.status} />
              <button type="button" className="btn-secondary text-xs" onClick={() => void transportApi.testDevice(d.id).then(load)}>
                Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </TransportPageLayout>
  );
}
