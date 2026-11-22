'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard, ChartCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatFrw, formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { FeesData } from '@/types';

const PIE_COLORS = [brand.success, brand.warning, brand.danger, '#8ea2c6'];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

export default function FeesPage() {
  const { scope, ctx, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<FeesData>(
    () => consoleApi.fees(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );

  const schoolChart = useMemo(
    () =>
      (data?.bySchool ?? []).map((s) => ({
        name: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
        collected: s.collected,
        outstanding: s.outstanding,
        rate: s.rate,
      })),
    [data]
  );

  const trendChart = useMemo(
    () => (data?.collectionTrend ?? []).map((p) => ({ date: p.date, amount: p.amount })),
    [data]
  );

  const pieData = useMemo(() => {
    const status = data?.summary.studentStatus;
    if (!status) return [];
    return [
      { name: 'Paid in full', value: status.paid, color: PIE_COLORS[0] },
      { name: 'Partial', value: status.partial, color: PIE_COLORS[1] },
      { name: 'Unpaid', value: status.unpaid, color: PIE_COLORS[2] },
      { name: 'Overdue', value: status.overdue, color: PIE_COLORS[3] },
    ].filter((d) => d.value > 0);
  }, [data]);

  if (loading && !data) return <PageLoading label="Loading fee collection…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No fees data" />;

  const branchName =
    scope.organizationId === 'all'
      ? 'All branches'
      : (ctx?.branches.find((b) => b.id === scope.organizationId)?.name ?? 'Branch');

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="School Fees"
        description={`${branchName} · ${scope.term} ${scope.academicYear} — billed, collected and outstanding.`}
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard
            label="Expected this term"
            value={formatFrw(data.summary.totalExpected, { compact: true })}
            icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Collected"
            value={formatPct(data.summary.collectionRate)}
            delta={formatFrw(data.summary.totalCollected, { compact: true })}
            icon={<PaymentsOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Outstanding"
            value={formatFrw(data.summary.outstanding, { compact: true })}
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={{ color: brand.danger }}
          />
          <KpiCard
            label="Collection rate"
            value={formatPct(data.summary.collectionRate)}
            icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
          />
        </StatsGrid>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          mb: 2,
        }}
      >
        <ChartCard title="Collections by school" subtitle="Collected vs outstanding" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={schoolChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: brand.muted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: brand.muted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatFrw(Number(v))} />
              <Legend />
              <Bar dataKey="collected" name="Collected" fill={brand.primary} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="outstanding" name="Outstanding" fill={brand.navy} radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="Student fee status" subtitle={`${formatNumber(data.studentsWithOutstanding ?? 0)} with balance`}>
          <Box sx={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </PanelCard>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          mb: 2,
        }}
      >
        <ChartCard title="Collection trend" subtitle="Weekly deposits this term" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: brand.muted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: brand.muted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatFrw(Number(v))} />
              <Bar dataKey="amount" fill={brand.primary} radius={[8, 8, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="By fee category" subtitle="Expected vs collected">
          <Stack spacing={1.5}>
            {(data.byCategory ?? []).map((cat) => {
              const rate = cat.expected ? (cat.collected / cat.expected) * 100 : 0;
              return (
                <Box key={cat.name ?? cat.category}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{cat.name ?? cat.category}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{formatPct(rate)}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, rate)}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      bgcolor: 'rgba(0,4,53,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: brand.primary },
                    }}
                  />
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
                    {formatFrw(cat.collected, { compact: true })} / {formatFrw(cat.expected, { compact: true })}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </PanelCard>
      </Box>

      <PanelCard title="Collection by school" subtitle="Rates below 65% need a remediation plan" bodySx={{ px: 0, pt: 0 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>School</TableCell>
                <TableCell align="right">Collected</TableCell>
                <TableCell align="right">Outstanding</TableCell>
                <TableCell>Rate</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.bySchool ?? []).map((s) => (
                <TableRow key={s.name} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{s.name}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 12 }}>{formatFrw(s.collected, { compact: true })}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 12 }}>{formatFrw(s.outstanding, { compact: true })}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, s.rate)}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'rgba(0,4,53,0.06)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: s.rate >= 80 ? brand.success : s.rate >= 65 ? brand.warning : brand.danger,
                          },
                        }}
                      />
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{formatPct(s.rate)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={s.rate >= 80 ? 'good' : s.rate >= 65 ? 'watch' : 'attention'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PanelCard>
    </Box>
  );
}
