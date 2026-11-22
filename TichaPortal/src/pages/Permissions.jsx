import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useTpAcademic from '../hooks/useTpAcademic';
import TablePagination from '../components/TablePagination';
import PermissionRequestModal, { PERMISSION_TYPES } from '../components/PermissionRequestModal';
import { PageLoading, EmptyState } from '../components/ui';
import {
  ListPage,
  StickyTabs,
  StickyFilterBar,
  BarSelect,
  ListPageBody,
  PageTitleRow,
  NavyStats,
  SectionPaper,
  headCellSx,
  cellSx,
  BORDER,
} from '../components/ListPageKit';
import { brand } from '../theme/theme';

const STATUS_CHIP = {
  pending: { bgcolor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
  approved: { bgcolor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  rejected: { bgcolor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
  cancelled: { bgcolor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' },
};

function chipSx(status) {
  return { fontWeight: 700, textTransform: 'capitalize', ...(STATUS_CHIP[status] || STATUS_CHIP.pending) };
}

function fmtDate(raw) {
  if (!raw) return '-';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

function typeLabel(value) {
  return PERMISSION_TYPES.find((p) => p.value === value)?.label || String(value || 'Other').replace(/_/g, ' ');
}

function permissionDays(start, end) {
  return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1);
}

export default function Permissions() {
  const { teacher } = useAuth();
  const { term, academicYear } = useTpAcademic();
  const teacherName = teacher?.name || teacher?.full_name || 'Teacher';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewPerm, setViewPerm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/teacher-portal/permissions');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
        return;
      }
      setRows([]);
      setError(res.data?.message || 'Could not load permissions');
    } catch (e) {
      setRows([]);
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 401) {
        setError(msg || 'Session expired. Sign out and sign in again from Shule+.');
      } else if (!e?.response) {
        setError('Cannot reach TichaPortal API. Start the backend on port 4000 and refresh.');
      } else {
        setError(msg || e?.message || 'Failed to load permissions');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createPerm = async (payload) => {
    await api.post('/teacher-portal/permissions', {
      ...payload,
      term,
      academicYear,
    });
    load();
  };

  const teacherMeta = useMemo(
    () => ({
      position: teacher?.position || teacher?.role_title || '',
      department: teacher?.department || teacher?.subject || '',
    }),
    [teacher]
  );

  const cancelPerm = async (id) => {
    if (!window.confirm('Cancel this permission request?')) return;
    try {
      await api.delete(`/teacher-portal/permissions/${id}`);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const counts = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const tabOk =
        tab === 'All' ||
        (tab === 'Pending' && r.status === 'pending') ||
        (tab === 'Approved' && r.status === 'approved') ||
        (tab === 'Rejected' && r.status === 'rejected');
      const typeOk = typeFilter === 'All' || r.permission_type === typeFilter;
      const qOk =
        !q ||
        typeLabel(r.permission_type).toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q);
      const fromOk = !dateFrom || String(r.start_date || '').slice(0, 10) >= dateFrom;
      const toOk = !dateTo || String(r.end_date || '').slice(0, 10) <= dateTo;
      return tabOk && typeOk && qOk && fromOk && toOk;
    });
  }, [rows, search, typeFilter, dateFrom, dateTo, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, dateFrom, dateTo, tab, rowsPerPage]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setDateFrom('');
    setDateTo('');
    setTab('All');
  };

  const tabs = [
    { id: 'All', label: 'All' },
    { id: 'Pending', label: `Pending (${counts.pending})` },
    { id: 'Approved', label: `Approved (${counts.approved})` },
    { id: 'Rejected', label: `Rejected (${counts.rejected})` },
  ];

  const stats = [
    { label: 'Total requests', value: loading ? '—' : counts.total },
    { label: 'Pending', value: loading ? '—' : counts.pending },
    { label: 'Approved', value: loading ? '—' : counts.approved },
    { label: 'Rejected', value: loading ? '—' : counts.rejected },
  ];

  const hasFilters = Boolean(search || typeFilter !== 'All' || dateFrom || dateTo || tab !== 'All');

  const dateInputSx = {
    width: '100%',
    border: 'none',
    outline: 'none',
    bgcolor: 'transparent',
    py: 0.75,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    color: brand.navy,
  };

  return (
    <ListPage>
      <StickyTabs tabs={tabs} value={tab} onChange={setTab} />

      <StickyFilterBar top={42} search={search} onSearch={setSearch} searchPlaceholder="Search type or reason…">
        <BarSelect
          label="Type"
          value={typeFilter === 'All' ? '' : typeFilter}
          onChange={(v) => setTypeFilter(v || 'All')}
          options={PERMISSION_TYPES.map((pt) => ({ value: pt.value, label: pt.label }))}
          allLabel="All types"
        />
        <Box key="from" sx={{ flex: 0.9, minWidth: 0 }}>
          <Box component="input" type="date" aria-label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sx={dateInputSx} />
        </Box>
        <Box key="to" sx={{ flex: 0.9, minWidth: 0 }}>
          <Box component="input" type="date" aria-label="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={dateInputSx} />
        </Box>
      </StickyFilterBar>

      <ListPageBody>
        <PageTitleRow
          title="Permission requests"
          subtitle="Submit leave, late arrival, or early departure requests. Your manager reviews and approves."
          actions={
            <>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={load}
                sx={{ textTransform: 'none', fontWeight: 700, borderColor: brand.border }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setModal(true)}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.navy, color: '#fff', '&:hover': { bgcolor: '#1B2D52' } }}
              >
                Request permission
              </Button>
            </>
          }
        />

        {error ? (
          <Alert
            severity="error"
            sx={{ borderRadius: 1 }}
            action={
              <Button color="inherit" size="small" onClick={load} sx={{ fontWeight: 700 }}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        <NavyStats stats={stats} />

        <SectionPaper
          title="Requests"
          count={filtered.length}
          action={
            hasFilters ? (
              <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', fontWeight: 700, color: brand.muted }}>
                Reset filters
              </Button>
            ) : null
          }
        >
          {loading ? (
            <PageLoading label="Loading requests…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No permission requests found"
              description="Create a request or adjust filters."
              action={
                <Button size="small" onClick={() => setModal(true)} sx={{ color: brand.navy, fontWeight: 700, textTransform: 'none' }}>
                  + Request permission
                </Button>
              }
            />
          ) : (
            <>
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {paginated.map((r, idx) => {
                  const days = permissionDays(r.start_date, r.end_date);
                  return (
                    <Box
                      key={r.id}
                      sx={{
                        px: 1.5,
                        py: 1.35,
                        bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                        borderBottom: idx < paginated.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>
                            {typeLabel(r.permission_type)}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: brand.muted, mt: 0.25 }}>
                            {fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {days} day{days === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                        <Chip size="small" label={r.status} sx={{ height: 22, fontSize: 10, ...chipSx(r.status) }} />
                      </Stack>
                      {r.reason ? (
                        <Typography noWrap sx={{ mt: 0.5, fontSize: 12, color: brand.muted }}>
                          {r.reason}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
                        <IconButton size="small" onClick={() => setViewPerm(r)} aria-label="View">
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                        {r.status === 'pending' ? (
                          <IconButton size="small" onClick={() => cancelPerm(r.id)} aria-label="Cancel" sx={{ color: brand.danger }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>

              <TableContainer sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                <Table size="small" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
                  <TableHead>
                    <TableRow>
                      {['Type', 'Period', 'Days', 'Reason', 'Status', 'Submitted', ''].map((h, i) => (
                        <TableCell
                          key={h || 'actions'}
                          sx={
                            i === 0
                              ? { ...headCellSx, position: 'sticky', left: 0, zIndex: 12, minWidth: 140, boxShadow: `inset -1px 0 0 ${BORDER}` }
                              : headCellSx
                          }
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((r, idx) => {
                      const days = permissionDays(r.start_date, r.end_date);
                      const rowBg = idx % 2 === 1 ? '#F8F9FC' : '#fff';
                      return (
                        <TableRow
                          key={r.id}
                          hover
                          sx={{ bgcolor: rowBg, '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' }, '&:last-child td': { borderBottom: 0 } }}
                        >
                          <TableCell
                            sx={{
                              ...cellSx,
                              position: 'sticky',
                              left: 0,
                              zIndex: 10,
                              bgcolor: rowBg,
                              'tr:hover > &': { bgcolor: '#FEFAF2' },
                              boxShadow: `inset -1px 0 0 ${BORDER}`,
                            }}
                          >
                            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: brand.navy }}>
                              {typeLabel(r.permission_type)}
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>#{r.id}</Typography>
                          </TableCell>
                          <TableCell sx={{ ...cellSx, color: '#475569', whiteSpace: 'nowrap' }}>
                            {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                          </TableCell>
                          <TableCell sx={{ ...cellSx, color: '#475569' }}>{days}</TableCell>
                          <TableCell sx={{ ...cellSx, color: '#475569', maxWidth: 220 }}>
                            <Typography noWrap sx={{ fontSize: 12.5 }}>
                              {r.reason || '—'}
                            </Typography>
                            {r.decision_note ? (
                              <Typography noWrap sx={{ fontSize: 10, color: '#4F46E5', fontStyle: 'italic', mt: 0.25 }}>
                                Manager: {r.decision_note}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Chip size="small" label={r.status} sx={{ height: 22, fontSize: 10, ...chipSx(r.status) }} />
                          </TableCell>
                          <TableCell sx={{ ...cellSx, color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</TableCell>
                          <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>
                            <IconButton size="small" onClick={() => setViewPerm(r)} aria-label="View">
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                            {r.status === 'pending' ? (
                              <IconButton size="small" onClick={() => cancelPerm(r.id)} aria-label="Cancel" sx={{ color: brand.danger }}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={rowsPerPage}
                itemCount={paginated.length}
                pageStartIndex={(page - 1) * rowsPerPage}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setRowsPerPage(n);
                  setPage(1);
                }}
              />
            </>
          )}
        </SectionPaper>
      </ListPageBody>

      <PermissionRequestModal
        open={modal}
        onClose={() => setModal(false)}
        teacherName={teacherName}
        teacherMeta={teacherMeta}
        onSubmit={createPerm}
      />

      <Dialog
        open={Boolean(viewPerm)}
        onClose={() => setViewPerm(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: { xs: '28px 28px 0 0', sm: 4 }, overflow: 'hidden' } }}
        slotProps={{ backdrop: { sx: { bgcolor: 'rgba(8,17,31,0.6)', backdropFilter: 'blur(6px)' } } }}
        sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } } }}
      >
        {viewPerm ? (
          <>
            <Box
              sx={{
                p: 2.5,
                background:
                  viewPerm.status === 'approved'
                    ? 'linear-gradient(135deg,#059669,#065F46)'
                    : viewPerm.status === 'rejected'
                      ? 'linear-gradient(135deg,#DC2626,#7F1D1D)'
                      : `linear-gradient(135deg,${brand.navy},${brand.navy})`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.75,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Permission Details</Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>
                      #{viewPerm.id} · {viewPerm.status?.toUpperCase()}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  onClick={() => setViewPerm(null)}
                  sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
            <DialogContent sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box sx={{ bgcolor: brand.background, borderRadius: 1.5, p: 1.5 }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Type
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mt: 0.5 }}>
                      {typeLabel(viewPerm.permission_type)}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: brand.background, borderRadius: 1.5, p: 1.5 }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip size="small" label={viewPerm.status} sx={chipSx(viewPerm.status)} />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                  {[
                    { label: 'Start', value: fmtDate(viewPerm.start_date) },
                    { label: 'End', value: fmtDate(viewPerm.end_date) },
                    { label: 'Days', value: permissionDays(viewPerm.start_date, viewPerm.end_date) },
                  ].map((item) => (
                    <Box key={item.label} sx={{ bgcolor: brand.background, borderRadius: 1.5, p: 1.5 }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {item.label}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        {item.label === 'Days' ? (
                          <AccessTimeIcon sx={{ fontSize: 11, color: brand.muted }} />
                        ) : (
                          <CalendarMonthOutlinedIcon sx={{ fontSize: 11, color: brand.muted }} />
                        )}
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{item.value}</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Box>
                {viewPerm.reason ? (
                  <Box sx={{ bgcolor: brand.background, borderRadius: 1.5, p: 1.5 }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Reason
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#334155', mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {viewPerm.reason}
                    </Typography>
                  </Box>
                ) : null}
                {viewPerm.decision_note ? (
                  <Box sx={{ bgcolor: '#EEF2FF', border: '1px solid #E0E7FF', borderRadius: 1.5, p: 1.5 }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Manager Decision Note
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#4338CA', mt: 0.5, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                      {viewPerm.decision_note}
                    </Typography>
                  </Box>
                ) : null}
                {viewPerm.created_at ? (
                  <Typography sx={{ fontSize: 9, color: '#94A3B8', textAlign: 'right' }}>
                    Submitted: {fmtDate(viewPerm.created_at)}
                  </Typography>
                ) : null}
              </Stack>
            </DialogContent>
            <Box sx={{ p: 2, bgcolor: brand.background, borderTop: `1px solid ${brand.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setViewPerm(null)} sx={{ borderColor: brand.border, color: brand.muted }}>
                Close
              </Button>
            </Box>
          </>
        ) : null}
      </Dialog>
    </ListPage>
  );
}
