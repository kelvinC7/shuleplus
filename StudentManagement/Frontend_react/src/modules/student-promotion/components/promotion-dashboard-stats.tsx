import { Box, Typography } from '@mui/material';
import type { PromotionStats } from '../types';
import { NAVY, GOLD } from '../utils';

interface PromotionDashboardStatsProps {
  stats: PromotionStats;
}

function StatItem({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 120, textAlign: 'center', py: 1.5 }}>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: accent ?? NAVY, lineHeight: 1.2 }}>
        {value.toLocaleString()}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}

export function PromotionDashboardStats({ stats }: PromotionDashboardStatsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        border: '1px solid rgba(0,4,53,0.08)',
        borderRadius: 2,
        bgcolor: 'white',
        overflow: 'hidden',
      }}
    >
      <StatItem label="Students" value={stats.total} />
      <Box sx={{ width: '1px', bgcolor: 'rgba(0,4,53,0.08)', display: { xs: 'none', sm: 'block' } }} />
      <StatItem label="Promoted" value={stats.promoted} accent="#16a34a" />
      <Box sx={{ width: '1px', bgcolor: 'rgba(0,4,53,0.08)', display: { xs: 'none', sm: 'block' } }} />
      <StatItem label="Pending" value={stats.pending} accent={GOLD} />
      <Box sx={{ width: '1px', bgcolor: 'rgba(0,4,53,0.08)', display: { xs: 'none', sm: 'block' } }} />
      <StatItem label="Not Promoted" value={stats.notPromoted} accent="#64748b" />
    </Box>
  );
}
