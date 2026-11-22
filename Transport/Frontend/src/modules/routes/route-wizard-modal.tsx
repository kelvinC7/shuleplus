'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { TransportModal } from '@/components/transport-modal';
import { fetchRoadPath, searchPlaces, type LatLng } from '@/utils/routing';
import type { Bus, RouteDetail, RouteStopDraft } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';

const RouteMap = dynamic(() => import('./route-map').then((m) => ({ default: m.RouteMap })), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-border bg-slate-50 text-sm text-muted">
      Loading map…
    </div>
  ),
});

const STEPS = ['Route information', 'Stops & map', 'Schedule & learners', 'Review & save'] as const;
const DAYS = [
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
  { v: 0, l: 'Sun' },
];

export type RouteWizardDraft = {
  id?: string;
  name: string;
  code: string;
  serviceDirection: 'MORNING' | 'AFTERNOON' | 'BOTH';
  primaryBusId: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  color: string;
  departureTime: string;
  arrivalTime: string;
  operatingDays: number[];
  notes: string;
  distanceKm?: number;
  etaMinutes?: number;
  pathGeoJson?: { type: 'LineString'; coordinates: [number, number][] } | null;
  schoolLat?: number;
  schoolLng?: number;
  schoolName?: string;
  stops: RouteStopDraft[];
};

function emptyDraft(code: string): RouteWizardDraft {
  return {
    name: '',
    code,
    serviceDirection: 'MORNING',
    primaryBusId: '',
    status: 'DRAFT',
    color: '#FCB038',
    departureTime: '06:30',
    arrivalTime: '07:30',
    operatingDays: [1, 2, 3, 4, 5],
    notes: '',
    stops: [
      { id: 'origin', name: 'Starting point', sequence: 1, kind: 'ORIGIN' },
      { id: 'dest', name: 'School', sequence: 2, kind: 'DESTINATION' },
    ],
  };
}

function draftFromRoute(route: RouteDetail, code: string): RouteWizardDraft {
  return {
    id: route.id,
    name: route.name,
    code: route.code,
    serviceDirection: (route.serviceDirection as RouteWizardDraft['serviceDirection']) ?? 'BOTH',
    primaryBusId: route.primaryBusId ?? route.primaryBus?.id ?? '',
    status: (route.status as RouteWizardDraft['status']) ?? 'DRAFT',
    color: route.color ?? '#FCB038',
    departureTime: route.departureTime ?? '06:30',
    arrivalTime: route.arrivalTime ?? '07:30',
    operatingDays: (route.operatingDays as number[]) ?? [1, 2, 3, 4, 5],
    notes: route.notes ?? '',
    distanceKm: route.distanceKm ?? undefined,
    etaMinutes: route.etaMinutes ?? undefined,
    pathGeoJson: route.pathGeoJson ?? null,
    schoolLat: route.schoolLat ?? undefined,
    schoolLng: route.schoolLng ?? undefined,
    schoolName: route.schoolName ?? undefined,
    stops:
      route.stops?.map((s) => ({
        id: s.id,
        name: s.name,
        sequence: s.sequence,
        kind: s.kind ?? 'INTERMEDIATE',
        address: s.address ?? undefined,
        plannedTime: s.plannedTime ?? undefined,
        latitude: s.latitude ?? undefined,
        longitude: s.longitude ?? undefined,
      })) ?? emptyDraft(code).stops,
  };
}

interface RouteWizardModalProps {
  open: boolean;
  initial?: RouteDetail | null;
  buses: Bus[];
  suggestedCode: string;
  onClose: () => void;
  onSave: (draft: RouteWizardDraft, activate: boolean) => Promise<void>;
}

