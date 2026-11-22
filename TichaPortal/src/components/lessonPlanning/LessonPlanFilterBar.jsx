import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import { brand } from '../../theme/theme';

const BORDER = 'rgba(19,33,61,0.08)';

const barSelectSx = {
  fontSize: 12,
  fontWeight: 600,
  color: brand.navy,
  bgcolor: 'transparent',
  '&:before, &:after': { borderBottom: 'none !important' },
  '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
  '& .MuiSelect-icon': { fontSize: 18 },
};

const searchInputSx = {
  width: '100%',
  border: 'none',
  outline: 'none',
  bgcolor: 'transparent',
  pl: 2.75,
  pr: 0.5,
  py: 0.75,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  color: brand.navy,
  '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
};

function SearchField({ value, onChange, placeholder }) {
  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <SearchIcon sx={{ position: 'absolute', left: 0, fontSize: 16, color: 'rgba(19,33,61,0.3)', pointerEvents: 'none' }} />
      <Box
        component="input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={searchInputSx}
      />
    </Box>
  );
}

/**
 * Compact sticky filter bar — same language as /marks and /assessments.
 * filters: [{ key, label, value, onChange(value), options: [{ value, label }], flex? }]
 * search:  { value, onChange(value), placeholder }
 */
export default function LessonPlanFilterBar({ filters = [], search }) {
  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.15 }}>
        {filters.map((f, i) => (
          <Box key={f.key} sx={{ display: 'contents' }}>
            {i > 0 ? <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} /> : null}
            <Box sx={{ flex: f.flex ?? 1, minWidth: 0 }}>
              <FormControl variant="standard" size="small" fullWidth>
                <Select
                  variant="standard"
                  disableUnderline
                  displayEmpty
                  value={f.value ?? ''}
                  onChange={(e) => f.onChange(e.target.value)}
                  sx={barSelectSx}
                  inputProps={{ 'aria-label': f.label }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                >
                  {f.options.map((o) => (
                    <MenuItem key={o.value || 'empty'} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        ))}
        {search ? (
          <>
            {filters.length ? (
              <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25, display: { xs: 'none', sm: 'block' } }} />
            ) : null}
            <Box sx={{ flex: 1.3, minWidth: 0, display: { xs: 'none', sm: 'flex' } }}>
              <SearchField {...search} />
            </Box>
          </>
        ) : null}
      </Stack>
      {search ? (
        <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 1.5, py: 0.5, borderTop: `1px solid ${BORDER}` }}>
          <SearchField {...search} />
        </Box>
      ) : null}
    </>
  );
}
