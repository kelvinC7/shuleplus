import { useState } from 'react';
import { IconButton, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckIcon from '@mui/icons-material/Check';

const NAVY = '#000435';

interface ChartAcademicYearMenuProps {
  years: string[];
  value: string;
  onChange: (year: string) => void;
  disabled?: boolean;
}

function formatYear(year: string): string {
  return year.replace(/-/g, '–');
}

export function ChartAcademicYearMenu({ years, value, onChange, disabled }: ChartAcademicYearMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        disabled={disabled || years.length === 0}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ color: NAVY }}
        aria-label="Filter by academic year"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 2, mt: 0.5 } } }}
      >
        {years.map((year) => (
          <MenuItem
            key={year}
            selected={year === value}
            onClick={() => {
              onChange(year);
              setAnchorEl(null);
            }}
            sx={{ py: 1 }}
          >
            <ListItemText primary={formatYear(year)} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }} />
            {year === value ? <CheckIcon sx={{ fontSize: 18, color: NAVY, ml: 1 }} /> : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
