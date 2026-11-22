'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { brand } from '@/theme/theme';
import { SessionAccessDeniedScreen } from '@/components/session-access';
import { ErrorIllustration } from '@/components/status-screen';
import { friendlyErrorMessage } from '@/services/api';

export const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number];

/** Server-driven pagination state for list pages. */
export function useServerPagination(resetKey: unknown) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  return { page, pageSize, setPage, setPageSize };
}

export function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 1.5,
        borderTop: `1px solid ${brand.border}`,
        bgcolor: 'rgba(248,249,252,0.6)',
        px: 2,
        py: 1.5,
        fontSize: 12,
        color: 'text.secondary',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 1, sm: 2.5 } }}>
        <Typography component="span" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          <Box component="span" sx={{ fontWeight: 700, color: brand.navy }}>
            {rangeStart}
          </Box>
          {total > 0 ? `–${rangeEnd}` : ''} of{' '}
          <Box component="span" sx={{ fontWeight: 700, color: brand.navy }}>
            {total}
          </Box>{' '}
          {total === 1 ? 'record' : 'records'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            Rows
          </Typography>
          <FormControl size="small">
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as TablePageSize)}
              sx={{ fontSize: 12, fontWeight: 500, minWidth: 64, '& .MuiSelect-select': { py: 0.75 } }}
            >
              {TABLE_PAGE_SIZES.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' }, gap: 1.5 }}>
        <Typography sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          Page {page} of {Math.max(totalPages, 1)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            sx={{ border: `1px solid ${brand.border}`, borderRadius: 2 }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={page >= totalPages || totalPages === 0}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            sx={{ border: `1px solid ${brand.border}`, borderRadius: 2 }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search.',
  variant = 'outlined',
  sx,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'outlined' | 'standard' | 'filled';
  sx?: object;
}) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      variant={variant}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </InputAdornment>
        ),
      }}
      sx={{ minWidth: { xs: '100%', sm: 220 }, ...sx }}
    />
  );
}

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 8,
      }}
    >
      <CircularProgress sx={{ fontSize: 36, color: brand.primary }} thickness={4} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  message,
  hint,
  action,
  icon,
}: {
  title?: string;
  description?: string | null;
  message?: string | null;
  hint?: string | null;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const desc = description ?? message ?? hint;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        py: 6,
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 1.25,
          bgcolor: alphaNavy(0.06),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: brand.muted,
        }}
      >
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Typography sx={{ fontWeight: 700, color: brand.navy }}>{title}</Typography>
      {desc ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          {desc}
        </Typography>
      ) : null}
      {action}
    </Box>
  );
}

function alphaNavy(a: number) {
  return `rgba(0, 4, 53, ${a})`;
}

export function ErrorState({
  title = 'Unable to load',
  description,
  message,
  onRetry,
}: {
  title?: string;
  description?: string | null;
  message?: string | null;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const detail = friendlyErrorMessage(description ?? message);
  const sessionIssue = /sign in through shule|jwt|token|session|unauthori/i.test(
    `${description ?? ''} ${message ?? ''}`
  );
  if (sessionIssue) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, bgcolor: '#fff', overflow: 'auto' }}>
        <SessionAccessDeniedScreen />
      </Box>
    );
  }

  const close = () => setOpen(false);

  return (
    <>
      {!open ? (
        <Box
          sx={{
            py: 6,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 700, color: brand.navy }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            {detail}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {onRetry ? (
              <Button variant="contained" color="secondary" onClick={onRetry} sx={{ fontWeight: 700 }}>
                Try again
              </Button>
            ) : null}
            <Button variant="outlined" onClick={() => setOpen(true)} sx={{ fontWeight: 600, borderColor: brand.border }}>
              Show details
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ minHeight: 240 }} />
      )}

      <Dialog
        open={open}
        onClose={close}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0, 4, 53, 0.18)',
          },
        }}
      >
        <IconButton
          aria-label="Close"
          onClick={close}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            color: 'text.secondary',
            bgcolor: 'rgba(0,4,53,0.04)',
            '&:hover': { bgcolor: 'rgba(0,4,53,0.08)', color: brand.navy },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ textAlign: 'center', px: { xs: 3, sm: 4 }, py: { xs: 4, sm: 5 }, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ErrorIllustration size={160} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: brand.navy, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          <Typography sx={{ mt: 1.25, fontSize: 14, lineHeight: 1.6, color: brand.muted }}>
            {detail}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {onRetry ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={onRetry}
                sx={{ px: 4, py: 1.25, fontWeight: 700, borderRadius: 999, minWidth: 160 }}
              >
                Try again
              </Button>
            ) : null}
            <Button
              variant="text"
              onClick={close}
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AccessDeniedState({
  title = 'Access restricted',
  description = 'You do not have permission to view this section. Contact your platform administrator if you believe this is an error.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 1.5,
        py: 8,
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 1.25,
          bgcolor: 'rgba(214,69,69,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: brand.danger,
        }}
      >
        <ShieldOutlinedIcon />
      </Box>
      <Typography sx={{ fontWeight: 700, color: brand.navy }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {description}
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        href="/login"
        endIcon={<ArrowForwardIcon />}
        sx={{ mt: 1 }}
      >
        Go to login
      </Button>
    </Box>
  );
}

export function FilterBar({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        mb: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}


/** @deprecated use SearchField */
export const SearchInput = SearchField;
