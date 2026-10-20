import {
  Box,
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

interface PromotionRecordsFilterProps {
  search: string;
  classFilter: string | null;
  classes: ApiClass[];
  recordCount: number;
  onSearchChange: (q: string) => void;
  onClassFilterChange: (id: string | null) => void;
}

export function PromotionRecordsFilter({
  search,
  classFilter,
  classes,
  recordCount,
  onSearchChange,
  onClassFilterChange,
}: PromotionRecordsFilterProps) {
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
        placeholder="Search by class name…"
        value={search}
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
        sx={{
          minWidth: { xs: '100%', sm: 260 },
          flex: { sm: 1 },
          maxWidth: 360,
          '& .MuiOutlinedInput-root': { borderRadius: 2 },
        }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>From Class</InputLabel>
        <Select
          label="From Class"
          value={classFilter ?? ''}
          onChange={(e) => onClassFilterChange(e.target.value || null)}
          sx={{ borderRadius: 2 }}
        >
          <MenuItem value="">All Classes</MenuItem>
          {classes.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.stream ? `${c.name} ${c.stream}` : c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: { md: 'auto' } }}>
        {recordCount} class promotion{recordCount !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
}
