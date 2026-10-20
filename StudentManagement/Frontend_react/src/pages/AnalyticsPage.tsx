import { Box, Typography, Chip } from '@mui/material';

export default function AnalyticsPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', p: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Academic Analytics</Typography>
      <Chip label="Coming Soon" color="warning" size="small" sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">Analytics will be available in a future update.</Typography>
    </Box>
  );
}
