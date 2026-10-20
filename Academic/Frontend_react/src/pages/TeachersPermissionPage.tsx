import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  approveTeacherPermission,
  listTeacherPermissions,
  rejectTeacherPermission,
  type TeacherPermissionRow,
} from '@/services/api';

const PERMISSION_TYPES: Record<string, string> = {
  SICK_LEAVE: 'Sick leave',
  PERSONAL: 'Personal',
  FAMILY: 'Family',
  OFFICIAL: 'Official',
  LATE_ARRIVAL: 'Late arrival',
  EARLY_DEPARTURE: 'Early departure',
  OTHER: 'Other',
};

function fmtDate(raw?: string) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

function typeLabel(row: TeacherPermissionRow) {
  const raw = String(row.permission_type || '').trim();
  const key = raw.toUpperCase();
  if (key === 'OTHER' && row.permission_type_other) return row.permission_type_other;
  return PERMISSION_TYPES[key] || raw.replace(/_/g, ' ') || 'Other';
}

function statusStyle(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending') return { bgcolor: 'rgba(251,191,36,0.1)', color: '#b45309' };
  if (s === 'approved') return { bgcolor: 'rgba(34,197,94,0.1)', color: '#15803d' };
  if (s === 'rejected') return { bgcolor: 'rgba(239,68,68,0.08)', color: '#b91c1c' };
  if (s === 'cancelled') return { bgcolor: '#f1f5f9', color: '#64748b' };
  return { bgcolor: '#f1f5f9', color: '#64748b' };
}

const flatFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fff',
    boxShadow: 'none',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '&.Mui-focused fieldset': { borderColor: '#000435', borderWidth: 1 },
  },
};