export function RouteWizardModal({
  open,
  initial,
  buses,
  suggestedCode,
  onClose,
  onSave,
}: RouteWizardModalProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RouteWizardDraft>(() => emptyDraft(suggestedCode));
  const [path, setPath] = useState<LatLng[]>([]);
  const [routing, setRouting] = useState(false);
  const [placeQ, setPlaceQ] = useState('');
  const [places, setPlaces] = useState<{ displayName: string; lat: number; lng: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [mapMode, setMapMode] = useState<'origin' | 'stop' | 'destination' | 'school' | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(initial ? draftFromRoute(initial, suggestedCode) : emptyDraft(suggestedCode));
    setPath([]);
  }, [open, initial, suggestedCode]);

  const selectedBus = buses.find((b) => b.id === draft.primaryBusId);
  const learnerCap = selectedBus?.capacity ?? 0;

  const sortedStops = useMemo(
    () => [...draft.stops].sort((a, b) => a.sequence - b.sequence),
    [draft.stops]
  );

  const recalcPath = useCallback(async () => {
    setRouting(true);
    try {
      const pts = sortedStops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({ lat: s.latitude!, lng: s.longitude! }));
      const result = await fetchRoadPath(pts);
      if (result) {
        setPath(result.coordinates);
        setDraft((d) => ({
          ...d,
          distanceKm: Number(result.distanceKm.toFixed(2)),
          etaMinutes: result.durationMinutes,
          pathGeoJson: {
            type: 'LineString',
            coordinates: result.coordinates.map((c) => [c.lng, c.lat]),
          },
        }));
      }
    } finally {
      setRouting(false);
    }
  }, [sortedStops]);

  useEffect(() => {
    if (step !== 1 || !open) return;
    const t = setTimeout(() => void recalcPath(), 400);
    return () => clearTimeout(t);
  }, [step, open, recalcPath]);

  useEffect(() => {
    if (placeQ.trim().length < 3) {
      setPlaces([]);
      return;
    }
    const t = setTimeout(() => {
      void searchPlaces(placeQ).then(setPlaces);
    }, 400);
    return () => clearTimeout(t);
  }, [placeQ]);

  function addStop() {
    const seq = draft.stops.length + 1;
    setDraft({
      ...draft,
      stops: [
        ...draft.stops,
        { id: `stop-${Date.now()}`, name: `Stop ${seq - 1}`, sequence: seq, kind: 'INTERMEDIATE' },
      ],
    });
  }

  function removeStop(id: string) {
    const next = draft.stops.filter((s) => s.id !== id).map((s, i) => ({ ...s, sequence: i + 1 }));
    setDraft({ ...draft, stops: next });
  }

  function applyPlace(p: { displayName: string; lat: number; lng: number }) {
    if (!mapMode) return;
    setDraft((d) => {
      const stops = [...d.stops];
      if (mapMode === 'school') {
        return {
          ...d,
          schoolLat: p.lat,
          schoolLng: p.lng,
          schoolName: p.displayName.split(',')[0],
        };
      }
      const idx =
        mapMode === 'origin'
          ? stops.findIndex((s) => s.kind === 'ORIGIN')
          : mapMode === 'destination'
            ? stops.findIndex((s) => s.kind === 'DESTINATION' || s.kind === 'SCHOOL')
            : -1;
      if (idx >= 0) {
        stops[idx] = {
          ...stops[idx],
          name: p.displayName.split(',')[0] ?? stops[idx].name,
          address: p.displayName,
          latitude: p.lat,
          longitude: p.lng,
        };
      } else if (mapMode === 'stop') {
        stops.push({
          id: `stop-${Date.now()}`,
          name: p.displayName.split(',')[0] ?? 'Stop',
          address: p.displayName,
          sequence: stops.length + 1,
          kind: 'INTERMEDIATE',
          latitude: p.lat,
          longitude: p.lng,
        });
      }
      return { ...d, stops };
    });
    setPlaceQ('');
    setPlaces([]);
    setMapMode(null);
  }

  function onMapClick(p: LatLng) {
    if (!mapMode) return;
    applyPlace({ displayName: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`, lat: p.lat, lng: p.lng });
  }

  async function submit(activate: boolean) {
    setSaving(true);
    try {
      await onSave({ ...draft, status: activate ? 'ACTIVE' : draft.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT' }, activate);
      onClose();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  const canNext =
    step === 0
      ? draft.name.trim().length > 0
      : step === 1
        ? sortedStops.length >= 2 &&
          sortedStops.some((s) => s.latitude != null) &&
          sortedStops.some((s) => s.kind === 'DESTINATION' || s.kind === 'SCHOOL')
        : true;

  return (
    <TransportModal
      open={open}
      title={initial ? 'Edit route' : 'Add new route'}
      description={`Step ${step + 1} of 4 · ${STEPS[step]}`}
      wide={step !== 1}
      xl={step === 1 || step === 3}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {step > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => void submit(false)}
              >
                Save draft
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => void submit(true)}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                Save & activate
              </button>
            </>
          )}
        </>
      }
    >
      <div className="mb-4 flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-xl px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs ${
              i === step ? 'bg-navy text-primary' : i < step ? 'bg-primary/20 text-navy' : 'bg-slate-100 text-muted'
            }`}
          >
            {i + 1}. {label.split(' ')[0]}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-slate-50/60 p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy">Basic details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Route name *">
            <input className="input bg-white" placeholder="e.g. Kigali North Route" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Route code">
            <input className="input bg-white font-mono" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Direction">
            <select
              className="input bg-white"
              value={draft.serviceDirection}
              onChange={(e) =>
                setDraft({ ...draft, serviceDirection: e.target.value as RouteWizardDraft['serviceDirection'] })
              }
            >
              <option value="MORNING">Morning (home → school)</option>
              <option value="AFTERNOON">Afternoon (school → home)</option>
              <option value="BOTH">Both directions</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className="input bg-white"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as RouteWizardDraft['status'] })}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Assigned bus">
            <select
              className="input bg-white"
              value={draft.primaryBusId}
              onChange={(e) => setDraft({ ...draft, primaryBusId: e.target.value })}
            >
              <option value=""> -  Select bus  - </option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.plateNumber} ({b.capacity} seats)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Route color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-white p-1"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                aria-label="Pick route color"
              />
              <input
                className="input bg-white font-mono uppercase"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              />
            </div>
          </Field>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-slate-50/60 p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy">Schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Departure">
            <input
              type="time"
              className="input bg-white"
              value={draft.departureTime}
              onChange={(e) => setDraft({ ...draft, departureTime: e.target.value })}
            />
          </Field>
          <Field label="Expected arrival">
            <input
              type="time"
              className="input bg-white"
              value={draft.arrivalTime}
              onChange={(e) => setDraft({ ...draft, arrivalTime: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <span className="mb-2 block text-[11px] font-bold uppercase text-muted">Operating days</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = draft.operatingDays.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        operatingDays: on
                          ? draft.operatingDays.filter((x) => x !== d.v)
                          : [...draft.operatingDays, d.v],
                      })
                    }
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${on ? 'bg-navy text-primary' : 'border border-border bg-white text-muted'}`}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes / instructions">
              <textarea className="input min-h-[72px] bg-white" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
          </div>
          {selectedBus && !selectedBus.driver ? (
            <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Selected bus has no driver assigned yet. Assign a driver from Buses & Fleet.
            </p>
          ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <MapTool active={mapMode === 'origin'} onClick={() => setMapMode('origin')}>
                Set start
              </MapTool>
              <MapTool active={mapMode === 'stop'} onClick={() => setMapMode('stop')}>
                Add stop
              </MapTool>
              <MapTool active={mapMode === 'destination'} onClick={() => setMapMode('destination')}>
                Set destination
              </MapTool>
              <MapTool active={mapMode === 'school'} onClick={() => setMapMode('school')}>
                School marker
              </MapTool>
              <button type="button" className="btn-secondary text-xs" onClick={() => void recalcPath()} disabled={routing}>
                {routing ? <Loader2 size={14} className="animate-spin" /> : null}
                Draw road path
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-8 text-sm"
                placeholder="Search address or place…"
                value={placeQ}
                onChange={(e) => setPlaceQ(e.target.value)}
              />
              {places.length ? (
                <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
                  {places.map((p) => (
                    <li key={`${p.lat}-${p.lng}`}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                        onClick={() => applyPlace(p)}
                      >
                        {p.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <RouteMap
              heightClass="h-[260px] lg:h-[340px]"
              stops={sortedStops.map((s) => ({
                id: s.id ?? String(s.sequence),
                name: s.name,
                sequence: s.sequence,
                lat: s.latitude,
                lng: s.longitude,
                kind: s.kind,
              }))}
              path={path}
              routeColor={draft.color}
              clickToAdd={Boolean(mapMode)}
              onMapClick={onMapClick}
              school={
                draft.schoolLat != null && draft.schoolLng != null
                  ? { lat: draft.schoolLat, lng: draft.schoolLng }
                  : null
              }
            />
            <p className="text-[11px] text-muted">
              Road path uses OSRM routing (not straight lines). Distance{' '}
              <strong>{draft.distanceKm?.toFixed(1) ?? ''} km</strong> · ETA{' '}
              <strong>{draft.etaMinutes ?? ''} min</strong>
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase text-muted">Stop sequence</p>
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={addStop}>
                <Plus size={14} /> Stop
              </button>
            </div>
            <ol className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {sortedStops.map((s) => (
                <li key={s.id} className="flex gap-2 rounded-xl border border-border bg-white p-2">
                  <GripVertical size={16} className="mt-2 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-primary">
                        {s.sequence}
                      </span>
                      <input
                        className="input py-1.5 text-sm"
                        value={s.name}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            stops: draft.stops.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <input
                      className="input py-1.5 text-xs"
                      placeholder="Planned time"
                      type="time"
                      value={s.plannedTime ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          stops: draft.stops.map((x) =>
                            x.id === s.id ? { ...x, plannedTime: e.target.value } : x
                          ),
                        })
                      }
                    />
                    <p className="truncate text-[10px] text-muted">
                      {s.latitude != null ? `${s.latitude.toFixed(4)}, ${s.longitude?.toFixed(4)}` : 'No coordinates  -  search or click map'}
                    </p>
                  </div>
                  {sortedStops.length > 2 ? (
                    <button type="button" className="text-danger" aria-label="Remove" onClick={() => removeStop(s.id!)}>
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Set planned times per stop on the previous step. Learner assignments use the Transport Learners page; counts
            update when enrollments are linked to this route.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Bus capacity" value={learnerCap || ''} />
            <Stat label="Stops" value={sortedStops.length} />
            <Stat label="Enrolled (saved route)" value={initial?.learnerCount ?? 0} />
          </div>
          <ul className="space-y-2">
            {sortedStops.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span>
                  <MapPin size={14} className="mr-1 inline text-primary" />
                  {s.sequence}. {s.name}
                </span>
                <span className="text-muted">{s.plannedTime || draft.departureTime}</span>
              </li>
            ))}
          </ul>
          {learnerCap > 0 && (initial?.learnerCount ?? 0) > learnerCap ? (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              Enrolled learners exceed bus capacity. Adjust assignments or choose a larger bus.
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Review label="Name" value={draft.name} />
            <Review label="Code" value={draft.code} />
            <Review label="Direction" value={draft.serviceDirection} />
            <Review label="Bus" value={selectedBus?.code ?? ''} />
            <Review label="Schedule" value={`${draft.departureTime} → ${draft.arrivalTime}`} />
            <Review label="Distance / ETA" value={`${draft.distanceKm ?? ''} km · ${draft.etaMinutes ?? ''} min`} />
          </div>
          <RouteMap
            heightClass="h-[220px]"
            stops={sortedStops.map((s) => ({
              id: s.id ?? String(s.sequence),
              name: s.name,
              sequence: s.sequence,
              lat: s.latitude,
              lng: s.longitude,
            }))}
            path={path}
            routeColor={draft.color}
          />
        </div>
      ) : null}
    </TransportModal>
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

function MapTool({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${active ? 'bg-navy text-primary' : 'border border-border bg-white text-navy'}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/80 px-3 py-3">
      <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
      <p className="text-lg font-bold text-navy">{value}</p>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
      <p className="font-semibold text-navy">{value}</p>
    </div>
  );
}
