import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SendIcon from '@mui/icons-material/Send';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SchoolIcon from '@mui/icons-material/School';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import { brand } from '../theme/theme';

function fmtMoney(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function fmtDate(raw) {
  if (!raw) return '-';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_TONE = {
  pending: { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  rejected: { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  issued: { color: '#075985', bg: '#F0F9FF', border: '#BAE6FD' },
};
const STATUS_FALLBACK = { color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' };

function statusTone(status) {
  return STATUS_TONE[String(status ?? '')] || STATUS_FALLBACK;
}

const DESTINATION_OPTIONS = [
  { value: 'dos', label: 'DOS (Dean of Studies)', Icon: SchoolIcon },
  { value: 'accountant', label: 'Accountant', Icon: AccountBalanceWalletIcon },
  { value: 'store', label: 'Store Manager', Icon: Inventory2Icon },
  { value: 'all', label: 'All Departments', Icon: ApartmentIcon },
];

const DEST_TONE = {
  dos: { color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  store: { color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
  all: { color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE' },
  accountant: { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
};

const DEST_LABEL = {
  store: 'Store',
  all: 'All Depts',
  dos: 'DOS',
  accountant: 'Accountant',
};

const fieldLabelSx = { fontSize: 11, fontWeight: 600, color: 'rgba(107,115,133,0.9)', ml: 0.5 };

export function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        bgcolor: tone.bg,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </Box>
  );
}

function AddModal({ open, onClose, defaultRequester, onSubmit, initialData = null, submitLabel = 'Submit Request' }) {
  const [dept, setDept] = useState('');
  const [requester, setRequester] = useState(defaultRequester || '');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(() => new Date().toISOString().slice(0, 10));
  const [attachment, setAttachment] = useState(null);
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('accountant');
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (open) {
      setDept(initialData?.dept || '');
      setRequester(initialData?.requester || defaultRequester || '');
      setItems(initialData?.items || '');
      setAmount(initialData?.amount != null ? String(Number(initialData.amount) || '') : '');
      setSubmitted(initialData?.submitted ? String(initialData.submitted).slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDescription(initialData?.description || initialData?.note || '');
      setDestination(initialData?.destination || 'accountant');
      setAttachment(null);
      setActiveStep(1);
    }
  }, [open, defaultRequester, initialData]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: { xs: '24px 24px 0 0', sm: 4 }, overflow: 'hidden', m: { xs: 0, sm: 4 } } }}
      sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 3, bgcolor: brand.navy, color: '#fff', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{initialData ? 'Edit Requisition' : 'New Requisition'}</Typography>
              <Typography sx={{ mt: 0.5, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                Procurement · Official Request
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close" sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '12px', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' } }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', bgcolor: '#fff', px: 2.5, py: 3 }}>
          {activeStep === 1 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2.5 }}>
              <Box>
                <Box component="label" sx={fieldLabelSx}>Department / Unit <Box component="span" sx={{ color: '#F87171' }}>*</Box></Box>
                <TextField
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="Ex: ICT Department"
                  InputProps={{ startAdornment: <InputAdornment position="start"><ApartmentIcon sx={{ fontSize: 17, color: brand.navy }} /></InputAdornment> }}
                  sx={{ mt: 0.75 }}
                />
              </Box>
              <Box>
                <Box component="label" sx={fieldLabelSx}>Requester Name <Box component="span" sx={{ color: '#F87171' }}>*</Box></Box>
                <TextField
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  placeholder="Enter full name"
                  InputProps={{ startAdornment: <InputAdornment position="start"><SchoolIcon sx={{ fontSize: 17, color: brand.navy }} /></InputAdornment> }}
                  sx={{ mt: 0.75 }}
                />
              </Box>
              <Box>
                <Box component="label" sx={fieldLabelSx}>Application Date <Box component="span" sx={{ color: '#F87171' }}>*</Box></Box>
                <TextField
                  type="date"
                  value={submitted}
                  onChange={(e) => setSubmitted(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mt: 0.75 }}
                />
              </Box>
              <Box>
                <Box component="label" sx={fieldLabelSx}>
                  Total Amount (RWF) <Box component="span" sx={{ fontWeight: 600, textTransform: 'none', opacity: 0.6 }}>(optional)</Box>
                </Box>
                <TextField
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  inputProps={{ inputMode: 'numeric', placeholder: '0' }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><AccountBalanceWalletIcon sx={{ fontSize: 17, color: brand.navy }} /></InputAdornment> }}
                  sx={{ mt: 0.75 }}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Box component="label" sx={{ ...fieldLabelSx, display: 'block', mb: 0.75 }}>
                  Description <Box component="span" sx={{ color: '#F87171' }}>*</Box>
                </Box>
                <TextField
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write clear description for review..."
                  multiline
                  minRows={2}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Box component="label" sx={fieldLabelSx}>
                  Send To <Box component="span" sx={{ color: '#F87171' }}>*</Box>
                </Box>
                <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                  {DESTINATION_OPTIONS.map((opt) => {
                    const active = destination === opt.value;
                    const Icon = opt.Icon;
                    return (
                      <ButtonBase
                        key={opt.value}
                        type="button"
                        onClick={() => setDestination(opt.value)}
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.75,
                          p: 1.5,
                          borderRadius: '16px',
                          border: '2px solid',
                          borderColor: active ? brand.navy : 'transparent',
                          bgcolor: active ? '#F3F5FA' : '#F7F8FA',
                          boxShadow: active ? '0 2px 12px rgba(19,33,61,0.15)' : 'none',
                          '&:hover': { borderColor: active ? brand.navy : 'rgba(0,0,0,0.1)', bgcolor: '#fff' },
                        }}
                      >
                        {active ? (
                          <CheckCircleIcon sx={{ position: 'absolute', top: 6, right: 6, fontSize: 12, color: brand.navy }} />
                        ) : null}
                        <Icon sx={{ fontSize: 20, color: brand.navy }} />
                        <Box component="span" sx={{ fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.25 }}>{opt.label}</Box>
                      </ButtonBase>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          ) : (
            <Stack spacing={2.5}>
              <Box>
                <Box component="label" sx={{ ...fieldLabelSx, display: 'block', mb: 0.75 }}>
                  Items or Services Description <Box component="span" sx={{ color: '#F87171' }}>*</Box>
                </Box>
                <TextField
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="List the items or services you are requesting with their estimated costs..."
                  multiline
                  minRows={4}
                />
              </Box>
              <Box>
                <Box component="label" sx={{ ...fieldLabelSx, display: 'block', mb: 0.75 }}>Supporting Documents</Box>
                <ButtonBase
                  component="label"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%',
                    height: 56,
                    px: 2,
                    borderRadius: '20px',
                    bgcolor: '#F7F8FA',
                    border: '1px dashed rgba(0,0,0,0.1)',
                    justifyContent: 'flex-start',
                    '&:hover': { bgcolor: '#fff', borderColor: 'rgba(19,33,61,0.3)' },
                  }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: brand.muted }}>
                    <UploadFileIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: brand.text }}>
                      {attachment ? attachment.name : 'Click to upload attachment'}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 10, fontWeight: 500, color: 'rgba(107,115,133,0.6)' }}>
                      {attachment ? 'Ready to send' : 'PDF or Image (Optional)'}
                    </Typography>
                  </Box>
                  <Box component="input" type="file" sx={{ display: 'none' }} onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                </ButtonBase>
              </Box>
            </Stack>
          )}
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ p: 2.5, bgcolor: '#F7F8FA', borderTop: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
          <Button
            type="button"
            onClick={() => {
              if (activeStep === 1) onClose();
              else setActiveStep(1);
            }}
            sx={{ height: 44, px: 3, borderRadius: '16px', bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.05)', color: brand.text, fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: '#F8FAFC' } }}
          >
            {activeStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {activeStep === 1 ? (
            <Button
              type="button"
              onClick={() => setActiveStep(2)}
              endIcon={<ChevronRightIcon sx={{ fontSize: 16 }} />}
              sx={{ height: 44, px: 4, borderRadius: '16px', bgcolor: brand.primary, color: brand.navy, fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: brand.primaryStrong } }}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                const amt = Number(amount) || 0;
                if (!dept.trim() || !requester.trim() || !items.trim() || !description.trim()) return;
                onSubmit({
                  dept: dept.trim(),
                  requester: requester.trim(),
                  items: items.trim(),
                  amount: amt,
                  submitted,
                  attachmentName: attachment?.name || '',
                  description: description.trim(),
                  note: description.trim(),
                  destination,
                });
              }}
              startIcon={<SendIcon sx={{ fontSize: 15 }} />}
              sx={{ height: 44, px: 4, borderRadius: '16px', bgcolor: brand.primary, color: brand.navy, fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: brand.primaryStrong } }}
            >
              {submitLabel}
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}

