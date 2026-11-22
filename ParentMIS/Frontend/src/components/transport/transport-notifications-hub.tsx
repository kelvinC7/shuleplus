'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  Bus,
  CheckCheck,
  MessageSquare,
  Radio,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useFetch } from '@/hooks/use-fetch';
import { useNotificationStream, type LiveNotification } from '@/hooks/use-notification-stream';
import { useTransportWebPush } from '@/hooks/use-transport-web-push';
import { useTransportLocale } from '@/contexts/transport-locale-context';
import { useAuth } from '@/contexts/auth-context';
import { timeAgo } from '@/lib/format';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/shared/empty-state';

export type TransportNotificationRow = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  smsStatus: string | null;
  pushStatus: string | null;
  studentName?: string | null;
  studentId?: string;
  link?: string | null;
};

type Filter = 'all' | 'unread';

function deliveryTone(status: string | null | undefined) {
  const s = (status ?? 'QUEUED').toUpperCase();
  if (s === 'SENT' || s === 'DELIVERED') return 'ok' as const;
  if (s === 'FAILED') return 'bad' as const;
  return 'muted' as const;
}

function DeliveryPill({ label, tone }: { label: string; tone: 'ok' | 'bad' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        tone === 'ok' && 'bg-emerald-500/15 text-emerald-800',
        tone === 'bad' && 'bg-rose-500/15 text-rose-800',
        tone === 'muted' && 'bg-slate-500/10 text-slate-600'
      )}
    >
      {label}
    </span>
  );
}

export function TransportNotificationsHub() {
  const { t } = useTransportLocale();
  const { linkedStudents, activeStudentId } = useAuth();
  const { data, loading, error, reload } = useFetch<TransportNotificationRow[]>('/transport/notifications?scope=all');
  const [items, setItems] = useState<TransportNotificationRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [childFilter, setChildFilter] = useState<string>('all');
  const { pushActive, permission, busy, enablePush, prefs, updateTransportPrefs } = useTransportWebPush();

  const list = items ?? data ?? [];

  const onLive = useCallback(
    (n: LiveNotification & { sourceModule?: string }) => {
      if (n.sourceModule && n.sourceModule !== 'transport') return;
      setItems((prev) => {
        const base = prev ?? data ?? [];
        if (base.some((x) => x.id === n.id)) return base;
        const row: TransportNotificationRow = {
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          isRead: n.isRead,
          smsStatus: null,
          pushStatus: 'DELIVERED',
          link: n.link,
        };
        return [row, ...base];
      });
    },
    [data]
  );

  useNotificationStream(onLive);

  const filtered = useMemo(() => {
    let rows = list;
    if (filter === 'unread') rows = rows.filter((n) => !n.isRead);
    if (childFilter !== 'all') {
      rows = rows.filter((n) => n.studentId === childFilter);
    }
    return rows;
  }, [list, filter, childFilter, linkedStudents]);

  const unread = list.filter((n) => !n.isRead).length;

  async function markRead(id: string, link?: string | null) {
    await api.put(`/notifications/${id}/read`).catch(() => undefined);
    setItems((prev) => (prev ?? list).map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (link?.startsWith('/')) window.location.href = link;
  }

  async function markAllRead() {
    await api.put('/transport/notifications/read-all');
    setItems((prev) => (prev ?? list).map((n) => ({ ...n, isRead: true })));
    void reload();
  }

  return (
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-[#0a1147] to-navy p-4 text-white shadow-lg sm:p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-4" />
              Live bus alerts
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{unread}</p>
            <p className="text-sm text-white/70">Unread across all children · in-app + optional web push</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/20 sm:flex-none"
              >
                <CheckCheck className="size-4 text-primary" />
                Mark all read
              </button>
            ) : null}
            <Link
              href="/transport/settings"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold sm:flex-none"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      {!pushActive && permission !== 'unsupported' ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
              <Radio className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-navy">Web push for bus events</p>
              <p className="text-sm text-muted">Get boarding & arrival alerts when this tab is closed.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void enablePush()}
            className="btn-primary min-h-11 w-full sm:w-auto"
          >
            {busy ? 'Enabling…' : 'Enable push'}
          </button>
        </div>
      ) : pushActive ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <BellRing className="size-4 shrink-0" />
          Web push enabled on this device
        </div>
      ) : null}

      {prefs ? (
        <div className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:grid-cols-3 sm:gap-3 sm:p-4">
          {(
            [
              { key: 'inApp' as const, label: t('notifications.inApp'), icon: MessageSquare },
              { key: 'push' as const, label: t('notifications.push'), icon: Bell },
              { key: 'sms' as const, label: t('notifications.sms'), icon: Smartphone },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <label
              key={key}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5 sm:flex-col sm:items-start sm:py-3"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Icon className="size-4 text-primary" />
                {label}
              </span>
              <Switch
                checked={prefs.transportNotifications[key]}
                disabled={busy}
                onCheckedChange={(checked) => void updateTransportPrefs({ [key]: checked })}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-slate-100 bg-white p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold capitalize sm:flex-none',
                filter === f ? 'bg-navy text-primary' : 'text-muted'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        {linkedStudents.length > 1 ? (
          <select
            className="input min-h-11 w-full sm:max-w-[220px]"
            value={childFilter}
            onChange={(e) => setChildFilter(e.target.value)}
          >
            <option value="all">All children</option>
            {linkedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading && !list.length ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title="Could not load alerts" description={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Bus className="text-primary" />}
              title={t('notifications.none')}
              description="Boarding, arrival, and delay messages from Smart Transport appear here in real time."
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const smsTone = deliveryTone(n.smsStatus);
              const pushTone = deliveryTone(n.pushStatus);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(n.id, n.link)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-4 text-left transition active:bg-slate-50 sm:gap-4 sm:px-5',
                      !n.isRead ? 'bg-sky-50/50' : 'hover:bg-slate-50/80'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                        !n.isRead ? 'bg-navy text-primary' : 'bg-slate-100 text-navy'
                      )}
                    >
                      <Bus className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('text-sm leading-snug', !n.isRead ? 'font-bold text-navy' : 'font-medium text-navy/85')}>
                          {n.title}
                        </p>
                        {!n.isRead ? <span className="size-2 rounded-full bg-primary" aria-hidden /> : null}
                        {n.studentName ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {n.studentName}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{n.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                        {n.smsStatus != null ? (
                          <DeliveryPill label={`SMS · ${n.smsStatus}`} tone={smsTone} />
                        ) : null}
                        {n.pushStatus != null ? (
                          <DeliveryPill label={`Push · ${n.pushStatus}`} tone={pushTone} />
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeStudentId ? (
        <p className="text-center text-[11px] text-muted">
          Showing transport alerts for all linked children. Switch child in the header to filter.
        </p>
      ) : null}
    </div>
  );
}
