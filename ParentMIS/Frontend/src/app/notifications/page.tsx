'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, ShieldAlert, CreditCard, CalendarCheck, FileText, AlertCircle, CheckCheck, Settings, Radio, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { timeAgo } from '@/lib/format';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { registerAndroidPushToken, registerParentDeviceToken, requestWebFcmToken } from '@/firebase/fcm-client';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  sourceModule: string;
  priority: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  studentName: string | null;
}

interface NotificationsResponse {
  unread: number;
  total: number;
  items: AppNotification[];
}

type ChannelPrefs = { sms: boolean; email: boolean; push: boolean; inApp: boolean };

type Preferences = {
  paymentReminders: ChannelPrefs;
  receiptNotifications: ChannelPrefs;
  scholarshipNotifications: ChannelPrefs;
  pushEnabled: boolean;
  webPushToken: string | null;
};

function typeMeta(type: string) {
  switch (type) {
    case 'DISCIPLINE':
      return { icon: <ShieldAlert className="size-4" />, cls: 'bg-rose-100 text-rose-600' };
    case 'FEE':
      return { icon: <CreditCard className="size-4" />, cls: 'bg-sky-100 text-sky-600' };
    case 'ATTENDANCE':
      return { icon: <CalendarCheck className="size-4" />, cls: 'bg-emerald-100 text-emerald-600' };
    case 'EXAM':
      return { icon: <FileText className="size-4" />, cls: 'bg-violet-100 text-violet-600' };
    case 'CANTEEN':
      return { icon: <Utensils className="size-4" />, cls: 'bg-amber-100 text-amber-700' };
    default:
      return { icon: <Bell className="size-4" />, cls: 'bg-slate-100 text-slate-600' };
  }
}

