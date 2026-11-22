'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, FilterBar, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { TimetableData, TimetableEntry } from '@/types';

type TimetableView = 'class' | 'school';

const SUBJECT_PALETTE = [
  { bg: 'rgba(22,138,85,0.1)', color: '#0f6b42', ring: 'rgba(22,138,85,0.25)' },
  { bg: 'rgba(62,123,250,0.1)', color: '#1d4ed8', ring: 'rgba(62,123,250,0.25)' },
  { bg: 'rgba(217,144,19,0.12)', color: '#92400e', ring: 'rgba(217,144,19,0.3)' },
  { bg: 'rgba(124,58,237,0.1)', color: '#5b21b6', ring: 'rgba(124,58,237,0.25)' },
  { bg: 'rgba(214,69,69,0.1)', color: '#9f1239', ring: 'rgba(214,69,69,0.25)' },
  { bg: 'rgba(13,148,136,0.1)', color: '#0f766e', ring: 'rgba(13,148,136,0.25)' },
];

function toneFor(subject: string) {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

export default function TimetablePage() {
  const { scope, refreshKey } = useConsole();
  const [view, setView] = useState<TimetableView>('class');
  const [classFilter, setClassFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  const organizationId = scope.organizationId;

  const { data, loading, error, reload } = useConsoleFetch<TimetableData>(
    () =>
      consoleApi.timetable({
        organizationId: organizationId === 'all' ? undefined : organizationId,
        teacherId: teacherFilter || undefined,
      }),
    [organizationId, teacherFilter, refreshKey]
  );

  const classes = data?.filterOptions.classes ?? [];
  const selectedClass = view === 'class' ? classFilter || classes[0] || '' : classFilter;

  const visible: TimetableEntry[] = useMemo(() => {
    const entries = data?.entries ?? [];
    if (view === 'class') return entries.filter((e) => e.className === selectedClass);
    return classFilter ? entries.filter((e) => e.className === classFilter) : entries;
  }, [data, view, selectedClass, classFilter]);

  const cellsFor = (day: string, start: string) =>
    visible.filter((e) => e.day === day && e.startTime === start).sort((a, b) => a.className.localeCompare(b.className));

  if (loading && !data) return <PageLoading label="Loading timetable…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data || !data.entries.length) {
    return (
      <Box sx={pageSx}>
        <DirectorPageHeader title="Timetable" description="Weekly teaching schedule from the Timetable module." />
        <EmptyState title="No timetable yet" hint="Timetables appear once classes are published in the Timetable module." />
      </Box>
    );
  }

  const teacherName = teacherFilter ? data.filterOptions.teachers.find((t) => t.id === teacherFilter)?.name : undefined;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Timetable"
        description={
          view === 'class'
            ? `Class timetable${selectedClass ? ` · ${selectedClass}` : ''}${teacherName ? ` · ${teacherName}` : ''}`
            : `Whole-school timetable${teacherName ? ` · ${teacherName}` : ''}`
        }
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Lessons" value={formatNumber(data.summary.entries)} icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Classes" value={formatNumber(data.summary.classes)} icon={<LayersOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Teachers" value={formatNumber(data.summary.teachers)} icon={<PersonOutlineIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Subjects" value={formatNumber(data.summary.subjects)} icon={<SchoolOutlinedIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, v) => v && setView(v)}
          sx={{ bgcolor: 'rgba(0,4,53,0.04)', borderRadius: 2, p: 0.5 }}
        >
          <ToggleButton value="class" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1.5, border: 'none', borderRadius: '8px !important' }}>
            <LayersOutlinedIcon sx={{ fontSize: 14, mr: 0.75 }} /> By class
          </ToggleButton>
          <ToggleButton value="school" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, px: 1.5, border: 'none', borderRadius: '8px !important' }}>
            <ApartmentIcon sx={{ fontSize: 14, mr: 0.75 }} /> Whole school
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <FilterBar sx={{ alignItems: 'flex-end' }}>
        <TextField
          select
          variant="standard"
          size="small"
          label="Class"
          value={classFilter || (view === 'class' ? selectedClass : '')}
          onChange={(e) => setClassFilter(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 140 }, flex: 1 }}
        >
          {view === 'school' ? <MenuItem value="">All classes</MenuItem> : null}
          {classes.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <Divider
          orientation="vertical"
          sx={{ alignSelf: 'flex-end', height: 24, mb: 0.5, borderColor: brand.border }}
        />
        <TextField
          select
          variant="standard"
          size="small"
          label="Teacher"
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 180 }, flex: 1 }}
        >
          <MenuItem value="">All teachers</MenuItem>
          {data.filterOptions.teachers.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
      </FilterBar>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '3fr 1fr' },
        }}
      >
        <PanelCard
          title={view === 'class' ? `${selectedClass || 'Class'} · weekly timetable` : 'Whole-school weekly timetable'}
          subtitle={
            view === 'class'
              ? `${visible.length} lessons this week`
              : `${visible.length} lessons across ${new Set(visible.map((e) => e.className)).size} classes`
          }
          bodySx={{ px: 0, pt: 0, overflowX: 'auto' }}
        >
          {!visible.length ? (
            <EmptyState title="No lessons match" hint="Try another class or teacher." />
          ) : (
            <Box sx={{ minWidth: 720, p: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `7rem repeat(${data.days.length}, 1fr)`,
                  gap: 0,
                }}
              >
                <Typography sx={{ px: 1.5, py: 1.5, fontSize: 10, fontWeight: 800, color: 'text.secondary' }}>
                  Time
                </Typography>
                {data.days.map((day) => (
                  <Typography
                    key={day}
                    sx={{ px: 1, py: 1.5, fontSize: 10, fontWeight: 800, color: 'text.secondary' }}
                  >
                    {day.slice(0, 3)}
                  </Typography>
                ))}

                {data.slots.map((slot) => (
                  <Box key={slot.start} sx={{ display: 'contents' }}>
                    <Box sx={{ px: 1.5, py: 1, borderTop: `1px solid ${brand.border}` }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{slot.start}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{slot.end}</Typography>
                    </Box>
                    {data.days.map((day) => {
                      const cells = cellsFor(day, slot.start);
                      return (
                        <Box key={day} sx={{ px: 0.75, py: 0.75, borderTop: `1px solid ${brand.border}`, verticalAlign: 'top' }}>
                          {cells.length === 0 ? null : (
                            <Stack spacing={0.75}>
                              {cells.slice(0, 3).map((entry) => (
                                <LessonCard key={`${entry.id}-${entry.className}`} entry={entry} />
                              ))}
                              {cells.length > 3 ? (
                                <Typography sx={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                                  +{cells.length - 3} more
                                </Typography>
                              ) : null}
                            </Stack>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </PanelCard>

        <Stack spacing={2}>
          <PanelCard title="Teacher workload" subtitle="Lessons per week">
            <Stack spacing={1.25}>
              {data.teacherLoad.slice(0, 10).map((t) => {
                const max = data.teacherLoad[0]?.periods || 1;
                return (
                  <Stack key={t.id} direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, color: brand.navy }}>
                        {t.name}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(t.periods / max) * 100}
                        sx={{
                          mt: 0.75,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'rgba(0,4,53,0.06)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: t.periods >= 24 ? brand.danger : brand.primary,
                          },
                        }}
                      />
                    </Box>
                    <Typography sx={{ width: 36, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                      {t.periods}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </PanelCard>

          <PanelCard title="Subjects" subtitle="Colour key">
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {[...new Set(visible.map((e) => e.subject))].sort().map((s) => {
                const tone = toneFor(s);
                return (
                  <Box
                    key={s}
                    sx={{
                      borderRadius: 2,
                      px: 1,
                      py: 0.5,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: tone.bg,
                      color: tone.color,
                      border: `1px solid ${tone.ring}`,
                    }}
                  >
                    {s}
                  </Box>
                );
              })}
            </Stack>
          </PanelCard>
        </Stack>
      </Box>
    </Box>
  );
}

function LessonCard({ entry }: { entry: TimetableEntry }) {
  const tone = toneFor(entry.subject);
  return (
    <Box
      sx={{
        borderRadius: 1.25,
        px: 1.25,
        py: 1,
        bgcolor: tone.bg,
        color: tone.color,
        border: `1px solid ${tone.ring}`,
      }}
    >
      <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>
        {entry.subject}
      </Typography>
      <Typography noWrap sx={{ mt: 0.25, fontSize: 10, fontWeight: 500, opacity: 0.75 }}>
        {entry.teacher}
      </Typography>
      <Typography sx={{ mt: 0.25, fontSize: 10, opacity: 0.6 }}>
        {entry.room ? `Room ${entry.room}` : entry.schoolName}
      </Typography>
    </Box>
  );
}
