'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard, ChartCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, FilterBar, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { AcademicsData } from '@/types';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

export default function AcademicsPage() {
  const { scope, ctx, refreshKey } = useConsole();
  const [className, setClassName] = useState('');
  const [course, setCourse] = useState('');

  const { data, loading, error, reload } = useConsoleFetch<AcademicsData>(
    () => consoleApi.academics({ ...scope, className: className || undefined, course: course || undefined }),
    [scope.organizationId, scope.academicYear, scope.term, className, course, refreshKey]
  );

  const trend = useMemo(
    () => (data?.trend ?? []).map((p: any) => ({ label: p.label ?? p.period, average: p.average ?? p.score })),
    [data]
  );

  if (loading && !data) return <PageLoading label="Loading academics…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No academic data" />;

  const summary = data.summary ?? {};
  const results = data.results ?? data.classes ?? [];

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Academic Management"
        description="Teaching quality, results and marking progress across levels."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Average score" value={formatPct(summary.average ?? 0)} icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Pass rate" value={formatPct(summary.passRate ?? 0)} icon={<SchoolOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Students assessed" value={formatNumber(summary.students ?? 0)} icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Mark entries" value={formatNumber(summary.entries ?? 0)} icon={<GppMaybeOutlinedIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <FilterBar sx={{ alignItems: 'flex-end' }}>
        <TextField
          select
          variant="standard"
          size="small"
          label="Class"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 140 }, flex: 1 }}
        >
          <MenuItem value="">All classes</MenuItem>
          {(data.filters?.classes ?? []).map((c: string) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
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
          label="Course"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 140 }, flex: 1 }}
        >
          <MenuItem value="">All courses</MenuItem>
          {(data.filters?.courses ?? []).map((c: string) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>
      </FilterBar>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, mb: 2 }}>
        <ChartCard title="Score trend" subtitle="Average over recent assessments" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="average" stroke={brand.primary} strokeWidth={3} dot={{ r: 4, fill: brand.primary }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="Subject completion" subtitle="Marking progress">
          <Stack spacing={1.5}>
            {(data.subjects ?? []).map((subject: any) => (
              <Box key={subject.name}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{subject.name}</Typography>
                  <StatusBadge value={subject.completion >= 90 ? 'good' : subject.completion >= 85 ? 'review' : 'attention'} />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, subject.completion ?? 0)}
                  sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(0,4,53,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: brand.primary } }}
                />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>{formatPct(subject.completion)} complete</Typography>
              </Box>
            ))}
          </Stack>
        </PanelCard>
      </Box>

      <PanelCard title="Class results" bodySx={{ px: 0, pt: 0 }}>
        {!results.length ? (
          <EmptyState title="No class results" />
        ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="right">Average</TableCell>
                <TableCell align="right">Pass rate</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((row: any, i: number) => (
                <TableRow key={row.id ?? i} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{row.className ?? row.class}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12 }}>{row.subject ?? '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatPct(row.average ?? row.score ?? 0)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 12 }}>{formatPct(row.passRate ?? 0)}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.status ?? ((row.average ?? 0) >= 50 ? 'good' : 'attention')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </PanelCard>
    </Box>
  );
}
