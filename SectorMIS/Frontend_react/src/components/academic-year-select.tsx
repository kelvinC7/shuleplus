import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';

function formatYear(year: string): string {
  return year.replace(/-/g, '–');
}

interface AcademicYearSelectProps {
  years: string[];
  value: string;
  onChange: (year: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  minWidth?: number;
}

export function AcademicYearSelect({
  years,
  value,
  onChange,
  disabled,
  size = 'small',
  minWidth = 160,
}: AcademicYearSelectProps) {
  return (
    <FormControl size={size} sx={{ minWidth }} disabled={disabled || years.length === 0}>
      <InputLabel id="academic-year-label">Academic Year</InputLabel>
      <Select
        labelId="academic-year-label"
        label="Academic Year"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        startAdornment={undefined}
        sx={{ borderRadius: 1, bgcolor: 'white', fontSize: '0.875rem' }}
      >
        {years.map((year) => (
          <MenuItem key={year} value={year}>
            {formatYear(year)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export { CalendarMonthOutlinedIcon as AcademicYearIcon };
