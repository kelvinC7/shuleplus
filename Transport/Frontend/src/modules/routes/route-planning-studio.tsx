'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { ChevronLeft, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { RouteAppearancePanel } from '@/components/route-appearance-panel';
import { RwandaLocationPicker, type RwandaLocationValue } from '@/components/rwanda-location-picker';
import { fetchRoadPath, reverseGeocode, type LatLng, type RoadLeg } from '@/utils/routing';
import type { Bus, RouteDetail, RouteStopDraft } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

const RouteMap = dynamic(() => import('./route-map').then((m) => ({ default: m.RouteMap })), { ssr: false });

export type RoutePlanDraft = {
  id?: string;
  name: string;
  code: string;
  serviceDirection: 'MORNING' | 'AFTERNOON' | 'BOTH';
  primaryBusId: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  color: string;
  lineWidth: number;
  lineOpacity: number;
  departureTime: string;
  arrivalTime: string;
  operatingDays: number[];
  notes: string;
  distanceKm?: number;
  etaMinutes?: number;
  pathGeoJson?: { type: 'LineString'; coordinates: [number, number][] } | null;
  stops: RouteStopDraft[];
};

function emptyDraft(code: string): RoutePlanDraft {
  return {
    name: '',
    code,
    serviceDirection: 'MORNING',
    primaryBusId: '',
    status: 'DRAFT',
    color: '#2563EB',
    lineWidth: 7,
    lineOpacity: 1,
    departureTime: '06:30',
    arrivalTime: '07:30',
    operatingDays: [1, 2, 3, 4, 5],
    notes: '',
    stops: [
      { id: 'origin', name: 'Starting point', sequence: 1, kind: 'ORIGIN' },
      { id: 'dest', name: 'School / destination', sequence: 2, kind: 'DESTINATION' },
    ],
  };
}

function fromRoute(route: RouteDetail, code: string): RoutePlanDraft {
  return {
    id: route.id,
    name: route.name,
    code: route.code,
    serviceDirection: (route.serviceDirection as RoutePlanDraft['serviceDirection']) ?? 'BOTH',
    primaryBusId: route.primaryBusId ?? route.primaryBus?.id ?? '',
    status: (route.status as RoutePlanDraft['status']) ?? 'DRAFT',
    color: route.color ?? '#2563EB',
    lineWidth: route.lineWidth ?? 7,
    lineOpacity: route.lineOpacity ?? 1,
    departureTime: route.departureTime ?? '06:30',
    arrivalTime: route.arrivalTime ?? '07:30',
    operatingDays: (route.operatingDays as number[]) ?? [1, 2, 3, 4, 5],
    notes: route.notes ?? '',
    distanceKm: route.distanceKm ?? undefined,
    etaMinutes: route.etaMinutes ?? undefined,
    pathGeoJson: route.pathGeoJson ?? null,
    stops:
      route.stops?.map((s) => ({
        id: s.id,
        name: s.name,
        sequence: s.sequence,
        kind: s.kind ?? 'INTERMEDIATE',
        provinceId: s.provinceId ?? undefined,
        districtId: s.districtId ?? undefined,
        sectorId: s.sectorId ?? undefined,
        cellId: s.cellId ?? undefined,
        villageId: s.villageId ?? undefined,
        placeName: s.placeName ?? undefined,
        adminLabel: s.adminLabel ?? undefined,
        address: s.address ?? undefined,
        plannedTime: s.plannedTime ?? undefined,
        latitude: s.latitude ?? undefined,
        longitude: s.longitude ?? undefined,
      })) ?? emptyDraft(code).stops,
  };
}

function validateDraft(d: RoutePlanDraft): string | null {
  if (!d.name.trim()) return 'Enter a route name before saving.';
  const placed = d.stops.filter((s) => s.latitude != null && s.longitude != null);
  if (placed.length < 2) return 'Set start and end (school) on the map  -  each needs a location.';
  const origin = d.stops.some((s) => s.kind === 'ORIGIN' && s.latitude != null);
  const dest = d.stops.some(
    (s) => (s.kind === 'DESTINATION' || s.kind === 'SCHOOL') && s.latitude != null
  );
  if (!origin || !dest) return 'Mark both start and school/end stops on the map.';
  return null;
}

