import { Box, Button, Typography } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { Link } from 'react-router-dom';
import type { ApiClass } from '@/types';
import type { PromotionResult } from '../types';
import { formatYearDisplay, shortClassLabel, NAVY, GOLD } from '../utils';

interface PromotionResultStepProps {
  fromYear: string;
  toYear: string;
  fromClass: ApiClass | null;
  toClass: ApiClass | null;
  totalSelected: number;
  result: PromotionResult;
  onPromoteAnother: () => void;
}

export function PromotionResultStep({
  fromYear,
  toYear,
  fromClass,
  toClass,
  totalSelected,
  result,
  onPromoteAnother,
}: PromotionResultStepProps) {
  const promoted = result.success.length;
  const skipped = result.skipped.length;
  const review = result.review.length;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
      <CheckCircleOutlinedIcon sx={{ fontSize: 56, color: '#16a34a', mb: 2 }} />
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: NAVY, mb: 1 }}>
        Promotion Completed
      </Typography>
      <Typography sx={{ fontSize: '0.9375rem', color: 'text.secondary', mb: 4 }}>
        {promoted} student{promoted !== 1 ? 's' : ''} successfully promoted
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
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
            {formatYearDisplay(fromYear)}
          </Typography>
          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: NAVY }}>
            {fromClass ? shortClassLabel(fromClass) : 'Mixed'}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{totalSelected} students</Typography>
        </Box>
        <Typography sx={{ fontSize: '2rem', color: GOLD }}>↓</Typography>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
            {formatYearDisplay(toYear)}
          </Typography>
          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: NAVY }}>
            {toClass ? shortClassLabel(toClass) : 'Mixed'}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
            {promoted} promoted
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
          mb: 4,
          p: 2.5,
          borderRadius: 2,
          bgcolor: 'white',
          border: '1px solid rgba(0,4,53,0.08)',
        }}
      >
        <ResultStat label="Successfully Promoted" value={promoted} color="#16a34a" />
        <ResultStat label="Skipped" value={skipped} color="#64748b" />
        <ResultStat label="Requires Review" value={review} color="#ea580c" />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
        {toClass && (
          <Button
            component={Link}
            to={`/students?class=${toClass.id}`}
            variant="contained"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: NAVY, '&:hover': { bgcolor: '#0a1055' } }}
          >
            View New Class
          </Button>
        )}
        <Button
          component={Link}
          to="/students/reports"
          variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: NAVY, borderColor: 'rgba(0,4,53,0.15)' }}
        >
          View Promotion Report
        </Button>
        <Button
          variant="outlined"
          onClick={onPromoteAnother}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: NAVY, borderColor: 'rgba(0,4,53,0.15)' }}
        >
          Promote Another Class
        </Button>
      </Box>
    </Box>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}
