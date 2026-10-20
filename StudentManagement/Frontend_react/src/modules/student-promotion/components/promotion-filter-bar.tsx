import {
  Box,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { ApiClass } from '@/types';
import type { PromotionMode } from '../types';
import { classLabel, formatYearDisplay, shortClassLabel, NAVY } from '../utils';

interface PromotionFilterBarProps {
  mode: PromotionMode;
  fromYear: string;
  toYear: string;
  fromClassId: string | null;
  filterClassId: string | null;
  classes: ApiClass[];
  searchQuery: string;
  studentCount: number;
  onSearchChange: (q: string) => void;
  onFromClassChange: (id: string | null) => void;
  onFilterClassChange: (id: string | null) => void;
  onEditSetup: () => void;
}

export function PromotionFilterBar({
  mode,
  fromYear,
  toYear,
  fromClassId,
  filterClassId,
  classes,
  searchQuery,
  studentCount,
  onSearchChange,
  onFromClassChange,
  onFilterClassChange,
  onEditSetup,
}: PromotionFilterBarProps) {
  const fromClass = classes.find((c) => c.id === fromClassId);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        border: '1px solid rgba(0,4,53,0.08)',
        borderRadius: 2,
        bgcolor: 'white',
      }}
    >
      <TextField
        size="small"
        placeholder="Search student…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: 1 }, maxWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />

      {mode === 'by_class' ? (
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>From Class</InputLabel>
          <Select
            label="From Class"
            value={fromClassId ?? ''}
            onChange={(e) => onFromClassChange(e.target.value || null)}
            sx={{ borderRadius: 2 }}
          >
            {classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {classLabel(c)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Class</InputLabel>
          <Select
            label="Class"
            value={filterClassId ?? ''}
            onChange={(e) => onFilterClassChange(e.target.value || null)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Classes</MenuItem>
            {classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {classLabel(c)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {fromYear && toYear && (
        <Chip
          size="small"
          label={`${formatYearDisplay(fromYear)} → ${formatYearDisplay(toYear)}`}
          sx={{ fontWeight: 600, fontSize: '0.6875rem', bgcolor: 'rgba(0,4,53,0.05)' }}
        />
      )}

      {fromClass && (
        <Chip
          size="small"
          label={shortClassLabel(fromClass)}
          sx={{ fontWeight: 600, fontSize: '0.6875rem', bgcolor: 'rgba(252,176,56,0.12)', color: NAVY }}
        />
      )}

      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: { md: 'auto' } }}>
        {studentCount} student{studentCount !== 1 ? 's' : ''}
      </Typography>

      <Typography
        component="button"
        onClick={onEditSetup}
        sx={{
          border: 'none',
          bgcolor: 'transparent',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: NAVY,
          textDecoration: 'underline',
          p: 0,
        }}
      >
        Edit setup
      </Typography>
    </Box>
  );
}
