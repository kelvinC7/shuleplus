/**
 * TichaDealPayments.jsx
 * Modern payment page - #13213D navy + amber
 * MTN MoMo (live collection) + Airtel / Bank / Visa (intent)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import api from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { brand } from '../theme/theme';

const MOMO_POLL_MS = 2500;
const MOMO_MAX_POLLS = 48;

const PAGE_FONT_FAMILY = "'Montserrat', system-ui, sans-serif";

const BABYEYI_BANK_DEPOSITS = [
  { code: 'bk', name: 'Bank of Kigali (BK)', accountNo: '00000-0000000-0', accountName: 'Babyeyi Ltd' },
  { code: 'umwalimu', name: 'Umwalimu SACCO', accountNo: '0000-000000-00', accountName: 'Babyeyi Ltd' },
  { code: 'equity', name: 'Equity Bank Rwanda', accountNo: '4001-xxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'im', name: 'I&M Bank Rwanda', accountNo: 'RW00-xxxx', accountName: 'Babyeyi Ltd' },
  { code: 'access', name: 'Access Bank Rwanda', accountNo: 'ACC-xxxx', accountName: 'Babyeyi Ltd' },
  { code: 'bpr', name: 'BPR / Bank of Africa', accountNo: '00040-xxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'kcb', name: 'KCB Bank Rwanda', accountNo: '11xxxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'gt', name: 'GTBank Rwanda', accountNo: 'xxxxxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'other', name: 'Other Rwandan bank', accountNo: '', accountName: '', otherNote: true },
];

function sanitizeRwandaPhone(raw) {
  if (!raw) return '';
  let p = String(raw).trim().replace(/\s+/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  p = p.replace(/[^0-9]/g, '');
  if (p.startsWith('2507') && p.length === 12) return p;
  if (p.startsWith('07') && p.length === 10) return `250${p.slice(1)}`;
  if (p.startsWith('7') && p.length === 9) return `250${p}`;
  return p;
}

function isValidMtnRw(raw) {
  return /^2507[0-9]{8}$/.test(sanitizeRwandaPhone(raw));
}

function formatFrw(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return `${Math.round(v).toLocaleString('en-RW')} RWF`;
}

const labelSx = { display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', mb: 1 };

function MethodTab({ label, Icon, active, onClick }) {
  return (
    <ButtonBase
      type="button"
      onClick={onClick}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        py: 1.5,
        px: 1,
        borderRadius: '12px',
        border: '2px solid',
        borderColor: active ? brand.navy : '#E2E8F0',
        bgcolor: active ? brand.navy : '#fff',
        color: active ? '#fff' : '#64748B',
        minHeight: 60,
        boxShadow: active ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
        '&:hover': { borderColor: active ? brand.navy : '#CBD5E1', bgcolor: active ? brand.navy : '#F8FAFC' },
      }}
    >
      <Icon sx={{ fontSize: 18 }} />
      <Box component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>{label}</Box>
    </ButtonBase>
  );
}

function PayField({ label, value, onChange, placeholder, inputMode = 'text', hint, ...rest }) {
  return (
    <Box>
      <Box component="label" sx={labelSx}>{label}</Box>
      <TextField value={value} onChange={onChange} placeholder={placeholder} inputProps={{ inputMode }} {...rest} />
      {hint ? <Typography sx={{ mt: 0.75, ml: 0.5, fontSize: 11, color: '#94A3B8' }}>{hint}</Typography> : null}
    </Box>
  );
}

function PaySelect({ label, value, onChange, children }) {
  return (
    <Box>
      <Box component="label" sx={labelSx}>{label}</Box>
      <TextField select value={value} onChange={onChange}>{children}</TextField>
    </Box>
  );
}

function SubmitBtn({ onClick, disabled, loading, label, amber = false }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth
      sx={{
        py: 1.75,
        minHeight: 52,
        borderRadius: '12px',
        fontSize: 14,
        fontWeight: 800,
        color: amber ? brand.navy : '#fff',
        bgcolor: amber ? '#FBBF24' : brand.navy,
        boxShadow: amber ? '0 10px 15px -3px rgba(251,191,36,0.25)' : '0 10px 15px -3px rgba(19,33,61,0.2)',
        '&:hover': { bgcolor: amber ? '#FCD34D' : '#000C70' },
        '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#94A3B8' },
      }}
    >
      {loading ? <CircularProgress size={18} sx={{ color: amber ? brand.navy : '#fff' }} /> : label}
    </Button>
  );
}

function FullScreenShell({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: brand.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, fontFamily: PAGE_FONT_FAMILY }}>
      {children}
    </Box>
  );
}

export default function TichaDealPayments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get('tdt') || '').trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const [method, setMethod] = useState('momo');
  const [momoPhone, setMomoPhone] = useState('');
  const [airtelPhone, setAirtelPhone] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [bankCode, setBankCode] = useState(BABYEYI_BANK_DEPOSITS[0]?.code || 'bk');
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [visaName, setVisaName] = useState('');
  const [visaLast4, setVisaLast4] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [momoWaiting, setMomoWaiting] = useState(null);
  const pollTimerRef = useRef(null);

  const stopMomoPoll = useCallback(() => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing payment link. Go back to the deal and start again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services/shule-avance/public/teacher-deal-pay-payload', { params: { token } });
      if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || 'Invalid or expired payment session');
      const p = res.data.data;
      setPayload(p);
      setMomoPhone(String(p.payer_phone || '').trim());
      setAirtelPhone(String(p.payer_phone || '').trim());
      setVisaName(String(p.payer_name || '').trim());
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load payment.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => stopMomoPoll(), [stopMomoPoll]);

  const pollMomoStatus = useCallback(async (refId, orderNumber, attemptIndex) => {
    if (!token || !refId) return;
    setMomoWaiting(w => w ? { ...w, pollCount: attemptIndex + 1 } : w);
    try {
      const res = await api.post('/services/shule-avance/public/teacher-deal-pay-momo-status', { token, reference_id: refId });
      const d = res.data?.data;
      if (!res.data?.success) { stopMomoPoll(); setMomoWaiting(null); setSubmitting(false); setError(res.data?.message || 'Status check failed'); return; }
      if (d?.phase === 'complete' || d?.mtn_status === 'SUCCESSFUL') {
        stopMomoPoll(); setMomoWaiting(null); setSubmitting(false);
        setDone({ title: 'Payment Received!', detail: d?.message || 'Your payment was completed successfully.', ref: d?.order_number || orderNumber || '' });
        return;
      }
      if (d?.payment_failed || d?.phase === 'failed') { stopMomoPoll(); setMomoWaiting(null); setError(d?.message || 'Payment was not completed on the phone.'); return; }
      if (attemptIndex + 1 >= MOMO_MAX_POLLS) { stopMomoPoll(); setMomoWaiting(null); setError('No confirmation from MTN in time. If you already paid, please wait a few minutes or contact finance.'); return; }
      pollTimerRef.current = setTimeout(() => pollMomoStatus(refId, orderNumber, attemptIndex + 1), MOMO_POLL_MS);
    } catch (e) {
      if (attemptIndex + 1 >= MOMO_MAX_POLLS) { stopMomoPoll(); setMomoWaiting(null); setSubmitting(false); setError(e.message || 'Could not confirm payment.'); return; }
      pollTimerRef.current = setTimeout(() => pollMomoStatus(refId, orderNumber, attemptIndex + 1), MOMO_POLL_MS * 2);
    }
  }, [token, stopMomoPoll]);

  const refCode = useMemo(() => (token ? `TD-${token.slice(0, 8).toUpperCase()}` : ''), [token]);
  const amount = useMemo(() => Math.max(0, Math.round(Number(payload?.amount_rwf) || 0)), [payload]);

  const selectedBankDeposit = useMemo(
    () => BABYEYI_BANK_DEPOSITS.find((b) => b.code === bankCode) || BABYEYI_BANK_DEPOSITS[0],
    [bankCode]
  );

  const copyDepositAccount = useCallback(async () => {
    const n = String(selectedBankDeposit?.accountNo || '').trim();
    if (!n) return;
    try {
      await navigator.clipboard.writeText(n);
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [selectedBankDeposit]);

  const payMtn = async () => {
    if (!token) return;
    if (!isValidMtnRw(momoPhone)) { setError('Enter a valid Rwanda MTN number (e.g. 078…).'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await api.post('/services/shule-avance/public/teacher-deal-pay-momo', { token, momo_phone: momoPhone });
      const j = res.data || {};
      if (!j.success) { const base = j.message || 'Payment could not start.'; const hint = j.detail ? ` ${j.detail}` : ''; throw new Error(base + hint); }
      const d = j.data || {};
      if (d.phase === 'complete' && String(d.mtn_status || '').toUpperCase() === 'SUCCESSFUL') {
        setDone({ title: 'Payment Received!', detail: d.message || 'Your payment was completed successfully.', ref: d.order_number || '' });
        return;
      }
      if (d.mtn_reference_id && (d.phase === 'awaiting_device' || String(d.mtn_status || '').toUpperCase() === 'PENDING')) {
        setSubmitting(false);
        setMomoWaiting({ mtnReferenceId: d.mtn_reference_id, orderNumber: d.order_number || '', pollCount: 0 });
        stopMomoPoll();
        pollTimerRef.current = setTimeout(() => pollMomoStatus(d.mtn_reference_id, d.order_number || '', 0), MOMO_POLL_MS);
        return;
      }
      setError('Unexpected response. Please try again.');
    } catch (e) {
      const d = e.response?.data;
      const line = d && (d.message || d.detail) ? [d.message, d.detail].filter(x => x?.trim()).join(' ') : e.message;
      setError(line || 'Payment failed');
    } finally {
      if (!pollTimerRef.current) setSubmitting(false);
    }
  };

  const submitAlt = async (channel, extra) => {
    if (!token) return;
    setSubmitting(true); setError(null);
    try {
      const res = await api.post('/services/shule-avance/public/teacher-deal-pay-alt-intent', { token, channel, ...extra });
      const j = res.data || {};
      if (!j.success) throw new Error(j.message || 'Could not save');
      const detail = channel === 'airtel_money'
        ? 'Your Airtel Money preference is logged. Finance may contact you or send a wallet request.'
        : channel === 'bank_transfer'
          ? 'Use the reference below when you transfer. Finance will match your payment.'
          : 'Visa / card details recorded. School finance will follow up with you.';
      setDone({ title: 'Request Recorded', detail, ref: refCode });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FullScreenShell>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={40} sx={{ color: '#FBBF24' }} />
          <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)' }}>
            Loading payment…
          </Typography>
        </Stack>
      </FullScreenShell>
    );
  }

  if (momoWaiting) {
    return (
      <FullScreenShell>
        <Paper elevation={24} sx={{ width: '100%', maxWidth: 384, borderRadius: 4, p: 4, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <AccessTimeIcon sx={{ fontSize: 36, color: '#F59E0B' }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: brand.navy, mb: 1 }}>Approve on your phone</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#64748B', lineHeight: 1.6, mb: 2 }}>
            A payment prompt was sent to your MTN number. Enter your PIN only when ready to pay.
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', mb: 2 }}>
            This page will update automatically after MTN confirms.
          </Typography>
          {momoWaiting.orderNumber && (
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '12px', px: 2, py: 1.25, mb: 2.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', mb: 0.25 }}>Reference</Typography>
              <Typography sx={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 900, color: brand.navy }}>{momoWaiting.orderNumber}</Typography>
            </Box>
          )}
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 3 }}>
            <CircularProgress size={16} sx={{ color: '#F59E0B' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#D97706' }}>
              Checking {momoWaiting.pollCount > 0 ? `(${momoWaiting.pollCount}/${MOMO_MAX_POLLS})` : ''}
            </Typography>
          </Stack>
          <Button
            type="button"
            fullWidth
            onClick={() => { stopMomoPoll(); setMomoWaiting(null); setSubmitting(false); }}
            sx={{ py: 1.5, borderRadius: '12px', border: '2px solid #E2E8F0', color: '#475569', fontSize: 14, fontWeight: 900, '&:hover': { bgcolor: '#F8FAFC' } }}
          >
            Cancel
          </Button>
        </Paper>
      </FullScreenShell>
    );
  }

  if (done) {
    return (
      <FullScreenShell>
        <Paper elevation={24} sx={{ width: '100%', maxWidth: 384, borderRadius: 4, p: 4, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <CheckCircleIcon sx={{ fontSize: 40, color: '#10B981' }} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: brand.navy, mb: 1 }}>{done.title}</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#64748B', lineHeight: 1.6, mb: 2 }}>{done.detail}</Typography>
          {done.ref && (
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '12px', px: 2, py: 1.25, mb: 3 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', mb: 0.25 }}>Reference</Typography>
              <Typography sx={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 900, color: brand.navy }}>{done.ref}</Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            <Button
              type="button"
              onClick={() => navigate('/ticha-deals/tracking')}
              fullWidth
              sx={{ py: 1.75, borderRadius: '12px', bgcolor: '#FBBF24', color: brand.navy, fontSize: 14, fontWeight: 900, boxShadow: '0 10px 15px -3px rgba(251,191,36,0.25)', '&:hover': { bgcolor: '#FCD34D' } }}
            >
              Track Deal Status
            </Button>
            
          </Stack>
        </Paper>
      </FullScreenShell>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: brand.navy, fontFamily: PAGE_FONT_FAMILY }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: 'rgba(19,33,61,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ maxWidth: 512, mx: 'auto', px: 2, height: 56 }}>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
              Teacher Deal
            </Typography>
            <Typography noWrap sx={{ mt: 0.25, fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
              {payload?.product_name || 'Payment'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ fontSize: 10, fontWeight: 700, color: '#FBBF24' }}>
            <LockOutlinedIcon sx={{ fontSize: 12 }} /> Secure
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 512, mx: 'auto', px: 2, pt: 3, pb: 8 }}>
        <Paper elevation={12} sx={{ borderRadius: 2.5, overflow: 'hidden', mb: 2.5, background: 'linear-gradient(135deg, #13213D 0%, #001580 60%, #000c70 100%)' }}>
          <Box sx={{ px: 2.5, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', mb: 1 }}>
              Amount Due
            </Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#FBBF24' }}>{formatFrw(amount)}</Typography>
            {payload?.payer_name && (
              <Typography sx={{ mt: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Payer: {payload.payer_name}</Typography>
            )}
          </Box>
          {payload?.product_name && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2.5, py: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FBBF24' }} />
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{payload.product_name}</Typography>
            </Stack>
          )}
        </Paper>

        {error && (
          <Alert
            severity="error"
            icon={<ErrorOutlineIcon sx={{ fontSize: 18 }} />}
            sx={{ mb: 2, borderRadius: '12px', bgcolor: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(248,113,113,0.25)', fontWeight: 600, "& .MuiAlert-icon": { color: '#F87171' } }}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', mb: 1.5 }}>
            Payment Method
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {[
              { id: 'momo', label: 'MTN', Icon: SmartphoneIcon },
              { id: 'airtel', label: 'Airtel', Icon: SmartphoneIcon },
              { id: 'bank', label: 'Bank', Icon: AccountBalanceIcon },
              { id: 'visa', label: 'Visa', Icon: CreditCardIcon },
            ].map(({ id, label, Icon }) => (
              <MethodTab key={id} label={label} Icon={Icon} active={method === id} onClick={() => { setMethod(id); setError(null); }} />
            ))}
          </Box>
        </Box>

        <Stack direction="row" alignItems="flex-start" spacing={1.25} sx={{ px: 2, py: 1.5, borderRadius: '12px', bgcolor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', mb: 2.5 }}>
          <InfoOutlinedIcon sx={{ fontSize: 15, color: '#FBBF24', flexShrink: 0, mt: 0.25 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(253,230,138,0.8)', lineHeight: 1.6 }}>
            MTN MoMo sends a live payment prompt to your phone. Other methods are recorded for school finance to process.
          </Typography>
        </Stack>

        <Paper elevation={12} sx={{ borderRadius: 2.5, p: 2.5 }}>
          {method === 'momo' && (
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SmartphoneIcon sx={{ fontSize: 18, color: brand.navy }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: brand.navy }}>MTN Mobile Money</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>Live push payment to your phone</Typography>
                </Box>
              </Stack>
              <PayField
                label="MTN MoMo Number"
                value={momoPhone}
                onChange={e => { setMomoPhone(e.target.value); setError(null); }}
                placeholder="078 000 0000"
                inputMode="tel"
                hint="Enter your MTN number starting with 078 or 079"
              />
              <SubmitBtn
                onClick={payMtn}
                disabled={!isValidMtnRw(momoPhone)}
                loading={submitting}
                label={<Stack direction="row" spacing={1} alignItems="center"><SmartphoneIcon sx={{ fontSize: 16 }} /><span>Pay {formatFrw(amount)} with MTN</span></Stack>}
                amber
              />
            </Stack>
          )}

          {method === 'airtel' && (
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: brand.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SmartphoneIcon sx={{ fontSize: 18, color: '#fff' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: brand.navy }}>Airtel Money</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>Finance will send a payment request</Typography>
                </Box>
              </Stack>
              <PayField
                label="Airtel Money Number"
                value={airtelPhone}
                onChange={e => setAirtelPhone(e.target.value)}
                placeholder="073 000 0000"
                inputMode="tel"
              />
              <SubmitBtn
                onClick={() => submitAlt('airtel_money', { phone: airtelPhone.trim(), note: 'User selected Airtel Money' })}
                disabled={!airtelPhone.trim()}
                loading={submitting}
                label={<Stack direction="row" spacing={1} alignItems="center"><SmartphoneIcon sx={{ fontSize: 16 }} /><span>Continue with Airtel Money</span></Stack>}
              />
            </Stack>
          )}

          {method === 'bank' && (
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: brand.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccountBalanceIcon sx={{ fontSize: 18, color: '#FBBF24' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: brand.navy }}>Bank Transfer</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>Choose Babyeyi’s receiving bank, then transfer using the reference</Typography>
                </Box>
              </Stack>

              <PaySelect label="Bank (deposit to)" value={bankCode} onChange={(e) => { setBankCode(e.target.value); setCopiedAcc(false); }}>
                {BABYEYI_BANK_DEPOSITS.map((b) => (
                  <MenuItem key={b.code} value={b.code}>{b.name}</MenuItem>
                ))}
              </PaySelect>

              {selectedBankDeposit?.otherNote ? (
                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#78350F', lineHeight: 1.6 }}>
                    For banks not listed above, contact your school finance office for the correct Babyeyi deposit account. You can still record your intent below after you transfer using reference <Box component="span" sx={{ fontFamily: 'monospace' }}>{refCode}</Box>.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(19,33,61,0.05)', border: '1px solid rgba(19,33,61,0.1)' }}>
                  <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', mb: 0.25 }}>Account name (beneficiary)</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 900, color: brand.navy }}>{selectedBankDeposit.accountName || 'Babyeyi'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', mb: 0.5 }}>Account number</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography sx={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 900, color: brand.navy, letterSpacing: '-0.01em', wordBreak: 'break-all' }}>
                        {selectedBankDeposit.accountNo}
                      </Typography>
                      {selectedBankDeposit.accountNo ? (
                        <Button
                          type="button"
                          onClick={copyDepositAccount}
                          startIcon={copiedAcc ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                          sx={{ px: 1.5, py: 0.75, borderRadius: 1, bgcolor: brand.navy, color: '#fff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', '&:hover': { bgcolor: '#000C70' } }}
                        >
                          {copiedAcc ? 'Copied' : 'Copy'}
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                </Stack>
              )}

              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', mb: 0.5 }}>Payment reference (required on transfer)</Typography>
                <Typography sx={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 900, color: brand.navy }}>{refCode}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                  Transfer <Box component="strong" sx={{ color: brand.navy }}>{formatFrw(amount)}</Box> and include this reference in the narration / description.
                </Typography>
              </Box>

              <PayField
                label="Your Full Name (as on transfer)"
                value={bankHolder}
                onChange={e => setBankHolder(e.target.value)}
                placeholder="Full name"
              />

              <PayField
                label="Your bank confirmation reference (optional)"
                value={bankRef}
                onChange={e => setBankRef(e.target.value)}
                placeholder="e.g. TXN ID from your banking app"
              />

              <SubmitBtn
                onClick={() => submitAlt('bank_transfer', {
                  bank_reference: refCode,
                  account_holder: bankHolder.trim(),
                  transfer_note: bankRef.trim(),
                  bank_code: selectedBankDeposit.code,
                  bank_name: selectedBankDeposit.name,
                  babyeyi_account_number: selectedBankDeposit.accountNo || null,
                  babyeyi_account_name: selectedBankDeposit.accountName || null,
                })}
                disabled={!bankHolder.trim()}
                loading={submitting}
                label={<Stack direction="row" spacing={1} alignItems="center"><PaymentsOutlinedIcon sx={{ fontSize: 16 }} /><span>Confirm bank transfer &amp; continue</span></Stack>}
              />
            </Stack>
          )}

          {method === 'visa' && (
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: brand.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCardIcon sx={{ fontSize: 18, color: '#FBBF24' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: brand.navy }}>Visa / Card</Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>School finance will process your card payment</Typography>
                </Box>
              </Stack>
              <PayField
                label="Cardholder Name"
                value={visaName}
                onChange={e => setVisaName(e.target.value)}
                placeholder="Name on card"
              />
              <PayField
                label="Last 4 Digits of Card"
                value={visaLast4}
                onChange={e => setVisaLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
              />
              <SubmitBtn
                onClick={() => submitAlt('visa_card', { cardholder: visaName.trim(), card_last4: visaLast4 })}
                disabled={!visaName.trim() || visaLast4.length !== 4}
                loading={submitting}
                label={<Stack direction="row" spacing={1} alignItems="center"><CreditCardIcon sx={{ fontSize: 16 }} /><span>Submit Card Details</span></Stack>}
              />
            </Stack>
          )}
        </Paper>

        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mt: 3 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
            <ShieldOutlinedIcon sx={{ fontSize: 11 }} /> SSL Encrypted
          </Stack>
          <Box component="span" sx={{ color: 'rgba(255,255,255,0.15)' }}>·</Box>
          <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Babyeyi Systems</Typography>
        </Stack>
      </Box>
    </Box>
  );
}
