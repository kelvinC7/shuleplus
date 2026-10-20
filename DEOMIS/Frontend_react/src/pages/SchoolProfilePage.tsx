import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { fetchSchoolProfile } from '@/services/deo-api';
import { StatusChip } from '@/components/status-chip';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';
import { ModernVerticalBarChart, NAVY, PRIMARY } from '@/components/charts/sm-charts';

export default function SchoolProfilePage() {
  const { schoolId } = useParams();
  const [school, setSchool] = useState<Awaited<ReturnType<typeof fetchSchoolProfile>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    fetchSchoolProfile(schoolId)
      .then(setSchool)
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading || !school) return <PageLoading />;

  const device = school.device as Record<string, string | number | boolean | null>;
  const g = school.genderDistribution ?? { MALE: 0, FEMALE: 0, OTHER: 0 };
  const genderBars = [
    { label: 'Male', value: g.MALE ?? 0, male: g.MALE ?? 0, female: 0 },
    { label: 'Female', value: g.FEMALE ?? 0, male: 0, female: g.FEMALE ?? 0 },
    { label: 'Other', value: g.OTHER ?? 0, male: 0, female: 0 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#000435' }}>
          {school.name}
        </Typography>
        <StatusChip status={school.status} />
      </Box>

      <StatsGrid>
        <StatCard label="Student attendance" value={`${school.studentAttendancePct}%`} />
        <StatCard label="Staff attendance" value={`${school.staffAttendancePct}%`} />
        <StatCard label="Present / enrolled" value={`${school.studentsPresent} / ${school.students}`} />
        <StatCard label="Late arrivals" value={school.lateArrivals} />
      </StatsGrid>

      <SectionCard title="Enrollment by gender" subtitle="Student Management active enrollments">
        <ModernVerticalBarChart data={genderBars} color={NAVY} accentColor={PRIMARY} />
      </SectionCard>

      <SectionCard title="Class-level attendance">
        {school.classes.map((c) => (
          <Box key={c.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(0,4,53,0.06)' }}>
            <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
            <Typography>
              {c.attendancePct}% · present {c.present ?? 0} · late {c.late ?? 0}
            </Typography>
          </Box>
        ))}
      </SectionCard>

      {school.chronicAbsentees?.length ? (
        <SectionCard title="Chronic absentees">
          {school.chronicAbsentees.map((st) => (
            <Typography key={st.studentCode} sx={{ fontSize: '0.875rem' }}>
              {st.studentName} ({st.studentCode}) · {st.className ?? 'Class n/a'}
            </Typography>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title="Attendance device">
        <Typography sx={{ fontSize: '0.875rem' }}>Status: {String(device.readerStatus)}</Typography>
        <Typography sx={{ fontSize: '0.875rem' }}>Last sync: {String(device.lastSync ?? '-')}</Typography>
        <Typography sx={{ fontSize: '0.875rem' }}>Internet: {device.internet ? 'Online' : 'Offline'}</Typography>
        <Typography sx={{ fontSize: '0.875rem' }}>Scans today: {String(device.scansToday)}</Typography>
        <Typography sx={{ fontSize: '0.875rem' }}>Clock: {String(device.clockSync)}</Typography>
      </SectionCard>

      {school.flags.length ? (
        <SectionCard title="Active flags">
          {school.flags.map((f) => (
            <Typography key={f} sx={{ fontSize: '0.875rem' }}>
              • {f}
            </Typography>
          ))}
        </SectionCard>
      ) : null}
    </Box>
  );
}
