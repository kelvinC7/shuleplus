import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    navigate(`/home${qs ? `?${qs}` : ''}`, { replace: true });
  }, [navigate, searchParams]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={20} />
    </Box>
  );
}
