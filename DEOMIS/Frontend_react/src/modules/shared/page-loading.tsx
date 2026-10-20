import { Box, CircularProgress } from '@mui/material';

export function PageLoading() {
  return (
    <Box sx={{ display: 'flex', minHeight: '40vh', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={22} sx={{ color: '#FCB038' }} />
    </Box>
  );
}
