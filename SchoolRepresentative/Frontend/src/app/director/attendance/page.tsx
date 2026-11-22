'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard, ChartCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, FilterBar, PageLoading, SearchInput } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatPct, formatNumber } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { AttendanceReportData } from '@/types';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

export default function AttendancePage() {
  const { scope, refreshKey } = useConsole();
  const [search, setSearch] = useState('');
  const [scopeType, setScopeType] = useState('students');

  const { data, loading, error, reload } = useConsoleFetch<AttendanceReportData>(
    () => consoleApi.attendanceReport({ ...scope, scope: scopeType }),
    [scope.organizationId, scope.academicYear, scope.term, scopeType, refreshKey]
  );

  const trend = useMemo(
    () => (data?.trend ?? data?.weeklyTrend ?? []).map((p: any) => ({
      day: p.day ?? p.date,
      students: p.students ?? p.student ?? p.rate,
      staff: p.staff,
    })),
    [data]
  );

  const rows = useMemo(() => {
    const list = data?.classes ?? data?.items ?? data?.records ?? [];
    if (!search.trim()) return list;
    const n = search.trim().toLowerCase();
    return list.filter((r: any) => `${r.name ?? r.className ?? r.label} ${r.branch ?? ''}`.toLowerCase().includes(n));
  }, [data, search]);

  if (loading && !data) return <PageLoading label="Loading attendance…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No attendance data" />;

  const summary = data.summary ?? {};

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Attendance"
        description="Student and staff attendance with capture sources."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Student rate" value={formatPct(summary.studentRate ?? summary.average ?? 0)} icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Staff rate" value={formatPct(summary.staffRate ?? 0)} icon={<PersonOutlineIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Present today" value={formatNumber(summary.present ?? 0)} icon={<EventAvailableOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Absent / late" value={formatNumber((summary.absent ?? 0) + (summary.late ?? 0))} icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />} valueSx={{ color: brand.warning }} />
        </StatsGrid>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, mb: 2 }}>
        <ChartCard title="Weekly trend" subtitle="Attendance rates" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="students" name="Students" stroke={brand.navy} strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="staff" name="Staff" stroke={brand.primary} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="Capture sources" subtitle="How attendance was recorded">
          <Stack spacing={1}>
            {(data.sources ?? [
              { name: 'Biometric', pct: 62 },
              { name: 'Teacher app', pct: 28 },
              { name: 'Manual', pct: 10 },
            ]).map((s: any) => (
              <Stack key={s.name} direction="row" justifyContent="space-between">
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{s.name}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatPct(s.pct ?? s.rate)}</Typography>
              </Stack>
            ))}
          </Stack>
        </PanelCard>
      </Box>

      <PanelCard title="By class" bodySx={{ px: 0, pt: 0 }}>
        <Box sx={{ px: 2.5, pt: 1 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search class…"
              variant="standard"
              sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1 }}
            />
            <Divider
              orientation="vertical"
              sx={{ alignSelf: 'flex-end', height: 24, mb: 0.5, borderColor: brand.border }}
            />
            <TextField
              select
              variant="standard"
              size="small"
              label="Scope"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
              sx={{ minWidth: { xs: 96, sm: 140 } }}
            >
              <MenuItem value="students">Students</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
          </FilterBar>
        </Box>
        {!rows.length ? (
          <EmptyState title="No rows" />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Class / group</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell align="right">Present</TableCell>
                  <TableCell align="right">Absent</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any, i: number) => (
                  <TableRow key={row.id ?? row.className ?? i} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{row.name ?? row.className ?? row.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.branch ?? row.schoolName ?? '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontSize: 12 }}>{row.present ?? '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontSize: 12 }}>{row.absent ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatPct(row.rate ?? row.attendanceRate ?? 0)}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={row.status ?? ((row.rate ?? 0) >= 94 ? 'good' : 'watch')} />
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