function stopKindLabel(kind?: string) {
  if (kind === 'ORIGIN') return 'Start';
  if (kind === 'PICKUP') return 'Student pickup';
  if (kind === 'DROPOFF') return 'Student drop-off';
  if (kind === 'DESTINATION' || kind === 'SCHOOL') return 'End / school';
  return 'Stop';
}

function stopLocation(s: RouteStopDraft): RwandaLocationValue {
  return {
    provinceId: s.provinceId,
    districtId: s.districtId,
    sectorId: s.sectorId,
    cellId: s.cellId,
    villageId: s.villageId,
    placeName: s.placeName,
    adminLabel: s.adminLabel,
    latitude: s.latitude,
    longitude: s.longitude,
  };
}

interface RoutePlanningStudioProps {
  open: boolean;
  initial?: RouteDetail | null;
  buses: Bus[];
  suggestedCode: string;
  onClose: () => void;
  onSave: (draft: RoutePlanDraft, activate: boolean) => Promise<void>;
}

export function RoutePlanningStudio({
  open,
  initial,
  buses,
  suggestedCode,
  onClose,
  onSave,
}: RoutePlanningStudioProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<RoutePlanDraft>(() => emptyDraft(suggestedCode));
  const [path, setPath] = useState<LatLng[]>([]);
  const [routing, setRouting] = useState(false);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [mapPickStopId, setMapPickStopId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [legByStopId, setLegByStopId] = useState<Record<string, RoadLeg>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setDraft(initial ? fromRoute(initial, suggestedCode) : emptyDraft(suggestedCode));
    setPath([]);
    setActiveStopId(null);
    setMapPickStopId(null);
    setMapFocus(null);
  }, [open, initial, suggestedCode]);

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
        const withCoords = sortedStops.filter((s) => s.latitude != null && s.longitude != null);
        const legs: Record<string, RoadLeg> = {};
        result.legs.forEach((leg, i) => {
          const stop = withCoords[i + 1];
          if (stop?.id) legs[stop.id] = leg;
        });
        setLegByStopId(legs);
        setDraft((d) => ({
          ...d,
          distanceKm: result.distanceKm,
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
    if (!open) return;
    const t = setTimeout(() => void recalcPath(), 500);
    return () => clearTimeout(t);
  }, [open, recalcPath]);

  function updateStop(id: string, patch: Partial<RouteStopDraft>) {
    setDraft((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    if (patch.latitude != null && patch.longitude != null && Number.isFinite(patch.latitude) && Number.isFinite(patch.longitude)) {
      setMapFocus({ lat: patch.latitude, lng: patch.longitude, zoom: 16, key: Date.now() });
    }
  }

  async function applyCoords(id: string, lat: number, lng: number) {
    const geo = await reverseGeocode(lat, lng);
    updateStop(id, {
      latitude: lat,
      longitude: lng,
      ...(geo
        ? {
            placeName: geo.displayName,
            adminLabel: geo.displayName,
            name:
              draft.stops.find((s) => s.id === id)?.name?.includes('point') ||
              draft.stops.find((s) => s.id === id)?.name?.includes('Stop')
                ? geo.shortName
                : draft.stops.find((s) => s.id === id)?.name,
          }
        : {}),
    });
  }

  function onMapClick(p: LatLng) {
    const targetId = mapPickStopId ?? activeStopId;
    if (!targetId) return;
    void applyCoords(targetId, p.lat, p.lng);
    setMapPickStopId(null);
  }

  function onStopDrag(id: string, lat: number, lng: number) {
    void applyCoords(id, lat, lng);
  }

  function addStop(kind: 'PICKUP' | 'DROPOFF' | 'INTERMEDIATE' = 'PICKUP') {
    const seq = draft.stops.length + 1;
    const id = `stop-${Date.now()}`;
    const name =
      kind === 'PICKUP' ? `Pickup zone ${seq - 1}` : kind === 'DROPOFF' ? `Drop-off zone ${seq - 1}` : `Stop ${seq - 1}`;
    setDraft((d) => ({
      ...d,
      stops: [...d.stops.filter((s) => s.kind !== 'DESTINATION' && s.kind !== 'SCHOOL'), { id, name, sequence: seq, kind }, ...d.stops.filter((s) => s.kind === 'DESTINATION' || s.kind === 'SCHOOL')].map(
        (s, i) => ({ ...s, sequence: i + 1 })
      ),
    }));
    setActiveStopId(id);
    setMapPickStopId(id);
  }

  function setStartOnMap() {
    const origin = draft.stops.find((s) => s.kind === 'ORIGIN');
    if (origin?.id) {
      setActiveStopId(origin.id);
      setMapPickStopId(origin.id);
    }
  }

  function setEndOnMap() {
    const end = draft.stops.find((s) => s.kind === 'DESTINATION' || s.kind === 'SCHOOL');
    if (end?.id) {
      setActiveStopId(end.id);
      setMapPickStopId(end.id);
    }
  }

  async function save(activate: boolean) {
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      toast.warning(validation);
      return;
    }
    setFormError(null);
    setSaving(true);
    const loadingId = toast.loading(activate ? 'Activating route…' : 'Saving draft…');
    try {
      await onSave({ ...draft, status: activate ? 'ACTIVE' : draft.status, etaMinutes: undefined }, activate);
      toast.dismiss(loadingId);
      onClose();
    } catch (err) {
      toast.dismiss(loadingId);
      const msg = getApiErrorMessage(err, 'Save failed');
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col overflow-hidden bg-slate-50">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <button type="button" className="btn-secondary shrink-0 px-3 py-2 text-sm lg:hidden" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-[#000435]">{initial ? 'Edit route' : 'New route'}</h1>
          <p className="truncate text-xs text-muted">
            {initial ? `${initial.code} · update path & stops` : `${draft.code} · plan on map below`}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={() => void save(false)}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save draft
          </button>
          <button type="button" className="btn-primary text-sm" disabled={saving} onClick={() => void save(true)}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Activate
          </button>
        </div>
        <button type="button" className="hidden rounded-xl border border-border p-2 lg:block" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </header>

      {formError ? (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm font-medium text-danger sm:px-6" role="alert">
          {formError}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28 lg:flex lg:flex-row lg:overflow-hidden lg:pb-0">
        <aside className="w-full border-b border-slate-200 bg-white lg:min-h-0 lg:w-[min(420px,40%)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="space-y-4 p-4 sm:p-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Route name *</span>
                <input
                  className={`input ${!draft.name.trim() && formError ? 'border-danger ring-1 ring-danger/40' : ''}`}
                  value={draft.name}
                  placeholder="e.g. Morning Kicukiro → Sainte Famille"
                  onChange={(e) => {
                    setDraft({ ...draft, name: e.target.value });
                    if (formError) setFormError(null);
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Code</span>
                <input className="input font-mono" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Bus</span>
                <select className="input" value={draft.primaryBusId} onChange={(e) => setDraft({ ...draft, primaryBusId: e.target.value })}>
                  <option value=""> - </option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.plateNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Departure</span>
                <input
                  type="time"
                  className="input"
                  value={draft.departureTime}
                  onChange={(e) => setDraft({ ...draft, departureTime: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Arrival (planned)</span>
                <input
                  type="time"
                  className="input"
                  value={draft.arrivalTime}
                  onChange={(e) => setDraft({ ...draft, arrivalTime: e.target.value })}
                />
              </label>
            </section>

            <RouteAppearancePanel
              color={draft.color}
              lineWidth={draft.lineWidth}
              lineOpacity={draft.lineOpacity}
              onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
            />

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase text-navy">Route path & student stops</h2>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button type="button" className="btn-secondary min-h-[40px] px-2 py-2 text-[10px] font-bold uppercase sm:py-1" onClick={setStartOnMap}>
                  Start on map
                </button>
                <button type="button" className="btn-secondary min-h-[40px] px-2 py-2 text-[10px] font-bold uppercase text-blue-700 sm:py-1" onClick={() => addStop('PICKUP')}>
                  <Plus size={12} /> Pickup
                </button>
                <button type="button" className="btn-secondary min-h-[40px] px-2 py-2 text-[10px] font-bold uppercase text-orange-700 sm:py-1" onClick={() => addStop('DROPOFF')}>
                  <Plus size={12} /> Drop-off
                </button>
                <button type="button" className="btn-secondary min-h-[40px] px-2 py-2 text-[10px] font-bold uppercase text-emerald-700 sm:py-1" onClick={setEndOnMap}>
                  School end
                </button>
              </div>
              <ol className="space-y-3">
                {sortedStops.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded-2xl border p-3 ${activeStopId === s.id ? 'border-primary bg-primary/5' : 'border-border bg-slate-50/50'}`}
                  >
                    <button type="button" className="mb-2 w-full text-left" onClick={() => setActiveStopId(s.id ?? null)}>
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-primary">
                        {s.sequence}
                      </span>
                      <span className="font-semibold text-navy">{stopKindLabel(s.kind)}</span>
                    </button>
                    {s.kind !== 'ORIGIN' && s.kind !== 'DESTINATION' && s.kind !== 'SCHOOL' ? (
                      <select
                        className="input mb-2 bg-white text-xs"
                        value={s.kind ?? 'PICKUP'}
                        onChange={(e) => updateStop(s.id!, { kind: e.target.value })}
                      >
                        <option value="PICKUP">Pickup  -  collect students</option>
                        <option value="DROPOFF">Drop-off  -  distribute students</option>
                        <option value="INTERMEDIATE">Pass-through stop</option>
                      </select>
                    ) : null}
                    <input
                      className="input mb-2 bg-white text-sm"
                      value={s.name}
                      onChange={(e) => updateStop(s.id!, { name: e.target.value })}
                    />
                    {legByStopId[s.id!] ? (
                      <p className="mb-2 rounded-lg bg-navy/5 px-2 py-1 text-[11px] font-semibold text-navy">
                        From previous stop: {legByStopId[s.id!].distanceKm} km by road
                      </p>
                    ) : null}
                    <RwandaLocationPicker
                      label="Locate this stop"
                      value={stopLocation(s)}
                      mapPickActive={mapPickStopId === s.id}
                      onRequestMapPick={() => {
                        setActiveStopId(s.id ?? null);
                        setMapPickStopId(s.id ?? null);
                      }}
                      onChange={(loc) =>
                        updateStop(s.id!, {
                          provinceId: loc.provinceId,
                          districtId: loc.districtId,
                          sectorId: loc.sectorId,
                          cellId: loc.cellId,
                          villageId: loc.villageId,
                          placeName: loc.placeName,
                          adminLabel: loc.adminLabel,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        })
                      }
                    />
                    {sortedStops.length > 2 && s.kind !== 'ORIGIN' && s.kind !== 'DESTINATION' && s.kind !== 'SCHOOL' ? (
                      <button
                        type="button"
                        className="mt-2 text-xs text-danger"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            stops: d.stops.filter((x) => x.id !== s.id).map((x, i) => ({ ...x, sequence: i + 1 })),
                          }))
                        }
                      >
                        <Trash2 size={12} className="inline" /> Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </aside>

        <main className="flex shrink-0 flex-col p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Road distance{' '}
              <strong className="text-navy">{draft.distanceKm != null ? draft.distanceKm.toFixed(1) : 'n/a'} km</strong>
            </p>
            <button type="button" className="btn-secondary text-xs" disabled={routing} onClick={() => void recalcPath()}>
              {routing ? <Loader2 size={14} className="animate-spin" /> : null}
              Recalculate
            </button>
          </div>
          <RouteMap
            heightClass="h-[min(42vh,320px)] shrink-0 rounded-2xl ring-1 ring-slate-200 lg:min-h-0 lg:h-full lg:flex-1"
            stops={sortedStops.map((s) => ({
              id: s.id ?? String(s.sequence),
              name: s.name,
              sequence: s.sequence,
              lat: s.latitude,
              lng: s.longitude,
              kind: s.kind,
              subtitle: s.placeName ?? s.adminLabel ?? undefined,
            }))}
            path={path}
            routeColor={draft.color}
            lineWeight={draft.lineWidth}
            lineOpacity={draft.lineOpacity}
            clickToAdd={Boolean(mapPickStopId)}
            onMapClick={onMapClick}
            draggableStops
            onStopDrag={onStopDrag}
            focus={mapFocus}
          />
          <p className="mt-2 hidden text-[10px] text-muted lg:block">
            Select a stop to pick on the map, drag markers, or enter exact GPS coordinates in “Coordinates” — the map will automatically fly to the pinned location. Road path and distances are recalculated via OSRM.
          </p>
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-[10001] flex flex-col gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          className="btn-secondary order-2 w-full lg:order-1 lg:w-auto"
          disabled={saving}
          onClick={() => void save(false)}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save draft
        </button>
        <button
          type="button"
          className="btn-primary order-1 w-full lg:order-2 lg:w-auto"
          disabled={saving}
          onClick={() => void save(true)}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Activate route
        </button>
      </footer>
    </div>,
    document.body
  );
}
