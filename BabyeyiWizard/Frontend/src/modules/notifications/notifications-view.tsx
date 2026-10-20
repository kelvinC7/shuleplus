'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  MessageSquare,
  Megaphone,
  QrCode,
  ShieldAlert,
  Download,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/shared/notifications';
import { timeAgo } from '@/lib/time-ago';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/babyeyi-api';
import type { NotificationItem } from '@/types';

const POLL_MS = 15_000;

type FilterKey = 'all' | 'unread' | 'verification' | 'circulars' | 'comments';

const VERIFICATION_TYPES = new Set([
  'QR_SCANNED',
  'QR_GENERATED',
  'VERIFICATION_REPORT',
  'VERIFICATION_ALERT',
]);

function isVerificationNotification(n: NotificationItem): boolean {
  if (VERIFICATION_TYPES.has(n.type)) return true;
  if (n.type !== 'SYSTEM') return false;
  return /qr|verif|report|scan/i.test(`${n.title} ${n.message}`);
}

const CIRCULAR_TYPES = new Set([
  'CIRCULAR_PUBLISHED',
  'DIRECTOR_APPROVED',
  'PARENT_DOWNLOADED',
  'PAYMENT_UPDATED',
  'REQUIREMENT_ADDED',
  'REMINDER',
]);

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'verification', label: 'Verification' },
  { key: 'circulars', label: 'Circulars' },
  { key: 'comments', label: 'Comments' },
];

function notificationMeta(type: string): {
  icon: React.ReactNode;
  accent: string;
  bg: string;
  category: string;
} {
  switch (type) {
    case 'QR_SCANNED':
      return {
        icon: <QrCode size={18} />,
        accent: 'text-sky-700',
        bg: 'bg-sky-50 ring-sky-100',
        category: 'QR scan',
      };
    case 'QR_GENERATED':
      return {
        icon: <QrCode size={18} />,
        accent: 'text-indigo-700',
        bg: 'bg-indigo-50 ring-indigo-100',
        category: 'QR ready',
      };
    case 'VERIFICATION_REPORT':
      return {
        icon: <ShieldAlert size={18} />,
        accent: 'text-rose-700',
        bg: 'bg-rose-50 ring-rose-100',
        category: 'Report',
      };
    case 'VERIFICATION_ALERT':
      return {
        icon: <AlertTriangle size={18} />,
        accent: 'text-amber-800',
        bg: 'bg-amber-50 ring-amber-100',
        category: 'Alert',
      };
    case 'CIRCULAR_PUBLISHED':
      return {
        icon: <Megaphone size={18} />,
        accent: 'text-emerald-700',
        bg: 'bg-emerald-50 ring-emerald-100',
        category: 'Published',
      };
    case 'DIRECTOR_APPROVED':
      return {
        icon: <CheckCircle2 size={18} />,
        accent: 'text-teal-700',
        bg: 'bg-teal-50 ring-teal-100',
        category: 'Approved',
      };
    case 'PARENT_DOWNLOADED':
      return {
        icon: <Download size={18} />,
        accent: 'text-violet-700',
        bg: 'bg-violet-50 ring-violet-100',
        category: 'Download',
      };
    case 'COMMENT_ADDED':
      return {
        icon: <MessageSquare size={18} />,
        accent: 'text-blue-700',
        bg: 'bg-blue-50 ring-blue-100',
        category: 'Comment',
      };
    case 'REMINDER':
      return {
        icon: <Clock size={18} />,
        accent: 'text-orange-700',
        bg: 'bg-orange-50 ring-orange-100',
        category: 'Reminder',
      };
    default:
      return {
        icon: <Bell size={18} />,
        accent: 'text-navy',
        bg: 'bg-navy/[0.06] ring-navy/10',
        category: 'System',
      };
  }
}

function dayGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This week';
  return 'Earlier';
}

