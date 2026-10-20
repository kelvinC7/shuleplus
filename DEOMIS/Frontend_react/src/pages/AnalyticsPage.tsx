import { useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, Typography } from '@mui/material';
import { fetchAnalytics } from '@/services/deo-api';
import { ModernVerticalBarChart, NAVY, PRIMARY } from '@/components/charts/sm-charts';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'term', label: 'Term' },
  { id: 'year', label: 'Year' },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState('week');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(range)
      .then(setData)
      .finally(() => setLoading(false));
  }, [range]);

  if (loading || !data) return <PageLoading />;

  const dates = data.trends.dates ?? [];
  const studentBars = data.trends.student.map((v, i) => ({
    label: dates[i]?.slice(5) ?? `D${i + 1}`,
    value: v,
    male: 0,
    female: 0,
  }));
  const staffBars = data.trends.staff.map((v, i) => ({
    label: dates[i]?.slice(5) ?? `D${i + 1}`,
    value: v,
    male: 0,
    female: 0,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ButtonGroup size="small" sx={{ flexWrap: 'wrap' }}>
        {RANGES.map((r) => (
          <Button key={r.id} variant={range === r.id ? 'contained' : 'outlined'} onClick={() => setRange(r.id)}>
            {r.label}
          </Button>
        ))}
      </ButtonGroup>

      <SectionCard title="Today's snapshot">
        <Typography sx={{ fontSize: '0.875rem' }}>Student attendance: {data.today.studentAttendancePct}%</Typography>
        <Typography sx={{ fontSize: '0.875rem' }}>Staff attendance: {data.today.staffAttendancePct}%</Typography>
        <Typography sx={{ fontSize: '0.875rem' }}>Late arrivals: {data.today.lateArrivals}</Typography>
      </SectionCard>

      <SectionCard title="Student vs staff trend">
        <ModernVerticalBarChart data={studentBars.length ? studentBars : [{ label: 'N/A', value: 0, male: 0, female: 0 }]} color={NAVY} accentColor={PRIMARY} />
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '0.875rem' }}>Staff trend</Typography>
          <ModernVerticalBarChart data={staffBars} color={PRIMARY} accentColor={NAVY} />
        </Box>
      </SectionCard>

      <SectionCard title="Absence & lateness trends">
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          Absence trend (avg %): {data.trends.absence.slice(-1)[0]} · Late-arrival index points: {data.trends.late.length}
        </Typography>
      </SectionCard>
    </Box>
  );
}
