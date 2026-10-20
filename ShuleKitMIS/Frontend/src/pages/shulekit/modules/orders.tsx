import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  Print,
  MoreVert,
  ArrowBack,
  VisibilityOutlined,
} from '@mui/icons-material';
import {
  ACCENT,
  PRIMARY,
  PRIMARY_DARK,
  HEADER_BG,
  BORDER,
  CUSTOM_SCROLLBAR,
  PAGE_TITLE,
  SECTION_LABEL,
  CARD,
  CARD_BG,
} from '../styles';
import { SearchInput } from '../components';
import { createRequest, getRequestById, listKits, recordPayment, updateRequestStatus } from '@/services/api';
import { reqStatusChip, deliveryChip } from '@/shared/chips';
import type { Kit, KitRequest, PaymentMethod } from '@/types';

const STATUSES = ['PENDING', 'APPROVED', 'PAID', 'DELIVERED', 'CANCELLED'];
const RELATIONS = ['FATHER', 'MOTHER', 'GUARDIAN'];
const DELIVERY_METHODS = [
  { value: 'AT_SCHOOL', label: 'Pick up at school' },
  { value: 'AT_HOME', label: 'Home delivery (+2,500 RWF)' },
];
const STATUS_ACTIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PAID', 'CANCELLED'],
  PAID: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

function paymentChip(status: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    COMPLETED: { bg: '#dcfce7', fg: '#166534' },
    REFUNDED: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <Chip
      label={status}
      size="small"
      sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 600, borderRadius: '2px', fontSize: '0.65rem', height: 20 }}
    />
  );
}

