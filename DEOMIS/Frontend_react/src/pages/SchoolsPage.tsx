import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { fetchSchools } from '@/services/deo-api';
import { StatusChip } from '@/components/status-chip';
import { OnboardingBadge } from '@/components/onboarding-badge';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';
import type { SchoolRecord } from '@/types';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const sectorFilter = params.get('sector');
  const visible = useMemo(
    () => (sectorFilter ? schools.filter((s) => s.sectorName === sectorFilter) : schools),
    [schools, sectorFilter]
  );

  useEffect(() => {
    fetchSchools()
      .then(setSchools)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <SectionCard
      title="School attendance monitor"
      subtitle={sectorFilter ? `Sector: ${sectorFilter}` : 'Tap a school for performance by class, staff, and gender'}
    >
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>School</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Module</TableCell>
              <TableCell align="right">Students</TableCell>
              <TableCell align="right">Present</TableCell>
              <TableCell align="right">Absent</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((s) => (
              <TableRow key={s.id} hover component={Link} to={`/schools/${s.id}`} sx={{ cursor: 'pointer', textDecoration: 'none' }}>
                <TableCell sx={{ fontWeight: 700, color: '#000435' }}>{s.name}</TableCell>
                <TableCell>{s.sectorName ?? '-'}</TableCell>
                <TableCell>
                  <OnboardingBadge status={s.onboarding} />
                </TableCell>
                <TableCell align="right">{s.students}</TableCell>
                <TableCell align="right">{s.studentsPresent}</TableCell>
                <TableCell align="right">{s.studentsAbsent}</TableCell>
                <TableCell>
                  {s.staffPresent}/{s.staffTotal}
                </TableCell>
                <TableCell>
                  <StatusChip status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
}
