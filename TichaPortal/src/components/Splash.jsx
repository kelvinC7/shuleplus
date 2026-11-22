import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand } from '../theme/theme';

export default function Splash() {
  return (
    <Box
      role="status"
      aria-label="Loading"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brand.navy,
        color: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <Box component="img" src="/st-wordmark.webp" alt="ShuleTicha" sx={{ height: 48, width: 'auto' }} />
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>The teacher&apos;s workspace</Typography>
        <Box
          sx={{
            mt: 1,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: brand.primary,
            animation: 'spin 0.8s linear infinite',
            '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
          }}
        />
      </Box>
      <Box sx={{ position: 'absolute', bottom: 28, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)' }}>
          Powered by
        </Typography>
        <Box component="img" src="/logo_white.png" alt="Shule+" sx={{ height: 18, width: 'auto' }} />
      </Box>
    </Box>
  );
}
