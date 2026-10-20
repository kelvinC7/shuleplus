import { useEffect, useRef, useState } from 'react';
import { Bell, Clock, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchTeacherToday } from '../services/teacherPortalApi';
import {
  canUseBrowserNotifications,
  ensurePeriodNotificationPermission,
  periodNotificationKey,
  showPeriodBrowserNotification,
} from '../utils/periodNotifications';
import {
  getTeacherPortalPushState,
  isWebPushEnvironmentSupported,
  subscribeTeacherPortalPush,
} from '../utils/webPushTeacherPortal';

export default function PeriodReminderBanner() {
  const navigate = useNavigate();
  const { ready } = useTpAcademic();
  const [lesson, setLesson] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const lastKey = useRef('');
  const lastNotifiedKey = useRef('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState(null);
  const [pushState, setPushState] = useState({ supported: false, permission: 'default', subscribed: false });

  useEffect(() => {
    void getTeacherPortalPushState().then(setPushState);
  }, []);

  useEffect(() => {
    let timer;
    let stopped = false;
    let delay = 30000;

    const poll = () => {
      if (stopped) return;
      fetchTeacherToday()
        .then((today) => {
          delay = 30000;
          const target = today?.next || today?.current || null;
          if (!target) {
            setLesson(null);
            return;
          }
          const [h, m] = String(target.startTime || '').split(':').map(Number);
          const now = new Date();
          const mins = Number.isFinite(h)
            ? h * 60 + (m || 0) - (now.getHours() * 60 + now.getMinutes())
            : null;
          const isCurrent = Boolean(today?.current) && today.current === target;
          const warnSoon = isCurrent || (mins != null && mins <= 15);
          if (!warnSoon) {
            setLesson(null);
            return;
          }
          const d = {
            has_lesson: true,
            warn_soon: true,
            minutes_until: isCurrent ? 0 : mins,
            lesson: {
              class_name: target.className,
              subject_name: target.subjectName,
              start_time: target.startTime,
              end_time: target.endTime,
            },
          };
          const key = periodNotificationKey(d.lesson);
          if (key !== lastKey.current) {
            lastKey.current = key;
            setDismissed(false);
          }
          setLesson(d);

          const notifyKey = `${key}:${mins <= 0 ? 0 : mins <= 5 ? 5 : 15}`;
          if (notifyKey !== lastNotifiedKey.current) {
            lastNotifiedKey.current = notifyKey;
            showPeriodBrowserNotification(d.lesson, isCurrent ? 0 : mins);
          }
        })
        .catch(() => {
          delay = Math.min(delay * 2, 120000);
        })
        .finally(() => {
          if (!stopped) timer = setTimeout(poll, delay);
        });
    };

    if (!ready) return;
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [ready]);

  async function enableAlerts() {
    setPushBusy(true);
    setPushHint(null);
    try {
      await ensurePeriodNotificationPermission();
      if (isWebPushEnvironmentSupported()) {
        await subscribeTeacherPortalPush();
      }
      setPushState(await getTeacherPortalPushState());
      setPushHint('Alerts enabled. You will get period reminders even when this tab is in the background.');
    } catch (err) {
      setPushHint(err?.message || 'Could not enable alerts');
    } finally {
      setPushBusy(false);
    }
  }

  if (!lesson?.warn_soon || dismissed) return null;

  const mins = lesson.minutes_until;
  const l = lesson.lesson;
  const alertsOn =
    canUseBrowserNotifications() &&
    Notification.permission === 'granted' &&
    (!isWebPushEnvironmentSupported() || pushState.subscribed);

  return (
    <div className="fixed top-[72px] left-1/2 z-[100] w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 animate-[slideDown_.35s_ease-out] sm:w-[calc(100%-1.5rem)]">
      <style>{`@keyframes slideDown{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-[#fff7ed] to-white shadow-2xl">
        <div className="flex items-start gap-3 p-3 sm:p-4">
          <div className="shrink-0 rounded-xl bg-orange-500 p-2.5 text-white">
            <Bell size={20} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
              Period starting soon
            </p>
            <p className="text-sm font-black leading-snug text-[#000435]">
              {mins <= 0
                ? 'Your lesson is starting now'
                : `${mins} minute${mins === 1 ? '' : 's'} until ${l?.subject_name}`}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-orange-500" />
                {l?.class_name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-orange-500" />
                {l?.start_time} – {l?.end_time}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/class-room-scan')}
                className="rounded-lg bg-[#000435] px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white hover:bg-[#0a116b]"
              >
                Scan class monitor QRCode
              </button>
              <button
                type="button"
                onClick={() => navigate('/attendance')}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-orange-300"
              >
                Mark attendance
              </button>
              {!alertsOn && canUseBrowserNotifications() ? (
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={() => void enableAlerts()}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-orange-800 hover:bg-orange-100 disabled:opacity-60"
                >
                  {pushBusy ? 'Enabling…' : 'Enable alert notifications'}
                </button>
              ) : null}
            </div>
            {pushHint ? <p className="mt-2 text-[11px] font-medium text-slate-600">{pushHint}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Dismiss period notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