interface OrdersModuleProps {
  requests: KitRequest[];
  loading: boolean;
  error: string | null;
  status: string;
  onStatusChange: (status: string) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function OrdersModule({
  requests,
  loading,
  error,
  status,
  onStatusChange,
  onOpen,
  onNew,
}: OrdersModuleProps) {
  const [search, setSearch] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<KitRequest | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (status && r.status !== status) return false;
      if (!q) return true;
      return `${r.requestNumber} ${r.studentName} ${r.parentName} ${r.studentCode ?? ''} ${r.gradeLevel ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [requests, search, status]);

  const handleActionClick = (event: MouseEvent<HTMLElement>, request: KitRequest) => {
    setActionAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={PAGE_TITLE}>
            Orders
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onNew}
            sx={{
              height: 28,
              bgcolor: PRIMARY,
              borderRadius: '2px',
              textTransform: 'none',
              fontSize: '0.7rem',
              fontWeight: 700,
              px: 2,
              '&:hover': { bgcolor: PRIMARY_DARK },
            }}
          >
            New
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <SearchInput
            placeholder="Search orders..."
            value={search}
            onChange={setSearch}
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
          />
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
            sx={{
              height: 36,
              borderRadius: '2px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              borderColor: 'rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.7)',
              '&:hover': { borderColor: 'rgba(0,0,0,0.2)', bgcolor: 'rgba(0,0,0,0.05)' },
            }}
          >
            Print
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: HEADER_BG,
              color: PRIMARY,
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: '4px',
              minWidth: 220,
              mt: 1,
              '& .MuiMenuItem-root': { fontSize: '0.85rem', py: 0.75, px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } },
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Typography sx={{ px: 2, pt: 1.5, ...SECTION_LABEL }}>Status</Typography>
        {['', ...STATUSES].map((s) => (
          <MenuItem
            key={s || 'all-status'}
            selected={status === s}
            onClick={() => {
              onStatusChange(s);
              setFilterAnchorEl(null);
              setPage(0);
            }}
          >
            {s || 'All statuses'}
          </MenuItem>
        ))}
      </Menu>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer
            sx={{
              bgcolor: 'rgba(0,0,0,0.02)',
              border: `1px solid ${BORDER}`,
              borderRadius: '2px',
              ...CUSTOM_SCROLLBAR,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: HEADER_BG, color: 'rgba(0,0,0,0.4)', fontWeight: 700, fontSize: '0.65rem', py: 1, borderBottom: `1px solid ${BORDER}` } }}>
                  <TableCell>Request #</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell>Kit</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Delivery</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((r) => (
                    <TableRow
                      key={r.id}
                      hover
                      onClick={() => onOpen(r.id)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                        '& td': { borderBottom: '1px solid rgba(0,0,0,0.03)', py: 0.75 },
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ color: ACCENT, fontSize: '0.75rem', fontWeight: 700 }}>
                          {r.requestNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: PRIMARY, fontSize: '0.75rem', fontWeight: 600 }}>
                          {r.studentName}
                        </Typography>
                        <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.62rem' }}>
                          {r.studentCode ?? ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.75rem' }}>{r.parentName}</Typography>
                        <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.62rem' }}>
                          {r.parentPhone ?? ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          {r.kit?.name ?? r.gradeLevel ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                          {Number(r.total).toLocaleString()} RWF
                        </Typography>
                      </TableCell>
                      <TableCell>{deliveryChip(r.deliveryMethod)}</TableCell>
                      <TableCell>{reqStatusChip(r.status)}</TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          sx={{ color: 'rgba(0,0,0,0.2)', '&:hover': { color: PRIMARY } }}
                          onClick={(e) => handleActionClick(e, r)}
                        >
                          <MoreVert sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center' }}>
                      <Typography sx={{ color: 'rgba(0,0,0,0.2)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No orders found. Click "New" to create one!
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter sx={{ borderTop: `1px solid ${BORDER}` }}>
                <TableRow>
                  <TableCell colSpan={5} sx={{ color: 'rgba(0,0,0,0.4)', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>
                    Orders Summary
                  </TableCell>
                  <TableCell sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>
                    {filtered.length} orders
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>

          <Menu
            anchorEl={actionAnchorEl}
            open={Boolean(actionAnchorEl)}
            onClose={() => {
              setActionAnchorEl(null);
              setSelectedRequest(null);
            }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: HEADER_BG,
                  color: PRIMARY,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  '& .MuiMenuItem-root': { fontSize: '0.85rem', gap: 1.5, py: 1, px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem
              onClick={() => {
                if (selectedRequest) onOpen(selectedRequest.id);
                setActionAnchorEl(null);
                setSelectedRequest(null);
              }}
            >
              <VisibilityOutlined sx={{ fontSize: 18, color: ACCENT }} />
              View
            </MenuItem>
          </Menu>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              color: 'rgba(0,0,0,0.6)',
              borderTop: `1px solid ${BORDER}`,
              '& .MuiTablePagination-selectIcon': { color: 'rgba(0,0,0,0.4)' },
              '& .MuiTablePagination-actions': { color: 'rgba(0,0,0,0.6)' },
            }}
          />
        </>
      )}
    </>
  );
}

interface OrderDetailProps {
  requestId: string;
  onBack: () => void;
  onUpdated: (request: KitRequest) => void;
}

function normalizeRequest(req: KitRequest): KitRequest {
  return { ...req, payments: req.payments ?? [], items: req.items ?? [] };
}

export function OrderDetail({ requestId, onBack, onUpdated }: OrderDetailProps) {
  const [request, setRequest] = useState<KitRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [paying, setPaying] = useState(false);
  const onUpdatedRef = useRef(onUpdated);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    if (!requestId) return;
    getRequestById(requestId)
      .then((r) => {
        const normalized = normalizeRequest(r);
        setRequest(normalized);
        onUpdatedRef.current(normalized);
      })
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load request'
        );
      })
      .finally(() => setLoading(false));
  }, [requestId]);

  async function handleStatus(next: string) {
    if (!request) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await updateRequestStatus(request.id, next);
      const normalized = normalizeRequest(updated);
      setRequest(normalized);
      onUpdated(normalized);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update status'
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecordPayment() {
    if (!request) return;
    setPaying(true);
    setError(null);
    try {
      await recordPayment(request.id, { method, reference: reference.trim() || undefined });
      setPayOpen(false);
      setReference('');
      await handleStatus('PAID');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to record payment'
      );
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!request) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error ?? 'Request not found'}</Alert>
      </Box>
    );
  }

  const actions = STATUS_ACTIONS[request.status] ?? [];

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onBack} sx={{ color: 'rgba(0,0,0,0.4)', '&:hover': { color: PRIMARY } }}>
            <ArrowBack sx={{ fontSize: 20 }} />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={PAGE_TITLE}>{request.requestNumber}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              {reqStatusChip(request.status)}
              {deliveryChip(request.deliveryMethod)}
            </Box>
          </Box>
        </Box>
        {actions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {request.status === 'APPROVED' && (
              <Button
                variant="contained"
                onClick={() => setPayOpen(true)}
                sx={{ height: 36, bgcolor: PRIMARY, borderRadius: '2px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: PRIMARY_DARK } }}
              >
                Record Payment
              </Button>
            )}
            {actions.map((a) => (
              <Button
                key={a}
                variant="outlined"
                color={a === 'CANCELLED' ? 'error' : 'primary'}
                disabled={actionLoading}
                onClick={() => handleStatus(a)}
                sx={{ height: 36, borderRadius: '2px', textTransform: 'none', fontWeight: 600, borderColor: 'rgba(0,0,0,0.1)', color: a === 'CANCELLED' ? '#ef4444' : 'rgba(0,0,0,0.7)' }}
              >
                {a.charAt(0) + a.slice(1).toLowerCase()}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={CARD}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={SECTION_LABEL}>Student</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Typography sx={{ color: PRIMARY, fontWeight: 600, fontSize: '1.05rem' }}>
                {request.studentName}
              </Typography>
              <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
                {request.studentCode ?? 'No code'} · {request.gradeLevel ?? 'No grade'}
              </Typography>
            </Box>
          </Box>

          <Box sx={CARD}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={SECTION_LABEL}>Parent</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Typography sx={{ color: PRIMARY, fontWeight: 600 }}>{request.parentName}</Typography>
              <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
                {request.parentPhone ?? 'No phone'} · {request.parentRelation}
              </Typography>
              {request.notes && (
                <>
                  <Divider sx={{ my: 1.5, borderColor: BORDER }} />
                  <Typography sx={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {request.notes}
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          <Box sx={CARD}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={SECTION_LABEL}>Kit & Billing</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>Kit</Typography>
                <Typography sx={{ color: PRIMARY, fontWeight: 600, fontSize: '0.85rem' }}>
                  {request.kit?.name ?? request.gradeLevel ?? '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>Subtotal</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {Number(request.subtotal).toLocaleString()} RWF
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>Home delivery fee</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {Number(request.homeFee).toLocaleString()} RWF
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5, borderColor: BORDER }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: PRIMARY, fontWeight: 700 }}>Total</Typography>
                <Typography sx={{ color: '#10b981', fontWeight: 700 }}>
                  {Number(request.total).toLocaleString()} RWF
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ ...CARD, alignSelf: 'flex-start' }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
            <Typography sx={SECTION_LABEL}>Payments</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            {request.payments.length === 0 && (
              <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.8rem' }}>
                No payments recorded yet.
              </Typography>
            )}
            {request.payments.length > 0 && (
              <TableContainer sx={{ bgcolor: 'transparent' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: HEADER_BG, color: 'rgba(0,0,0,0.4)', fontWeight: 700, fontSize: '0.65rem', py: 1, borderBottom: `1px solid ${BORDER}` } }}>
                      <TableCell>Payment #</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {request.payments.map((p) => (
                      <TableRow key={p.id} sx={{ '& td': { borderBottom: '1px solid rgba(0,0,0,0.03)', py: 0.75 } }}>
                        <TableCell sx={{ color: PRIMARY, fontWeight: 600, fontSize: '0.75rem' }}>{p.paymentNumber}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{p.method}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{Number(p.amount).toLocaleString()} RWF</TableCell>
                        <TableCell>{paymentChip(p.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </Box>

      {request.items.length > 0 && (
        <Box sx={{ ...CARD, mt: 3 }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
            <Typography sx={SECTION_LABEL}>Items</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <TableContainer sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: HEADER_BG, color: 'rgba(0,0,0,0.4)', fontWeight: 700, fontSize: '0.65rem', py: 1, borderBottom: `1px solid ${BORDER}` } }}>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Line total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {request.items.map((item) => (
                    <TableRow key={item.id} sx={{ '& td': { borderBottom: '1px solid rgba(0,0,0,0.03)', py: 0.75 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {item.imageUrl && (
                            <Box
                              component="img"
                              src={item.imageUrl}
                              alt={item.title}
                              sx={{ width: 36, height: 36, flexShrink: 0, objectFit: 'cover', borderRadius: '2px', border: `1px solid ${BORDER}` }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <Typography sx={{ color: PRIMARY, fontWeight: 600, fontSize: '0.75rem' }}>{item.title}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{item.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                        {Number(item.unitPrice) > 0 ? `${Number(item.unitPrice).toLocaleString()} RWF` : 'Included'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {Number(item.unitPrice) > 0 ? `${Number(item.lineTotal).toLocaleString()} RWF` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: PRIMARY }}>Record Payment</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.85rem', mb: 2 }}>
            Total due: <b>{Number(request.total).toLocaleString()} RWF</b>
          </Typography>
          <TextField
            select
            variant="standard"
            label="Payment Method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            fullWidth
            sx={{ mb: 2 }}
          >
            {PAYMENT_METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            variant="standard"
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Receipt or transaction number"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ borderRadius: '2px', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRecordPayment}
            disabled={paying}
            sx={{ bgcolor: PRIMARY, borderRadius: '2px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: PRIMARY_DARK } }}
          >
            {paying ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface OrderFormProps {
  onSaved: (request: KitRequest) => void;
  onCancel: () => void;
}

export function OrderForm({ onSaved, onCancel }: OrderFormProps) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitsLoading, setKitsLoading] = useState(true);
  const [studentCode, setStudentCode] = useState('');
  const [kitId, setKitId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('FATHER');
  const [deliveryMethod, setDeliveryMethod] = useState('AT_SCHOOL');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listKits({ status: 'ACTIVE' })
      .then(setKits)
      .catch(() => setKits([]))
      .finally(() => setKitsLoading(false));
  }, []);

  const selectedKit = useMemo(() => kits.find((k) => k.id === kitId) ?? null, [kits, kitId]);
  const homeFee = deliveryMethod === 'AT_HOME' ? 2500 : 0;
  const kitHasPrices = selectedKit?.requirements.some((r) => Number(r.unitPrice) > 0) ?? false;
  const kitAmount = selectedKit
    ? kitHasPrices
      ? selectedKit.requirements.reduce((s, r) => (Number(r.unitPrice) > 0 ? s + Number(r.unitPrice) * Math.max(1, r.quantity) : s), 0)
      : Number(selectedKit.amount)
    : 0;
  const total = kitAmount + homeFee;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentCode.trim() || !kitId || !parentName.trim()) {
      setError('ShuleCode, kit and parent name are required.');
      return;
    }
    setSaving(true);
    createRequest({
      studentCode: studentCode.trim(),
      kitId,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim() || undefined,
      parentRelation,
      deliveryMethod,
      notes: notes.trim() || undefined,
    })
      .then(onSaved)
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to create request'
        );
      })
      .finally(() => setSaving(false));
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={onCancel} sx={{ color: 'rgba(0,0,0,0.4)', '&:hover': { color: PRIMARY } }}>
          <ArrowBack sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography variant="h5" sx={PAGE_TITLE}>New Order</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ bgcolor: 'white', border: `1px solid ${BORDER}`, borderRadius: '2px', p: 4, maxWidth: 820 }}
      >
        <Typography sx={{ ...SECTION_LABEL, mb: 2 }}>Student</Typography>
        <TextField
          label="ShuleCode"
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
          placeholder="ShuleCode e.g. KG-GAS-00042"
          helperText="Format: XX-XXX-00000 (e.g. KG-GAS-00042)"
          required
          fullWidth
          size="small"
          inputProps={{
            'aria-label': 'ShuleCode',
            autoCapitalize: 'characters',
            spellCheck: false,
          }}
        />

        <Divider sx={{ my: 3 }} />
        <Typography sx={{ ...SECTION_LABEL, mb: 2 }}>Kit</Typography>
        <TextField
          select
          label="Kit"
          value={kitId}
          onChange={(e) => setKitId(e.target.value)}
          required
          fullWidth
          size="small"
          disabled={kitsLoading}
        >
          {kitsLoading && <MenuItem value="">Loading kits…</MenuItem>}
          {kits.length === 0 && !kitsLoading && <MenuItem value="">No active kits</MenuItem>}
          {kits.map((k) => (
            <MenuItem key={k.id} value={k.id}>
              {k.name} · {k.gradeLevel} · {Number(k.amount).toLocaleString()} RWF
            </MenuItem>
          ))}
        </TextField>
        {selectedKit && (
          <Typography sx={{ mt: 1, color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
            Includes {selectedKit.requirements.length} requirement(s).
          </Typography>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography sx={{ ...SECTION_LABEL, mb: 2 }}>Parent</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          <TextField label="Parent Name" value={parentName} onChange={(e) => setParentName(e.target.value)} required size="small" />
          <TextField label="Parent Phone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. 078xxxxxxx" size="small" />
          <TextField select label="Relation" value={parentRelation} onChange={(e) => setParentRelation(e.target.value)} size="small">
            {RELATIONS.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Delivery" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} size="small">
            {DELIVERY_METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          size="small"
          sx={{ mt: 2.5 }}
        />

        <Box sx={{ mt: 3, p: 2, borderRadius: '2px', bgcolor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.85rem' }}>
              {kitHasPrices ? 'Items total' : 'Kit amount'}
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {selectedKit ? `${kitAmount.toLocaleString()} RWF` : '—'}
            </Typography>
          </Box>
          {kitHasPrices && (
            <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.72rem' }}>
              Auto total from priced items — all items are included by default.
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.85rem' }}>Home delivery fee</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{homeFee ? `${homeFee.toLocaleString()} RWF` : '0 RWF'}</Typography>
          </Box>
          <Divider sx={{ my: 1, borderColor: BORDER }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ color: PRIMARY, fontWeight: 700 }}>Total</Typography>
            <Typography sx={{ color: '#10b981', fontWeight: 700 }}>{total ? `${total.toLocaleString()} RWF` : '—'}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            sx={{ height: 36, bgcolor: PRIMARY, borderRadius: '2px', textTransform: 'none', fontWeight: 700, px: 4, '&:hover': { bgcolor: PRIMARY_DARK } }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Submit Request'}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{ height: 36, borderRadius: '2px', textTransform: 'none', fontWeight: 600, borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.7)' }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </>
  );
}
