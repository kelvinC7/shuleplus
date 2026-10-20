import { useEffect, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { fetchStudentIntelligence } from '@/services/sei-api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function StudentAttendancePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentIntelligence()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <PageLoading />;

  const bySchool = (data.bySchool as Array<{ schoolName: string; attendancePct: number; absent: number }>) ?? [];
  const byGrade = (data.byGrade as Array<{ grade: string; attendancePct: number }>) ?? [];
  const chronicStudents =
    (data.chronicStudents as Array<{ studentName: string; studentCode: string; className: string | null }>) ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <StatsGrid>
        <StatCard label="Absent today" value={data.absentToday as number} />
        <StatCard label="Consecutive absences" value={data.consecutiveAbsences as number} />
        <StatCard label="Frequent absenteeism" value={data.frequentAbsenteeism as number} />
        <StatCard label="Late arrivals" value={data.lateArrivals as number} />
      </StatsGrid>

      <SectionCard title="By school" subtitle="Sector → School drill-down">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>School</TableCell>
                <TableCell align="right">Attendance %</TableCell>
                <TableCell align="right">Absent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bySchool.map((s) => (
                <TableRow key={s.schoolName}>
                  <TableCell>{s.schoolName}</TableCell>
                  <TableCell align="right">{s.attendancePct}%</TableCell>
                  <TableCell align="right">{s.absent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <SectionCard title="Chronic absence (3+ consecutive days)" subtitle="From Attendance records">
        {chronicStudents.length === 0 ? (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>No chronic absentees detected today.</Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Class</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chronicStudents.map((s) => (
                  <TableRow key={`${s.studentCode}-${s.studentName}`}>
                    <TableCell>{s.studentName}</TableCell>
                    <TableCell>{s.studentCode}</TableCell>
                    <TableCell>{s.className ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <SectionCard title="Grade-level attendance">
        {byGrade.map((g) => (
          <Box key={g.grade} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{g.grade}</Typography>
            <Typography>{g.attendancePct}%</Typography>
          </Box>
        ))}
      </SectionCard>
    </Box>
  );
}
