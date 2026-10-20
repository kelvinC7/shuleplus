import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { fetchMorningSituation } from '@/services/deo-api';
import { OnboardingBadge } from '@/components/onboarding-badge';
import { StatusChip } from '@/components/status-chip';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

export default function MorningSituationPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMorningSituation>> | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => fetchMorningSituation().then(setData), []);
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);
  useAutoRefresh(reload, 120, Boolean(data));

  if (loading || !data) return <PageLoading />;

  return (
    <>
      <SectionCard
        title={data.timeLabel}
        subtitle={`Morning cutoff ${data.morningCutoffTime ?? '08:00'} · compliance ${data.compliance?.compliant ?? 0}/${data.schools.length}`}
      >
        <Typography sx={{ fontSize: '0.875rem' }}>
          Compliant: {data.compliance?.compliant ?? 0} · Late submission: {data.compliance?.late ?? 0} · Not reporting:{' '}
          {data.compliance?.notReporting ?? 0}
        </Typography>
      </SectionCard>

      <SectionCard title="All schools" subtitle="Live morning picture per school">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>School</TableCell>
                <TableCell>Onboarding</TableCell>
                <TableCell>Compliance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Student %</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>First tap</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Last sync</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.schools.map((s) => (
                <TableRow key={s.id} hover component={Link} to={`/schools/${s.id}`} sx={{ textDecoration: 'none' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#000435' }}>{s.name}</TableCell>
                  <TableCell>
                    <OnboardingBadge status={s.onboarding} />
                  </TableCell>
                  <TableCell>
                    {s.morningCompliant ? (
                      <Chip size="small" color="success" label="On time" />
                    ) : s.deviceOnline || s.firstAttendanceTime ? (
                      <Chip size="small" color="warning" label="Late" />
                    ) : (
                      <Chip size="small" label="Pending" />
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={s.status} />
                  </TableCell>
                  <TableCell align="right">{s.studentAttendancePct}%</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{s.firstAttendanceTime ?? '-'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{s.lastSync ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </>
  );
}
