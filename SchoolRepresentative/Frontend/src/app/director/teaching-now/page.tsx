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
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, FilterBar, PageLoading, SearchInput } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { TeachingNowData } from '@/types';

export default function TeachingNowPage() {
  const { scope, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<TeachingNowData>(
    () => consoleApi.teachingNow(scope),
    [scope.organizationId, refreshKey]
  );

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const sessions = useMemo(() => {
    let rows = data?.sessions ?? data?.items ?? [];
    if (status) rows = rows.filter((s: any) => s.status === status);
    if (search.trim()) {
      const n = search.trim().toLowerCase();
      rows = rows.filter((s: any) => `${s.className} ${s.subject} ${s.teacher} ${s.branch}`.toLowerCase().includes(n));
    }
    return rows;
  }, [data, status, search]);

  if (loading && !data) return <PageLoading label="Loading live classes…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No sessions" />;

  const summary = data.summary ?? {};

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Teaching Now"
        description={`Classes in session now — teaching, covers, gaps and late starts. Period ${summary.period ?? '—'} · ${summary.time ?? ''}`}
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Teaching" value={summary.teaching ?? 0} icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Covers" value={summary.cover ?? 0} icon={<LiveTvOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="No teacher" value={summary.gaps ?? 0} icon={<ErrorOutlineIcon sx={{ fontSize: 20 }} />} valueSx={(summary.gaps ?? 0) > 0 ? { color: brand.danger } : undefined} />
          <KpiCard label="Late start" value={summary.late ?? 0} icon={<AccessTimeIcon sx={{ fontSize: 20 }} />} valueSx={(summary.late ?? 0) > 0 ? { color: brand.warning } : undefined} />
        </StatsGrid>
      </Box>

      <PanelCard
        title="Live sessions"
        action={
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
            {sessions.length} classes
          </Typography>
        }
        bodySx={{ px: 0, pt: 0 }}
      >
        <Box sx={{ px: 2.5, pt: 0.5 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search class, subject, teacher…"
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
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: { xs: 96, sm: 140 } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="teaching">Teaching</MenuItem>
              <MenuItem value="cover">Cover</MenuItem>
              <MenuItem value="gap">Gap</MenuItem>
              <MenuItem value="late">Late</MenuItem>
            </TextField>
          </FilterBar>
        </Box>
        {!sessions.length ? (
          <EmptyState title="No sessions match" />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Class</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Room</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((s: any) => (
                  <TableRow key={s.id ?? `${s.className}-${s.subject}`} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{s.className}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{s.subject}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{s.teacher ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.branch ?? s.schoolName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{s.room ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={s.status} />
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
