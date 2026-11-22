'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Bus,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type AttendanceEventDetailFull } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatDate, formatTime } from '@/utils/format';

function eventLabel(type: string) {
  const map: Record<string, string> = {
    BOARDING_TO_SCHOOL: 'Morning boarding',
    ARRIVED_AT_SCHOOL: 'Arrived at school',
    BOARDING_TO_HOME: 'Return boarding',
    DROPPED_OFF_HOME: 'Home drop-off',
    ROUTE_PICKUP_STARTED: 'Route pickup started',
    ROUTE_HOME_STARTED: 'Home route started',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

function channelLabel(channel: string) {
  if (channel === 'APP') return 'Parent portal (in-app)';
  if (channel === 'SMS') return 'SMS';
  if (channel === 'PUSH') return 'Push';
  if (channel === 'EMAIL') return 'Email';
  return channel;
}

function notifyStatusTone(status: string): string {
  if (status === 'DELIVERED' || status === 'SENT') return 'text-emerald-700';
  if (status === 'QUEUED' || status === 'SENDING' || status === 'RETRYING') return 'text-amber-700';
  return 'text-red-700';
}

interface AttendanceEventDetailDrawerProps {
  eventId: string | null;
  onClose: () => void;
}

export function AttendanceEventDetailDrawer({ eventId, onClose }: AttendanceEventDetailDrawerProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<AttendanceEventDetailFull | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!eventId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    void transportApi
      .attendanceEventDetail(eventId)
      .then(({ data }) => setDetail(data.data ?? null))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Could not load event')))
      .finally(() => setLoading(false));
  }, [eventId, toast]);

  useEffect(() => {
    if (!eventId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [eventId, onClose]);

  if (!eventId || !mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-[9998] bg-[#000435]/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[min(100%,520px)] flex-col border-l border-slate-200 bg-white shadow-2xl animate-scale-in">
        <header className="border-b border-slate-100 bg-gradient-to-br from-[#000435] to-[#0a1454] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">Attendance record</p>
              {loading || !detail ? (
                <h2 className="mt-1 text-lg font-semibold">Loading…</h2>
              ) : (
                <>
                  <h2 className="mt-1 truncate text-xl font-bold">{detail.studentName}</h2>
                  <p className="text-sm text-white/80">
                    {detail.studentCode ?? ''}
                    {detail.className ? ` · ${detail.className}` : ''}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl border border-white/20 p-2 text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          {detail ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#FCB038] px-2.5 py-0.5 text-xs font-semibold text-[#000435]">
                {eventLabel(detail.eventType)}
              </span>
              <StatusBadge status={detail.outcome === 'OK' ? 'PRESENT' : detail.outcome} />
              <StatusBadge status={detail.attendanceMethod} />
            </div>
          ) : null}
        </header>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000435]">
                <Clock size={16} className="text-[#FCB038]" /> Event details
              </h3>
              <dl className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
                <Row label="Recorded at" value={`${formatDate(detail.scannedAt)} ${formatTime(detail.scannedAt)}`} />
                <Row label="Event ID" value={detail.id} mono />
                <Row label="Sync" value={detail.syncStatus} />
                {detail.stopName ? (
                  <Row label="Stop" value={detail.stopName} icon={<MapPin size={14} />} />
                ) : null}
                {detail.recordedByUserId ? (
                  <Row label="Recorded by (staff)" value={detail.recordedByUserId} mono />
                ) : null}
                {detail.deviceCode ? <Row label="Device" value={detail.deviceCode} /> : null}
                {detail.cardNumber ? <Row label="Card" value={detail.cardNumber} mono /> : null}
              </dl>
            </section>

            {detail.trip ? (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000435]">
                  <Bus size={16} className="text-[#FCB038]" /> Trip & route
                </h3>
                <dl className="grid gap-2 rounded-2xl border border-slate-100 p-4 text-sm">
                  <Row label="Route" value={detail.routeName ?? detail.trip.route?.name ?? ''} />
                  <Row label="Bus" value={`${detail.busCode ?? detail.trip.bus.code} · ${detail.trip.bus.plateNumber}`} />
                  <Row label="Journey" value={detail.trip.direction.replace(/_/g, ' ')} />
                  <Row label="Trip date" value={formatDate(detail.trip.tripDate)} />
                  <Row label="Trip status" value={detail.trip.status} />
                  {detail.trip.startedAt ? (
                    <Row
                      label="Route started"
                      value={`${formatDate(detail.trip.startedAt)} ${formatTime(detail.trip.startedAt)}`}
                    />
                  ) : null}
                  {detail.driverName || detail.trip.driver?.name ? (
                    <Row label="Driver" value={detail.driverName ?? detail.trip.driver?.name ?? ''} />
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000435]">
                <Bell size={16} className="text-[#FCB038]" /> Parent notifications
              </h3>
              {detail.notifications.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-muted">
                  No notifications were queued for this event.
                </p>
              ) : (
                <ul className="space-y-3">
                  {detail.notifications.map((n) => (
                    <li
                      key={n.id}
                      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_-4px_rgba(0,4,53,0.08)]"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-50 bg-slate-50/60 px-4 py-2.5">
                        <span className="flex items-center gap-2 text-sm font-medium text-[#000435]">
                          {n.channel === 'SMS' ? (
                            <MessageSquare size={16} className="text-[#FCB038]" />
                          ) : (
                            <Smartphone size={16} className="text-[#FCB038]" />
                          )}
                          {channelLabel(n.channel)}
                        </span>
                        <span className={`text-xs font-bold uppercase ${notifyStatusTone(n.status)}`}>
                          {n.status}
                        </span>
                      </div>
                      <div className="space-y-2 px-4 py-3 text-sm">
                        <p className="font-medium text-[#000435]">{n.title}</p>
                        <p className="whitespace-pre-wrap text-muted leading-relaxed">{n.message}</p>
                        {n.parent ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted">
                            <User size={12} />
                            {n.parent.name}
                            {n.parent.phone ? ` · ${n.parent.phone}` : ''}
                            {n.channel === 'SMS' && !n.parent.notifySms ? (
                              <span className="text-amber-700"> (SMS disabled in preferences)</span>
                            ) : null}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-700">No transport parent contact linked</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-50 pt-2 text-xs text-muted">
                          {n.sentAt ? (
                            <span>
                              Sent {formatDate(n.sentAt)} {formatTime(n.sentAt)}
                            </span>
                          ) : (
                            <span>Not sent yet</span>
                          )}
                          {n.retryCount ? <span>Retries: {n.retryCount}</span> : null}
                        </div>
                        {n.providerRef ? (
                          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                            <span className="font-semibold">Why it failed / note: </span>
                            {n.providerRef}
                          </div>
                        ) : null}
                        {n.status === 'DELIVERED' || n.status === 'SENT' ? (
                          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            {n.channel === 'SMS'
                              ? 'SMS accepted by the messaging service. Final handset delivery depends on the provider.'
                              : 'Delivered to the parent portal in-app inbox.'}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </>,
    document.body
  );
}

function Row({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex gap-2 sm:grid sm:grid-cols-[120px_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-medium text-[#000435] ${mono ? 'break-all font-mono text-xs' : ''}`}>
        {icon ? <span className="inline-flex items-center gap-1">{icon}{value}</span> : value}
      </dd>
    </div>
  );
}
