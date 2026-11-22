'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard, ChartCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { BranchesData } from '@/types';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

export default function SchoolsPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading branches…" />}>
      <SchoolsContent />
    </Suspense>
  );
}

function SchoolsContent() {
  const searchParams = useSearchParams();
  const { scope, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<BranchesData>(
    () => consoleApi.branches(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );

  const [detailId, setDetailId] = useState<string | null>(searchParams.get('focus'));

  const comparisonChart = useMemo(
    () =>
      (data?.branches ?? []).map((b) => ({
        name: b.name.length > 14 ? `${b.name.slice(0, 12)}…` : b.name,
        attendance: b.performance?.attendance ?? 0,
        academic: b.performance?.academic ?? 0,
        fees: b.performance?.schoolFees ?? 0,
      })),
    [data]
  );

  if (loading && !data) return <PageLoading label="Loading branches…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No branches" />;

  const active = data.branches.find((b) => b.id === detailId) ?? null;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Schools & Branches"
        description="Manage and compare all branches from one executive workspace."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard label="Branches" value={data.branches.length} icon={<ApartmentIcon sx={{ fontSize: 20 }} />} />
          <KpiCard
            label="Group students"
            value={formatNumber(data.comparison?.students ?? 0)}
            icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Average attendance"
            value={formatPct(data.comparison?.averageAttendance ?? 0)}
            icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Average fee collection"
            value={formatPct(data.comparison?.averageFees ?? 0)}
            icon={<ApartmentIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, mb: 2 }}>
        <ChartCard title="Branch comparison" subtitle="Attendance · academic · fee collection" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChart} margin={{ top: 8, right: 8, left: -8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: brand.muted }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${Number(v)}%`, String(name ?? '')]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="attendance" name="Attendance" fill={brand.primary} radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Bar dataKey="academic" name="Academic" fill={brand.navy2} radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Bar dataKey="fees" name="Fees" fill="#8ea2c6" radius={[6, 6, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="Branch status" subtitle="Thresholds: attendance ≥ 94% · fees ≥ 65%" bodySx={{ px: 0, pt: 0 }}>
          <List disablePadding>
            {data.branches.map((branch) => (
              <ListItemButton
                key={branch.id}
                onClick={() => setDetailId(branch.id)}
                sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${brand.border}`, gap: 1.5 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>
                    {branch.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {branch.district ?? '—'} · {formatNumber(branch.students)} students
                  </Typography>
                </Box>
                <StatusBadge value={branch.status ?? 'good'} />
              </ListItemButton>
            ))}
          </List>
        </PanelCard>
      </Box>

      <DetailDrawer
        open={Boolean(active)}
        onClose={() => setDetailId(null)}
        title={active?.name ?? 'Branch'}
        subtitle={active?.district ?? undefined}
        status={active ? <StatusBadge value={active.status ?? 'good'} /> : undefined}
        width="md"
      >
        {active ? (
          <DrawerSection title="Snapshot">
            <FieldList
              items={[
                { label: 'Students', value: formatNumber(active.students) },
                { label: 'Attendance', value: formatPct(active.performance?.attendance ?? 0) },
                { label: 'Academic', value: formatPct(active.performance?.academic ?? 0) },
                { label: 'Fee collection', value: formatPct(active.performance?.schoolFees ?? 0) },
                { label: 'District', value: active.district ?? '—' },
                { label: 'Status', value: <StatusBadge value={active.status ?? 'good'} /> },
              ]}
            />
          </DrawerSection>
        ) : null}
      </DetailDrawer>
    </Box>
  );
}
