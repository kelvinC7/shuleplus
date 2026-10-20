import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import type { PromotionMode } from '../types';
import { NAVY } from '../utils';

interface PromotionModeTabsProps {
  mode: PromotionMode;
  onChange: (mode: PromotionMode) => void;
}

export function PromotionModeTabs({ mode, onChange }: PromotionModeTabsProps) {
  return (
    <Box sx={{ border: '1px solid rgba(0,4,53,0.08)', borderRadius: 2, bgcolor: 'white', p: 2.5 }}>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, mb: 1.5 }}>
        Promotion Method
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_, v: PromotionMode | null) => v && onChange(v)}
        sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: '100%' }}
      >
        <ToggleButton
          value="by_class"
          sx={{
            flex: 1,
            textTransform: 'none',
            borderRadius: '12px !important',
            border: '1px solid rgba(0,4,53,0.12) !important',
            py: 1.5,
            px: 2,
            alignItems: 'flex-start',
            flexDirection: 'column',
            '&.Mui-selected': { bgcolor: 'rgba(252,176,56,0.12)', borderColor: '#FCB038 !important' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <ClassOutlinedIcon sx={{ fontSize: 18, color: NAVY }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: NAVY }}>Promote by Class</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'left' }}>
            Move an entire class — best for normal end-of-year promotion (e.g. P5 → P6)
          </Typography>
        </ToggleButton>

        <ToggleButton
          value="select_students"
          sx={{
            flex: 1,
            textTransform: 'none',
            borderRadius: '12px !important',
            border: '1px solid rgba(0,4,53,0.12) !important',
            py: 1.5,
            px: 2,
            alignItems: 'flex-start',
            flexDirection: 'column',
            '&.Mui-selected': { bgcolor: 'rgba(252,176,56,0.12)', borderColor: '#FCB038 !important' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <PersonSearchOutlinedIcon sx={{ fontSize: 18, color: NAVY }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: NAVY }}>Select Students</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'left' }}>
            Choose individual students for repeats, skips, transfers, or special placement
          </Typography>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
