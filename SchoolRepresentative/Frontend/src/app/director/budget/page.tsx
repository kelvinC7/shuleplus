'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
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
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatFrw, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { BudgetData } from '@/types';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

function barColor(status: string) {
  if (status === 'over') return brand.danger;
  if (status === 'watch') return brand.warning;
  return brand.success;
}

export default function BudgetPage() {
  const { scope, ctx, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<BudgetData>(
    () => consoleApi.budget(scope.organizationId),
    [scope.organizationId, refreshKey]
  );

  const voteChart = useMemo(
    () =>
      (data?.lines ?? []).map((line) => ({
        vote: line.vote.length > 14 ? `${line.vote.slice(0, 12)}…` : line.vote,
        planned: line.planned,
        actual: line.actual,
      })),
    [data]
  );

  if (loading && !data) return <PageLoading label="Loading budget…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No budget data" />;

  const branchName =
    scope.organizationId === 'all'
      ? 'All branches'
      : (ctx?.branches.find((b) => b.id === scope.organizationId)?.name ?? 'Branch');

  const overLines = data.lines.filter((l) => l.status !== 'ok');

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="School Budget"
        description={`${branchName} — approved budget versus actual expenditure by vote line.`}
      />

      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
          <KpiCard
            label="Planned"
            value={formatFrw(data.summary.planned, { compact: true })}
            icon={<PaymentsOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Actual"
            value={formatFrw(data.summary.actual, { compact: true })}
            icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <KpiCard
            label="Remaining"
            value={formatFrw(data.summary.remaining, { compact: true })}
            icon={<SavingsOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={data.summary.remaining < 0 ? { color: brand.danger } : undefined}
          />
          <KpiCard
            label="At risk lines"
            value={overLines.length}
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />}
            valueSx={overLines.length > 0 ? { color: brand.warning } : undefined}
          />
        </StatsGrid>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          mb: 2,
        }}
      >
        <ChartCard title="Planned vs actual" subtitle="By vote line" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={voteChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="vote" tick={{ fontSize: 10, fill: brand.muted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: brand.muted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatFrw(Number(v))} />
              <Legend />
              <Bar dataKey="planned" name="Planned" fill={brand.navy} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="actual" name="Actual" fill={brand.primary} radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <PanelCard title="Utilization" subtitle="Progress against each vote">
          <Stack spacing={1.5}>
            {data.lines.map((line) => (
              <Box key={line.vote}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: brand.navy }}>{line.vote}</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: barColor(line.status) }}>
                    {formatPct(line.pct)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, line.pct)}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: 'rgba(0,4,53,0.06)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      bgcolor: barColor(line.status),
                    },
                  }}
                />
              </Box>
            ))}
          </Stack>
        </PanelCard>
      </Box>

      <PanelCard title="Vote lines" subtitle={`${data.lines.length} lines`} bodySx={{ px: 0, pt: 0 }}>
        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vote</TableCell>
                <TableCell>Department</TableCell>
                <TableCell align="right">Planned</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell>Utilization</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.lines.map((line) => (
                <TableRow key={line.vote} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>{line.vote}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{line.department}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 12 }}>{formatFrw(line.planned, { compact: true })}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 12 }}>{formatFrw(line.actual, { compact: true })}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, line.pct)}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'rgba(0,4,53,0.06)',
                          '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: barColor(line.status) },
                        }}
                      />
                      <Typography sx={{ fontSize: 11, fontWeight: 700, minWidth: 40 }}>{formatPct(line.pct)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={line.status === 'over' ? 'over' : line.status === 'watch' ? 'watch' : 'ok'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack spacing={0} sx={{ display: { xs: 'flex', md: 'none' }, divideY: 1 }}>
          {data.lines.map((line) => (
            <Box key={line.vote} sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${brand.border}` }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{line.vote}</Typography>
                <Box sx={{ ml: 'auto' }}>
                  <StatusBadge value={line.status === 'over' ? 'over' : line.status === 'watch' ? 'watch' : 'ok'} />
                </Box>
              </Stack>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                {formatFrw(line.actual, { compact: true })} of {formatFrw(line.planned, { compact: true })} ·{' '}
                {line.department}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, line.pct)}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 999,
                  bgcolor: 'rgba(0,4,53,0.06)',
                  '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: barColor(line.status) },
                }}
              />
            </Box>
          ))}
        </Stack>
      </PanelCard>

      {overLines.length ? (
        <Alert severity="warning" icon={<WarningAmberOutlinedIcon />} sx={{ mt: 2, borderRadius: 1.25 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            {overLines.length} vote {overLines.length === 1 ? 'line' : 'lines'} above 95% utilization
          </Typography>
          <Typography sx={{ fontSize: 12, mt: 0.5 }}>
            Reallocation requests appear in Approvals, where they are decided with a full audit trail.
          </Typography>
        </Alert>
      ) : null}
    </Box>
  );
}
