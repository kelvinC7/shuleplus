'use client';

import Box from '@mui/material/Box';
import { brand } from '@/theme/theme';

/** Round initial avatar. `ring` draws the story ring (unseen = gold gradient, seen = grey). */
export function YoAvatar({
  name,
  color,
  size = 44,
  ring,
}: {
  name: string;
  color: string;
  size?: number;
  ring?: 'unseen' | 'seen';
}) {
  const dark = color === '#FCB038';
  const inner = (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
        color: dark ? brand.navy : '#fff',
        fontWeight: 800,
        fontSize: size * 0.4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {(name.trim().charAt(0) || '?').toUpperCase()}
    </Box>
  );
  if (!ring) return inner;
  return (
    <Box
      sx={{
        p: '2.5px',
        borderRadius: '50%',
        background: ring === 'unseen' ? `linear-gradient(135deg, ${brand.primary}, #D64545)` : 'rgba(255,255,255,0.35)',
        flexShrink: 0,
      }}
    >
      <Box sx={{ p: '2px', borderRadius: '50%', bgcolor: '#00021F' }}>{inner}</Box>
    </Box>
  );
}
