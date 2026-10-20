import { useAuth } from '@/contexts/auth-context';
import { DashboardView } from '@/modules/dashboard/dashboard-view';
import { Box, CircularProgress } from '@mui/material';

export default function DashboardPage() {
  const { summary } = useAuth();

  if (!summary) {
    return (
      <Box sx={{ display: 'flex', minHeight: '40vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={22} sx={{ color: '#FCB038' }} />
      </Box>
    );
  }

  return <DashboardView summary={summary} />;
}
