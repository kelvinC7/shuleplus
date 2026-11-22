import { Box, Typography } from '@mui/material';
import ReportCardsWorkspace from '@/components/reports/ReportCardsWorkspace';

const NAVY = '#000435';
const PAGE_BG = '#F5F7FA';

export default function ReportCardV2Page() {
  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: PAGE_BG,
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 2.5 },
          pb: 1,
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#fff',
        }}
      >
        <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 800, color: NAVY }}>
          Academic reports
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.5 }}>
          Manage, generate, review, and publish student report cards
        </Typography>
      </Box>
      <Box sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 2.5 } }}>
        <ReportCardsWorkspace />
      </Box>
    </Box>
  );
}
