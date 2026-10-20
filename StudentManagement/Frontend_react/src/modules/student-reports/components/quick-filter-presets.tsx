import { Box, Button } from '@mui/material';
import type { QuickPreset } from '../types';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

const PRESETS: { id: QuickPreset; label: string }[] = [
  { id: 'all', label: 'All Students' },
  { id: 'new_admissions', label: 'New Admissions' },
  { id: 'active', label: 'Active Students' },
  { id: 'transferred', label: 'Transferred' },
];

export function QuickFilterPresets({
  active,
  onChange,
}: {
  active: QuickPreset;
  onChange: (preset: QuickPreset) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      {PRESETS.map((p) => {
        const selected = active === p.id;
        return (
          <Button
            key={p.id}
            size="small"
            onClick={() => onChange(p.id)}
            sx={{
              borderRadius: 5,
              px: 2,
              py: 0.75,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: selected ? NAVY : '#fff',
              color: selected ? PRIMARY : NAVY,
              border: '1px solid',
              borderColor: selected ? NAVY : 'rgba(0,4,53,0.12)',
              boxShadow: selected ? '0 4px 12px -4px rgba(0,4,53,0.2)' : 'none',
              '&:hover': { bgcolor: selected ? NAVY : '#f8fafc' },
            }}
          >
            {p.label}
          </Button>
        );
      })}
    </Box>
  );
}
