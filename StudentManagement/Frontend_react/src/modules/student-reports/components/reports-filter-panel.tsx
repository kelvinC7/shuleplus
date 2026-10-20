import {
  Box,
  Button,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import type { ApiClass } from '@/types';
import type { AcademicSettings } from '@/types';
import type { ReportFilters } from '../types';
import { getUniqueDistricts, getUniqueSectors, getUniqueStreams } from '../utils';
import type { Student } from '@/types';
import { ActiveFilterChips } from './active-filter-chips';

const NAVY = '#000435';

interface ReportsFilterPanelProps {
  open: boolean;
  onToggle: () => void;
  filters: ReportFilters;
  onChange: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  onClear: () => void;
  classes: ApiClass[];
  students: Student[];
  academicSettings: AcademicSettings | null;
}

export function ReportsFilterPanel({
  open,
  onToggle,
  filters,
  onChange,
  onClear,
  classes,
  students,
  academicSettings,
}: ReportsFilterPanelProps) {
  const districts = getUniqueDistricts(students);
  const sectors = getUniqueSectors(students, filters.district);
  const streams = getUniqueStreams(classes);
  const years = academicSettings?.academicYears ?? [];
  const terms = academicSettings?.terms ?? [];

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(0,4,53,0.08)',
        bgcolor: '#fff',
        mb: 2,
        overflow: 'hidden',
        boxShadow: '0 2px 12px -4px rgba(0,4,53,0.06)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderBottom: open ? '1px solid rgba(0,4,53,0.06)' : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon sx={{ fontSize: 18, color: NAVY }} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>Filters</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={onClear} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
            Clear All
          </Button>
          <IconButton size="small" onClick={onToggle}>
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(0,4,53,0.06)',
          bgcolor: 'rgba(0,4,53,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: NAVY }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY }}>Date Range</Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            maxWidth: 520,
          }}
        >
          <TextField
            size="small"
            type="date"
            label="From"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.dateFrom}
            onChange={(e) => onChange('dateFrom', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: '#fff',
              },
            }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.dateTo}
            onChange={(e) => onChange('dateTo', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: '#fff',
              },
            }}
          />
        </Box>
      </Box>

      <Collapse in={open}>
        <Box sx={{ p: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
          <TextField
            size="small"
            label="Search"
            placeholder="Name, Student Code, SDMS…"
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small">
            <InputLabel>Academic Year</InputLabel>
            <Select
              label="Academic Year"
              value={filters.academicYear}
              onChange={(e) => onChange('academicYear', e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">All years</MenuItem>
              {years.map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Term</InputLabel>
            <Select label="Term" value={filters.term} onChange={(e) => onChange('term', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All terms</MenuItem>
              {terms.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Class / Grade</InputLabel>
            <Select label="Class / Grade" value={filters.classId} onChange={(e) => onChange('classId', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All classes</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}{c.stream ? ` ${c.stream}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Stream</InputLabel>
            <Select label="Stream" value={filters.stream} onChange={(e) => onChange('stream', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All streams</MenuItem>
              {streams.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Gender</InputLabel>
            <Select label="Gender" value={filters.gender} onChange={(e) => onChange('gender', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="MALE">Male</MenuItem>
              <MenuItem value="FEMALE">Female</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Student Status</InputLabel>
            <Select label="Student Status" value={filters.status} onChange={(e) => onChange('status', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="GRADUATED">Graduated</MenuItem>
              <MenuItem value="TRANSFERRED">Transferred</MenuItem>
              <MenuItem value="WITHDRAWN">Withdrawn</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Enrollment Type</InputLabel>
            <Select label="Enrollment Type" value={filters.enrollmentType} onChange={(e) => onChange('enrollmentType', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="new">New Student</MenuItem>
              <MenuItem value="continuing">Continuing</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" type="number" label="Min Age" value={filters.ageMin} onChange={(e) => onChange('ageMin', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField size="small" type="number" label="Max Age" value={filters.ageMax} onChange={(e) => onChange('ageMax', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl size="small">
            <InputLabel>District</InputLabel>
            <Select label="District" value={filters.district} onChange={(e) => onChange('district', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All districts</MenuItem>
              {districts.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Sector</InputLabel>
            <Select label="Sector" value={filters.sector} onChange={(e) => onChange('sector', e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">All sectors</MenuItem>
              {sectors.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Collapse>

      <Box sx={{ px: 2, pb: open ? 2 : 1.5 }}>
        <ActiveFilterChips filters={filters} classes={classes} onChange={onChange} />
      </Box>
    </Box>
  );
}