export default function TeachersPermissionPage() {
  const [rows, setRows] = useState<TeacherPermissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [status, setStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewRow, setViewRow] = useState<TeacherPermissionRow | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionKind, setActionKind] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await listTeacherPermissions({
        page: page + 1,
        limit: rowsPerPage,
        status: status === 'all' ? undefined : status,
        permission_type: typeFilter === 'all' ? undefined : typeFilter,
        q: searchDebounced || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      setRows([]);
      setTotal(0);
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setLoadError(
        err.response?.data?.message ||
          err.message ||
          'Could not load requests. Check Academic backend and TICHA_PORTAL_API_URL (port 4000).'
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, status, typeFilter, searchDebounced, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => (status === 'pending' ? total : rows.filter((r) => r.status === 'pending').length),
    [status, total, rows]
  );

  const runAction = async () => {
    if (!actionId || !actionKind) return;
    setActionError('');
    const notes = reviewNotes.trim();
    if (actionKind === 'reject' && !notes) {
      setActionError('Please enter a reason for rejection.');
      return;
    }
    try {
      if (actionKind === 'approve') await approveTeacherPermission(actionId, notes || undefined);
      else await rejectTeacherPermission(actionId, notes);
      setActionId(null);
      setActionKind(null);
      setReviewNotes('');
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setActionError(err.response?.data?.message || 'Action failed. Try again.');
    }
  };

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          bgcolor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <ShieldOutlinedIcon sx={{ color: '#000435', fontSize: 22 }} />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: '#000435' }}>
            Teachers permission
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
            Review leave and duty requests from the teacher portal.
          </Typography>
        </Box>
        {status === 'pending' && pendingCount > 0 && (
          <Chip
            label={`${pendingCount} pending`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: 'rgba(251,191,36,0.12)', color: '#d97706' }}
          />
        )}
        <Tooltip title="Refresh">
          <IconButton onClick={load} size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
        {loadError ? (
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              border: '1px solid #fecaca',
              bgcolor: '#fef2f2',
              color: '#b91c1c',
              fontSize: '0.85rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Box component="span" sx={{ flex: 1 }}>
              {loadError}
            </Box>
            <Button size="small" variant="outlined" color="error" onClick={load}>
              Retry
            </Button>
          </Box>
        ) : null}
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            p: 2,
            mb: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' },
            gap: 1.5,
          }}
        >
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          >
            <MenuItem value="all">All types</MenuItem>
            {Object.entries(PERMISSION_TYPES).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          />
          <TextField
            size="small"
            placeholder="Search teacher or reason…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer
          sx={{
            bgcolor: '#fff',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            overflow: 'auto',
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Teacher', 'Type', 'Dates', 'Reason', 'Status', 'Actions'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#64748b',
                      bgcolor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#000435' }} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No permission requests match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600, color: '#0f172a', maxWidth: 160 }}>
                      {row.teacher_name || 'Teacher'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{typeLabel(row)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.start_date)} – {fmtDate(row.end_date)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.82rem',
                        color: '#475569',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.reason || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={String(row.status || 'unknown')}
                        size="small"
                        sx={{ ...statusStyle(row.status), fontWeight: 700, textTransform: 'capitalize', height: 22 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => setViewRow(row)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {String(row.status).toLowerCase() === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              sx={{ color: '#16a34a' }}
                              onClick={() => {
                                setActionId(row.id);
                                setActionKind('approve');
                                setReviewNotes('');
                              }}
                            >
                              <CheckCircleOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              sx={{ color: '#dc2626' }}
                              onClick={() => {
                                setActionId(row.id);
                                setActionKind('reject');
                                setReviewNotes('');
                              }}
                            >
                              <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
            sx={{ borderTop: '1px solid #e2e8f0' }}
          />
        </TableContainer>

        {/* Mobile cards */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mt: 2 }}>
          {!loading &&
            rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  bgcolor: '#fff',
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{row.teacher_name}</Typography>
                  <Chip
                    label={row.status}
                    size="small"
                    sx={{ ...statusStyle(row.status), fontWeight: 700, textTransform: 'capitalize', height: 22 }}
                  />
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{typeLabel(row)}</Typography>
                <Typography sx={{ fontSize: '0.78rem', mt: 0.5 }}>
                  {fmtDate(row.start_date)} – {fmtDate(row.end_date)}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', mt: 1, color: '#475569' }}>{row.reason}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button size="small" variant="outlined" onClick={() => setViewRow(row)}>
                    View
                  </Button>
                  {String(row.status).toLowerCase() === 'pending' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ bgcolor: '#16a34a', boxShadow: 'none' }}
                        onClick={() => {
                          setActionId(row.id);
                          setActionKind('approve');
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => {
                          setActionId(row.id);
                          setActionKind('reject');
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            ))}
        </Box>
      </Box>

      <Dialog open={Boolean(viewRow)} onClose={() => setViewRow(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Permission request</DialogTitle>
        <DialogContent dividers>
          {viewRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, fontSize: '0.88rem' }}>
              <div>
                <strong>Teacher:</strong> {viewRow.teacher_name}
              </div>
              <div>
                <strong>Type:</strong> {typeLabel(viewRow)}
              </div>
              <div>
                <strong>Dates:</strong> {fmtDate(viewRow.start_date)} – {fmtDate(viewRow.end_date)}
              </div>
              <div>
                <strong>Reason:</strong> {viewRow.reason || '—'}
              </div>
              <div>
                <strong>Emergency phone:</strong> {viewRow.emergency_phone || '—'}
              </div>
              <div>
                <strong>Status:</strong> {viewRow.status}
              </div>
              {viewRow.review_notes ? (
                <div>
                  <strong>Review notes:</strong> {viewRow.review_notes}
                </div>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewRow(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(actionId && actionKind)}
        onClose={() => {
          setActionId(null);
          setActionError('');
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {actionKind === 'approve' ? 'Approve request' : 'Reject request'}
        </DialogTitle>
        <DialogContent>
          {actionError ? (
            <Typography sx={{ color: '#b91c1c', fontSize: '0.82rem', mb: 1 }}>{actionError}</Typography>
          ) : null}
          <TextField
            fullWidth
            multiline
            minRows={3}
            required={actionKind === 'reject'}
            label={actionKind === 'reject' ? 'Rejection reason (required)' : 'Notes (optional)'}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            sx={{ mt: 1, ...flatFieldSx }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionId(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={runAction}
            sx={{
              boxShadow: 'none',
              bgcolor: actionKind === 'approve' ? '#16a34a' : '#dc2626',
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
