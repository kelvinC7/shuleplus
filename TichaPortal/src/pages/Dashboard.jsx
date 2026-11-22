import { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import WalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../context/AuthContext';
import { openCommandPalette, isMacPlatform } from '../components/CommandPalette';
import BottomSheet from '../components/BottomSheet';
import ClassRoomScanSheet from '../components/ClassRoomScanSheet';
import useAutoRefresh from '../hooks/useAutoRefresh';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchTeacherToday, fetchMyClasses, tpAcademicParams } from '../services/teacherPortalApi';
import { formatSchoolTime, getSchoolTimeMinutes } from '../utils/schoolTime';
import { getTeacherLessonState } from '../utils/teacherLessonState';
import { periodAttendanceHref } from '../utils/teacherLessonLinks';
import { Page, PageLoading, Panel, EmptyState } from '../components/ui';
import { brand } from '../theme/theme';

function schoolInitials(name) {
  return String(name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Dashboard() {
  const { teacher } = useAuth();
  const { ready, term, academicYear } = useTpAcademic();
  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [scanMode, setScanMode] = useState(null);
  const [schoolMinutes, setSchoolMinutes] = useState(() => getSchoolTimeMinutes());

  useEffect(() => {
    const id = window.setInterval(() => setSchoolMinutes(getSchoolTimeMinutes()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const loadDashboard = useCallback(
    async (isActive = () => true) => {
      setLoading(true);
      try {
        const ac = tpAcademicParams(term, academicYear);
        const [today, classesData] = await Promise.all([
          fetchTeacherToday(ac).catch(() => null),
          fetchMyClasses().catch(() => null),
        ]);
        if (!isActive()) return;
        const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
        const totalClasses = today?.kpis?.todayClasses ?? lessons.length;
        const activeStudents = Array.isArray(classesData?.classes)
          ? classesData.classes.reduce((sum, item) => sum + (Number(item.studentsCount) || 0), 0)
          : 0;
        setStats([
          { key: 'classes', label: 'Lessons today', value: totalClasses, hint: `${lessons.filter((l) => l.phase === 'done').length} done`, icon: <MenuBookOutlinedIcon sx={{ fontSize: 18 }} /> },
          { key: 'students', label: 'Students', value: activeStudents, hint: 'Across classes', icon: <PeopleOutlineIcon sx={{ fontSize: 18 }} /> },
          { key: 'attendance', label: 'Attendance', value: today?.kpis?.attendance ?? 0, hint: 'Today', icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} /> },
          { key: 'done', label: 'Lessons done', value: today?.kpis?.lessonsDone ?? 0, hint: `of ${totalClasses}`, icon: <AccessTimeIcon sx={{ fontSize: 18 }} /> },
        ]);
        setSchedule(lessons);
      } catch (e) {
        console.error('Failed to fetch dashboard', e);
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [term, academicYear]
  );

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void loadDashboard(() => active);
    return () => {
      active = false;
    };
  }, [ready, loadDashboard]);

  // Refresh dashboard data when timetable/config class changes upstream.
  useAutoRefresh(() => loadDashboard(), { enabled: ready });

  const displayName = teacher?.first_name
    ? `${teacher.first_name}${teacher.last_name ? ` ${teacher.last_name}` : ''}`
    : 'Teacher';
  const schoolName = teacher?.school?.name || teacher?.school_name || 'Your school';
  const todayLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  // Prefer current session; otherwise the most recent finished one — not "next"
  const currentLesson = schedule.find((lesson) =>
    ['Now', 'In class'].includes(getTeacherLessonState(lesson, schoolMinutes).label)
  );
  const previousLesson = (() => {
    if (currentLesson || schoolMinutes == null) return null;
    let best = null;
    let bestEnd = -1;
    for (const lesson of schedule) {
      const label = getTeacherLessonState(lesson, schoolMinutes).label;
      if (!['Done', 'Attended', 'Missed'].includes(label)) continue;
      const endMatch = formatSchoolTime(lesson?.endTime).match(/^(\d{2}):(\d{2})$/);
      const endMin = endMatch ? Number(endMatch[1]) * 60 + Number(endMatch[2]) : null;
      if (endMin == null || endMin > schoolMinutes) continue;
      if (endMin >= bestEnd) {
        bestEnd = endMin;
        best = lesson;
      }
    }
    return best;
  })();
  const focus = currentLesson || previousLesson;
  const focusState = focus ? getTeacherLessonState(focus, schoolMinutes) : null;
  const focusIsPrevious = Boolean(previousLesson && focus === previousLesson && !currentLesson);
  const selectedLessonState = getTeacherLessonState(selectedLesson, schoolMinutes);
  const selectedLessonScanned = Boolean(
    selectedLesson?.qrVerified || selectedLesson?.scannedAt || selectedLesson?.entryTime || selectedLesson?.entry_time
  );
  const canScanOut = selectedLessonScanned && selectedLesson?.lessonStatus !== 'COMPLETED';
  const canScanIn = ['Next', 'Now'].includes(selectedLessonState?.label || '');

  const quickTools = [
    { title: 'Ticha Avance', icon: <WalletOutlinedIcon />, path: '/shule-avance' },
    { title: 'Ticha Deals', icon: <ShoppingBagOutlinedIcon />, path: '/ticha-deals' },
    { title: 'Ticha AI', icon: <AutoAwesomeOutlinedIcon />, path: '/ticha-ai' },
  ];

  const sessionBody = (
    <>
  {loading && !schedule.length ? (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1.5, color: brand.muted }}>
      <Typography sx={{ fontSize: 13 }}>Loading your day…</Typography>
    </Stack>
  ) : focus ? (
    <Box sx={{ display: 'flex', alignItems: { xs: 'center', lg: 'stretch' }, gap: 1.75, flex: 1 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          flexShrink: 0,
          borderRadius: 2,
          bgcolor: 'rgba(19,33,61,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: brand.navy,
        }}
      >
        {focusState?.label === 'In class' || focusState?.label === 'Now' ? (
          <AccessTimeIcon sx={{ fontSize: 28 }} />
        ) : (
          <MenuBookOutlinedIcon sx={{ fontSize: 28 }} />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {focusIsPrevious ? 'Last session' : 'Current session'}
          </Typography>
          <Chip
            size="small"
            label={focusState?.label || 'Lesson'}
            sx={{
              height: 22,
              fontWeight: 700,
              fontSize: 10,
              bgcolor:
                focusState?.tone === 'amber'
                  ? 'rgba(245,166,35,0.15)'
                  : focusState?.tone === 'red'
                    ? 'rgba(220,38,38,0.1)'
                    : focusState?.tone === 'green'
                      ? 'rgba(4,120,87,0.1)'
                      : 'rgba(19,33,61,0.06)',
              color:
                focusState?.tone === 'amber'
                  ? '#B45309'
                  : focusState?.tone === 'red'
                    ? '#B91C1C'
                    : focusState?.tone === 'green'
                      ? '#047857'
                      : brand.navy,
            }}
          />
        </Stack>
        <Typography sx={{ mt: 0.25, fontSize: 15, fontWeight: 800, color: brand.navy }} noWrap>
          {focus.subjectName || focus.subject || focus.title || 'Lesson'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: brand.muted }} noWrap>
          {focus.className || focus.class}
          {focus.room ? ` · ${focus.room}` : ''}
          {' · '}
          {formatSchoolTime(focus.startTime)}–{formatSchoolTime(focus.endTime)}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: { xs: 1.25, lg: 'auto' }, pt: { lg: 1.5 } }}>
          {/* Smart scan: enter when not yet in class, exit when already scanned in */}
          {!focusIsPrevious && focusState?.label === 'Now' ? (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<QrCodeScannerOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setSelectedLesson(focus);
                setScanMode('in');
              }}
              sx={{ textTransform: 'none', fontWeight: 700, flex: 1, py: 0.65 }}
            >
              Scan to enter
            </Button>
          ) : null}
          {!focusIsPrevious && focusState?.label === 'In class' ? (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<QrCodeScannerOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setSelectedLesson(focus);
                setScanMode('out');
              }}
              sx={{ textTransform: 'none', fontWeight: 700, flex: 1, py: 0.65 }}
            >
              Scan to exit
            </Button>
          ) : null}
          <Button
            size="small"
            variant={
              !focusIsPrevious && (focusState?.label === 'Now' || focusState?.label === 'In class')
                ? 'outlined'
                : 'contained'
            }
            color="secondary"
            component={RouterLink}
            to={periodAttendanceHref(focus)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              flex: 1,
              py: 0.65,
              ...(!focusIsPrevious && (focusState?.label === 'Now' || focusState?.label === 'In class')
                ? { borderColor: brand.border, color: brand.navy }
                : {}),
            }}
          >
            Period attendance
          </Button>
        </Stack>
      </Box>
    </Box>
  ) : (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: 2,
          bgcolor: 'rgba(19,33,61,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: brand.muted,
        }}
      >
        <CalendarMonthOutlinedIcon />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>
          Today
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: brand.navy }}>No session to show</Typography>
        <Typography sx={{ fontSize: 12, color: brand.muted }}>No current or recent class yet today</Typography>
      </Box>
    </Stack>
  )}
    </>
  );

  const displayStats = stats.length
    ? stats
    : [
        { label: 'Lessons today', icon: <MenuBookOutlinedIcon sx={{ fontSize: 18 }} /> },
        { label: 'Students', icon: <PeopleOutlineIcon sx={{ fontSize: 18 }} /> },
        { label: 'Attendance', icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} /> },
        { label: 'Lessons done', icon: <AccessTimeIcon sx={{ fontSize: 18 }} /> },
      ].map((item) => ({ key: item.label, ...item, value: '—' }));

  return (
    <Page maxWidth="none">
      {/* ───────── Desktop home (lg+): hero replaces the top bar ───────── */}
      <Box sx={{ display: { xs: 'none', lg: 'block' }, mx: -2.5, mt: -2.5 }}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            bgcolor: brand.primary,
            color: brand.navy,
            px: 5,
            pt: 3,
            pb: 13,
            minHeight: 260,
          }}
        >
          {/* Top row: school + date on the left, former header actions on the right */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(19,33,61,0.1)',
                  color: brand.navy,
                  fontWeight: 700,
                  fontSize: 14,
                  width: 40,
                  height: 40,
                }}
              >
                {schoolInitials(schoolName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
                  {schoolName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(19,33,61,0.65)' }}>{todayLabel}</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                component="button"
                type="button"
                onClick={openCommandPalette}
                aria-label="Search and quick actions"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: 260,
                  height: 38,
                  mr: 1,
                  px: 1.25,
                  border: '1px solid rgba(19,33,61,0.14)',
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.35)',
                  color: 'rgba(19,33,61,0.7)',
                  font: 'inherit',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background-color .15s, border-color .15s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.55)', borderColor: 'rgba(19,33,61,0.28)' },
                  '&:focus-visible': { outline: `2px solid ${brand.navy}`, outlineOffset: 2 },
                }}
              >
                <SearchIcon sx={{ fontSize: 18 }} />
                <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
                  Search or jump to…
                </Box>
                <Box
                  component="kbd"
                  sx={{
                    fontFamily: 'inherit',
                    fontSize: 10.5,
                    fontWeight: 700,
                    lineHeight: 1,
                    px: 0.75,
                    py: 0.5,
                    borderRadius: 0.75,
                    bgcolor: 'rgba(19,33,61,0.1)',
                    color: brand.navy,
                  }}
                >
                  {isMacPlatform() ? '⌘ K' : 'Ctrl K'}
                </Box>
              </Box>
              <IconButton
                component={RouterLink}
                to="/school-calendar"
                aria-label="School calendar"
                sx={{ color: brand.navy, '&:hover': { bgcolor: 'rgba(19,33,61,0.08)' } }}
              >
                <CalendarMonthOutlinedIcon />
              </IconButton>
              <IconButton
                component={RouterLink}
                to="/console"
                aria-label="Open console"
                sx={{ color: brand.navy, '&:hover': { bgcolor: 'rgba(19,33,61,0.08)' } }}
              >
                <GridViewRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Typography
            sx={{
              mt: 4,
              fontSize: '2.25rem',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              position: 'relative',
              zIndex: 1,
            }}
          >
            Hello, {displayName.split(' ')[0]}
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 14, color: 'rgba(19,33,61,0.7)', position: 'relative', zIndex: 1 }}>
            {schedule.length
              ? `You have ${schedule.length} ${schedule.length === 1 ? 'lesson' : 'lessons'} today.`
              : 'Here is your day at a glance.'}
          </Typography>

          <Box
            component="img"
            src="/st-teacher.webp"
            alt=""
            sx={{
              position: 'absolute',
              right: 48,
              bottom: 0,
              height: '88%',
              width: 'auto',
              maxWidth: 240,
              objectFit: 'contain',
              objectPosition: 'bottom right',
              opacity: 0.95,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 10px 24px rgba(19,33,61,0.25))',
            }}
          />
        </Box>

        {/* Elevated row overlapping the hero: stats (left) + session card (right) */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            mt: -8,
            px: 5,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 440px)',
            gap: 2.5,
            alignItems: 'stretch',
          }}
        >
          {/* Squarish navy stats — 2×2 grid, no gaps, lifted with a shadow, styled icon tile on each */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 0,
              border: `1px solid ${brand.navy}`,
              boxShadow: '0 8px 20px rgba(0,4,53,0.18)',
              overflow: 'hidden',
            }}
          >
            {displayStats.map((s, i) => (
              <Box
                key={s.key}
                sx={{
                  bgcolor: brand.navy,
                  color: '#fff',
                  px: 2,
                  py: 1.75,
                  minHeight: 96,
                  borderRadius: 0,
                  borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.65)', pt: 0.25 }}>
                    {s.label}
                  </Typography>
                  <Box sx={{ display: 'flex', flexShrink: 0, color: brand.primary }}>{s.icon}</Box>
                </Stack>
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  {s.hint ? (
                    <Typography sx={{ mt: 0.5, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{s.hint}</Typography>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              bgcolor: '#fff',
              borderRadius: 0,
              border: '1px solid rgba(0,4,53,0.06)',
              boxShadow: '0 8px 20px rgba(0,4,53,0.1)',
              px: 2.25,
              py: 2,
              display: 'flex',
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{sessionBody}</Box>
          </Box>
        </Box>
      </Box>


      {/* ───────── Mobile / tablet hero + overlapping session card (unchanged) ───────── */}
      <Box
        sx={{
          display: { xs: 'block', lg: 'none' },
          position: 'relative',
          // Pull flush under topbar on mobile (cancels Page py/px)
          mt: { xs: -2, sm: 0 },
          mb: 2.5,
          mx: { xs: -2, sm: 0 },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            bgcolor: brand.navy,
            color: '#fff',
            borderRadius: { xs: 0, sm: 2 },
            px: { xs: 2, sm: 2.5 },
            pt: { xs: 1.75, sm: 2 },
            // Reserved strip at the bottom of the hero that the session card sits on
            pb: focus || loading ? { xs: 7, sm: 7.5 } : { xs: 2.25, sm: 2.5 },
            minHeight: { xs: 132, sm: 148 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ position: 'relative', zIndex: 1 }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar sx={{ bgcolor: brand.primary, color: brand.navy, fontWeight: 800, width: 40, height: 40 }}>
                {schoolInitials(schoolName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                  {schoolName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{todayLabel}</Typography>
              </Box>
            </Stack>
            <IconButton component={RouterLink} to="/school-calendar" sx={{ color: brand.primary, zIndex: 1 }}>
              <CalendarMonthOutlinedIcon />
            </IconButton>
          </Stack>

          <Typography
            sx={{
              mt: 1.25,
              mb: 0,
              fontSize: { xs: '1.3rem', sm: '1.5rem' },
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              position: 'relative',
              zIndex: 1,
              maxWidth: { xs: '58%', sm: '62%' },
            }}
          >
            Hello, {displayName.split(' ')[0]}
          </Typography>

          <Box
            component="img"
            src="/st-teacher.webp"
            alt=""
            sx={{
              position: 'absolute',
              right: { xs: 0, sm: 8 },
              bottom: 0,
              height: '100%',
              width: 'auto',
              maxWidth: { xs: 120, sm: 160 },
              objectFit: 'contain',
              objectPosition: 'bottom right',
              zIndex: 0,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.35))',
            }}
          />
        </Box>

        {/* Session card — sits on hero like school health card */}
        <Box
          sx={{
            position: 'relative',
            // Overlap the hero by a fixed amount (5 * 8px = 40px), independent of card height
            mt: focus || loading ? -5 : 2,
            mx: { xs: 1.5, sm: 0 },
            zIndex: 2,
            bgcolor: '#fff',
            borderRadius: 2.5,
            border: '1px solid rgba(0,4,53,0.06)',
            boxShadow: '0 8px 20px rgba(0,4,53,0.1)',
            px: 2,
            py: 1.75,
          }}
        >
          {sessionBody}
        </Box>
      </Box>

      {loading && !schedule.length ? (
        <PageLoading label="Loading your day…" />
      ) : (
        <>
          {/* Squarish navy stats — no gap */}
          <Box
            sx={{
              display: { xs: 'grid', lg: 'none' },
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
              mb: 2.5,
              border: `1px solid ${brand.navy}`,
              overflow: 'hidden',
            }}
          >
            {stats.map((s, i) => (
              <Box
                key={s.key}
                sx={{
                  bgcolor: brand.navy,
                  color: '#fff',
                  px: 1.75,
                  py: 1.5,
                  minHeight: 88,
                  borderRadius: 0,
                  borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.65)' }}>
                  {s.label}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {s.value}
                </Typography>
                {s.hint ? (
                  <Typography sx={{ mt: 0.35, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{s.hint}</Typography>
                ) : null}
              </Box>
            ))}
          </Box>

          {/* Desktop: quick tools (left) + today's sessions (right) in a row */}
          <Box
            sx={{
              display: { xs: 'block', lg: 'grid' },
              gridTemplateColumns: { lg: '320px minmax(0, 1fr)' },
              gap: { lg: 2.5 },
              alignItems: { lg: 'start' },
              px: { lg: 5 },
              mx: { lg: -2.5 },
              mt: { lg: 3 },
              '& > *': { mb: { xs: 2.5, lg: 0 } },
            }}
          >
          {/* Quick actions — inside a card, full-width rows, dividers only */}
          <Panel title="Quick tools" bodySx={{ p: 0 }}>
            {quickTools.map((tool, i) => (
              <Button
                key={tool.path}
                component={RouterLink}
                to={tool.path}
                fullWidth
                disableElevation
                sx={{
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  px: 2,
                  py: 1.6,
                  border: 0,
                  borderRadius: 0,
                  borderTop: i > 0 ? `1px solid ${brand.border}` : 0,
                  bgcolor: '#fff',
                  color: brand.navy,
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(19,33,61,0.03)' },
                  '& .MuiSvgIcon-root': { color: brand.navy, fontSize: 22 },
                }}
              >
                <Box sx={{ display: 'flex', color: brand.navy }}>{tool.icon}</Box>
                {tool.title}
              </Button>
            ))}
          </Panel>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${brand.border}`,
              bgcolor: '#fff',
              overflow: 'hidden',
            }}
          >
            <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>Today&apos;s timetable</Typography>
              <Box
                component="span"
                sx={{
                  ml: 'auto',
                  borderRadius: 999,
                  bgcolor: '#F1F5F9',
                  px: 1,
                  py: 0.25,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#64748B',
                }}
              >
                {schedule.length}
              </Box>
            </Stack>
            {!schedule.length ? (
              <Box sx={{ px: 2, pb: 2 }}>
                <EmptyState title="No lessons scheduled" description="Enjoy the free period or check your full timetable." />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          width: 88,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#94A3B8',
                          bgcolor: '#F8F9FC',
                          borderBottom: `1px solid ${brand.border}`,
                        }}
                      >
                        Time
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#94A3B8',
                          bgcolor: '#F8F9FC',
                          borderBottom: `1px solid ${brand.border}`,
                        }}
                      >
                        Lesson
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          width: 88,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#94A3B8',
                          bgcolor: '#F8F9FC',
                          borderBottom: `1px solid ${brand.border}`,
                          textAlign: 'right',
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedule.map((lesson, idx) => {
                      const state = getTeacherLessonState(lesson, schoolMinutes);
                      const tone = state?.tone;
                      const chipSx =
                        tone === 'amber'
                          ? { bgcolor: 'rgba(245,166,35,0.15)', color: '#B45309' }
                          : tone === 'green'
                            ? { bgcolor: 'rgba(4,120,87,0.12)', color: '#047857' }
                            : tone === 'red'
                              ? { bgcolor: 'rgba(185,28,28,0.1)', color: '#B91C1C' }
                              : { bgcolor: 'rgba(19,33,61,0.06)', color: brand.navy };
                      return (
                        <TableRow
                          key={lesson.id || `${lesson.subject}-${idx}`}
                          hover
                          onClick={() => setSelectedLesson(lesson)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                            '&:last-child td': { borderBottom: 0 },
                            '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' },
                          }}
                        >
                          <TableCell
                            sx={{
                              py: 1,
                              px: 1.5,
                              borderBottom: '1px solid rgba(19,33,61,0.06)',
                              verticalAlign: 'top',
                            }}
                          >
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy, fontVariantNumeric: 'tabular-nums' }}>
                              {formatSchoolTime(lesson.startTime)}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: brand.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {formatSchoolTime(lesson.endTime)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 1,
                              px: 1.5,
                              borderBottom: '1px solid rgba(19,33,61,0.06)',
                              overflow: 'hidden',
                            }}
                          >
                            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>
                              {lesson.subjectName || lesson.subject || lesson.title || 'Lesson'}
                            </Typography>
                            <Typography noWrap sx={{ fontSize: 11.5, color: brand.muted }}>
                              {lesson.className || lesson.class || '—'}
                              {lesson.room ? ` · ${lesson.room}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={{
                              py: 1,
                              px: 1.5,
                              borderBottom: '1px solid rgba(19,33,61,0.06)',
                              textAlign: 'right',
                            }}
                          >
                            <Chip
                              size="small"
                              label={state.label}
                              sx={{ height: 22, fontWeight: 700, fontSize: 10, ...chipSx }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          </Box>
        </>
      )}

      <BottomSheet open={Boolean(selectedLesson)} onClose={() => setSelectedLesson(null)}>
        {selectedLesson ? (
          <Box sx={{ p: 2.5, pr: { xs: 2.5, lg: 7 } }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: brand.navy }}>
              {selectedLesson.subjectName || selectedLesson.subject || selectedLesson.title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: brand.muted, mt: 0.5 }}>
              {selectedLesson.className || selectedLesson.class}
              {selectedLesson.room ? ` · Room ${selectedLesson.room}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              <Chip icon={<AccessTimeIcon />} label={`${formatSchoolTime(selectedLesson.startTime)} – ${formatSchoolTime(selectedLesson.endTime)}`} />
              {selectedLesson.room ? <Chip icon={<PlaceOutlinedIcon />} label={selectedLesson.room} /> : null}
              <Chip label={selectedLessonState?.label || 'Lesson'} color="secondary" />
            </Stack>
            <Stack spacing={1} sx={{ mt: 2.5 }}>
              <Button
                component={RouterLink}
                to={periodAttendanceHref(selectedLesson)}
                variant="outlined"
                onClick={() => setSelectedLesson(null)}
                sx={{ fontWeight: 700, borderColor: brand.border }}
              >
                Period attendance
              </Button>
              <Button
                component={RouterLink}
                to="/lesson-planning/generate"
                variant="outlined"
                onClick={() => setSelectedLesson(null)}
                sx={{ fontWeight: 700, borderColor: brand.border }}
              >
                Lesson plan
              </Button>
              <Button
                component={RouterLink}
                to="/students"
                variant="outlined"
                onClick={() => setSelectedLesson(null)}
                sx={{ fontWeight: 700, borderColor: brand.border }}
              >
                Class list
              </Button>
            </Stack>
            {(canScanOut || canScanIn) && (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<QrCodeScannerOutlinedIcon />}
                sx={{ mt: 2, fontWeight: 700, py: 1.25 }}
                onClick={() => {
                  setScanMode(canScanOut ? 'out' : 'in');
                  setSelectedLesson(null);
                }}
              >
                {canScanOut ? 'Scan to clock out' : 'Scan to enter class'}
              </Button>
            )}
          </Box>
        ) : null}
      </BottomSheet>

      <ClassRoomScanSheet
        open={Boolean(scanMode)}
        mode={scanMode || 'in'}
        onClose={() => setScanMode(null)}
        onSuccess={() => loadDashboard()}
      />
    </Page>
  );
}
