'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard, ChartCard } from '@/components/panel-card';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { BranchesData, OverviewData } from '@/types';

const RADAR_COLORS = ['#fcb038', '#13213d', '#8ea2c6', '#d64545', '#168a55', '#d99013'];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

export default function InsightsPage() {
  const router = useRouter();
  const { scope, refreshKey } = useConsole();

  const branchesQuery = useConsoleFetch<BranchesData>(
    () => consoleApi.branches(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );
  const overviewQuery = useConsoleFetch<OverviewData>(
    () => consoleApi.overview(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );

  const branches = branchesQuery.data?.branches ?? [];
  const overview = overviewQuery.data;

  const ranked = useMemo(
    () =>
      [...branches].sort(
        (a, b) =>
          (b.performance?.academic ?? 0) +
          (b.performance?.attendance ?? 0) +
          (b.performance?.schoolFees ?? 0) -
          ((a.performance?.academic ?? 0) + (a.performance?.attendance ?? 0) + (a.performance?.schoolFees ?? 0))
      ),
    [branches]
  );

  const radarSeries = useMemo(() => {
    const used = new Set<string>();
    return branches.slice(0, 6).map((branch) => {
      const parts = branch.name.trim().split(/\s+/);
      let label = parts.length > 1 ? parts.slice(1).join(' ') : branch.name;
      if (used.has(label)) label = branch.name;
      used.add(label);
      return label;
    });
  }, [branches]);

  const radarData = useMemo(() => {
    const dimensions: Array<{ key: string; label: string }> = [
      { key: 'attendance', label: 'Attendance' },
      { key: 'academic', label: 'Academic' },
      { key: 'schoolFees', label: 'Fees' },
    ];
    return dimensions.map((dim) => {
      const row: Record<string, string | number> = { dimension: dim.label };
      branches.slice(0, 6).forEach((branch, index) => {
        row[radarSeries[index]] = Math.round(
          dim.key === 'attendance'
            ? (branch.performance?.attendance ?? 0)
            : dim.key === 'academic'
              ? (branch.performance?.academic ?? 0)
              : (branch.performance?.schoolFees ?? 0)
        );
      });
      return row;
    });
  }, [branches, radarSeries]);

  if (branchesQuery.loading && !branchesQuery.data) return <PageLoading label="Crunching branch metrics…" />;
  if (branchesQuery.error && !branchesQuery.data)
    return <ErrorState message={branchesQuery.error} onRetry={branchesQuery.reload} />;
  if (!branches.length) return <EmptyState title="No branch data" />;

  const attentionBranches = branches.filter((b) => (b.status ?? 'good') !== 'good');
  const top = ranked[0];
  const topComposite = top
    ? ((top.performance?.academic ?? 0) + (top.performance?.attendance ?? 0) + (top.performance?.schoolFees ?? 0)) / 3
    : 0;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Performance Insights"
        description="Branch comparison across attendance, academics, fees and staffing."
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard
            label="Students"
            value={formatNumber(overview?.summary.totalStudents ?? 0)}
            icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Attendance"
            value={formatPct(overview?.summary.averageAttendance ?? 0)}
            icon={<SchoolOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Fees collected"
            value={formatPct(overview?.summary.feesCollectionRate ?? 0)}
            icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Health score"
            value={overview?.summary.healthScore ?? '—'}
            icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' },
          mb: 2,
        }}
      >
        <ChartCard title="Branch profile comparison" subtitle="Higher is better on every axis" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#eef0f5" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: brand.muted }} />
              <Tooltip contentStyle={tooltipStyle} />
              {radarSeries.map((name, i) => (
                <Radar
                  key={name}
                  name={name}
                  dataKey={name}
                  stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                  fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="Branch ranking" subtitle="Composite of attendance, academic and fees">
          <Stack spacing={1}>
            {ranked.map((branch, index) => {
              const composite =
                ((branch.performance?.academic ?? 0) +
                  (branch.performance?.attendance ?? 0) +
                  (branch.performance?.schoolFees ?? 0)) /
                3;
              return (
                <Button
                  key={branch.id}
                  onClick={() => router.push('/director/schools')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%',
                    borderRadius: 1.25,
                    border: `1px solid ${brand.border}`,
                    bgcolor: 'rgba(248,249,252,0.6)',
                    px: 1.75,
                    py: 1.5,
                    textAlign: 'left',
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 2, bgcolor: '#fff' },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 2,
                      bgcolor: index === 0 ? brand.primary : brand.navy,
                      color: index === 0 ? brand.navy : brand.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>
                        {branch.name}
                      </Typography>
                      {index === 0 ? <EmojiEventsOutlinedIcon sx={{ fontSize: 14, color: brand.warning }} /> : null}
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, composite)}
                      sx={{
                        mt: 0.75,
                        height: 6,
                        borderRadius: 999,
                        maxWidth: 280,
                        bgcolor: 'rgba(0,4,53,0.06)',
                        '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: brand.primary },
                      }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: brand.navy }}>{formatPct(composite)}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
                      composite
                    </Typography>
                  </Box>
                </Button>
              );
            })}
          </Stack>
        </PanelCard>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
        }}
      >
        <PanelCard title="Top branch" subtitle={top?.name ?? '—'}>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: brand.navy }}>{formatPct(topComposite)}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>Composite score</Typography>
        </PanelCard>
        <PanelCard title="Branches needing support" subtitle={`${attentionBranches.length} flagged`}>
          {attentionBranches.length ? (
            <Stack spacing={1}>
              {attentionBranches.slice(0, 4).map((b) => (
                <Stack key={b.id} direction="row" alignItems="center" spacing={1}>
                  <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: brand.warning }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{b.name}</Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>All branches within thresholds.</Typography>
          )}
        </PanelCard>
        <PanelCard title="Group context" subtitle="From the executive overview">
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Open alerts</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{overview?.summary.openAlerts ?? '—'}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Pending approvals</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{overview?.summary.pendingApprovals ?? '—'}</Typography>
            </Stack>
          </Stack>
        </PanelCard>
      </Box>
    </Box>
  );
}
