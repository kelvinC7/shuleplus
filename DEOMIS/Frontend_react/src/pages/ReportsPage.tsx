import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { downloadDailyReportPdf, fetchDailyReport } from '@/services/deo-api';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function ReportsPage() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyReport()
      .then(setReport)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !report) return <PageLoading />;

  const observations = (report.observations as string[]) ?? [];

  function exportText() {
    if (!report) return;
    const lines = [
      String(report.title),
      `Date: ${report.date}`,
      `Sector: ${report.sector}`,
      `Schools: ${report.schools}`,
      `Students: ${report.students}`,
      `Student Attendance: ${report.studentAttendancePct}%`,
      `Staff Attendance: ${report.staffAttendancePct}%`,
      `Schools requiring attention: ${report.schoolsRequiringAttention}`,
      `Schools not reporting: ${report.schoolsNotReporting}`,
      '',
      'Major observations:',
      ...observations.map((o) => `- ${o}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sector-attendance-${report.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SectionCard title="Automatic SEI daily report" subtitle="End-of-morning sector attendance summary">
      <Typography sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>{String(report.title)}</Typography>
      <Typography sx={{ mt: 2, fontSize: '0.875rem' }}>Date: {String(report.date)}</Typography>
      <Typography sx={{ fontSize: '0.875rem' }}>Sector: {String(report.sector)}</Typography>
      <Typography sx={{ fontSize: '0.875rem' }}>Schools: {String(report.schools)} · Students: {String(report.students)}</Typography>
      <Typography sx={{ fontSize: '0.875rem' }}>
        Student attendance: {String(report.studentAttendancePct)}% · Staff: {String(report.staffAttendancePct)}%
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', mt: 1 }}>
        Schools requiring attention: {String(report.schoolsRequiringAttention)} · Not reporting: {String(report.schoolsNotReporting)}
      </Typography>
      <Typography sx={{ fontWeight: 700, mt: 2 }}>Major observations</Typography>
      {observations.map((o) => (
        <Typography key={o} sx={{ fontSize: '0.875rem' }}>
          • {o}
        </Typography>
      ))}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3 }}>
        <Button variant="contained" onClick={exportText}>
          Export (text / CSV-ready)
        </Button>
        <Button variant="outlined" onClick={() => downloadDailyReportPdf()}>
          PDF
        </Button>
        <Button variant="outlined" disabled title="Excel export: connect reporting service">
          Excel
        </Button>
      </Box>
    </SectionCard>
  );
}
