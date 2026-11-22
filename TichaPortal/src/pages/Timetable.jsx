import { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewDayOutlinedIcon from '@mui/icons-material/ViewDayOutlined';
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchTeacherSchedule, fetchTeacherLive, flattenScheduleByDay } from '../services/teacherPortalApi';
import { PageLoading, EmptyState } from '../components/ui';
import {
  ListPage,
  CardTabs,
  StickyFilterBar,
  BarSelect,
  ListPageBody,
  PageTitleRow,
  NavyStats,
  SectionPaper,
} from '../components/ListPageKit';
import { brand } from '../theme/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function Timetable() {
  const { ready, settings, term: ctxTerm, academicYear: ctxYear } = useTpAcademic();
  const [view, setView] = useState('list');
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday');
  const [schedule, setSchedule] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ classes: [], terms: [], academicYears: [], courses: [] });
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState(null);
  const gridRef = useRef(null);

  const loadLive = useCallback(async () => {
    try {
      setLiveData(await fetchTeacherLive());
    } catch {
      setLiveData(null);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    setFilterOptions((prev) => ({
      ...prev,
      terms: settings?.terms || prev.terms,
      academicYears: settings?.academicYears || prev.academicYears,
    }));
    if (ctxTerm) setSelectedTerm(ctxTerm);
    if (ctxYear) setSelectedAcademicYear(ctxYear);
  }, [ready, settings, ctxTerm, ctxYear]);

  const loadSchedule = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await fetchTeacherSchedule('weekly', {
          term: selectedTerm || undefined,
          academicYear: selectedAcademicYear || undefined,
          className: selectedClass || undefined,
          course: selectedCourse || undefined,
        });
        setSchedule(flattenScheduleByDay(data));
        setFilterOptions((prev) => ({
          ...prev,
          classes: Array.isArray(data?.classes) && data.classes.length ? data.classes : prev.classes,
          courses: Array.isArray(data?.courses) && data.courses.length ? data.courses : prev.courses,
          terms: prev.terms.length ? prev.terms : settings?.terms || [],
          academicYears: prev.academicYears.length ? prev.academicYears : settings?.academicYears || [],
        }));
      } catch {
        setSchedule([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedClass, selectedTerm, selectedAcademicYear, selectedCourse, settings]
  );

  useEffect(() => {
    if (!ready) return;
    void loadSchedule();
  }, [ready, loadSchedule]);

  useEffect(() => {
    if (!ready) return;
    void loadLive();
    const interval = setInterval(() => {
      void loadLive();
      void loadSchedule(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [ready, loadLive, loadSchedule]);

  const daySchedule = schedule.filter((s) => s.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  const allTimes = [...new Set(schedule.map((s) => s.time))].sort();
  const weeklyClassCount = new Set(schedule.map((s) => s.group).filter(Boolean)).size;

  const dayTabs = DAYS.map((d) => ({ id: d, label: d.slice(0, 3) }));

  const stats = [
    { label: 'Lessons this week', value: loading ? '—' : schedule.length },
    { label: 'Classes', value: loading ? '—' : weeklyClassCount },
    { label: 'Live now', value: liveData?.currentLesson ? 1 : 0 },
  ];

  return (
    <ListPage>
      <StickyFilterBar>
        <BarSelect label="Class" value={selectedClass} onChange={setSelectedClass} options={filterOptions.classes} allLabel="All classes" />
        <BarSelect label="Course" value={selectedCourse} onChange={setSelectedCourse} options={filterOptions.courses} allLabel="All courses" />
        <BarSelect label="Term" value={selectedTerm} onChange={setSelectedTerm} options={filterOptions.terms || []} allLabel="All terms" flex={0.85} />
      </StickyFilterBar>

      <ListPageBody>
        <PageTitleRow
          title="Timetable"
          subtitle={liveData?.currentLesson?.subject ? `Live now: ${liveData.currentLesson.subject}` : 'Your weekly teaching schedule'}
          actions={
            <>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)} sx={{ bgcolor: '#fff' }}>
                <ToggleButton value="list" sx={{ textTransform: 'none', gap: 0.5, px: 1.5 }}>
                  <ViewDayOutlinedIcon sx={{ fontSize: 16 }} /> Day
                </ToggleButton>
                <ToggleButton value="grid" sx={{ textTransform: 'none', gap: 0.5, px: 1.5 }}>
                  <ViewWeekOutlinedIcon sx={{ fontSize: 16 }} /> Week
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => void loadSchedule()}
                sx={{ borderColor: brand.border, fontWeight: 700, textTransform: 'none' }}
              >
                Refresh
              </Button>
            </>
          }
        />

        <NavyStats stats={stats} />

        {view === 'list' ? (
          <SectionPaper title="Schedule" count={daySchedule.length}>
            <CardTabs tabs={dayTabs} value={selectedDay} onChange={setSelectedDay} />
            {loading ? (
              <PageLoading label="Loading timetable…" />
            ) : !daySchedule.length ? (
              <EmptyState title="No lessons this day" />
            ) : (
              <Stack>
                {daySchedule.map((session, i) => (
                  <Stack
                    key={`${session.time}-${session.subject}-${i}`}
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                    sx={{
                      px: 1.5,
                      py: 1.35,
                      bgcolor: i % 2 === 1 ? '#F8F9FC' : '#fff',
                      borderBottom: i < daySchedule.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                    }}
                  >
                    <Box sx={{ minWidth: 72 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: brand.navy }}>{session.time}</Typography>
                      {session.endTime ? <Typography sx={{ fontSize: 11, color: brand.muted }}>{session.endTime}</Typography> : null}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>{session.subject}</Typography>
                      <Typography sx={{ fontSize: 12, color: brand.muted }}>
                        {session.group}
                        {session.periodLabel ? ` · ${session.periodLabel}` : ''}
                      </Typography>
                      {session.room ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                          <PlaceOutlinedIcon sx={{ fontSize: 14, color: brand.muted }} />
                          <Typography sx={{ fontSize: 12, color: brand.muted }}>{session.room}</Typography>
                        </Stack>
                      ) : null}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionPaper>
        ) : (
          <SectionPaper title="Week grid" count={schedule.length}>
            {loading ? (
              <PageLoading label="Loading timetable…" />
            ) : !allTimes.length ? (
              <EmptyState title="No lessons this week" />
            ) : (
              <Box sx={{ overflowX: 'auto', p: 1.5 }}>
                <Box ref={gridRef} sx={{ minWidth: 640 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)`, gap: 0.75 }}>
                    <Box />
                    {DAYS.map((d) => (
                      <Typography key={d} sx={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: brand.navy }}>
                        {d.slice(0, 3)}
                      </Typography>
                    ))}
                    {allTimes.map((time) => (
                      <Box key={time} sx={{ display: 'contents' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, pt: 1 }}>{time}</Typography>
                        {DAYS.map((day) => {
                          const session = schedule.find((s) => s.day === day && s.time === time);
                          return (
                            <Paper
                              key={`${day}-${time}`}
                              variant="outlined"
                              sx={{
                                minHeight: 72,
                                p: 1,
                                bgcolor: session ? 'rgba(245,166,35,0.08)' : 'transparent',
                                borderColor: session ? 'rgba(245,166,35,0.35)' : brand.border,
                              }}
                            >
                              {session ? (
                                <>
                                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: brand.navy }}>{session.subject}</Typography>
                                  <Typography sx={{ fontSize: 10, color: brand.muted }}>{session.group}</Typography>
                                </>
                              ) : null}
                            </Paper>
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </SectionPaper>
        )}
      </ListPageBody>
    </ListPage>
  );
}
