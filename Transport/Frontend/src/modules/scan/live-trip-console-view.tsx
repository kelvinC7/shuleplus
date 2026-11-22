'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  ScanLine,
  Search,
  Square,
  User,
  XCircle,
} from 'lucide-react';
import { QrScannerPanel } from '@/components/qr-scanner-panel';
import { StatusBadge } from '@/components/status-badge';
import {
  transportApi,
  type LiveOpsData,
  type TapResult,
  type Trip,
  type BoardingEvent,
} from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

function tripHeading(trip: Trip) {
  const dir =
    trip.direction === 'TO_SCHOOL'
      ? 'Morning pickup'
      : trip.direction === 'TO_HOME'
        ? 'Afternoon drop-off'
        : trip.direction;
  return `${trip.bus.code} · ${trip.route?.name ?? 'Route'}  -  ${dir}`;
}

function eventLabel(ev: BoardingEvent) {
  if (ev.type === 'BOARDING') return 'Boarded';
  if (ev.type === 'EXIT') return 'Exit / arrival';
  return ev.type;
}

export function LiveTripConsoleView() {
  const toast = useToast();
  const manualRef = useRef<HTMLInputElement>(null);
  const [ops, setOps] = useState<LiveOpsData | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(true);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<TapResult | null>(null);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);
  const [recent, setRecent] = useState<BoardingEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.liveOperations();
      setOps(data.data);
      const trips = data.data.todayTrips ?? data.data.liveTrips ?? [];
      setActiveTripId((prev) => {
        if (prev && trips.some((t) => t.id === prev)) return prev;
        const live = trips.find((t) => t.status === 'LIVE' || t.status === 'BOARDING');
        return live?.id ?? trips[0]?.id ?? null;
      });
      setRecent(data.data.recentEvents?.slice(0, 8) ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load trip console'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 6000);
    return () => clearInterval(t);
  }, [load]);

  const activeTrip =
    ops?.todayTrips?.find((t) => t.id === activeTripId) ??
    ops?.liveTrips?.find((t) => t.id === activeTripId) ??
    null;

  async function processCard(cardNumber: string) {
    if (!cardNumber.trim()) return;
    if (!activeTrip) {
      toast.error('Select a trip before scanning');
      return;
    }
    setBusy(true);
    setFlash(null);
    try {
      const { data } = await transportApi.tap({
        cardNumber: cardNumber.trim(),
        busCode: activeTrip.bus.code,
      });
      setLast(data.data);
      setFlash('ok');
      toast.success(data.data.parentMessage ?? `${data.data.student.name} recorded`);
      setManual('');
      await load();
    } catch (err) {
      setFlash('err');
      setLast(null);
      toast.error(getApiErrorMessage(err, 'Scan failed'));
    } finally {
      setBusy(false);
    }
  }

  async function startTrip(force?: boolean) {
    if (!activeTrip) return;
    try {
      await transportApi.startTrip(activeTrip.id, force);
      toast.success('Trip started');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cannot start trip'));
    }
  }

  async function completeTrip() {
    if (!activeTrip) return;
    if (!window.confirm('End this trip and run passenger reconciliation?')) return;
    try {
      await transportApi.completeTrip(activeTrip.id);
      toast.success('Trip completed');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cannot complete trip'));
    }
  }

  const boarded = activeTrip?.boardedCount ?? 0;
  const expected = activeTrip?.expectedCount ?? 0;
  const assigned = activeTrip?.passengers?.length ?? expected;
  const awaiting = Math.max(0, expected - boarded);

  return (
    <div className="live-console mx-auto max-w-2xl space-y-4 pb-24 lg:max-w-4xl lg:pb-8">
      <div className="rounded-2xl bg-navy p-4 text-white shadow-lg sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live trip console</p>
        <h1 className="mt-1 text-lg font-extrabold leading-snug sm:text-xl">
          {activeTrip ? tripHeading(activeTrip) : 'No trip selected'}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeTrip ? <StatusBadge status={activeTrip.status} /> : null}
          <span className="text-xs text-white/60">
            {activeTrip?.driver?.name ? `Driver: ${activeTrip.driver.name}` : 'Assign driver on trip'}
            {activeTrip?.attendant?.name ? ` · ${activeTrip.attendant.name}` : ''}
          </span>
        </div>
      </div>

      {ops?.todayTrips && ops.todayTrips.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Active trip</span>
          <select
            className="input"
            value={activeTripId ?? ''}
            onChange={(e) => setActiveTripId(e.target.value || null)}
          >
            {ops.todayTrips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.bus.code} · {t.direction} · {t.status}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center sm:p-4">
          <p className="text-2xl font-extrabold text-emerald-900 sm:text-3xl">{boarded}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Boarded</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center sm:p-4">
          <p className="text-2xl font-extrabold text-amber-900 sm:text-3xl">{awaiting}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Awaiting</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center sm:p-4">
          <p className="text-2xl font-extrabold text-navy sm:text-3xl">{assigned}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Assigned</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeTrip && activeTrip.status !== 'LIVE' && activeTrip.status !== 'COMPLETED' ? (
          <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => void startTrip(false)}>
            <Play size={16} /> Start trip
          </button>
        ) : null}
        {activeTrip?.status === 'LIVE' ? (
          <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={() => void completeTrip()}>
            <Square size={16} /> End trip
          </button>
        ) : null}
        <button
          type="button"
          className="btn-secondary flex-1 sm:flex-none"
          onClick={() => setScanOpen((o) => !o)}
        >
          {scanOpen ? <Pause size={16} /> : <ScanLine size={16} />}
          {scanOpen ? 'Hide scanner' : 'Scan card'}
        </button>
      </div>

      {scanOpen ? (
        <div
          className={`hr-card overflow-hidden p-3 sm:p-4 ${
            flash === 'ok' ? 'ring-2 ring-emerald-400' : flash === 'err' ? 'ring-2 ring-rose-400' : ''
          }`}
        >
          <QrScannerPanel
            active={scanOpen}
            onScan={(code) => void processCard(code)}
            onManualFocus={() => manualRef.current?.focus()}
          />
        </div>
      ) : null}

      <form
        className="hr-card flex gap-2 p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void processCard(manual);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={manualRef}
            className="input pl-9 font-mono text-sm"
            placeholder="ShuleCode / RFID / QR payload"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0 px-4" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record'}
        </button>
      </form>

      {last ? (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            flash === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
          }`}
        >
          {flash === 'ok' ? (
            <CheckCircle2 className="shrink-0 text-emerald-600" size={28} />
          ) : (
            <XCircle className="shrink-0 text-rose-600" size={28} />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-navy">{last.student.name}</p>
            <p className="text-sm text-muted">
              {last.student.className ?? ''} · {last.bus.code} · {last.type}
            </p>
            <p className="mt-1 text-xs text-muted">{formatTime(last.time)} · Parent notification queued</p>
          </div>
          <User className="shrink-0 text-navy/30" size={32} />
        </div>
      ) : null}

      <div className="hr-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Recent scan activity</h2>
          <button type="button" className="text-xs font-semibold text-primary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No scans yet. Start the trip and scan learner cards.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy">{ev.studentName}</p>
                  <p className="truncate text-xs text-muted">
                    {eventLabel(ev)} · {ev.busCode ?? ''} · {formatTime(ev.scannedAt)}
                  </p>
                </div>
                <StatusBadge status={ev.outcome === 'OK' ? 'ACTIVE' : 'WARNING'} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          Each learner must be scanned individually. Bulk “mark all boarded” is not allowed  -  use authorized
          reconciliation on missing learners only.
        </p>
      </div>
    </div>
  );
}
