import { useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import Divider from '@mui/material/Divider';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

function orderWithCurrentFirst(items, current) {
  if (!current || !items?.length) return items || [];
  const rest = items.filter((x) => x !== current).sort((a, b) => String(a).localeCompare(String(b)));
  return items.includes(current) ? [current, ...rest] : rest;
}

const labelSx = {
  mb: 0.5,
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#94A3B8',
};

const selectSx = {
  '& .MuiOutlinedInput-root': {
    height: 40,
    borderRadius: 2,
    bgcolor: '#fff',
    fontSize: 14,
    fontWeight: 500,
  },
};

const barSelectSx = {
  fontSize: 12,
  fontWeight: 600,
  color: '#13213D',
  bgcolor: 'transparent',
  '&:before, &:after': { borderBottom: 'none !important' },
  '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
  '& .MuiSelect-icon': { fontSize: 18 },
};

/**
 * variant="card" (default): the original boxed filter panel used on other marks pages.
 * variant="bar": sticky full-width second topbar (Year | Term | Class, Subject below).
 */
export default function MarksAnalyticsFilters({
  filters,
  selected,
  onChange,
  showClass = true,
  showSubject = true,
  variant = 'card',
}) {
  const syncedRef = useRef(false);

  const years = orderWithCurrentFirst(filters?.academic_years || [], filters?.current_academic_year);
  const terms = orderWithCurrentFirst(filters?.terms || [], filters?.current_term || selected?.term);
  const assignments = filters?.assignments || [];

  const value = {
    academic_year: selected?.academic_year || filters?.current_academic_year || years[0] || '',
    term: selected?.term || filters?.current_term || terms[0] || '',
    class_name: selected?.class_name || '',
    subject_name: selected?.subject_name || '',
  };

  const classes = useMemo(() => {
    const all = [...new Set(assignments.map((a) => a.class_name).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
    if (!value.subject_name) return all.length ? all : [...(filters?.classes || [])].sort();
    return [...new Set(assignments.filter((a) => a.subject_name === value.subject_name).map((a) => a.class_name))]
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [assignments, filters?.classes, value.subject_name]);

  const courses = useMemo(() => {
    const all = [...new Set(assignments.map((a) => a.subject_name).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
    if (!value.class_name) return all.length ? all : [...(filters?.courses || [])].sort();
    return [...new Set(assignments.filter((a) => a.class_name === value.class_name).map((a) => a.subject_name))]
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [assignments, filters?.courses, value.class_name]);

  useEffect(() => {
    if (syncedRef.current || !filters?.current_academic_year) return;
    syncedRef.current = true;
    onChange({
      academic_year: filters.current_academic_year,
      term: filters.current_term || terms[0] || '',
      class_name: '',
      subject_name: '',
    });
  }, [filters, onChange, terms]);

  if (!years.length && !terms.length && !classes.length) return null;

  const emit = (patch) => {
    const next = { ...value, ...patch };
    if (patch.subject_name !== undefined && patch.class_name === undefined) {
      const classStillValid = !next.class_name || classes.includes(next.class_name);
      if (!classStillValid) next.class_name = '';
    }
    if (patch.class_name !== undefined && patch.subject_name === undefined) {
      const subjectStillValid = !next.subject_name || courses.includes(next.subject_name);
      if (!subjectStillValid) next.subject_name = '';
    }
    onChange(next);
  };


  if (variant === 'bar') {
    const renderSelect = (val, onVal, options, allLabel, aria) => (
      <FormControl variant="standard" size="small" fullWidth sx={{ minWidth: 0 }}>
        <Select
          variant="standard"
          disableUnderline
          displayEmpty
          fullWidth
          value={val}
          onChange={(e) => onVal(e.target.value)}
          sx={barSelectSx}
          inputProps={{ 'aria-label': aria }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
        >
          {allLabel ? <MenuItem value="">{allLabel}</MenuItem> : null}
          {options.map((o) => (
            <MenuItem key={o} value={o}>{o}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );

    const topRow = [
      years.length > 0 && { key: 'year', flex: 1, node: renderSelect(value.academic_year, (v) => emit({ academic_year: v }), years, null, 'Academic year') },
      terms.length > 0 && { key: 'term', flex: 0.85, node: renderSelect(value.term, (v) => emit({ term: v }), terms, null, 'Term') },
      showClass && classes.length > 0 && { key: 'class', flex: 1.1, node: renderSelect(value.class_name, (v) => emit({ class_name: v }), classes, 'All classes', 'Class') },
    ].filter(Boolean);

    return (
      <Box
        sx={{
          position: 'sticky',
          top: 40,
          zIndex: 20,
          width: '100%',
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(19,33,61,0.08)',
          boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
        }}
      >
        {topRow.length > 0 && (
          <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.25 }}>
            {topRow.map((item, i) => (
              <Stack key={item.key} direction="row" alignItems="center" sx={{ flex: item.flex, minWidth: 0 }}>
                {i > 0 && <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>{item.node}</Box>
              </Stack>
            ))}
          </Stack>
        )}
        {showSubject && courses.length > 0 && (
          <Box sx={{ px: 1.5, py: 0.25, borderTop: '1px solid rgba(19,33,61,0.08)', width: '100%' }}>
            {renderSelect(value.subject_name, (v) => emit({ subject_name: v }), courses, 'All subjects', 'Subject')}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: 'rgba(148,163,184,0.4)', p: { xs: 1.5, sm: 2 }, maxWidth: 560 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <FilterAltIcon sx={{ fontSize: 14, color: '#B26A00' }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#94A3B8' }}>
          Filters
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1 }}>
        {years.length > 0 && (
          <Box>
            <Box component="span" sx={labelSx}>Year</Box>
            <TextField select fullWidth size="small" value={value.academic_year} onChange={(e) => emit({ academic_year: e.target.value })} sx={selectSx} inputProps={{ 'aria-label': 'Academic year' }}>
              {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Box>
        )}
        {terms.length > 0 && (
          <Box>
            <Box component="span" sx={labelSx}>Term</Box>
            <TextField select fullWidth size="small" value={value.term} onChange={(e) => emit({ term: e.target.value })} sx={selectSx} inputProps={{ 'aria-label': 'Term' }}>
              {terms.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Box>
        )}
        {showClass && classes.length > 0 && (
          <Box>
            <Box component="span" sx={labelSx}>Class</Box>
            <TextField select fullWidth size="small" value={value.class_name} onChange={(e) => emit({ class_name: e.target.value })} sx={selectSx} inputProps={{ 'aria-label': 'Class' }}>
              <MenuItem value="">All classes</MenuItem>
              {classes.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Box>
        )}
        {showSubject && courses.length > 0 && (
          <Box sx={{ gridColumn: { xs: 'span 2', lg: 'span 1' } }}>
            <Box component="span" sx={labelSx}>Subject</Box>
            <TextField select fullWidth size="small" value={value.subject_name} onChange={(e) => emit({ subject_name: e.target.value })} sx={selectSx} inputProps={{ 'aria-label': 'Subject' }}>
              <MenuItem value="">All subjects</MenuItem>
              {courses.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
