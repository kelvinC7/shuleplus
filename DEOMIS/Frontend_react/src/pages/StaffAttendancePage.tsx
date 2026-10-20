import { useEffect, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { fetchStaffIntelligence } from '@/services/deo-api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function StaffAttendancePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffIntelligence()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <PageLoading />;

  const admin = data.administrativeStaff as { present: number; total: number };
  const support = data.supportStaff as { present: number; total: number };
  const bySchool = (data.bySchool as Array<{ schoolName: string; staffAttendancePct: number; present: number; total: number }>) ?? [];
  const trend = (data.punctualityTrend as number[]) ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <StatsGrid>
        <StatCard label="Teachers present" value={data.teachersPresent as number} />
        <StatCard label="Teachers absent" value={data.teachersAbsent as number} />
        <StatCard label="Late teachers" value={data.lateTeachers as number} />
        <StatCard label="Approved leave" value={data.approvedLeave as number} />
        <StatCard label="Unrecorded" value={data.unrecordedAttendance as number} />
        <StatCard label="Admin staff" value={`${admin.present}/${admin.total}`} />
        <StatCard label="Support staff" value={`${support.present}/${support.total}`} />
      </StatsGrid>

      <SectionCard title="Staff punctuality trend (7 days)">
        <Typography sx={{ fontSize: '0.875rem' }}>{trend.map((v) => `${v}%`).join(' → ')}</Typography>
      </SectionCard>

      <SectionCard title="Staff attendance by school">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>School</TableCell>
                <TableCell align="right">Present / total</TableCell>
                <TableCell align="right">%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bySchool.map((s) => (
                <TableRow key={s.schoolName}>
                  <TableCell>{s.schoolName}</TableCell>
                  <TableCell align="right">
                    {s.present}/{s.total}
                  </TableCell>
                  <TableCell align="right">{s.staffAttendancePct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Box>
  );
}
