import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { brand } from '../theme/theme';

export default function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  itemCount,
  pageStartIndex = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}) {
  if (total === 0) return null;

  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('ellipsis');
      acc.push(p);
      return acc;
    }, []);

  const navBtnSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    px: 1.5,
    py: 0.75,
    borderRadius: 1,
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid rgba(0,0,0,0.08)',
    bgcolor: '#fff',
    color: brand.navy,
    '&:hover': { bgcolor: '#F8FAFC' },
    '&.Mui-disabled': { opacity: 0.4 },
  };

  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        bgcolor: 'rgba(248,250,252,0.5)',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5}>
        <Typography sx={{ fontSize: 12, color: 'rgba(19,33,61,0.55)', fontVariantNumeric: 'tabular-nums' }}>
          Showing {pageStartIndex + 1}-{pageStartIndex + itemCount} of {total}
        </Typography>
        {onPageSizeChange && (
          <Stack direction="row" alignItems="center" gap={1} sx={{ fontSize: 12, color: 'rgba(19,33,61,0.55)' }}>
            <Box component="span">Per page</Box>
            <TextField
              select
              size="small"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              sx={{ '& .MuiOutlinedInput-root': { height: 28, fontSize: 12, borderRadius: 1 }, '& .MuiSelect-select': { py: 0.5, px: 1 } }}
            >
              {pageSizeOptions.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
      </Stack>

      {totalPages > 1 && (
        <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5} flexWrap="wrap">
          <ButtonBase disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} sx={navBtnSx}>
            <ChevronLeftIcon sx={{ fontSize: 14 }} /> Prev
          </ButtonBase>
          {pageButtons.map((p, i) => (p === 'ellipsis' ? (
            <Box component="span" key={`gap-${i}`} sx={{ px: 0.5, fontSize: 12, color: 'rgba(19,33,61,0.4)' }}>...</Box>
          ) : (
            <ButtonBase
              key={p}
              onClick={() => onPageChange(p)}
              sx={{
                minWidth: 32,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                borderColor: page === p ? '#FBBF24' : 'rgba(0,0,0,0.08)',
                bgcolor: page === p ? '#FEF3C7' : '#fff',
                color: page === p ? brand.navy : 'rgba(19,33,61,0.7)',
                '&:hover': { bgcolor: page === p ? '#FDE68A' : '#F8FAFC' },
              }}
            >
              {p}
            </ButtonBase>
          )))}
          <ButtonBase disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} sx={navBtnSx}>
            Next <ChevronRightIcon sx={{ fontSize: 14 }} />
          </ButtonBase>
        </Stack>
      )}
    </Box>
  );
}
