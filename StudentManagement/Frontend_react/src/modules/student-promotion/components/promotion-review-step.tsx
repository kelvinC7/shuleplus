import { Box, Button, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { ApiClass } from '@/types';
import type { PromotionCandidate } from '../types';
import { formatYearDisplay, shortClassLabel, NAVY, GOLD } from '../utils';

interface PromotionReviewStepProps {
  fromYear: string;
  toYear: string;
  fromClass: ApiClass | null;
  toClass: ApiClass | null;
  candidates: PromotionCandidate[];
  readyCount: number;
  reviewCount: number;
  promoting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function PromotionReviewStep({
  fromYear,
  toYear,
  fromClass,
  toClass,
  candidates,
  readyCount,
  reviewCount,
  promoting,
  onBack,
  onConfirm,
}: PromotionReviewStepProps) {
  const excluded = reviewCount;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY, mb: 3, textAlign: 'center' }}>
        Review Promotion
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          mb: 4,
          py: 3,
          px: 2,
          borderRadius: 2.5,
          bgcolor: 'white',
          border: '1px solid rgba(0,4,53,0.08)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
            {formatYearDisplay(fromYear)}
          </Typography>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>
            {fromClass ? shortClassLabel(fromClass) : 'Mixed'}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
            {candidates.length} students
          </Typography>
        </Box>

        <Typography sx={{ fontSize: '2rem', color: GOLD, fontWeight: 700 }}>↓</Typography>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
            {formatYearDisplay(toYear)}
          </Typography>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>
            {toClass ? shortClassLabel(toClass) : 'Mixed'}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
            {readyCount} to promote
          </Typography>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,4,53,0.08)', p: 3, mb: 3 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, mb: 2 }}>Summary</Typography>
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          <SummaryRow label="Students selected" value={String(candidates.length)} />
          <SummaryRow label="New academic year" value={formatYearDisplay(toYear)} />
          {fromClass && <SummaryRow label="Current class" value={shortClassLabel(fromClass)} />}
          {toClass && <SummaryRow label="New class (default)" value={shortClassLabel(toClass)} />}
          <SummaryRow label="Ready to promote" value={String(readyCount)} />
          <SummaryRow label="Students excluded (issues)" value={String(excluded)} highlight={excluded > 0} />
        </Box>
      </Box>

      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', textAlign: 'center', mb: 3 }}>
        Previous enrollments in {formatYearDisplay(fromYear)} will be preserved as historical records.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          disabled={promoting}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: NAVY, borderColor: 'rgba(0,4,53,0.15)' }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          endIcon={promoting ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
          onClick={onConfirm}
          disabled={promoting || readyCount === 0}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: NAVY, px: 3, '&:hover': { bgcolor: '#0a1055' } }}
        >
          {promoting ? 'Promoting…' : 'Confirm Promotion'}
        </Button>
      </Box>
    </Box>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: highlight ? '#ea580c' : NAVY }}>{value}</Typography>
    </Box>
  );
}
