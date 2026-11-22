'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid2';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { KpiCard } from '@/components/stat-card';
import { PanelCard } from '@/components/panel-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { StatusBadge } from '@/components/status-badge';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { formatFrw, formatNumber, formatPct } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { OverviewData } from '@/types';
import type { SvgIconComponent } from '@mui/icons-material';

const HEALTH_COLORS = { good: '#168a55', mid: '#d99013', low: '#d64545' };

const TREND_TABS = [
  { label: 'Attendance', subtitle: 'Student & staff attendance this week' },
  { label: 'Fees', subtitle: 'Weekly fee collections this term' },
  { label: 'Academics', subtitle: 'Academic score vs pass rate by branch' },
];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e8ef',
  fontSize: 12,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(19,33,61,0.08)',
};

export default function OverviewPage() {
  const router = useRouter();
  const { scope, refreshKey } = useConsole();
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const { data, loading, error, reload } = useConsoleFetch<OverviewData>(
    () => consoleApi.overview(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );

  const attendanceTrend = useMemo(
    () =>
      (data?.attendance?.weeklyTrend ?? []).map((point) => ({
        day: point.day,
        students: point.student,
        staff: point.staff,
      })),
    [data]
  );

  const feesChart = useMemo(
    () => (data?.feesTrend ?? []).map((point) => ({ date: point.date, amount: point.amount })),
    [data]
  );

  const performanceChart = useMemo(
    () =>
      (data?.schoolPerformance ?? []).map((s) => ({
        name: s.name.length > 16 ? `${s.name.slice(0, 14)}…` : s.name,
        academic: s.academicScore,
        passRate: s.passRate,
      })),
    [data]
  );

  if (loading && !data) return <PageLoading label="Loading executive overview…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No overview data" />;

  const healthColor =
    data.summary.healthScore >= 80
      ? HEALTH_COLORS.good
      : data.summary.healthScore >= 65
        ? HEALTH_COLORS.mid
        : HEALTH_COLORS.low;

  const healthLabel =
    data.summary.healthScore >= 80
      ? 'Excellent'
      : data.summary.healthScore >= 65
        ? 'On track'
        : 'Needs attention';

  const healthCard = (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: { xs: 2.5, lg: 0 },
        border: '1px solid rgba(0,4,53,0.06)',
        boxShadow: '0 8px 20px rgba(0,4,53,0.1)',
        px: 2.5,
        py: { xs: 1.75, lg: 2.25 },
        display: 'flex',
        alignItems: 'center',
        height: { lg: '100%' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
        <Box sx={{ position: 'relative', width: { xs: 84, lg: 104 }, height: { xs: 84, lg: 104 }, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={[{ name: 'health', value: data.summary.healthScore, fill: healthColor }]}
              innerRadius="74%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" background={{ fill: '#eef0f5' }} cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer>
          <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: brand.navy, lineHeight: 1 }}>
              {data.summary.healthScore}
            </Typography>
            <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.secondary' }}>score</Typography>
          </Stack>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>School health</Typography>
          <Typography sx={{ mt: 0.25, fontSize: 16, fontWeight: 800, color: brand.navy }}>{healthLabel}</Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, textAlign: 'center' }}>
            {[
              { label: 'Attendance', value: formatPct(data.summary.averageAttendance) },
              { label: 'Fees', value: formatPct(data.summary.feesCollectionRate) },
              { label: 'Alerts', value: data.summary.openAlerts },
            ].map((stat) => (
              <Box key={stat.label}>
                <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>{stat.label}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: brand.navy }}>{stat.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // Fees collected + Open alerts already live in the health card, so they are
  // dropped from the stat grid on desktop (6 tiles = 3 per row, 2 rows).
  const kpis = [
    {
      key: 'students',
      node: (
        <KpiCard
          flush
          label="Total students"
          value={formatNumber(data.summary.totalStudents)}
          hint={`${data.summary.assignedSchools} branches`}
          icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />}
          onClick={() => router.push('/director/students')}
        />
      ),
    },
    {
      key: 'attendance',
      node: (
        <KpiCard
          flush
          label="Attendance today"
          value={formatPct(data.summary.averageAttendance)}
          hint={`${data.attendance?.summary.lateArrivals ?? 0} late arrivals`}
          icon={<SchoolOutlinedIcon sx={{ fontSize: 20 }} />}
          onClick={() => router.push('/director/attendance')}
        />
      ),
    },
    {
      key: 'fees-collected',
      mobileOnly: true,
      node: (
        <KpiCard
          flush
          label="Fees collected"
          value={formatPct(data.summary.feesCollectionRate)}
          delta={formatFrw(data.summary.feesCollected, { compact: true })}
          icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20 }} />}
          onClick={() => router.push('/director/fees')}
        />
      ),
    },
    {
      key: 'approvals',
      node: (
        <KpiCard
          flush
          label="Pending approvals"
          value={data.summary.pendingApprovals}
          hint={data.summary.approvalsDueToday ? `${data.summary.approvalsDueToday} due today` : 'none due today'}
          icon={<AssignmentTurnedInOutlinedIcon sx={{ fontSize: 20 }} />}
          valueSx={data.summary.pendingApprovals > 0 ? { color: brand.primary } : undefined}
          onClick={() => router.push('/director/approvals')}
        />
      ),
    },
    {
      key: 'staff',
      node: (
        <KpiCard
          flush
          label="Total staff"
          value={formatNumber(data.summary.totalStaff)}
          icon={<PeopleOutlineIcon sx={{ fontSize: 20 }} />}
          onClick={() => router.push('/director/hr')}
        />
      ),
    },
    {
      key: 'outstanding',
      node: (
        <KpiCard
          flush
          label="Fees outstanding"
          value={formatFrw(data.summary.feesOutstanding, { compact: true })}
          hint={`of ${formatFrw(data.summary.feesBilled, { compact: true })} billed`}
          icon={<PaymentsOutlinedIcon sx={{ fontSize: 20 }} />}
          onClick={() => router.push('/director/fees')}
        />
      ),
    },
    {
      key: 'teaching',
      node: (
        <KpiCard
          flush
          label="Teaching now"
          value={`${data.teaching.teaching}/${data.teaching.sessions}`}
          hint={
            data.teaching.gaps > 0
              ? `${data.teaching.gaps} without teacher`
              : `${data.teaching.cover} covers · ${data.teaching.late} late`
          }
          icon={<MenuBookOutlinedIcon sx={{ fontSize: 20 }} />}
          onClick={() => router.push('/director/teaching-now')}
        />
      ),
    },
    {
      key: 'alerts',
      mobileOnly: true,
      node: (
        <KpiCard
          flush
          label="Open alerts"
          value={data.summary.openAlerts}
          icon={<WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />}
          valueSx={data.summary.openAlerts > 0 ? { color: brand.danger } : undefined}
          onClick={() => router.push('/director/briefing')}
        />
      ),
    },
  ].filter((k) => !(isDesktop && k.mobileOnly));

  const statsGrid = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
        gap: 0,
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: brand.navy,
        boxShadow: { lg: '0 8px 20px rgba(0,4,53,0.18)' },
      }}
    >
      {kpis.map((k) => (
        <Box key={k.key} sx={{ display: 'flex', minWidth: 0 }}>
          {k.node}
        </Box>
      ))}
    </Box>
  );

  const contentSx = {
    width: '100%',
    maxWidth: 1440,
    mx: 'auto',
    px: { xs: 1.5, sm: 2.5, md: 3 },
  };

  return (
    <Box sx={pageSx}>
      {/* Full-width hero (edge to edge, desktop included) */}
      <Box
        sx={{
          position: 'relative',
          mb: { xs: 10, sm: 10.5, lg: 0 },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            bgcolor: brand.navy,
            color: '#fff',
            height: { xs: 230, lg: 280 },
          }}
        >
          <Box
            sx={{
              ...contentSx,
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              pb: { lg: 8 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                minWidth: 0,
                maxWidth: { xs: 'calc(100% - 110px)', sm: '60%' },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2rem', lg: '2.25rem' },
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                Hello, {data.greeting.user || 'Director'}
              </Typography>
            </Box>

            <Box
              component="img"
              src="/director.webp"
              alt=""
              sx={{
                position: 'absolute',
                right: { xs: -4, sm: 0, lg: 16 },
                bottom: 0,
                height: '100%',
                width: 'auto',
                maxWidth: { xs: 130, sm: 180, md: 230, lg: 280 },
                objectFit: 'contain',
                objectPosition: 'bottom right',
                zIndex: 0,
                filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.35))',
              }}
            />
          </Box>
        </Box>

        {/* Mobile / tablet: health card sits on the hero's bottom edge */}
        {!isDesktop ? (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              transform: 'translate(-50%, 50%)',
              width: 'calc(100% - 24px)',
              maxWidth: 720,
              zIndex: 2,
            }}
          >
            {healthCard}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ ...contentSx, pt: { lg: 0 }, pb: { xs: 2, sm: 2.5 } }}>
        {isDesktop ? (
          /* Desktop: stats (left) + health card (right), overlapping the hero */
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              mt: -8,
              mb: 2.5,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 440px)',
              gap: 2.5,
              alignItems: 'stretch',
            }}
          >
            {statsGrid}
            {healthCard}
          </Box>
        ) : (
          <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>{statsGrid}</Box>
        )}

      {/* Performance trends */}
      <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
        <PanelCard>
          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            variant="scrollable"
            scrollButtons={false}
            allowScrollButtonsMobile
            sx={{ minHeight: 40, mb: 1.5, borderBottom: `1px solid ${brand.border}` }}
          >
            {TREND_TABS.map((trend) => (
              <Tab
                key={trend.label}
                label={trend.label}
                sx={{ minHeight: 40, px: { xs: 1.5, sm: 2 }, fontSize: 12.5 }}
              />
            ))}
          </Tabs>

          <Box sx={{ mt: 1.5, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {TREND_TABS[tab].subtitle}
            </Typography>
          </Box>

          <Box sx={{ height: { xs: 250, sm: 300 }, minHeight: { xs: 250, sm: 300 } }}>
            {tab === 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="studentsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={brand.navy} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={brand.navy} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="staffFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={brand.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={brand.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}%`, '']} />
                  <Area type="monotone" dataKey="students" stroke={brand.navy} fill="url(#studentsFill)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="staff" stroke={brand.primary} fill="url(#staffFill)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}

            {tab === 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feesChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: brand.muted }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: brand.muted }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatFrw(Number(v)), 'Collected']} />
                  <Bar dataKey="amount" fill={brand.primary} radius={[8, 8, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}

            {tab === 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceChart} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: brand.muted }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10, fill: brand.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [`${Number(v)}%`, name === 'academic' ? 'Academic score' : 'Pass rate']}
                  />
                  <Bar dataKey="academic" fill={brand.navy2} radius={[0, 6, 6, 0]} maxBarSize={10} />
                  <Bar dataKey="passRate" fill={brand.primary} radius={[0, 6, 6, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Box>
        </PanelCard>
      </Box>

      {/* Attention + teaching + quick actions */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <PanelCard
            title="Needs your attention"
            subtitle={`${data.attention.length} items`}
            action={
              <Button
                size="small"
                onClick={() => router.push('/director/briefing')}
                sx={{ fontSize: 11, fontWeight: 700, color: '#b5771a', textTransform: 'none' }}
              >
                Full briefing →
              </Button>
            }
          >
            {!data.attention.length ? (
              <EmptyState
                title="Nothing needs attention"
                description="All branches are running within thresholds."
                icon={<CheckCircleOutlineIcon sx={{ fontSize: 24 }} />}
              />
            ) : (
              <List disablePadding>
                {data.attention.map((item, index) => (
                  <ListItemButton
                    key={`${item.category}-${item.title}-${index}`}
                    onClick={() => item.link && router.push(item.link)}
                    sx={{
                      borderRadius: 1.25,
                      mb: 1,
                      border: '1px solid',
                      borderColor:
                        item.severity === 'urgent'
                          ? 'rgba(214,69,69,0.25)'
                          : item.severity === 'warning'
                            ? 'rgba(217,144,19,0.25)'
                            : brand.border,
                      bgcolor:
                        item.severity === 'urgent'
                          ? 'rgba(214,69,69,0.06)'
                          : item.severity === 'warning'
                            ? 'rgba(217,144,19,0.06)'
                            : 'rgba(248,249,252,0.7)',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                      <WarningAmberOutlinedIcon
                        sx={{
                          fontSize: 20,
                          color:
                            item.severity === 'urgent'
                              ? brand.danger
                              : item.severity === 'warning'
                                ? brand.warning
                                : brand.muted,
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{item.title}</Typography>
                          <StatusBadge value={item.severity} />
                          <Typography
                            sx={{
                              ml: 'auto',
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              color: 'text.disabled',
                            }}
                          >
                            {item.category}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {item.body}
                        </Typography>
                      }
                    />
                    <NorthEastIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.5, flexShrink: 0 }} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </PanelCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <PanelCard title="Teaching Now" subtitle={`Period ${data.teaching.period} · ${data.teaching.time}`}>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <MiniStat label="Teaching" value={data.teaching.teaching} tone="good" />
                </Grid>
                <Grid size={6}>
                  <MiniStat label="Covers" value={data.teaching.cover} tone="info" />
                </Grid>
                <Grid size={6}>
                  <MiniStat label="No teacher" value={data.teaching.gaps} tone="bad" />
                </Grid>
                <Grid size={6}>
                  <MiniStat label="Late start" value={data.teaching.late} tone="warn" />
                </Grid>
              </Grid>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<MenuBookOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => router.push('/director/teaching-now')}
                sx={{ mt: 2, fontSize: 12, fontWeight: 700 }}
              >
                Open Teaching Now
              </Button>
            </PanelCard>

            <PanelCard title="Quick actions">
              <Grid container spacing={1}>
                <Grid size={6}>
                  <QuickAction label="Approvals" icon={AssignmentTurnedInOutlinedIcon} href="/director/approvals" />
                </Grid>
                <Grid size={6}>
                  <QuickAction label="Attendance" icon={TimelineOutlinedIcon} href="/director/attendance" />
                </Grid>
                <Grid size={6}>
                  <QuickAction label="Broadcast" icon={CampaignOutlinedIcon} href="/director/circulars?create=broadcast" />
                </Grid>
                <Grid size={6}>
                  <QuickAction label="New task" icon={ChecklistOutlinedIcon} href="/director/action-plan?create=task" />
                </Grid>
                <Grid size={6}>
                  <QuickAction label="Create meeting" icon={EventOutlinedIcon} href="/director/action-plan?create=meeting" />
                </Grid>
              </Grid>
            </PanelCard>
          </Stack>
        </Grid>
      </Grid>
      </Box>
    </Box>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'good' | 'info' | 'warn' | 'bad' }) {
  const colors = {
    good: { bg: 'rgba(22,138,85,0.1)', color: '#168a55' },
    info: { bg: 'rgba(62,123,250,0.1)', color: '#3e7bfa' },
    warn: { bg: 'rgba(217,144,19,0.12)', color: '#d99013' },
    bad: { bg: 'rgba(214,69,69,0.1)', color: '#d64545' },
  };
  const c = colors[tone];
  return (
    <Box sx={{ borderRadius: 1.25, px: 1.5, py: 1.25, bgcolor: c.bg, color: c.color }}>
      <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.75 }}>
        {label}
      </Typography>
    </Box>
  );
}

function QuickAction({
  label,
  icon: Icon,
  href,
}: {
  label: string;
  icon: SvgIconComponent;
  href: string;
}) {
  const router = useRouter();
  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<Icon sx={{ fontSize: 16, color: '#b5771a' }} />}
      onClick={() => router.push(href)}
      sx={{
        justifyContent: 'flex-start',
        borderColor: brand.border,
        color: brand.navy,
        fontSize: 11,
        fontWeight: 700,
        py: 1.25,
        px: 1.5,
        bgcolor: 'background.paper',
        '&:hover': { borderColor: 'rgba(252,176,56,0.5)', bgcolor: 'rgba(252,176,56,0.05)' },
      }}
    >
      {label}
    </Button>
  );
}
