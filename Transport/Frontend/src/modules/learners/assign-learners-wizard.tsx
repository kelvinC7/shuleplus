'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, Loader2, MapPin, Search, Users, X } from 'lucide-react';
import {
  transportApi,
  type LearnerDirectoryRow,
  type Route,
  type RouteEnrollmentSummary,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

type ServiceDirection = 'BOTH' | 'MORNING_ONLY' | 'AFTERNOON_ONLY';

export type LearnerPlacement = { pickupStopId: string; dropoffStopId: string };

interface AssignLearnersWizardProps {
  open: boolean;
  routes: Route[];
  initialRouteId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const STEPS = ['Learners', 'Route', 'Destinations', 'Review'] as const;

export function AssignLearnersWizard({ open, routes, initialRouteId, onClose, onSaved }: AssignLearnersWizardProps) {
  const notify = useToast();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classOptions, setClassOptions] = useState<{ id: string; label: string }[]>([]);
  const [smLinked, setSmLinked] = useState(true);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [directory, setDirectory] = useState<LearnerDirectoryRow[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);
  const [selected, setSelected] = useState<Record<string, LearnerDirectoryRow>>({});
  const [moveFromOtherRoute, setMoveFromOtherRoute] = useState(false);
  const [routeId, setRouteId] = useState('');
  const [summary, setSummary] = useState<RouteEnrollmentSummary | null>(null);
  const [direction, setDirection] = useState<ServiceDirection>('BOTH');
  const [placements, setPlacements] = useState<Record<string, LearnerPlacement>>({});
  const [manageStopId, setManageStopId] = useState<string | null>(null);
  const [stopSearch, setStopSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(initialRouteId ? 1 : 0);
    setSelected({});
    setPlacements({});
    setRouteId(initialRouteId ?? '');
    setManageStopId(null);
  }, [open, initialRouteId]);

  const activeRoute = routes.find((r) => r.id === routeId);
  const stops = useMemo(
    () => [...(activeRoute?.stops ?? [])].sort((a, b) => a.sequence - b.sequence),
    [activeRoute?.stops]
  );
  const lastStopId = stops[stops.length - 1]?.id ?? '';
  const selectedList = useMemo(() => Object.values(selected), [selected]);

  const loadDirectory = useCallback(async () => {
    setLoadingDir(true);
    try {
      const { data } = await transportApi.learnersDirectory({
        q: search || undefined,
        classId: classFilter || undefined,
        assignmentStatus: assignmentFilter,
        limit: 500,
      });
      setDirectory(data.data ?? []);
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not load learners'));
    } finally {
      setLoadingDir(false);
    }
  }, [search, classFilter, assignmentFilter, notify]);

  useEffect(() => {
    if (!open) return;
    void transportApi.learnersClasses().then(({ data }) => {
      const payload = data.data;
      setSmLinked(payload?.studentManagementLinked ?? false);
      setClassOptions(payload?.classes ?? []);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void loadDirectory(), 300);
    return () => clearTimeout(t);
  }, [open, loadDirectory]);

  useEffect(() => {
    if (!routeId) {
      setSummary(null);
      return;
    }
    void transportApi.routeEnrollmentSummary(routeId).then(({ data }) => setSummary(data.data ?? null));
  }, [routeId]);

  useEffect(() => {
    if (!lastStopId) return;
    setPlacements((prev) => {
      const next = { ...prev };
      for (const code of Object.keys(selected)) {
        if (!next[code]) next[code] = { pickupStopId: '', dropoffStopId: lastStopId };
        else if (!next[code].dropoffStopId) next[code] = { ...next[code], dropoffStopId: lastStopId };
      }
      return next;
    });
  }, [selected, lastStopId]);

  function toggleLearner(row: LearnerDirectoryRow) {
    if (row.alreadyEnrolled && row.currentRoute && !moveFromOtherRoute) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[row.studentCode]) delete next[row.studentCode];
      else next[row.studentCode] = row;
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const row of directory) {
        if (row.alreadyEnrolled && row.currentRoute && !moveFromOtherRoute) continue;
        next[row.studentCode] = row;
      }
      return next;
    });
  }

  function learnersAtStop(stopId: string, mode: 'pickup' | 'dropoff') {
    return selectedList.filter((l) => {
      const p = placements[l.studentCode];
      if (!p) return false;
      return mode === 'pickup' ? p.pickupStopId === stopId : p.dropoffStopId === stopId;
    });
  }

  function toggleStopAssignment(stopId: string, row: LearnerDirectoryRow, field: 'pickup' | 'dropoff') {
    setPlacements((prev) => {
      const cur = prev[row.studentCode] ?? { pickupStopId: '', dropoffStopId: lastStopId };
      if (field === 'pickup') {
        const pickupStopId = cur.pickupStopId === stopId ? '' : stopId;
        return { ...prev, [row.studentCode]: { ...cur, pickupStopId } };
      }
      const dropoffStopId = cur.dropoffStopId === stopId ? lastStopId : stopId;
      return { ...prev, [row.studentCode]: { ...cur, dropoffStopId } };
    });
  }

  const missingPickup = selectedList.filter((l) => !placements[l.studentCode]?.pickupStopId);
  const needsMove = selectedList.filter((l) => l.currentRoute && l.currentRoute.id !== routeId);

  const canSave =
    routeId &&
    selectedList.length > 0 &&
    missingPickup.length === 0 &&
    (needsMove.length === 0 || moveFromOtherRoute);

  async function save() {
    if (!canSave || !activeRoute) return;
    setSaving(true);
    try {
      await transportApi.bulkAssignStudents({
        routeId,
        serviceDirection: direction,
        entries: selectedList.map((l) => ({
          studentId: l.id,
          studentCode: l.studentCode,
          studentName: l.fullName,
          className: l.className,
          guardianName: l.parentName,
          guardianPhone: l.parentPhone,
          pickupStopId: placements[l.studentCode].pickupStopId,
          dropoffStopId: placements[l.studentCode].dropoffStopId,
          moveFromOtherRoute: moveFromOtherRoute,
        })),
      });
      notify.success(`${selectedList.length} learner(s) assigned to ${activeRoute.name}`);
      onSaved();
      onClose();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  function nextStep() {
    if (step === 0 && selectedList.length === 0) {
      notify.warning('Select at least one learner');
      return;
    }
    if (step === 1) {
      if (!routeId) {
        notify.warning('Choose a route');
        return;
      }
      if (!stops.length) {
        notify.warning('This route has no stops  -  configure the route first');
        return;
      }
    }
    if (step === 2 && missingPickup.length) {
      notify.warning('Assign a pickup stop for every learner');
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  if (!open || !mounted) return null;

  const manageStop = stops.find((s) => s.id === manageStopId);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-50">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <button type="button" className="btn-secondary shrink-0 px-3 py-2 text-sm lg:hidden" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-[#000435]">Assign learners</h1>
          <p className="text-xs text-muted">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>
        <button type="button" className="hidden rounded-xl border border-border p-2 lg:block" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </header>

      <div className="border-b border-slate-200 bg-white px-2 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold sm:px-4 sm:text-sm ${
                i === step
                  ? 'border-[#FCB038] text-[#000435]'
                  : i < step
                    ? 'border-transparent text-[#000435]'
                    : 'border-transparent text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-6 lg:pb-6">
        {step === 0 ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="input w-full pl-9"
                  placeholder="Search learners…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="input w-full sm:min-w-[10rem] sm:max-w-xs"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                className="input w-full sm:w-40"
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as typeof assignmentFilter)}
              >
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Already assigned</option>
                <option value="all">All learners</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy">
                <Users size={16} className="mr-1 inline text-primary" />
                {selectedList.length} selected
              </p>
              <button type="button" className="btn-secondary text-xs" onClick={selectAllFiltered}>
                Select filtered
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={moveFromOtherRoute} onChange={(e) => setMoveFromOtherRoute(e.target.checked)} />
              Allow moving learners from another route
            </label>
            {!smLinked ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Student Management is not linked on the server. Set{' '}
                <code className="text-xs">STUDENT_MANAGEMENT_API_URL</code> on Transport backend (e.g.{' '}
                <code className="text-xs">http://localhost:4024/api</code>) and matching{' '}
                <code className="text-xs">SERVICE_API_KEY</code>.
              </p>
            ) : null}
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto rounded-2xl border border-border bg-white p-2">
              {loadingDir ? (
                <li className="flex items-center gap-2 p-4 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </li>
              ) : directory.length === 0 ? (
                <li className="p-4 text-sm text-muted">
                  {smLinked
                    ? 'No learners match this filter. Try another class or search by name or student code.'
                    : 'No learners found. Connect Student Management to load your school roster.'}
                </li>
              ) : (
                directory.map((row) => {
                  const blocked = Boolean(row.alreadyEnrolled && row.currentRoute && !moveFromOtherRoute);
                  const isOn = Boolean(selected[row.studentCode]);
                  return (
                    <li key={row.studentCode}>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => toggleLearner(row)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                          blocked ? 'cursor-not-allowed opacity-50' : isOn ? 'border-primary bg-primary/10' : 'border-border'
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${isOn ? 'border-navy bg-navy text-primary' : ''}`}>
                          {isOn ? <Check size={16} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-navy">{row.fullName}</span>
                          <span className="block text-xs text-muted">
                            {row.studentCode} · {row.className ?? ''}
                            {row.currentRoute ? ` · on ${row.currentRoute.name}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routes
              .filter((r) => r.status !== 'INACTIVE')
              .map((r) => {
                const bus = r.buses?.[0];
                const count = (r as { learnerCount?: number }).learnerCount ?? r._count?.assignments ?? 0;
                const cap = bus?.capacity ?? 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRouteId(r.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      routeId === r.id ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border bg-white hover:border-primary/40'
                    }`}
                  >
                    <p className="font-bold text-navy">{r.name}</p>
                    <p className="text-xs text-muted">
                      {r.code} · {r.direction || ''}
                    </p>
                    <p className="mt-2 text-xs">
                      {bus ? `${bus.code} · ${bus.plateNumber}` : 'No bus linked'} · {r.stops?.length ?? 0} stops
                    </p>
                    <p className="text-xs font-semibold text-navy">
                      {count} learners{cap ? ` / ${cap} capacity` : ''}
                    </p>
                  </button>
                );
              })}
          </div>
        ) : null}

        {step === 2 && activeRoute ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-[#000435] ring-1 ring-slate-200">
              <span className="font-semibold">{activeRoute.name}</span>
              <span className="text-muted"> · pick a pickup stop per learner</span>
            </p>
            {stops.map((stop, idx) => {
              const pickupN = learnersAtStop(stop.id, 'pickup').length;
              const dropN = learnersAtStop(stop.id, 'dropoff').length;
              return (
                <div key={stop.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Stop {idx + 1}</p>
                      <p className="font-bold text-[#000435]">{stop.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {pickupN} pickup · {dropN} drop-off
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary w-full shrink-0 text-sm sm:w-auto"
                      onClick={() => setManageStopId(stop.id)}
                    >
                      Manage learners
                    </button>
                  </div>
                </div>
              );
            })}
            {missingPickup.length ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {missingPickup.length} learner(s) still need a pickup stop.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#000435]">Review</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Route</dt>
                <dd className="font-semibold">{activeRoute?.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Learners</dt>
                <dd className="font-semibold">{selectedList.length}</dd>
              </div>
              <div>
                <dt className="text-muted">Bus capacity</dt>
                <dd>
                  {summary ? `${summary.assigned + selectedList.length} / ${summary.capacity || ''}` : ''}
                </dd>
              </div>
            </dl>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {stops.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-border/60 py-1">
                  <span>{s.name}</span>
                  <span className="font-semibold">{learnersAtStop(s.id, 'pickup').length} pickup</span>
                </li>
              ))}
            </ul>
            {needsMove.length && !moveFromOtherRoute ? (
              <p className="text-sm text-danger">Enable “move from another route” or remove conflicting learners.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-[10001] flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm sm:static sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:backdrop-blur-none">
        <button
          type="button"
          className="btn-secondary order-2 w-full sm:order-1 sm:w-auto"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="order-1 flex w-full flex-col gap-2 sm:order-2 sm:w-auto sm:flex-row">
          <button type="button" className="btn-secondary hidden sm:inline-flex" onClick={onClose}>
            Cancel
          </button>
          {step < 3 ? (
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={nextStep}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={!canSave || saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save assignments
            </button>
          )}
        </div>
      </footer>

      {manageStop ? (
        <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-navy/50 p-4 sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-bold uppercase text-muted">Pickup at stop</p>
              <p className="font-bold text-navy">{manageStop.name}</p>
              <input
                className="input mt-2 text-sm"
                placeholder="Filter selected learners…"
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
              />
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {selectedList
                .filter((l) => !stopSearch || l.fullName.toLowerCase().includes(stopSearch.toLowerCase()))
                .map((row) => {
                  const p = placements[row.studentCode];
                  const pickupOn = p?.pickupStopId === manageStop.id;
                  const dropOn = p?.dropoffStopId === manageStop.id;
                  return (
                    <li key={row.studentCode} className="rounded-xl border border-border p-2 mb-2">
                      <p className="text-sm font-semibold text-navy">{row.fullName}</p>
                      <p className="text-xs text-muted">{row.studentCode}</p>
                      <div className="mt-2 flex gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={pickupOn}
                            onChange={() => toggleStopAssignment(manageStop.id, row, 'pickup')}
                          />
                          Morning pickup
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={dropOn}
                            onChange={() => toggleStopAssignment(manageStop.id, row, 'dropoff')}
                          />
                          Drop-off here
                        </label>
                      </div>
                    </li>
                  );
                })}
            </ul>
            <div className="border-t border-border p-3">
              <button type="button" className="btn-primary w-full" onClick={() => setManageStopId(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
