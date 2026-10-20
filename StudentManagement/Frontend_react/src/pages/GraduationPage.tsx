import { Box, Typography, Chip } from '@mui/material';

export default function GraduationPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', p: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }} color="primary" gutterBottom>Graduation Management</Typography>
      <Chip label="Coming Soon" color="warning" size="small" sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">Graduation management will be available in a future update.</Typography>
    </Box>
  );
}