function matchesFilter(item: NotificationItem, filter: FilterKey): boolean {
  if (filter === 'unread') return !item.isRead;
  if (filter === 'verification') return isVerificationNotification(item);
  if (filter === 'circulars') return CIRCULAR_TYPES.has(item.type);
  if (filter === 'comments') return item.type === 'COMMENT_ADDED';
  return true;
}

export function NotificationsView() {
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchNotifications();
      setItems(data);
      setLastSynced(new Date());
    } catch {
      if (!silent) toast.error('Failed to load notifications');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const filtered = useMemo(
    () => items.filter((n) => matchesFilter(n, filter)),
    [items, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const item of filtered) {
      const label = dayGroupLabel(item.createdAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(item);
    }
    const order = ['Today', 'Yesterday', 'This week', 'Earlier'];
    return order
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label)! }));
  }, [filtered]);

  async function markRead(id: string) {
    try {
      await markNotificationRead(id);
      setItems((current) => current.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      toast.error('Could not mark as read');
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not mark all as read');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-navy">
              <BellRing size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy">Notifications</h1>
              <p className="mt-0.5 text-sm text-navy/55">
                Live updates from circulars, QR verification, and public reports.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-navy/45">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live · refreshes every 15s
                </span>
                {lastSynced ? <span>Last synced {timeAgo(lastSynced)}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-navy">
                {unreadCount} unread
              </span>
            ) : (
              <span className="rounded-full bg-navy/[0.06] px-2.5 py-1 text-xs font-semibold text-navy/50">
                All caught up
              </span>
            )}
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-navy/10 bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:bg-navy/[0.04] disabled:opacity-50"
            >
              <CheckCheck size={14} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === 'unread'
                ? unreadCount
                : f.key === 'all'
                  ? items.length
                  : items.filter((n) => matchesFilter(n, f.key)).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-navy text-white shadow-sm'
                    : 'border border-navy/10 bg-navy/[0.03] text-navy/60 hover:border-primary/30 hover:text-navy'
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-navy/10 bg-navy/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy/15 bg-navy/[0.02] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-navy">
            <Sparkles size={24} />
          </div>
          <p className="mt-4 text-base font-semibold text-navy">No notifications here</p>
          <p className="mt-1 text-sm text-navy/50">
            {filter === 'verification'
              ? 'QR scans and public verification reports will appear here.'
              : 'Activity from circulars and verification will show up in real time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.label}>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-navy/40">
                {group.label}
              </p>
              <div className="space-y-2.5">
                {group.items.map((n) => {
                  const meta = notificationMeta(n.type);
                  return (
                    <article
                      key={n.id}
                      className={`group relative overflow-hidden rounded-2xl border transition ${
                        n.isRead
                          ? 'border-navy/10 bg-white opacity-80'
                          : 'border-primary/25 bg-white shadow-[0_4px_20px_rgba(252,176,56,0.08)]'
                      }`}
                    >
                      {!n.isRead ? (
                        <span className="absolute left-0 top-0 h-full w-1 bg-primary" aria-hidden />
                      ) : null}
                      <div className="flex gap-3 p-4 sm:gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.bg} ${meta.accent}`}
                        >
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-navy">{n.title}</p>
                            <span className="rounded-full bg-navy/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy/45">
                              {meta.category}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-navy/60">{n.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-navy/45">
                            <span>{timeAgo(n.createdAt)}</span>
                            {n.circularId ? (
                              <Link
                                href={`/circulars/${n.circularId}`}
                                className="font-semibold text-primary hover:underline"
                              >
                                View circular
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        {!n.isRead ? (
                          <button
                            type="button"
                            onClick={() => void markRead(n.id)}
                            className="shrink-0 self-start rounded-lg border border-navy/10 px-2.5 py-1.5 text-[11px] font-semibold text-navy opacity-0 transition group-hover:opacity-100 hover:bg-navy/[0.04] sm:opacity-100"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
