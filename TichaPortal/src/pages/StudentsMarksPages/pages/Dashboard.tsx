import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import BookOpenIcon from '@mui/icons-material/MenuBook';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import RecordingPanel from './RecordingPanel';
import { brand } from '../../../theme/theme';

const NAVY = '#13213D';
const AMBER = '#F5A623';
const BAR_COLORS = ['#F5A623', '#13213D', '#6366f1', '#10b981', '#f43f5e', '#8b5cf6'];

type Learner = {
  id?: string;
  name: string;
  class_name?: string;
  average: number | null;
};

const CARD_BORDER = '1px solid rgba(19,33,61,0.08)';

function KpiCard({ Icon, label, value, warn }: { Icon: typeof BookOpenIcon; label: string; value: string | number; warn?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: { xs: 100, sm: 112 },
        p: { xs: 1.75, sm: 2 },
        bgcolor: brand.navy,
        borderRadius: 0,
        boxShadow: '0 2px 14px -4px rgba(0,4,53,0.1)',
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <Box sx={{ display: 'flex', color: brand.primary, flexShrink: 0, '& svg': { fontSize: { xs: 20, sm: 22 } } }}>
          <Icon />
        </Box>
        <Typography sx={{ flex: 1, minWidth: 0, pt: 0.25, fontSize: 11, fontWeight: 600, lineHeight: 1.35, color: 'rgba(255,255,255,0.72)' }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          mt: 1.25,
          fontSize: 'clamp(1.3rem, 5.4vw, 1.7rem)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: warn ? brand.primary : '#fff',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

const headCellSx = {
  py: 1,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#94A3B8',
  bgcolor: '#F8F9FC',
  px: { xs: 0.75, sm: 2 },
  borderBottom: CARD_BORDER,
  whiteSpace: 'nowrap',
} as const;

const bodyCellSx = { py: { xs: 1, sm: 1.25 }, px: { xs: 0.75, sm: 2 }, borderBottom: '1px solid rgba(19,33,61,0.06)', fontSize: { xs: 12, sm: 13 } } as const;

function StudentsTable({
  title,
  badge,
  Icon,
  tone,
  rows,
  empty,
}: {
  title: string;
  badge: string;
  Icon: typeof TrendingUpIcon;
  tone: 'weak' | 'strong';
  rows: Learner[];
  empty: string;
}) {
  const weak = tone === 'weak';
  const accent = weak
    ? { icon: '#DC2626', chipBg: '#FEE2E2', chipColor: '#991B1B', pillBg: '#FEF2F2', pillColor: '#B91C1C' }
    : { icon: '#047857', chipBg: '#D1FAE5', chipColor: '#065F46', pillBg: '#ECFDF5', pillColor: '#065F46' };

  return (
    <Paper component="section" elevation={0} sx={{ borderRadius: 2, border: CARD_BORDER, bgcolor: '#fff', overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
        <Icon sx={{ fontSize: 18, color: accent.icon }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{title}</Typography>
        <Box component="span" sx={{ ml: 'auto', borderRadius: 999, bgcolor: accent.chipBg, px: 1, py: 0.25, fontSize: 10, fontWeight: 700, color: accent.chipColor }}>
          {badge}
        </Box>
      </Stack>
      <TableContainer>
        <Table size="small" sx={{ width: '100%', tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, width: { xs: 28, sm: 40 }, pl: { xs: 1.5, sm: 2 }, pr: 0 }}>#</TableCell>
              <TableCell sx={headCellSx}>Learner</TableCell>
              <TableCell sx={headCellSx}>Class</TableCell>
              <TableCell align="right" sx={{ ...headCellSx, pr: { xs: 1.5, sm: 2 } }}>Avg</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length ? (
              rows.map((s, i) => (
                <TableRow
                  key={s.id || `${s.name}-${s.class_name}`}
                  hover
                  sx={{
                    '&:nth-of-type(even)': { bgcolor: '#F8F9FC' },
                    '&:last-child td': { borderBottom: 0 },
                  }}
                >
                  <TableCell sx={{ ...bodyCellSx, pl: { xs: 1.5, sm: 2 }, pr: 0, color: '#94A3B8', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</TableCell>
                  <TableCell sx={{ ...bodyCellSx, maxWidth: 0, width: '100%' }}>
                    <Typography noWrap sx={{ fontSize: { xs: 11.5, sm: 13 }, fontWeight: 600, color: NAVY }}>{s.name || 'Unknown learner'}</Typography>
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.class_name || '-'}</TableCell>
                  <TableCell align="right" sx={{ ...bodyCellSx, pr: { xs: 1.5, sm: 2 } }}>
                    <Box component="span" sx={{ display: 'inline-block', borderRadius: 1, px: { xs: 0.75, sm: 1 }, py: 0.25, fontSize: { xs: 11, sm: 12 }, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', bgcolor: accent.pillBg, color: accent.pillColor }}>
                      {s.average != null ? `${s.average}%` : '-'}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 4, textAlign: 'center', fontSize: 13, color: '#64748B', borderBottom: 0 }}>
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function ClassBarRow({ classLabel, average, maxAverage }: { classLabel: string; average: number; maxAverage: number }) {
  const width = maxAverage > 0 ? Math.max(8, (average / maxAverage) * 100) : 0;
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ fontSize: 14 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{classLabel}</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#B26A00' }}>{average}%</Typography>
      </Stack>
      <Box sx={{ mt: 0.5, height: 10, borderRadius: 999, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${width}%`, borderRadius: 999, background: `linear-gradient(to right, ${NAVY}, ${AMBER})`, transition: 'width 0.5s' }} />
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<'recording' | 'performance'>('recording');

  return (
    <Box>
      {/* Sticky tab switcher — full-width, square */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 22,
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(19,33,61,0.08)',
          display: 'flex',
        }}
      >
        {(
          [
            { id: 'recording' as const, label: 'Recording' },
            { id: 'performance' as const, label: 'Performance' },
          ]
        ).map((t) => (
          <ButtonBase
            key={t.id}
            onClick={() => setTab(t.id)}
            sx={{
              flex: 1,
              borderRadius: 0,
              py: 1.15,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.01em',
              borderBottom: tab === t.id ? `2px solid ${brand.navy}` : '2px solid transparent',
              color: tab === t.id ? brand.navy : 'rgba(19,33,61,0.45)',
              bgcolor: tab === t.id ? 'rgba(19,33,61,0.03)' : 'transparent',
              transition: 'color .15s, background .15s, border-color .15s',
              '&:hover': {
                color: brand.navy,
                bgcolor: 'rgba(19,33,61,0.04)',
              },
            }}
          >
            {t.label}
          </ButtonBase>
        ))}
      </Box>

      {tab === 'recording' ? <RecordingPanel /> : <PerformancePanel />}
    </Box>
  );
}

function PerformancePanel() {
  const [params, setParams] = useState<Record<string, string>>({});
  const {
    loading,
    error,
    kpis,
    classPerformance,
    courseClassComparison,
    termTrend,
    weakStudents,
    strongStudents,
    atRiskStudents,
    filters,
    selected,
  } = useTeacherMarksAnalytics(params);

  const needsSupport = useMemo(() => {
    const list = (weakStudents?.length ? weakStudents : atRiskStudents) as Array<{
      id?: string;
      name: string;
      class_name?: string;
      average: number | null;
    }>;
    return [...list]
      .filter((s) => s.average != null)
      .sort((a, b) => (a.average ?? 0) - (b.average ?? 0))
      .slice(0, 8);
  }, [weakStudents, atRiskStudents]);

  const topPerformers = useMemo(() => {
    return [...(strongStudents || [])]
      .filter((s) => s.average != null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
      .slice(0, 8);
  }, [strongStudents]);

  const comparisonSubject = selected?.subject_name || '';
  const subjectComparison = useMemo(() => {
    if (!courseClassComparison?.length) return null;
    if (comparisonSubject) {
      return courseClassComparison.find((g) => g.subject === comparisonSubject) || null;
    }
    return courseClassComparison.find((g) => g.classes?.length >= 2) || courseClassComparison[0] || null;
  }, [courseClassComparison, comparisonSubject]);

  const multiClassSubjects = useMemo(
    () => (courseClassComparison || []).filter((g) => g.classes?.length >= 2),
    [courseClassComparison],
  );

  if (loading && !filters) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: '#B26A00' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>{error}</Alert>;
  }

  const atRisk = kpis.at_risk_count ?? 0;
  const kpiCards = [
    { Icon: BookOpenIcon, label: 'Classes', value: kpis.total_classes ?? '-' },
    { Icon: PeopleIcon, label: 'Students', value: kpis.total_students ?? '-' },
    { Icon: TrendingUpIcon, label: 'Average', value: kpis.average_percent != null ? `${kpis.average_percent}%` : '-' },
    { Icon: SchoolIcon, label: 'Pass rate', value: kpis.pass_rate != null ? `${kpis.pass_rate}%` : '-' },
    { Icon: WarningAmberIcon, label: 'At risk', value: atRisk, warn: atRisk > 0 },
  ];

  const chartData = subjectComparison?.classes?.map((c) => ({
    name: c.class_name,
    average: c.average,
  })) || [];

  const maxClassAvg = Math.max(...chartData.map((c) => c.average || 0), 1);

  return (
    <Box>
      <MarksAnalyticsFilters variant="bar" filters={filters} selected={selected} onChange={setParams} />

      <Stack spacing={2.5} sx={{ p: { xs: 1.5, md: 2.5, lg: 3 }, pb: 5 }}>
      {loading && (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1, fontSize: 14, color: '#64748B' }}>
          <CircularProgress size={16} /> <span>Updating…</span>
        </Stack>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: { xs: 1.5, lg: 0 }, '@media (min-width:1200px)': { '& > *:not(:last-child) > *': { borderRight: '1px solid rgba(255,255,255,0.08)' } } }}>
        {kpiCards.map((kpi, i) => (
          <Box key={kpi.label} sx={{ gridColumn: { xs: i === kpiCards.length - 1 ? 'span 2' : 'auto', sm: 'auto' } }}>
            <KpiCard Icon={kpi.Icon} label={kpi.label} value={kpi.value} warn={kpi.warn} />
          </Box>
        ))}
      </Box>

      {subjectComparison && chartData.length > 0 && (
        <Paper component="section" elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(226,232,240,0.8)', bgcolor: '#fff', p: { xs: 2, sm: 2.5 }, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <Stack direction="row" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="flex-start" spacing={1.5}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
                  {subjectComparison.subject} across your classes
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                  {chartData.length >= 2
                    ? 'Compare average performance where you teach this subject in more than one class.'
                    : 'Average for this subject in the selected view.'}
                </Typography>
              </Box>
            </Stack>
            {!comparisonSubject && multiClassSubjects.length > 1 && (
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>Select a subject in filters to focus one course.</Typography>
            )}
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
            <Stack spacing={2}>
              {subjectComparison.classes.map((c) => (
                <ClassBarRow
                  key={c.class_name}
                  classLabel={c.class_name}
                  average={c.average ?? 0}
                  maxAverage={maxClassAvg}
                />
              ))}
            </Stack>
            {chartData.length >= 2 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Average']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(226,232,240,0.8)', bgcolor: '#fff', p: { xs: 2, sm: 2.5 }, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Term trend</Typography>
          <Typography sx={{ mb: 1.5, fontSize: 12, color: '#94A3B8' }}>Average mark performance over time</Typography>
          {termTrend.length === 0 ? (
            <Typography sx={{ py: 5, textAlign: 'center', fontSize: 14, color: '#94A3B8' }}>Record marks to see trends</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={termTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="average" stroke={NAVY} strokeWidth={2.5} dot={{ fill: AMBER, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid rgba(226,232,240,0.8)', bgcolor: '#fff', p: { xs: 2, sm: 2.5 }, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>All classes overview</Typography>
          <Typography sx={{ mb: 1.5, fontSize: 12, color: '#94A3B8' }}>Combined averages (all subjects in each class)</Typography>
          <Stack spacing={1.5} sx={{ maxHeight: 240, overflowY: 'auto', pr: 0.5 }}>
            {classPerformance.slice(0, 10).map((c) => (
              <ClassBarRow
                key={c.name}
                classLabel={c.name}
                average={c.average ?? 0}
                maxAverage={Math.max(...classPerformance.map((x) => x.average || 0), 1)}
              />
            ))}
            {!classPerformance.length && (
              <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#94A3B8' }}>No class averages yet</Typography>
            )}
          </Stack>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
        <StudentsTable
          title="Needs support"
          badge="< 40%"
          Icon={TrendingDownIcon}
          tone="weak"
          rows={needsSupport as Learner[]}
          empty="No learners below 40% in this view."
        />
        <StudentsTable
          title="Top performers"
          badge="≥ 75%"
          Icon={TrendingUpIcon}
          tone="strong"
          rows={topPerformers as Learner[]}
          empty="Top learners appear after marks are recorded."
        />
      </Box>
      </Stack>
    </Box>
  );
}
