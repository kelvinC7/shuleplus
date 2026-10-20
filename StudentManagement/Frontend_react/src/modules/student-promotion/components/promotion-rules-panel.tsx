import { Box, Button, Chip, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { DEFAULT_PROMOTION_RULES, NAVY } from '../utils';

interface PromotionRulesPanelProps {
  onApplyToSelection: () => void;
  disabled?: boolean;
}

export function PromotionRulesPanel({ onApplyToSelection, disabled }: PromotionRulesPanelProps) {
  return (
    <Box sx={{ border: '1px solid rgba(0,4,53,0.08)', borderRadius: 2, bgcolor: 'white', p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>Promotion Rules</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            Standard class progression — apply to auto-select the next class
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AutoAwesomeOutlinedIcon />}
          onClick={onApplyToSelection}
          disabled={disabled}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: NAVY, borderColor: 'rgba(0,4,53,0.15)', whiteSpace: 'nowrap' }}
        >
          Apply to Selection
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {DEFAULT_PROMOTION_RULES.map((rule) => (
          <Chip
            key={rule.from}
            size="small"
            label={`${rule.from} → ${rule.to}`}
            sx={{ fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'rgba(0,4,53,0.04)' }}
          />
        ))}
      </Box>
    </Box>
  );
}
