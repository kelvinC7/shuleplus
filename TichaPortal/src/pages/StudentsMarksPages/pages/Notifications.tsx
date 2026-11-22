import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

export default function Notifications() {
  const [params, setParams] = useState({});
  const { loading, error, alerts, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'flex-start' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Notifications</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Alerts from marks and at-risk students</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <Stack spacing={1.5}>
        {alerts.map((alert) => {
          const warning = alert.type === 'warning';
          return (
            <Paper
              key={alert.id}
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 2,
                borderRadius: 2,
                bgcolor: warning ? '#FFFBEB' : '#EFF6FF',
                borderColor: warning ? '#FDE68A' : '#BFDBFE',
              }}
            >
              <NotificationsIcon sx={{ fontSize: 18, color: warning ? '#D97706' : '#2563EB' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>{alert.message}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 12, color: '#6B7280' }}>{alert.date}</Typography>
              </Box>
            </Paper>
          );
        })}
        {!alerts.length && (
          <Box sx={{ py: 6, textAlign: 'center', borderRadius: 2, border: '1px dashed #E5E7EB', fontSize: 14, color: '#9CA3AF' }}>
            No alerts - all caught up.
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