function ViewModal({ open, onClose, req }) {
  return (
    <Dialog open={open && Boolean(req)} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden' } }}>
      {req ? (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: 'rgba(247,248,250,0.4)' }}>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted }}>Requisition Details</Typography>
              <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 700, color: brand.text }}>{req.id}</Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close" sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 1.5, color: '#64748B', '&:hover': { bgcolor: '#F8FAFC' } }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
          <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2, fontSize: 12 }}>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Department</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.text }}>{req.dept || '-'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Requester</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.text }}>{req.requester || '-'}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Amount</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.text }}>{fmtMoney(req.amount)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Submitted</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.text }}>{fmtDate(req.submitted)}</Typography>
            </Box>
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Items / Services</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.text, whiteSpace: 'pre-wrap' }}>{req.items || '-'}</Typography>
            </Box>
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>Description</Typography>
              <Typography sx={{ mt: 0.5, fontWeight: 700, color: brand.text, whiteSpace: 'pre-wrap' }}>{req.description || req.note || '-'}</Typography>
            </Box>
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <StatusChip status={req.status} />
            </Box>
          </Box>
        </>
      ) : null}
    </Dialog>
  );
}

export default function Requisitions() {
  const { teacher } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [modal, setModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewReq, setViewReq] = useState(null);
  const [editReq, setEditReq] = useState(null);

  const defaultRequester = [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ').trim() || teacher?.full_name || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/teacher-portal/requisitions');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
      else setError(res.data?.message || 'Failed to load');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load requisitions.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const st = status === 'All' || r.status === status;
      const match =
        !q ||
        String(r.id).toLowerCase().includes(q) ||
        r.dept?.toLowerCase().includes(q) ||
        r.requester?.toLowerCase().includes(q) ||
        r.items?.toLowerCase().includes(q);
      return st && match;
    });
  }, [rows, search, status]);

  const createReq = async (payload) => {
    try {
      await api.post('/teacher-portal/requisitions', {
        dept: payload.dept,
        requester: payload.requester,
        items: payload.items,
        amount: payload.amount,
        submitted: payload.submitted,
        attachmentName: payload.attachmentName,
        description: payload.description,
        note: payload.description,
        destination: payload.destination || 'accountant',
      });
      setModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Submit failed');
    }
  };

  const updateReq = async (payload) => {
    if (!editReq?.db_id) return;
    try {
      await api.patch(`/teacher-portal/requisitions/${editReq.db_id}`, {
        items: payload.items,
        attachmentName: payload.attachmentName,
        description: payload.description,
        note: payload.description,
      });
      setEditReq(null);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed');
    }
  };

  const newRequestButtons = (
    <>
      <Tooltip title="Refresh">
        <IconButton
          onClick={() => load()}
          aria-label="Refresh requisitions"
          sx={{ width: 44, height: 44, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
        >
          <RefreshIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Button
        type="button"
        onClick={() => setModal(true)}
        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
        sx={{ px: 2.5, py: 1.25, borderRadius: 1.5, color: '#fff', fontSize: 11, fontWeight: 700, border: '1px solid rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
      >
        New request
      </Button>
    </>
  );

  return (
    <Box sx={{ bgcolor: brand.background, minHeight: '100vh', pb: 12 }}>
      <TeacherOrangeHero
        title="Requisitions"
        subtitle="Submit requests for supplies or services. Your school accountant reviews and approves them here on Babyeyi."
        rightSlot={newRequestButtons}
      >
        <Stack direction="row" spacing={1} sx={{ display: { md: 'none' } }}>{newRequestButtons}</Stack>
      </TeacherOrangeHero>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, mt: -5, position: 'relative', zIndex: 30 }}>
        {error && <Alert severity="error" sx={{ mb: 2, fontWeight: 700 }}>{error}</Alert>}

        <Paper elevation={6} sx={{ borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 2, lg: 1.5 }, py: { xs: 2, lg: 1 }, borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: 'rgba(247,248,250,0.2)', display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, gap: { xs: 2, lg: 1 } }}>
            <ButtonBase
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              sx={{ display: { lg: 'none' }, width: '100%', justifyContent: 'space-between', fontSize: 10, fontWeight: 700 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <FilterListIcon sx={{ fontSize: 14, color: brand.navy }} /> show filters
              </Stack>
              {showMobileFilters ? <ExpandLessIcon sx={{ fontSize: 14, color: brand.navy }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
            </ButtonBase>

            <Collapse in={showMobileFilters} timeout={300} sx={{ width: '100%', display: { lg: 'none' } }}>
              <Stack spacing={1.5} sx={{ width: '100%' }}>
                <TextField
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requisition..."
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
                />
                <TextField select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {['All', 'pending', 'approved', 'rejected', 'issued'].map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Collapse>

            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1, minWidth: 0 }}>
              <Box sx={{ flex: 1, minWidth: '7rem', maxWidth: '15rem' }}>
                <TextField
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requisition..."
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15 }} /></InputAdornment> }}
                />
              </Box>
              <Box sx={{ width: '8rem', flexShrink: 0 }}>
                <TextField select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {['All', 'pending', 'approved', 'rejected', 'issued'].map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Stack>
          </Box>

          {loading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 10 }}>
              <CircularProgress size={22} sx={{ color: brand.navy }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#94A3B8' }}>Loading…</Typography>
            </Stack>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', px: 3 }}>
              <DescriptionOutlinedIcon sx={{ fontSize: 40, color: '#E2E8F0', mb: 1.5 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>No requisitions yet</Typography>
              <ButtonBase type="button" onClick={() => setModal(true)} sx={{ mt: 2, fontSize: 11, fontWeight: 700, color: brand.navy, '&:hover': { textDecoration: 'underline' } }}>
                + Create your first request
              </ButtonBase>
            </Box>
          ) : (
            <Box sx={{ "& > * + *": { borderTop: '1px solid rgba(0,0,0,0.05)' } }}>
              {filtered.map((r) => {
                const destTone = DEST_TONE[r.destination] || DEST_TONE.accountant;
                return (
                  <Box key={r.db_id || r.id} sx={{ px: 2.5, py: 2, "&:hover": { bgcolor: 'rgba(247,248,250,0.4)' } }}>
                    <Stack direction="row" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.text }}>{r.dept}</Typography>
                        <Typography sx={{ mt: 0.25, fontSize: 11, fontWeight: 700, color: '#64748B' }}>{r.requester}</Typography>
                        <Typography sx={{ mt: 1, fontSize: 12, color: '#475569', maxWidth: 672 }}>{r.items}</Typography>
                        <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1} sx={{ mt: 1, fontSize: 10, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace' }}>
                          <Box component="span">{r.id} · {fmtDate(r.submitted)}</Box>
                          {r.attachmentName ? <Box component="span">{r.attachmentName}</Box> : null}
                          {r.destination ? (
                            <Box component="span" sx={{ px: 0.75, py: 0.25, borderRadius: 1, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', border: `1px solid ${destTone.border}`, color: destTone.color, bgcolor: destTone.bg }}>
                              → {DEST_LABEL[r.destination] || 'Accountant'}
                            </Box>
                          ) : null}
                        </Stack>
                        {r.description || r.note ? (
                          <Typography sx={{ mt: 0.5, fontSize: 10, color: '#64748B', fontStyle: 'italic' }}>
                            Description: {r.description || r.note}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 700, color: brand.text }}>{fmtMoney(r.amount)}</Typography>
                        <Box sx={{ mt: 0.5 }}><StatusChip status={r.status} /></Box>
                        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            type="button"
                            onClick={() => setViewReq(r)}
                            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 13 }} />}
                            sx={{ height: 28, px: 1.25, borderRadius: 1, border: '1px solid #E2E8F0', color: '#475569', fontSize: 10, fontWeight: 700, '&:hover': { color: brand.navy, borderColor: 'rgba(19,33,61,0.3)', bgcolor: 'rgba(243,245,250,0.4)' } }}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            disabled={r.status !== 'pending'}
                            onClick={() => setEditReq(r)}
                            startIcon={<EditOutlinedIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              height: 28,
                              px: 1.25,
                              borderRadius: 1,
                              fontSize: 10,
                              fontWeight: 700,
                              border: '1px solid',
                              borderColor: r.status === 'pending' ? '#E2E8F0' : '#F1F5F9',
                              color: r.status === 'pending' ? '#475569' : '#CBD5E1',
                              '&:hover': { color: brand.navy, borderColor: 'rgba(19,33,61,0.3)', bgcolor: 'rgba(243,245,250,0.4)' },
                              '&.Mui-disabled': { color: '#CBD5E1', borderColor: '#F1F5F9' },
                            }}
                          >
                            Edit
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>

      <AddModal open={modal} onClose={() => setModal(false)} defaultRequester={defaultRequester} onSubmit={createReq} />
      <AddModal
        open={Boolean(editReq)}
        onClose={() => setEditReq(null)}
        defaultRequester={defaultRequester}
        onSubmit={updateReq}
        initialData={editReq}
        submitLabel="Save Changes"
      />
      <ViewModal open={Boolean(viewReq)} onClose={() => setViewReq(null)} req={viewReq} />
    </Box>
  );
}
