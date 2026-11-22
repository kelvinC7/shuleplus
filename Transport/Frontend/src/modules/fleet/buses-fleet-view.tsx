'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bus as BusIcon,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { TransportModal } from '@/components/transport-modal';
import { TransportDataTable } from '@/components/transport-data-table';
import { StatusBadge } from '@/components/status-badge';
import {
  transportApi,
  type Bus,
  type OrgAccessUser,
  type Route,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

type ModalMode = 'add' | 'edit' | 'view' | 'assign' | 'delete' | null;

const BUS_STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED'] as const;

const emptyForm = () => ({
  code: '',
  plateNumber: '',
  busType: 'School Bus',
  capacity: '40',
  status: 'ACTIVE' as string,
  gpsDevice: '',
  routeId: '',
  notes: '',
  mileageKm: '0',
});

export function BusesFleetView() {
  const toast = useToast();
  const [rows, setRows] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<ModalMode>(null);
  const [active, setActive] = useState<Bus | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [assignTab, setAssignTab] = useState<'directory' | 'manual'>('directory');
  const [userQuery, setUserQuery] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgAccessUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgAccessUser | null>(null);
  const [manualDriver, setManualDriver] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [busesRes, routesRes] = await Promise.all([transportApi.buses(), transportApi.routes()]);
      setRows(busesRes.data.data ?? []);
      setRoutes(routesRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load fleet'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.plateNumber.toLowerCase().includes(q) ||
        (b.driver?.name?.toLowerCase().includes(q) ?? false) ||
        (b.route?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function openAdd() {
    setForm(emptyForm());
    try {
      const { data } = await transportApi.nextBusCode();
      setForm((f) => ({ ...f, code: data.data?.code ?? '' }));
    } catch {
      /* optional */
    }
    setActive(null);
    setModal('add');
  }

  function openEdit(bus: Bus) {
    setActive(bus);
    setForm({
      code: bus.code,
      plateNumber: bus.plateNumber,
      busType: bus.busType,
      capacity: String(bus.capacity),
      status: bus.status,
      gpsDevice: bus.gpsDevice ?? '',
      routeId: bus.route?.id ?? '',
      notes: '',
      mileageKm: String(bus.mileageKm ?? 0),
    });
    setModal('edit');
  }

  function openView(bus: Bus) {
    setActive(bus);
    setModal('view');
  }

  function openAssign(bus: Bus) {
    setActive(bus);
    setAssignTab('directory');
    setUserQuery('');
    setOrgUsers([]);
    setSelectedUser(null);
    setManualDriver({ name: '', phone: '', licenseNumber: '' });
    setModal('assign');
  }

  function openDelete(bus: Bus) {
    setActive(bus);
    setModal('delete');
  }

  async function saveBus(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim() || undefined,
        plateNumber: form.plateNumber.trim(),
        busType: form.busType,
        capacity: Number(form.capacity) || 40,
        status: form.status,
        gpsDevice: form.gpsDevice.trim() || undefined,
        routeId: form.routeId || null,
        notes: form.notes.trim() || undefined,
        mileageKm: Number(form.mileageKm) || 0,
      };
      if (modal === 'edit' && active) {
        await transportApi.updateBus(active.id, payload);
        toast.success('Bus updated');
      } else {
        await transportApi.createBus(payload);
        toast.success('Bus registered');
      }
      setModal(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!active) return;
    setSaving(true);
    try {
      await transportApi.deleteBus(active.id);
      toast.success('Bus removed');
      setModal(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (modal !== 'assign' || assignTab !== 'directory') return;
    const t = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const { data } = await transportApi.orgUsers(userQuery.trim() || undefined);
        setOrgUsers(data.data ?? []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not search Users & Access'));
        setOrgUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [modal, assignTab, userQuery, toast]);

  async function saveAssign(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    setSaving(true);
    try {
      if (assignTab === 'directory' && selectedUser) {
        await transportApi.assignBusDriver(active.id, {
          iamUserId: selectedUser.id,
          name: selectedUser.name,
          phone: selectedUser.phone ?? undefined,
        });
      } else {
        await transportApi.assignBusDriver(active.id, {
          name: manualDriver.name.trim(),
          phone: manualDriver.phone.trim() || undefined,
          licenseNumber: manualDriver.licenseNumber.trim() || undefined,
        });
      }
      toast.success('Driver assigned');
      setModal(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Assign failed'));
    } finally {
      setSaving(false);
    }
  }

  const kpis = [
    { label: 'Total buses', value: rows.length, icon: <BusIcon size={18} className="text-primary" /> },
    { label: 'Active', value: rows.filter((b) => b.status === 'ACTIVE').length },
    { label: 'Maintenance', value: rows.filter((b) => b.status === 'MAINTENANCE').length },
    { label: 'With driver', value: rows.filter((b) => b.driver).length },
  ];

  return (
    <TransportPageLayout
      kpis={kpis}
      actions={
        <button type="button" className="btn-primary" onClick={() => void openAdd()}>
          <Plus size={16} /> Add bus
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search code, plate, driver, route…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <p className="text-xs text-muted">
          {filtered.length} bus{filtered.length === 1 ? '' : 'es'}
        </p>
      </div>

      <TransportDataTable
        loading={loading}
        data={pageRows}
        rowKey={(b) => b.id}
        page={pageSafe}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        emptyMessage="No buses registered yet. Add your first bus to start building the fleet."
        emptyAction={
          <button type="button" className="btn-primary" onClick={() => void openAdd()}>
            <Plus size={16} /> Add bus
          </button>
        }
        columns={[
          {
            key: 'num',
            header: '#',
            className: 'w-12 text-muted',
            render: (b) => {
              const idx = (pageSafe - 1) * pageSize + pageRows.indexOf(b) + 1;
              return <span className="font-medium text-muted">{idx}</span>;
            },
          },
          {
            key: 'code',
            header: 'Bus',
            render: (b) => (
              <div>
                <p className="font-bold text-navy">{b.code}</p>
                <p className="text-xs text-muted">{b.plateNumber}</p>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type / capacity',
            render: (b) => (
              <div>
                <p className="font-medium text-navy">{b.busType}</p>
                <p className="text-xs text-muted">
                  {b.currentStudents ?? 0} / {b.capacity} seats
                </p>
              </div>
            ),
          },
          {
            key: 'driver',
            header: 'Driver',
            render: (b) =>
              b.driver ? (
                <div>
                  <p className="font-medium text-navy">{b.driver.name}</p>
                  <p className="text-xs text-muted">{b.driver.phone ?? ''}</p>
                </div>
              ) : (
                <span className="text-xs font-medium text-amber-700">Unassigned</span>
              ),
          },
          {
            key: 'route',
            header: 'Route',
            render: (b) => <span className="text-navy">{b.route?.name ?? ''}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (b) => <StatusBadge status={b.status} />,
          },
        ]}
        renderActions={(b) => (
          <>
            <ActionBtn label="View" onClick={() => openView(b)}>
              <Eye size={15} />
            </ActionBtn>
            <ActionBtn label="Edit" onClick={() => openEdit(b)}>
              <Pencil size={15} />
            </ActionBtn>
            <ActionBtn label="Assign driver" onClick={() => openAssign(b)}>
              <UserPlus size={15} />
            </ActionBtn>
            <ActionBtn label="Delete" onClick={() => openDelete(b)} danger>
              <Trash2 size={15} />
            </ActionBtn>
          </>
        )}
      />

      <TransportModal
        open={modal === 'add' || modal === 'edit'}
        title={modal === 'edit' ? `Edit ${active?.code ?? 'bus'}` : 'Register new bus'}
        description="Fleet details are stored for your organization only."
        wide
        onClose={() => setModal(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              type="submit"
              form="bus-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {modal === 'edit' ? 'Save changes' : 'Register bus'}
            </button>
          </>
        }
      >
        <form id="bus-form" onSubmit={(e) => void saveBus(e)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Bus code">
            <input
              className="input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Auto-generated if empty"
            />
          </Field>
          <Field label="Plate number *">
            <input
              className="input"
              required
              value={form.plateNumber}
              onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <input className="input" value={form.busType} onChange={(e) => setForm({ ...form, busType: e.target.value })} />
          </Field>
          <Field label="Capacity">
            <input
              className="input"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {BUS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="GPS device ID">
            <input className="input" value={form.gpsDevice} onChange={(e) => setForm({ ...form, gpsDevice: e.target.value })} />
          </Field>
          <Field label="Route">
            <select className="input" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
              <option value=""> -  None  - </option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mileage (km)">
            <input
              className="input"
              type="number"
              min={0}
              value={form.mileageKm}
              onChange={(e) => setForm({ ...form, mileageKm: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className="input min-h-[80px] resize-y"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </TransportModal>

      <TransportModal
        open={modal === 'view' && Boolean(active)}
        title={active?.code ?? 'Bus details'}
        onClose={() => setModal(null)}
        wide
        footer={
          active ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEdit(active)}>
                Edit
              </button>
            </>
          ) : null
        }
      >
        {active ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Plate">{active.plateNumber}</Detail>
            <Detail label="Status">
              <StatusBadge status={active.status} />
            </Detail>
            <Detail label="Type">{active.busType}</Detail>
            <Detail label="Capacity">
              {active.currentStudents ?? 0} / {active.capacity}
            </Detail>
            <Detail label="Driver">{active.driver?.name ?? ''}</Detail>
            <Detail label="Driver phone">{active.driver?.phone ?? ''}</Detail>
            <Detail label="Route">{active.route?.name ?? ''}</Detail>
            <Detail label="GPS">{active.gpsDevice ?? ''}</Detail>
            <Detail label="Last location">{active.lastLocation ?? ''}</Detail>
            <Detail label="Mileage">{active.mileageKm?.toLocaleString() ?? 0} km</Detail>
          </dl>
        ) : null}
      </TransportModal>

      <TransportModal
        open={modal === 'assign' && Boolean(active)}
        title={`Assign driver · ${active?.code ?? ''}`}
        description="Link a driver from Users & Access or register one manually."
        wide
        onClose={() => setModal(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              type="submit"
              form="assign-form"
              className="btn-primary"
              disabled={
                saving ||
                (assignTab === 'directory' ? !selectedUser : !manualDriver.name.trim())
              }
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Assign driver
            </button>
          </>
        }
      >
        <form id="assign-form" onSubmit={(e) => void saveAssign(e)} className="space-y-4">
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <TabButton active={assignTab === 'directory'} onClick={() => setAssignTab('directory')}>
              Users & Access
            </TabButton>
            <TabButton active={assignTab === 'manual'} onClick={() => setAssignTab('manual')}>
              Manual entry
            </TabButton>
          </div>

          {assignTab === 'directory' ? (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-9"
                  placeholder="Search name, email, phone…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-border p-2">
                {loadingUsers ? (
                  <p className="flex items-center gap-2 px-2 py-4 text-sm text-muted">
                    <Loader2 size={16} className="animate-spin" /> Searching…
                  </p>
                ) : orgUsers.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted">No matching users. Try another search or use manual entry.</p>
                ) : (
                  orgUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className={`flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition ${
                        selectedUser?.id === u.id
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold text-navy">{u.name}</span>
                      <span className="text-xs text-muted">
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ''}
                        {u.position ? ` · ${u.position}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name *">
                <input
                  className="input"
                  required
                  value={manualDriver.name}
                  onChange={(e) => setManualDriver({ ...manualDriver, name: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className="input"
                  value={manualDriver.phone}
                  onChange={(e) => setManualDriver({ ...manualDriver, phone: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="License number">
                  <input
                    className="input"
                    value={manualDriver.licenseNumber}
                    onChange={(e) => setManualDriver({ ...manualDriver, licenseNumber: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}
        </form>
      </TransportModal>

      <TransportModal
        open={modal === 'delete' && Boolean(active)}
        title="Remove bus?"
        description={`${active?.code ?? 'This bus'} will be archived and hidden from the fleet list.`}
        onClose={() => setModal(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" disabled={saving} onClick={() => void confirmDelete()}>
              {saving ? 'Removing…' : 'Delete bus'}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Assigned learners and historical trips are kept for audit. You can register a new bus with the same plate later if
          needed.
        </p>
      </TransportModal>
    </TransportPageLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/80 bg-slate-50/50 px-3 py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-navy">{children}</dd>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
      }`}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg border border-transparent p-2 transition ${
        danger
          ? 'text-danger hover:border-danger/20 hover:bg-danger/5'
          : 'text-muted hover:border-border hover:bg-white hover:text-navy'
      }`}
    >
      {children}
    </button>
  );
}
