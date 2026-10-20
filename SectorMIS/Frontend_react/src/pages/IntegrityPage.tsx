import { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { fetchIntegrityAlerts } from '@/services/sei-api';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

type IntegrityAlert = {
  id: string;
  schoolName: string;
  summary: string;
  severity: string;
  recordedAt: string;
};

export default function IntegrityPage() {
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrityAlerts()
      .then((d) => setAlerts(d as IntegrityAlert[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info" icon={<ShieldOutlinedIcon />}>
        Unusual events are flagged for verification; audit history is preserved. No automatic accusations.
      </Alert>
      {alerts.map((a) => (
        <SectionCard key={a.id} title={a.schoolName} subtitle={new Date(a.recordedAt).toLocaleString()}>
          <Typography sx={{ fontWeight: 700, color: '#a16207', mb: 1 }}>Attendance record requires verification</Typography>
          <Typography sx={{ fontSize: '0.875rem' }}>{a.summary}</Typography>
          <Typography sx={{ mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>Severity: {a.severity}</Typography>
        </SectionCard>
      ))}
    </Box>
  );
}
