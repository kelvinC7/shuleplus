import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import RefreshIcon from '@mui/icons-material/Refresh';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import BottomSheet from '../components/BottomSheet';
import ClassRoomScanSheet from '../components/ClassRoomScanSheet';
import { useAuth } from '../context/AuthContext';
import useAutoRefresh from '../hooks/useAutoRefresh';
import useTpAcademic from '../hooks/useTpAcademic';
import {
  fetchMyClasses,
  fetchMyExamRooms,
  fetchTeacherToday,
  fetchAssessments,
  tpAcademicParams,
  tpApiError,
} from '../services/teacherPortalApi';
import { fetchHomeworkList } from '../services/homeworkApi';
import { listLessonPlansPaginated } from '../services/lessonPlanningApi';
import { formatSchoolTime, getSchoolTimeMinutes } from '../utils/schoolTime';
import { getTeacherLessonState } from '../utils/teacherLessonState';
import { periodAttendanceHref } from '../utils/teacherLessonLinks';
import { Page, PageHeader, Panel, PageLoading, EmptyState, ErrorBanner } from '../components/ui';
import { brand } from '../theme/theme';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'classes', label: 'Classes' },
  { id: 'plans', label: 'Lesson plans' },
  { id: 'homework', label: 'Homework' },
  { id: 'exams', label: 'Exams' },
];

function clock(value) {
  return formatSchoolTime(value);
}

function prettyDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function planTitle(plan) {
  return (
    plan?.lesson?.title ||
    plan?.planContent?.preparation?.lessonTitle?.value ||
    plan?.title ||
    'Lesson plan'
  );
}

