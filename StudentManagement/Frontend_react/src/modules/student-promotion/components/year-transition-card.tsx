import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { AcademicSettings } from '@/types';
import { formatYearDisplay, NAVY, GOLD } from '../utils';

interface YearTransitionCardProps {
  fromYear: string;
  toYear: string;
  academicSettings: AcademicSettings | null;
  onFromYearChange: (year: string) => void;
  onToYearChange: (year: string) => void;
}

export function YearTransitionCard({
  fromYear,
  toYear,
  academicSettings,
  onFromYearChange,
  onToYearChange,
}: YearTransitionCardProps) {
  const years = academicSettings?.academicYears ?? [];

  return (
    <Box
      sx={{
        border: '1px solid rgba(0,4,53,0.1)',
        borderRadius: 2.5,
        bgcolor: 'white',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ bgcolor: NAVY, color: 'white', px: 3, py: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', opacity: 0.85 }}>
          PROMOTE STUDENTS
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
            gap: 2,
            alignItems: 'end',
            mb: 2.5,
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel>From Academic Year</InputLabel>
            <Select
              label="From Academic Year"
              value={fromYear}
              onChange={(e) => onFromYearChange(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {formatYearDisplay(y)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: { xs: 0, md: 0.5 } }}>
            <ArrowForwardIcon sx={{ color: GOLD, fontSize: 28 }} />
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>To Academic Year</InputLabel>
            <Select
              label="To Academic Year"
              value={toYear}
              onChange={(e) => onToYearChange(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y} disabled={y === fromYear}>
                  {formatYearDisplay(y)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', textAlign: 'center', mb: 2.5 }}>
          Students will remain in {formatYearDisplay(fromYear)} as historical records.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(0,4,53,0.03)',
              border: '1px solid rgba(0,4,53,0.06)',
            }}
          >
            <LockOutlinedIcon sx={{ color: NAVY, fontSize: 20, mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 0.25 }}>
                Previous Academic Year
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 0.5 }}>
                Once promotion is completed, {formatYearDisplay(fromYear)} remains unchanged.
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: NAVY }}>
                {formatYearDisplay(fromYear)}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(252,176,56,0.08)',
              border: '1px solid rgba(252,176,56,0.25)',
            }}
          >
            <ArrowForwardIcon sx={{ color: GOLD, fontSize: 20, mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 0.25 }}>
                New Academic Year
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 0.5 }}>
                Students receive a new enrollment and class placement.
              </Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: NAVY }}>
                {formatYearDisplay(toYear)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
