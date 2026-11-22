'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { toast } from 'sonner';
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
import { formatFrw, formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { HrData, StaffData } from '@/types';

type PersonRow = StaffData['items'][number];

export default function HrPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading HR data…" />}>
      <HrPageContent />
    </Suspense>
  );
}

function HrPageContent() {
  const searchParams = useSearchParams();
  const { scope, ctx, refreshKey } = useConsole();

  const { data, loading, error, reload } = useConsoleFetch<HrData>(
    () => consoleApi.hr(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const { page, pageSize, setPage, setPageSize } = useServerPagination(`${search}|${department}|${scope.organizationId}`);

  const staffParams = useMemo(
    () => ({
      organizationId: scope.organizationId,
      search: search || undefined,
      department: department || undefined,
      page,
      pageSize,
    }),
    [scope.organizationId, search, department, page, pageSize]
  );

  const staffQuery = useConsoleFetch<StaffData>(() => consoleApi.staff(staffParams), [
    scope.organizationId,
    search,
    department,
    page,
    pageSize,
    refreshKey,
  ]);

  const [profile, setProfile] = useState<PersonRow | null>(null);

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (!focus) return;
    consoleApi
      .staff({ search: '' })
      .then((all) => {
        const found = all.items.find((row) => row.id === focus) ?? null;
        if (found) setProfile(found);
        else toast.info('Staff member not in the visible page');
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) return <PageLoading label="Loading HR data…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No HR data" />;

  const summary = data.summary;
  const staff = staffQuery.data;
  const rangeStart = staff && staff.pagination.total ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = staff ? Math.min(page * pageSize, staff.pagination.total) : 0;

  const branchName =
    scope.organizationId === 'all'
      ? 'All branches'
      : (ctx?.branches.find((b) => b.id === scope.organizationId)?.name ?? 'Branch');

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="HR & Payroll"
        description={`${branchName} — staff, attendance, leave, workload and payroll overview.`}
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Total employees" value={formatNumber(summary.totalEmployees)} icon={<WorkOutlineIcon sx={{ fontSize: 20 }} />} />
          <KpiCard
            label="Staff attendance"
            value={formatPct(summary.attendanceRate)}
            icon={<EventAvailableOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard label="On leave" value={formatNumber(summary.onLeave)} icon={<BeachAccessOutlinedIcon sx={{ fontSize: 20 }} />} />
          <KpiCard
            label="Monthly payroll"
            value={formatFrw(summary.monthlyPayroll, { compact: true })}
            icon={<PaymentsOutlinedIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <PanelCard title="Staff directory" subtitle={`${staff?.pagination.total ?? 0} people`} bodySx={{ px: 0, pt: 0 }}>
        <Box sx={{ px: 2.5, pt: 1 }}>
          <FilterBar sx={{ alignItems: 'flex-end' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name or role…"
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
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              sx={{ minWidth: { xs: 96, sm: 160 } }}
            >
              <MenuItem value="">All departments</MenuItem>
              {(data.departments ?? []).map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
          </FilterBar>
        </Box>

        {staffQuery.loading && !staff ? (
          <PageLoading label="Loading staff…" />
        ) : staffQuery.error && !staff ? (
          <ErrorState message={staffQuery.error} onRetry={staffQuery.reload} />
        ) : !staff?.items.length ? (
          <EmptyState title="No staff match" />
        ) : (
          <>
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staff.items.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => setProfile(row)}>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{row.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{row.role}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.department}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.branch ?? row.schoolName}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack spacing={1} sx={{ display: { xs: 'flex', md: 'none' }, px: 2, pb: 1 }}>
              {staff.items.map((row) => (
                <Box
                  key={row.id}
                  onClick={() => setProfile(row)}
                  sx={{ p: 1.5, borderRadius: 1.25, border: `1px solid ${brand.border}`, cursor: 'pointer' }}
                >
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{row.name}</Typography>
                    <StatusBadge value={row.status} />
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                    {row.role} · {row.department}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <TablePagination
              page={page}
              pageSize={pageSize}
              total={staff.pagination.total}
              totalPages={staff.pagination.totalPages}
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
        open={Boolean(profile)}
        onClose={() => setProfile(null)}
        title={profile?.name ?? 'Staff'}
        subtitle={profile?.role}
        status={profile ? <StatusBadge value={profile.status} /> : undefined}
        width="md"
      >
        {profile ? (
          <DrawerSection title="Profile">
            <FieldList
              items={[
                { label: 'Role', value: profile.role },
                { label: 'Department', value: profile.department },
                { label: 'Branch', value: profile.branch ?? profile.schoolName },
                { label: 'Status', value: <StatusBadge value={profile.status} /> },
                { label: 'Email', value: profile.email ?? '—' },
                { label: 'Phone', value: profile.phone ?? '—' },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}
