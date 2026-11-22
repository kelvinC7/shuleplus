'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
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
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, FilterBar, PageLoading, SearchInput } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatDate } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { DisciplineData } from '@/types';

type Case = DisciplineData['cases'][number];

export default function DisciplinePage() {
  const { scope, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<DisciplineData>(
    () => consoleApi.discipline(scope.organizationId),
    [scope.organizationId, refreshKey]
  );

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [selected, setSelected] = useState<Case | null>(null);

  const cases = useMemo(() => {
    let rows = data?.cases ?? [];
    if (severity) rows = rows.filter((c) => c.severity === severity);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter((c) =>
        `${c.id} ${c.title} ${c.branch} ${c.category} ${c.owner}`.toLowerCase().includes(needle)
      );
    }
    return rows;
  }, [data, severity, search]);

  if (loading && !data) return <PageLoading label="Loading discipline records…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No discipline data" />;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Discipline"
        description="Conduct cases and positive behaviour records — follow-up and parent notification tracked per case."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Open cases" value={data.summary.open} icon={<GavelOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard
            label="High severity"
            value={data.summary.high ?? data.summary.serious}
            icon={<GppMaybeOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={(data.summary.high ?? data.summary.serious) > 0 ? { color: brand.danger } : undefined}
          />
          <KpiCard
            label="Resolved (term)"
            value={data.summary.resolved ?? data.summary.resolvedThisTerm}
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Positive notes"
            value={data.summary.positive ?? data.summary.positiveNotes}
            icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <PanelCard title="Cases" subtitle={`${cases.length} matching`} bodySx={{ px: 0, pt: 0 }}>
        <Box sx={{ px: 2.5, pt: 1 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search case, class, owner…"
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
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              label="Severity"
              sx={{ minWidth: { xs: 96, sm: 140 } }}
            >
              <MenuItem value="">All severities</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </TextField>
          </FilterBar>
        </Box>

        {!cases.length ? (
          <EmptyState title="No cases match" hint="Try a different search or severity." icon={<GavelOutlinedIcon />} />
        ) : (
          <>
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Case</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Opened</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{c.title}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{c.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{c.branch}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{c.category}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={c.severity} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{c.owner}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={c.status} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{formatDate(c.reportedAt ?? c.openedAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, px: 2, pb: 2 }}>
              {cases.map((c) => (
                <Box
                  key={c.id}
                  onClick={() => setSelected(c)}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.25,
                    border: `1px solid ${brand.border}`,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(248,249,252,0.9)' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{c.title}</Typography>
                    <StatusBadge value={c.severity} />
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                    {c.branch} · {c.category} · {c.owner}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <StatusBadge value={c.status} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{formatDate(c.openedAt)}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </PanelCard>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Case'}
        subtitle={selected ? `${selected.id} · ${selected.branch}` : ''}
        status={selected ? <StatusBadge value={selected.status} /> : undefined}
        width="md"
      >
        {selected ? (
          <DrawerSection title="Details">
            <FieldList
              items={[
                { label: 'Category', value: selected.category },
                { label: 'Severity', value: <StatusBadge value={selected.severity} /> },
                { label: 'Owner', value: selected.owner },
                { label: 'Opened', value: formatDate(selected.reportedAt ?? selected.openedAt) },
                { label: 'Branch', value: selected.branch },
                { label: 'Notes', value: selected.notes ?? '—' },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}
