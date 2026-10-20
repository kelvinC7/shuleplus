import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useMissingInformationData } from './hooks/use-missing-information-data';
import { MissingInformationTable } from './components/missing-information-table';
import { MISSING_FIELD_DEFS } from './types';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

export function MissingInformationView() {
  const data = useMissingInformationData();

  if (data.loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  const start = (data.page - 1) * 20 + 1;
  const end = Math.min(data.page * 20, data.filtered.length);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
      <Box>
        <Button
          component={Link}
          to="/students/reports"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
        >
          Back to Student Reports
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(251,191,36,0.15)',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WarningAmberOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color: NAVY }}>
              Incomplete Profiles
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.9375rem', color: 'text.secondary', maxWidth: 640 }}>
              Students with incomplete profiles. Review missing fields and complete their records.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          p: 0.5,
        }}
      >
        <FilterPill label="All missing" active={data.fieldFilter === 'all'} onClick={() => data.setFieldFilter('all')} count={data.incompleteRows.length} />
        {MISSING_FIELD_DEFS.map((field) => (
          <FilterPill
            key={field.id}
            label={field.label.replace('Missing ', '')}
            active={data.fieldFilter === field.id}
            onClick={() => data.setFieldFilter(field.id)}
            count={data.fieldCounts[field.id]}
          />
        ))}
      </Box>

      <TextField
        size="small"
        placeholder="Search by name, code, or class…"
        value={data.search}
        onChange={(e) => data.setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: <SearchIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />,
          },
        }}
        sx={{ maxWidth: 420, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#fff' } }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 800, color: NAVY }}>
          Students with Missing Data
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {data.filtered.length} student{data.filtered.length !== 1 ? 's' : ''} found
        </Typography>
      </Box>

      <MissingInformationTable rows={data.paginated} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          Showing {data.filtered.length ? start : 0}–{end} of {data.filtered.length}
        </Typography>
        <Pagination
          count={data.totalPages}
          page={data.page}
          onChange={(_, p) => data.setPage(p)}
          shape="rounded"
          size="small"
          sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: NAVY, color: PRIMARY } }}
        />
      </Box>
    </Box>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <Button
      onClick={onClick}
      sx={{
        borderRadius: 5,
        px: 2,
        py: 0.75,
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'none',
        bgcolor: active ? NAVY : '#fff',
        color: active ? PRIMARY : NAVY,
        border: '1px solid',
        borderColor: active ? NAVY : 'rgba(0,4,53,0.12)',
        boxShadow: active ? '0 4px 12px -4px rgba(0,4,53,0.2)' : 'none',
        '&:hover': { bgcolor: active ? NAVY : '#f8fafc' },
      }}
    >
      {label} ({count})
    </Button>
  );
}