function PrefGroup({
  title,
  prefs,
  onChange,
}: {
  title: string;
  prefs: ChannelPrefs;
  onChange: (next: ChannelPrefs) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="font-semibold text-navy">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(['sms', 'email', 'push', 'inApp'] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(e) => onChange({ ...prefs, [key]: e.target.checked })}
            />
            {key === 'inApp' ? 'In-App' : key.charAt(0).toUpperCase() + key.slice(1)}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'inbox' | 'preferences'>('inbox');
  const { data, loading, error, reload } = useStudentFetch<NotificationsResponse>('/notifications');
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const items = data?.items ?? [];
  const pushActive = useMemo(
    () => Boolean(prefs?.pushEnabled && prefs?.webPushToken),
    [prefs?.pushEnabled, prefs?.webPushToken]
  );

  useEffect(() => {
    void api.get('/notification-preferences').then(({ data: res }) => setPrefs(res.data));
  }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    reload();
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      api.put(`/notifications/${n.id}/read`).catch(() => undefined);
    }
    if (n.link) router.push(n.link);
  };

  async function savePrefs() {
    if (!prefs) return;
    setSaving(true);
    try {
      await api.patch('/notification-preferences', prefs);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Could not save notification preferences');
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
    if (!prefs || pushBusy) return;
    setPushBusy(true);
    setPushStatus(null);
    try {
      let token: string | null = null;
      let platform: 'WEB' | 'ANDROID' | 'IOS' = 'WEB';

      if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent) && 'Capacitor' in window) {
        token = await registerAndroidPushToken();
        platform = 'ANDROID';
      } else {
        token = await requestWebFcmToken();
        platform = 'WEB';
      }

      if (!token) {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
          setPushStatus('Push is blocked in your browser. Allow notifications for this site and try again.');
          toast.error('Browser notifications are blocked');
        } else {
          setPushStatus('Could not enable push on this device. Make sure notifications are allowed and try again.');
          toast.error('Could not enable push notifications');
        }
        return;
      }

      await registerParentDeviceToken(token, platform);
      const next: Preferences = {
        ...prefs,
        pushEnabled: true,
        webPushToken: token,
        paymentReminders: { ...prefs.paymentReminders, push: true },
        receiptNotifications: { ...prefs.receiptNotifications, push: true },
        scholarshipNotifications: { ...prefs.scholarshipNotifications, push: true },
      };
      setPrefs(next);
      await api.patch('/notification-preferences', next);
      setPushStatus('Push notifications are enabled on this device. You will receive school updates, including published marks when available.');
      toast.success('Push notifications enabled');
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Push notifications enabled', {
            body: 'You will receive school updates on this device.',
          });
        }
      } catch {
        /* ignore */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not enable push notifications';
      setPushStatus(msg);
      toast.error('Could not enable push notifications');
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Communication Center"
        action={
          tab === 'inbox' ? (
            <div className="flex items-center gap-3">
              {data && data.unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <CheckCheck className="size-4 text-primary" />
                  Mark all read
                </button>
              )}
              <div className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                {data?.unread ?? 0} unread
              </div>
            </div>
          ) : null
        }
      />

      <div className="flex gap-2 rounded-xl border border-slate-100 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('inbox')}
          className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold', tab === 'inbox' ? 'bg-navy text-primary' : 'text-slate-500')}
        >
          <Bell className="size-4" /> In-App
        </button>
        <button
          type="button"
          onClick={() => setTab('preferences')}
          className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold', tab === 'preferences' ? 'bg-navy text-primary' : 'text-slate-500')}
        >
          <Settings className="size-4" /> Preferences
        </button>
      </div>

      {tab === 'inbox' ? (
        <div className="hr-card overflow-hidden">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load notifications" description={error} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No notifications" description="Fee reminders, receipts, and school updates will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {items.map((n) => {
                const meta = typeMeta(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => open(n)}
                    className={cn(
                      'flex w-full items-start gap-4 px-6 py-4 text-left transition-colors',
                      n.isRead ? 'bg-white hover:bg-slate-50/60' : 'bg-primary/[0.04] hover:bg-primary/[0.08]'
                    )}
                  >
                    <div className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl', meta.cls)}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('text-sm', n.isRead ? 'font-medium text-navy/80' : 'font-bold text-navy')}>{n.title}</p>
                        {!n.isRead && <span className="size-2 rounded-full bg-primary" />}
                        {n.studentName && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            {n.studentName}
                          </span>
                        )}
                        {n.sourceModule === 'school-fees' && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">FEES</span>
                        )}
                        {n.sourceModule === 'attendance' && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">RFID</span>
                        )}
                        {n.sourceModule === 'canteen' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">CANTEEN</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'preferences' && prefs ? (
        <div className="space-y-4">
          <div className="hr-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy">Push notifications</p>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  pushActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {pushActive ? 'Enabled' : 'Not enabled'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Enable push to receive school updates on this device, including published marks and important announcements, even when the portal is closed.
              </p>
              {pushStatus ? (
                <p className={cn('mt-2 text-xs', pushActive ? 'text-emerald-700' : 'text-amber-700')}>{pushStatus}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void enablePush()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
            >
              <Radio className="size-4" /> {pushBusy ? 'Enabling…' : pushActive ? 'Re-enable push' : 'Enable push'}
            </button>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
            <p className="font-semibold">How it works</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-sky-900/90 sm:text-sm">
              <li>Allow browser/app notifications when prompted.</li>
              <li>Keep push enabled for the categories you want below.</li>
              <li>When the school publishes marks, selected students receive notifications; pay-to-view published reports appear in the portal for the parent to review access.</li>
            </ul>
          </div>

          <PrefGroup title="Payment reminders" prefs={prefs.paymentReminders} onChange={(paymentReminders) => setPrefs({ ...prefs, paymentReminders })} />
          <PrefGroup title="Receipt notifications" prefs={prefs.receiptNotifications} onChange={(receiptNotifications) => setPrefs({ ...prefs, receiptNotifications })} />
          <PrefGroup title="Scholarship notifications" prefs={prefs.scholarshipNotifications} onChange={(scholarshipNotifications) => setPrefs({ ...prefs, scholarshipNotifications })} />
          <p className="text-xs text-slate-500">SMS is controlled by your school. You will only receive SMS if your profile is allowed and you have SMS enabled in payment reminders.</p>
          <button type="button" disabled={saving} onClick={() => void savePrefs()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-primary disabled:opacity-60">
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
