import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { brand } from '../theme/theme';
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

// Show each reminder once per lesson per day — never again on refresh or page switch.
const dayStamp = () => new Date().toDateString();
const hasFlag = (k) => { try { return !!localStorage.getItem(k); } catch { return false; } };
const setFlag = (k) => { try { localStorage.setItem(k, '1'); } catch { /* ignore */ } };

export default function PeriodReminderBanner() {
  const navigate = useNavigate();
  const { ready } = useTpAcademic();
  const [lesson, setLesson] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const lastKey = useRef('');
  const lastNotifiedKey = useRef('');
  const [pushBusy, setPushBusy] = useState(false);
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
            const seenKey = `tp_period_seen:${dayStamp()}:${key}`;
            if (hasFlag(seenKey)) {
              setDismissed(true);
            } else {
              setFlag(seenKey);
              setDismissed(false);
            }
          }
          setLesson(d);

          const notifyKey = `${key}:${mins <= 0 ? 0 : mins <= 5 ? 5 : 15}`;
          const notifiedFlag = `tp_period_notified:${dayStamp()}:${notifyKey}`;
          if (notifyKey !== lastNotifiedKey.current && !hasFlag(notifiedFlag)) {
            lastNotifiedKey.current = notifyKey;
            setFlag(notifiedFlag);
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

  const alertsOn =
    pushState.subscribed ||
    (canUseBrowserNotifications() && Notification.permission === 'granted');

  const enableAlerts = async () => {
    setPushBusy(true);
    try {
      await ensurePeriodNotificationPermission();
      if (isWebPushEnvironmentSupported()) await subscribeTeacherPortalPush();
      setPushState(await getTeacherPortalPushState());
    } catch {
      /* permission denied or push unavailable - leave the button visible */
    } finally {
      setPushBusy(false);
    }
  };

  if (!lesson?.warn_soon || dismissed) return null;

  const l = lesson.lesson;
  const mins = lesson.minutes_until ?? 0;
  const when = mins <= 0 ? 'Now' : `In ${mins} min`;

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-labelledby="period-sheet-title"
      sx={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <Box
        component="button"
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        sx={{ position: 'absolute', inset: 0, border: 0, p: 0, cursor: 'default', bgcolor: 'rgba(11,18,32,0.55)', backdropFilter: 'blur(2px)' }}
      />
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 520, bgcolor: '#fff', borderRadius: '24px 24px 0 0', px: 2.5, pt: 4, pb: 3, boxShadow: '0 -12px 40px rgba(11,18,32,0.25)' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2, bgcolor: brand.navy, color: '#fff', display: 'grid', placeItems: 'center' }}>
            <NotificationsActiveIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Period starting soon</Typography>
            <Typography id="period-sheet-title" noWrap sx={{ fontSize: 18, fontWeight: 700, color: brand.navy }}>
              {l?.subject_name || 'Your lesson'}
            </Typography>
          </Box>
          <Box
            component="span"
            sx={{
              flexShrink: 0,
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: mins <= 0 ? brand.navy : '#FFF3DC',
              color: mins <= 0 ? '#fff' : '#9A5B00',
            }}
          >
            {when}
          </Box>
        </Stack>

        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          <Box sx={{ borderRadius: 2, bgcolor: '#F4F5F8', px: 1.75, py: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
              <PlaceIcon sx={{ fontSize: 13 }} /> <Box component="span">Class</Box>
            </Stack>
            <Typography noWrap sx={{ mt: 0.5, fontSize: 14, fontWeight: 600, color: brand.navy }}>{l?.class_name || '-'}</Typography>
          </Box>
          <Box sx={{ borderRadius: 2, bgcolor: '#F4F5F8', px: 1.75, py: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
              <AccessTimeIcon sx={{ fontSize: 13 }} /> <Box component="span">Time</Box>
            </Stack>
            <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 600, color: brand.navy }}>{l?.start_time} - {l?.end_time}</Typography>
          </Box>
        </Box>

        <Button
          type="button"
          fullWidth
          onClick={() => { setDismissed(true); navigate('/class-room-scan'); }}
          sx={{ mt: 2.5, height: 48, borderRadius: 2, bgcolor: brand.navy, color: '#fff', fontSize: 14, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#24396A' }, '&:active': { bgcolor: '#24396A' } }}
        >
          Scan class QR code
        </Button>
        <Button
          type="button"
          fullWidth
          onClick={() => setDismissed(true)}
          sx={{ mt: 1.25, height: 44, borderRadius: 2, bgcolor: '#F4F5F8', color: '#64748B', fontSize: 14, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#ECEEF3' } }}
        >
          Later
        </Button>

        {!alertsOn && canUseBrowserNotifications() ? (
          <Button
            type="button"
            fullWidth
            disabled={pushBusy}
            onClick={() => void enableAlerts()}
            sx={{ mt: 2, fontSize: 12, fontWeight: 600, color: '#24396A', textTransform: 'none', '&.Mui-disabled': { opacity: 0.6 } }}
          >
            {pushBusy ? 'Enabling...' : 'Turn on period alerts'}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