/** Squarish navy stat tiles — same look as the dashboard. */
function NavyStats({ stats }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))`,
        gap: 0,
        mb: 2.5,
        border: `1px solid ${brand.navy}`,
        overflow: 'hidden',
      }}
    >
      {stats.map((st, i) => (
        <Box
          key={st.label}
          sx={{
            bgcolor: brand.navy,
            color: '#fff',
            px: { xs: 1, sm: 1.75 },
            py: { xs: 1.1, sm: 1.5 },
            minHeight: { xs: 72, sm: 88 },
            minWidth: 0,
            borderRadius: 0,
            borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: { xs: 9, sm: 10 }, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.25, color: 'rgba(255,255,255,0.65)' }}>
            {st.label}
          </Typography>
          <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {st.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

const headCellSx = {
  py: 1,
  px: 1.75,
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: brand.muted,
  bgcolor: '#F8FAFC',
  borderBottom: `1px solid ${brand.border}`,
};
const bodyCellSx = {
  py: 1.25,
  px: 1.75,
  fontSize: 13,
  color: brand.navy,
  borderBottom: `1px solid ${brand.border}`,
};

/** Borderless table: only horizontal dividers. columns: [{ key, label, align?, render?(row) }] */
function DataTable({ columns, rows, rowKey, onRowClick }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 360 }}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.key} align={c.align} sx={headCellSx}>{c.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={rowKey ? rowKey(row, i) : i}
              hover={Boolean(onRowClick)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default', '&:last-child td': { borderBottom: 0 } }}
            >
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ ...bodyCellSx, fontWeight: c.strong ? 700 : 400 }}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

const tableBody = { p: 0 };

export default function MyTeaching() {
  const { teacher } = useAuth();
  const { ready, term, academicYear } = useTpAcademic();
  const [today, setToday] = useState(null);
  const [classesData, setClassesData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [homework, setHomework] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [examRooms, setExamRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('today');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [scanMode, setScanMode] = useState(null);
  const [schoolMinutes, setSchoolMinutes] = useState(() => getSchoolTimeMinutes());

  useEffect(() => {
    const id = window.setInterval(() => setSchoolMinutes(getSchoolTimeMinutes()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = tpAcademicParams(term, academicYear);
    try {
      const [todayRes, classesRes, plansRes, homeworkRes, examsRes, assessmentsRes] = await Promise.all([
        fetchTeacherToday(ac),
        fetchMyClasses().catch(() => null),
        listLessonPlansPaginated({ page: '1', pageSize: '8' }).catch(() => ({ items: [] })),
        fetchHomeworkList({ academicYear: academicYear || undefined, term: term || undefined }).catch(() => []),
        fetchMyExamRooms().catch(() => null),
        fetchAssessments(ac).catch(() => []),
      ]);
      setToday(todayRes || null);
      setClassesData(classesRes || null);
      setPlans(Array.isArray(plansRes?.items) ? plansRes.items : []);
      setHomework(Array.isArray(homeworkRes) ? homeworkRes : []);
      setExamRooms(Array.isArray(examsRes?.rooms) ? examsRes.rooms : []);
      setAssessments(Array.isArray(assessmentsRes) ? assessmentsRes : assessmentsRes?.rows || []);
    } catch (err) {
      setError(tpApiError(err, 'Could not load your teaching workspace'));
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  // Keep teaching/courses in sync when timetable or config class changes.
  useAutoRefresh(load, { enabled: ready });

  const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
  const classes = Array.isArray(classesData?.classes) ? classesData.classes : [];
  const selectedLessonState = getTeacherLessonState(selectedLesson, schoolMinutes);
  const selectedLessonScanned = Boolean(selectedLesson?.qrVerified || selectedLesson?.scannedAt);
  const canScanOut = selectedLessonScanned && selectedLesson?.lessonStatus !== 'COMPLETED';
  const canScanIn = ['Next', 'Now'].includes(selectedLessonState?.label || '');

  return (
    <Page>
      <PageHeader
        title="My Teaching"
        description={`Workspace for ${teacher?.first_name || 'you'} · term ${term || '—'}`}
        actions={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()} sx={{ borderColor: brand.border, fontWeight: 700 }}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <NavyStats
        stats={[
          { label: 'Lessons today', value: loading ? '—' : lessons.length },
          { label: 'Classes', value: loading ? '—' : classes.length },
          { label: 'Homework', value: loading ? '—' : homework.length },
          { label: 'Lesson plans', value: loading ? '—' : plans.length },
        ]}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: `1px solid ${brand.border}`, minHeight: 44 }}
      >
        {TABS.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} />
        ))}
      </Tabs>

      {loading ? (
        <PageLoading label="Loading teaching workspace…" />
      ) : tab === 'today' ? (
        <Panel title="Today's lessons" bodySx={tableBody}>
          {!lessons.length ? (
            <Box sx={{ p: 1.75 }}><EmptyState title="No lessons today" /></Box>
          ) : (
            <DataTable
              rows={lessons}
              rowKey={(l, i) => l.id || i}
              onRowClick={setSelectedLesson}
              columns={[
                { key: 'time', label: 'Time', render: (l) => `${clock(l.startTime)} – ${clock(l.endTime)}` },
                { key: 'lesson', label: 'Lesson', strong: true, render: (l) => l.subjectName || l.subject || l.title || 'Lesson' },
                { key: 'class', label: 'Class', render: (l) => l.className || l.class || '—' },
                {
                  key: 'status',
                  label: 'Status',
                  align: 'right',
                  render: (l) => <Chip size="small" label={getTeacherLessonState(l, schoolMinutes).label} sx={{ fontWeight: 600 }} />,
                },
              ]}
            />
          )}
        </Panel>
      ) : tab === 'classes' ? (
        <Panel title="Your classes" bodySx={tableBody}>
          {!classes.length ? (
            <Box sx={{ p: 1.75 }}><EmptyState title="No classes loaded" /></Box>
          ) : (
            <DataTable
              rows={classes}
              rowKey={(c, i) => c.classId || c.className || i}
              columns={[
                { key: 'class', label: 'Class', strong: true, render: (c) => c.className || c.name || '—' },
                { key: 'subject', label: 'Subject', render: (c) => c.subjectName || '—' },
                { key: 'students', label: 'Students', align: 'right', render: (c) => (c.studentsCount != null ? c.studentsCount : '—') },
              ]}
            />
          )}
        </Panel>
      ) : tab === 'plans' ? (
        <Panel
          title="Recent lesson plans"
          action={
            <Button component={RouterLink} to="/lesson-planning/generate" size="small" sx={{ fontWeight: 700 }}>
              New plan
            </Button>
          }
          bodySx={tableBody}
        >
          {!plans.length ? (
            <Box sx={{ p: 1.75 }}><EmptyState title="No lesson plans yet" /></Box>
          ) : (
            <DataTable
              rows={plans}
              rowKey={(p) => p.id}
              columns={[
                { key: 'title', label: 'Plan', strong: true, render: (p) => planTitle(p) },
                { key: 'subject', label: 'Subject', render: (p) => p.subjectName || p.subject || '—' },
                { key: 'class', label: 'Class', render: (p) => p.className || '—' },
              ]}
            />
          )}
        </Panel>
      ) : tab === 'homework' ? (
        <Panel
          title="Homework"
          action={
            <Button component={RouterLink} to="/homework" size="small" sx={{ fontWeight: 700 }}>
              Open hub
            </Button>
          }
          bodySx={tableBody}
        >
          {!homework.length ? (
            <Box sx={{ p: 1.75 }}><EmptyState title="No homework" /></Box>
          ) : (
            <DataTable
              rows={homework.slice(0, 10)}
              rowKey={(h) => h.id}
              columns={[
                { key: 'title', label: 'Homework', strong: true, render: (h) => h.title || '—' },
                { key: 'due', label: 'Due', render: (h) => prettyDate(h.dueDate) || '—' },
                { key: 'status', label: 'Status', align: 'right', render: (h) => h.status || '—' },
              ]}
            />
          )}
        </Panel>
      ) : (
        <Panel title="Exams & assessments" bodySx={tableBody}>
          {!examRooms.length && !assessments.length ? (
            <Box sx={{ p: 1.75 }}><EmptyState title="Nothing scheduled" /></Box>
          ) : (
            <DataTable
              rows={[
                ...examRooms.map((r) => ({
                  key: `room-${r.id || r.roomName}`,
                  type: 'Exam room',
                  name: r.roomName || r.name || 'Exam room',
                  detail: r.examTitle || r.subject || 'Examination',
                })),
                ...assessments.slice(0, 8).map((a) => ({
                  key: `as-${a.id}`,
                  type: 'Assessment',
                  name: a.title || a.assessmentName || 'Assessment',
                  detail: [prettyDate(a.assessmentDate), a.className].filter(Boolean).join(' · ') || '—',
                })),
              ]}
              rowKey={(r) => r.key}
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'name', label: 'Name', strong: true },
                { key: 'detail', label: 'Details' },
              ]}
            />
          )}
        </Panel>
      )}

      <BottomSheet open={Boolean(selectedLesson)} onClose={() => setSelectedLesson(null)}>
        {selectedLesson ? (
          <Box sx={{ p: 2.5, pr: { xs: 2.5, lg: 7 } }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: brand.navy }}>
              {selectedLesson.subjectName || selectedLesson.subject || selectedLesson.title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: brand.muted, mt: 0.5 }}>
              {clock(selectedLesson.startTime)} – {clock(selectedLesson.endTime)} · {selectedLesson.className || selectedLesson.class}
            </Typography>
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
              {(canScanOut || canScanIn) && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<QrCodeScannerOutlinedIcon />}
                  onClick={() => {
                    setScanMode(canScanOut ? 'out' : 'in');
                    setSelectedLesson(null);
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  {canScanOut ? 'Scan to clock out' : 'Scan to enter class'}
                </Button>
              )}
            </Stack>
          </Box>
        ) : null}
      </BottomSheet>

      <ClassRoomScanSheet
        open={Boolean(scanMode)}
        mode={scanMode || 'in'}
        onClose={() => setScanMode(null)}
        onSuccess={() => void load()}
      />
    </Page>
  );
}
