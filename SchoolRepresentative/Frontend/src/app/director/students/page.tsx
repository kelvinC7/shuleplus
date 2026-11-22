'use client';

import { useState, useMemo } from 'react';
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
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageLoading,
  SearchInput,
  TablePagination,
  useServerPagination,
} from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { StudentsData } from '@/types';

type StudentRow = StudentsData['items'][number];

export default function StudentsPage() {
  const { scope, refreshKey } = useConsole();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const { page, pageSize, setPage, setPageSize } = useServerPagination(`${search}|${level}|${scope.organizationId}`);

  const { data, loading, error, reload } = useConsoleFetch<StudentsData>(
    () =>
      consoleApi.students({
        ...scope,
        search: search || undefined,
        level: level || undefined,
        page,
        pageSize,
      }),
    [scope.organizationId, scope.academicYear, scope.term, search, level, page, pageSize, refreshKey]
  );

  if (loading && !data) return <PageLoading label="Loading students…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No students" />;

  const total = data.pagination?.total ?? data.items.length;
  const totalPages = data.pagination?.totalPages ?? 1;
  const rangeStart = total ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Student Management"
        description="Learner records and enrolment information (permission-controlled)."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={3} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Students" value={formatNumber(total)} icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Classes" value={formatNumber(data.summary?.classes ?? data.filters?.classes?.length ?? 0)} icon={<SchoolOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard label="Active" value={formatNumber(data.summary?.active ?? total)} icon={<BadgeOutlinedIcon sx={{ fontSize: 20 }} />} />
        </StatsGrid>
      </Box>

      <PanelCard title="Directory" subtitle={`${total} learners`} bodySx={{ px: 0, pt: 0 }}>
        <Box sx={{ px: 2.5, pt: 1 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name or ID…"
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
              label="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              sx={{ minWidth: { xs: 96, sm: 140 } }}
            >
              <MenuItem value="">All levels</MenuItem>
              {(data.filters?.levels ?? ['Nursery', 'Primary', 'Secondary']).map((l) => (
                <MenuItem key={l} value={l}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
          </FilterBar>
        </Box>

        {!data.items.length ? (
          <EmptyState title="No students match" />
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(row)}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{row.name}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{row.studentCode ?? row.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{row.className ?? row.class}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.branch ?? row.schoolName}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={row.status ?? 'active'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s as typeof pageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </PanelCard>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'Student'}
        subtitle={selected?.studentCode ?? selected?.id}
        status={selected ? <StatusBadge value={selected.status ?? 'active'} /> : undefined}
        width="md"
      >
        {selected ? (
          <DrawerSection title="Record">
            <FieldList
              items={[
                { label: 'Class', value: selected.className ?? selected.class },
                { label: 'Branch', value: selected.branch ?? selected.schoolName },
                { label: 'Gender', value: selected.gender ?? '—' },
                { label: 'Status', value: <StatusBadge value={selected.status ?? 'active'} /> },
                { label: 'Guardian', value: selected.guardianName ?? selected.parentName ?? '—' },
                { label: 'Phone', value: selected.guardianPhone ?? selected.phone ?? '—' },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}
