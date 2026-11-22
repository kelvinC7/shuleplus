import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';
import { Page, PageHeader, Panel, PageLoading, EmptyState } from '../components/ui';
import { brand } from '../theme/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLOR = {
  HOLIDAY: brand.danger,
  EXAM: brand.warning,
  SPORT: brand.success,
  CEREMONY: '#7e22ce',
  MEETING: '#3b82f6',
  TERM: '#6366f1',
  OTHER: brand.muted,
};

function calendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SchoolCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/school/calendar-events', { params: { year, month: month + 1 } });
      if (res.data?.success) setEvents(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const d = new Date(e.event_date).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [events]);

  const cells = calendarGrid(year, month);
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;
  const dayEvents = selectedDay ? eventsByDay[selectedDay] || [] : [];
  const upcomingEvents = events.filter((e) => new Date(e.event_date) >= new Date(today.toDateString())).slice(0, 5);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  return (
    <Page>
      <PageHeader
        title="School calendar"
        description="Events, holidays, exams and important dates."
        actions={
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()} sx={{ borderColor: brand.border, fontWeight: 700 }}>
            Refresh
          </Button>
        }
      />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <Panel
          title={`${MONTHS[month]} ${year}`}
          action={
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={prevMonth} aria-label="Previous month">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton size="small" onClick={nextMonth} aria-label="Next month">
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          }
        >
          {loading ? (
            <PageLoading label="Loading calendar…" />
          ) : (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                {DAYS.map((d) => (
                  <Typography key={d} sx={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: brand.muted, py: 0.5 }}>
                    {d}
                  </Typography>
                ))}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {cells.map((day, i) => {
                  const has = day && eventsByDay[day]?.length;
                  const isToday = day === todayDay;
                  const isSelected = day === selectedDay;
                  return (
                    <Box
                      key={i}
                      component={day ? 'button' : 'div'}
                      type={day ? 'button' : undefined}
                      onClick={day ? () => setSelectedDay(day) : undefined}
                      sx={{
                        aspectRatio: '1',
                        border: `1px solid ${isSelected ? brand.navy : brand.border}`,
                        borderRadius: 1.5,
                        bgcolor: isSelected ? brand.navy : isToday ? 'rgba(245,166,35,0.12)' : '#fff',
                        color: isSelected ? '#fff' : brand.navy,
                        fontWeight: isToday || isSelected ? 800 : 500,
                        fontSize: 13,
                        cursor: day ? 'pointer' : 'default',
                        position: 'relative',
                        fontFamily: 'inherit',
                      }}
                    >
                      {day || ''}
                      {has ? (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: isSelected ? brand.primary : brand.primaryStrong,
                          }}
                        />
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Panel>

        <Stack spacing={2}>
          <Panel title={selectedDay ? `${MONTHS[month]} ${selectedDay}` : 'Select a day'}>
            {!selectedDay ? (
              <Typography sx={{ fontSize: 13, color: brand.muted }}>Tap a date to see events.</Typography>
            ) : !dayEvents.length ? (
              <EmptyState title="No events" description="Nothing scheduled this day." />
            ) : (
              <Stack spacing={1}>
                {dayEvents.map((e) => (
                  <Paper key={e.id || e.event_date + e.title} variant="outlined" sx={{ p: 1.5, borderColor: brand.border }}>
                    <Chip
                      size="small"
                      label={e.event_type || 'OTHER'}
                      sx={{
                        mb: 0.75,
                        fontWeight: 700,
                        fontSize: 10,
                        bgcolor: `${TYPE_COLOR[e.event_type] || brand.muted}22`,
                        color: TYPE_COLOR[e.event_type] || brand.muted,
                      }}
                    />
                    <Typography sx={{ fontWeight: 700, color: brand.navy, fontSize: 14 }}>{e.title}</Typography>
                    {e.description ? (
                      <Typography sx={{ fontSize: 12, color: brand.muted, mt: 0.5 }}>{e.description}</Typography>
                    ) : null}
                  </Paper>
                ))}
              </Stack>
            )}
          </Panel>

          <Panel title="Upcoming">
            {!upcomingEvents.length ? (
              <Typography sx={{ fontSize: 13, color: brand.muted }}>No upcoming events this month.</Typography>
            ) : (
              <Stack spacing={1}>
                {upcomingEvents.map((e) => (
                  <Box key={e.id || e.title + e.event_date}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted }}>{fmtDate(e.event_date)}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{e.title}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Panel>
        </Stack>
      </Box>
    </Page>
  );
}
