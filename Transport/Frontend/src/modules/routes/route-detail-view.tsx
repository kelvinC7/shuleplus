'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { ChevronLeft, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import {
  transportApi,
  type OrgAccessUser,
  type RouteDetail,
  type RouteLearnersDetail,
  type RouteSupervisor,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import type { LatLng } from '@/utils/routing';

const RouteMap = dynamic(() => import('./route-map').then((m) => ({ default: m.RouteMap })), { ssr: false });

type Tab = 'route' | 'bus' | 'learners' | 'supervision';

function pathFromGeo(route: RouteDetail | null): LatLng[] {
  const geo = route?.pathGeoJson as { coordinates?: [number, number][] } | null | undefined;
  if (!geo?.coordinates?.length) return [];
  return geo.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

function directionLabel(d: string) {
  if (d === 'MORNING') return 'Morning';
  if (d === 'AFTERNOON') return 'Afternoon';
  if (d === 'BOTH') return 'Both';
  return d;
}

function DetailStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-base font-semibold text-[#000435]">{value}</div>
    </div>
  );
}

interface RouteDetailViewProps {
  open: boolean;
  routeId: string | null;
  onClose: () => void;
  onEdit: (detail: RouteDetail) => void;
}

export function RouteDetailView({ open, routeId, onClose, onEdit }: RouteDetailViewProps) {
  const notify = useToast();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('route');
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [learners, setLearners] = useState<RouteLearnersDetail | null>(null);
  const [supervisors, setSupervisors] = useState<RouteSupervisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [supervisorModal, setSupervisorModal] = useState(false);
  const [assignTab, setAssignTab] = useState<'directory' | 'manual'>('directory');
  const [userQuery, setUserQuery] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgAccessUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgAccessUser | null>(null);
  const [manual, setManual] = useState({ name: '', email: '', phone: '', roleTitle: '' });
  const [savingSup, setSavingSup] = useState(false);

  useEffect(() => setMounted(true), []);

  const reload = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    try {
      const [routeRes, learnersRes, supRes] = await Promise.all([
        transportApi.getRoute(routeId),
        transportApi.routeLearnersDetail(routeId),
        transportApi.routeSupervisors(routeId),
      ]);
      setDetail(routeRes.data.data ?? null);
      setLearners(learnersRes.data.data ?? null);
      setSupervisors(supRes.data.data ?? []);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not load route'));
    } finally {
      setLoading(false);
    }
  }, [routeId, notify]);

  useEffect(() => {
    if (!open || !routeId) {
      setDetail(null);
      setLearners(null);
      setSupervisors([]);
      setTab('route');
      return;
    }
    void reload();
  }, [open, routeId, reload]);

  useEffect(() => {
    if (!supervisorModal || assignTab !== 'directory') return;
    const t = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const { data } = await transportApi.orgUsers(userQuery.trim() || undefined);
        setOrgUsers(data.data ?? []);
      } catch {
        setOrgUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [supervisorModal, assignTab, userQuery]);

  async function submitSupervisor(e: FormEvent) {
    e.preventDefault();
    if (!routeId) return;
    setSavingSup(true);
    try {
      if (assignTab === 'directory' && selectedUser) {
        await transportApi.addRouteSupervisor(routeId, {
          iamUserId: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email ?? undefined,
          phone: selectedUser.phone ?? undefined,
          roleTitle: manual.roleTitle.trim() || 'Route supervisor',
        });
      } else {
        await transportApi.addRouteSupervisor(routeId, {
          name: manual.name.trim(),
          email: manual.email.trim() || undefined,
          phone: manual.phone.trim() || undefined,
          roleTitle: manual.roleTitle.trim(),
        });
      }
      notify.success('Supervisor added');
      setSupervisorModal(false);
      setSelectedUser(null);
      setManual({ name: '', email: '', phone: '', roleTitle: '' });
      const { data } = await transportApi.routeSupervisors(routeId);
      setSupervisors(data.data ?? []);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not add supervisor'));
    } finally {
      setSavingSup(false);
    }
  }

  async function removeSupervisor(id: string) {
    if (!routeId || !window.confirm('Remove this supervisor from the route?')) return;
    try {
      await transportApi.removeRouteSupervisor(routeId, id);
      setSupervisors((prev) => prev.filter((s) => s.id !== id));
      notify.success('Supervisor removed');
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Remove failed'));
    }
  }

  if (!open || !mounted || !routeId) return null;

  const bus = detail?.primaryBus ?? detail?.buses?.[0];
  const stops = [...(detail?.stops ?? [])].sort((a, b) => a.sequence - b.sequence);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'route', label: 'Route & map' },
    { id: 'bus', label: 'Bus' },
    { id: 'learners', label: 'Learners' },
    { id: 'supervision', label: 'Supervision' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-white px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" className="btn-secondary shrink-0 text-sm" onClick={onClose}>
            <ChevronLeft size={16} /> Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-navy">{detail?.name ?? '…'}</h1>
            <p className="truncate text-sm text-muted">
              {detail?.code} · {directionLabel(detail?.serviceDirection ?? '')}
            </p>
          </div>
          {detail ? <StatusBadge status={detail.status} /> : null}
        </div>
        <div className="flex gap-2">
          {detail ? (
            <button type="button" className="btn-primary text-sm" onClick={() => onEdit(detail)}>
              <Pencil size={14} /> Edit route
            </button>
          ) : null}
          <button type="button" className="rounded-xl border border-border p-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-3 sm:px-5">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 py-3 text-sm font-semibold transition ${
                tab === t.id
                  ? 'border-[#FCB038] text-[#000435]'
                  : 'border-transparent text-muted hover:text-navy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {loading ? (
          <div className="flex justify-center py-16 text-muted">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : null}

        {!loading && tab === 'route' && detail ? (
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-2">
              <RouteMap
                heightClass="h-[280px] sm:h-[420px] lg:min-h-[480px] lg:h-full"
                path={pathFromGeo(detail)}
                routeColor={detail.color ?? '#2563EB'}
                lineWeight={detail.lineWidth ?? 7}
                lineOpacity={detail.lineOpacity ?? 1}
                school={
                  detail.schoolLat != null && detail.schoolLng != null
                    ? { lat: detail.schoolLat, lng: detail.schoolLng }
                    : null
                }
                stops={stops.map((s) => ({
                  id: s.id,
                  name: s.name,
                  sequence: s.sequence,
                  lat: s.latitude,
                  lng: s.longitude,
                  kind: s.kind ?? undefined,
                  subtitle: s.placeName ?? s.adminLabel ?? s.address ?? undefined,
                }))}
              />
              <p className="text-[10px] text-muted">
                Road distance {detail.distanceKm != null ? `${detail.distanceKm.toFixed(1)} km` : ''} ·{' '}
                {detail.departureTime ?? ''} – {detail.arrivalTime ?? ''}
              </p>
            </div>
            <aside className="hr-card flex flex-col p-4 sm:p-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Bus</dt>
                  <dd className="font-semibold">{bus?.code ?? ''}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Driver</dt>
                  <dd className="font-semibold">{bus?.driver?.name ?? ''}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Attendant</dt>
                  <dd className="font-semibold">{bus?.attendant?.name ?? ''}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Learners</dt>
                  <dd className="font-semibold">{detail.learnerCount ?? learners?.assigned ?? 0}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">
                {detail.startLabel} → {detail.endLabel}
              </p>
              <h3 className="mb-2 mt-4 text-xs font-bold uppercase text-navy">Destinations</h3>
              <ol className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto">
                {stops.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border bg-slate-50/80 p-3">
                    <div className="flex gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-primary">
                        {s.sequence}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy">{s.name}</p>
                        {(s.placeName || s.adminLabel) && (
                          <p className="text-xs text-muted">{s.placeName ?? s.adminLabel}</p>
                        )}
                        <p className="text-[10px] font-bold uppercase text-muted">{s.kind?.replace('_', ' ') ?? 'Stop'}</p>
                        {s.plannedTime ? <p className="text-xs text-muted">Planned {s.plannedTime}</p> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        ) : null}

        {!loading && tab === 'bus' && detail ? (
          <div className="mx-auto max-w-3xl">
            {bus ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold text-[#000435]">{bus.code}</p>
                    <p className="text-sm text-muted">{bus.plateNumber}</p>
                  </div>
                  <StatusBadge status={bus.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailStat label="Type" value={bus.busType ?? 'School bus'} />
                  <DetailStat label="Capacity" value={`${bus.capacity} seats`} />
                  <DetailStat label="Driver" value={bus.driver?.name ?? 'Not assigned'} />
                  <DetailStat label="Attendant" value={bus.attendant?.name ?? 'Not assigned'} />
                  <DetailStat
                    label="Route learners"
                    value={detail.learnerCount ?? learners?.assigned ?? 0}
                  />
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted">
                No bus on this route.{' '}
                <button type="button" className="font-semibold text-navy underline" onClick={() => detail && onEdit(detail)}>
                  Edit route
                </button>{' '}
                to assign one.
              </p>
            )}
          </div>
        ) : null}

        {!loading && tab === 'learners' && learners ? (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailStat label="Assigned" value={learners.assigned} />
              <DetailStat
                label="Capacity"
                value={
                  learners.capacity
                    ? `${learners.assigned} / ${learners.capacity} (${learners.capacityPercent}%)`
                    : 'No bus capacity'
                }
              />
              <DetailStat label="Stops with learners" value={learners.stops.length} />
            </div>
            {learners.stops.map((block, idx) => (
              <div key={block.stop.id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stop {idx + 1}</p>
                    <p className="font-semibold text-[#000435]">{block.stop.name}</p>
                  </div>
                  <p className="text-xs font-medium text-muted">
                    Pickup {block.pickupCount} · Drop-off {block.dropoffCount}
                  </p>
                </div>
                {block.learners.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">No learners at this stop</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-2.5">Learner</th>
                        <th className="px-4 py-2.5">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.learners.map((l) => (
                        <tr key={l.id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 font-medium text-navy">{l.studentName}</td>
                          <td className="px-4 py-2.5 text-muted">{l.studentCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {!loading && tab === 'supervision' ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#000435]">
                Supervisors <span className="font-normal text-muted">({supervisors.length})</span>
              </p>
              <button type="button" className="btn-primary text-sm" onClick={() => setSupervisorModal(true)}>
                <Plus size={16} /> Add supervisor
              </button>
            </div>
            {supervisors.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No supervisors on this route yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200/90 bg-white">
                {supervisors.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#000435]">{s.name}</p>
                      <p className="text-sm text-muted">{s.roleTitle}</p>
                      {(s.email || s.phone) && (
                        <p className="mt-0.5 text-xs text-muted">
                          {[s.email, s.phone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-danger hover:bg-danger/5"
                      aria-label="Remove supervisor"
                      onClick={() => void removeSupervisor(s.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {supervisorModal ? (
        <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-navy/50 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={(e) => void submitSupervisor(e)}
            className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h2 className="font-bold text-navy">Add route supervisor</h2>
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${assignTab === 'directory' ? 'bg-navy text-primary' : 'bg-slate-100'}`}
                  onClick={() => setAssignTab('directory')}
                >
                  Users & Access
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${assignTab === 'manual' ? 'bg-navy text-primary' : 'bg-slate-100'}`}
                  onClick={() => setAssignTab('manual')}
                >
                  Manual entry
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              {assignTab === 'directory' ? (
                <>
                  <input
                    className="input mb-2"
                    placeholder="Search users…"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                  />
                  <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto">
                    {loadingUsers ? (
                      <li className="text-sm text-muted">Searching…</li>
                    ) : (
                      orgUsers.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                              selectedUser?.id === u.id ? 'border-primary bg-primary/10' : 'border-border'
                            }`}
                            onClick={() => setSelectedUser(u)}
                          >
                            {u.name}
                            <span className="block text-xs text-muted">{u.email ?? u.phone ?? u.id}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                <>
                  <label className="mb-2 block text-sm">
                    <span className="text-xs font-bold uppercase text-muted">Full name *</span>
                    <input
                      className="input mt-1"
                      required
                      value={manual.name}
                      onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                    />
                  </label>
                  <label className="mb-2 block text-sm">
                    <span className="text-xs font-bold uppercase text-muted">Email</span>
                    <input
                      type="email"
                      className="input mt-1"
                      value={manual.email}
                      onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
                    />
                  </label>
                  <label className="mb-2 block text-sm">
                    <span className="text-xs font-bold uppercase text-muted">Phone</span>
                    <input
                      className="input mt-1"
                      value={manual.phone}
                      onChange={(e) => setManual((m) => ({ ...m, phone: e.target.value }))}
                    />
                  </label>
                </>
              )}
              <label className="block text-sm">
                <span className="text-xs font-bold uppercase text-muted">Role / position *</span>
                <input
                  className="input mt-1"
                  required
                  placeholder="e.g. Route coordinator"
                  value={manual.roleTitle}
                  onChange={(e) => setManual((m) => ({ ...m, roleTitle: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex gap-2 border-t border-border bg-slate-50 px-4 py-3 sm:px-5">
              <button type="button" className="btn-secondary flex-1" onClick={() => setSupervisorModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={savingSup || (assignTab === 'directory' && !selectedUser)}
              >
                {savingSup ? 'Saving…' : 'Add supervisor'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
