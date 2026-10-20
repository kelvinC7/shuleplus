import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Drawer,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';

const NAVY = '#000435';

export interface AcademicFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  activeFilterCount?: number;
  onClear?: () => void;
}

export function AcademicFilterDrawer({
  open,
  onClose,
  title = 'Filters',
  subtitle,
  children,
  activeFilterCount = 0,
  onClear,
}: AcademicFilterDrawerProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: fullScreen ? '100%' : { xs: '100%', sm: 360, md: 400 },
            maxWidth: '100vw',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: '1px solid rgba(0,4,53,0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          bgcolor: '#fff',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FilterListIcon sx={{ fontSize: 20, color: NAVY }} />
            <Typography sx={{ fontSize: '1.0625rem', fontWeight: 800, color: NAVY }}>{title}</Typography>
            {activeFilterCount > 0 ? (
              <Box
                sx={{
                  minWidth: 22,
                  height: 22,
                  px: 0.75,
                  borderRadius: 99,
                  bgcolor: '#FCB038',
                  color: NAVY,
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFilterCount}
              </Box>
            ) : null}
          </Box>
          {subtitle ? (
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>{subtitle}</Typography>
          ) : null}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close filters">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>{children}</Box>

      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderTop: '1px solid rgba(0,4,53,0.08)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          bgcolor: '#f8fafc',
        }}
      >
        {onClear ? (
          <Button
            fullWidth
            variant="outlined"
            onClick={onClear}
            sx={{ borderColor: 'rgba(0,4,53,0.15)', color: NAVY, fontWeight: 700 }}
          >
            Clear all
          </Button>
        ) : null}
        <Button fullWidth variant="contained" onClick={onClose} sx={{ bgcolor: NAVY, fontWeight: 700, '&:hover': { bgcolor: '#00064d' } }}>
          Show results
        </Button>
      </Box>
    </Drawer>
  );
}

export function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontSize: '0.625rem',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#64748b',
          mb: 1,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <FormControl fullWidth size="small">
      <Select
        displayEmpty
        value={value ?? ''}
        onChange={(e) => {
          const v = String(e.target.value);
          onChange(v === '' ? null : v);
        }}
        sx={{
          borderRadius: 2,
          bgcolor: '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: NAVY,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,4,53,0.12)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FCB038' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FCB038' },
        }}
      >
        {options.map((opt) => (
          <MenuItem key={opt.id || '__all__'} value={opt.id} sx={{ fontSize: '0.875rem' }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function FilterChipRow({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string; count?: number }>;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {options.map((opt) => {
        const active = value === opt.id || (opt.id === '' && (value === null || value === ''));
        return (
          <Box
            key={opt.id || '__all__'}
            onClick={() => onChange(opt.id === '' ? null : opt.id)}
            sx={{
              px: 1.25,
              py: 0.65,
              borderRadius: 99,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: active ? '#FCB038' : 'rgba(0,4,53,0.1)',
              bgcolor: active ? 'rgba(252,176,56,0.15)' : '#fff',
              transition: 'all 0.15s ease',
              '&:hover': { borderColor: '#FCB038' },
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: active ? 700 : 500, color: active ? NAVY : '#475569' }}>
              {opt.label}
              {opt.count != null ? ` (${opt.count})` : ''}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
