import { Box, Chip, Typography } from '@mui/material';
import type { ApiClass } from '@/types';
import type { ReportFilters } from '../types';
import { activeFilterChips } from '../utils';

export function ActiveFilterChips({
  filters,
  classes,
  onChange,
}: {
  filters: ReportFilters;
  classes: ApiClass[];
  onChange: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
}) {
  const chips = activeFilterChips(filters, classes);
  if (!chips.length) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>Active filters:</Typography>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          size="small"
          onDelete={() => {
            if (chip.key === 'dateFrom') {
              onChange('dateFrom', '');
              onChange('dateTo', '');
            } else {
              onChange(chip.key, '' as ReportFilters[typeof chip.key]);
            }
          }}
          sx={{ fontWeight: 600, bgcolor: '#f4f6fb' }}
        />
      ))}
    </Box>
  );
}
