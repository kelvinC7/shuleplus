import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Stack,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { publicRequestStatus } from '@/services/api';
import { downloadReceiptPdf, statusChip } from '@/utils/receipt.tsx';
import studentsImg from '@/assets/students.png';
import type { PublicRequestStatus as StatusData } from '@/types';

const paymentMethodText: Record<string, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  AT_SCHOOL: 'At school',
};

const glassSx = {
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.6)',
  bgcolor: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 16px 48px rgba(0,31,63,0.1)',
};

export default function PublicOrderStatusPage() {
  const [mobileView, setMobileView] = useState<'banner' | 'form'>('banner');
  const [requestNo, setRequestNo] = useState('');
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const no = requestNo.trim();
    if (!no) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await publicRequestStatus(no));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Request not found. Check the number and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const paymentLabel = data
    ? (data.notes?.match(/Payment method:\s*([^—]+)/)?.[1] ?? '').trim() ||
      (data.payments.length > 0 ? paymentMethodText[data.payments[0].method] ?? data.payments[0].method : '')
    : '';

  async function downloadReceipt() {
    if (!data) return;
    await downloadReceiptPdf({
      requestNumber: data.requestNumber,
      status: data.status,
      createdAt: data.createdAt,
      studentName: data.studentName,
      className: data.className,
      kitName: data.kitName,
      subtotal: data.subtotal,
      homeFee: data.homeFee,
      deliveryMethod: data.deliveryMethod,
      paymentLabel,
      total: data.total,
      notes: data.notes,
      items: data.items.map((it) => ({
        title: it.title,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
      })),
    });
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' },
        overflowY: 'hidden',
        height: '100vh',
      }}
    >
      {/* ---------- LEFT PANEL (same branding as the order page) ---------- */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'primary.main',
          color: '#fff',
          p: 2,
          display: { xs: mobileView === 'banner' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden',
          height: { xs: '100vh', md: 'auto' },
          maxHeight: '100vh',
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box component="img" src="/logo_white.png" alt="ShuleKit" sx={{ height: 40 }} />
        </Box>
        <Box
          sx={{
            position: 'relative',
            mt: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              fontStyle: 'italic',
              color: '#fff',
              fontFamily: "'Caveat', 'Kalam', 'Patrick Hand', cursive",
              textShadow: '0 2px 14px rgba(0,0,0,0.18)',
              maxWidth: 340,
              fontSize: { xs: '1.9rem', sm: '2.4rem', md: '2.125rem' },
            }}
          >
            Track your kit order with{' '}
            <Box component="span" sx={{ position: 'relative', display: 'inline-block', color: 'accent.main' }}>
              ease
              <Box
                component="svg"
                viewBox="0 0 120 10"
                sx={{ position: 'absolute', left: 0, bottom: -2, width: '100%', height: 7 }}
                preserveAspectRatio="none"
              >
                <path d="M2 6 Q30 1 60 6 Q90 11 118 5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </Box>
            </Box>
          </Typography>

          <Box
            component="img"
            src={studentsImg}
            alt=""
            sx={{ width: { xs: 190, sm: 240, md: 280 }, maxWidth: '70%' }}
          />
        </Box>

        <Button
          fullWidth
          onClick={() => setMobileView('form')}
          endIcon={<ArrowForwardIcon />}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'absolute',
            left: '6%',
            right: '6%',
            bottom: 16,
            bgcolor: '#fff',
            color: 'accent.main',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: 2.5,
            py: 1.1,
            fontSize: '0.95rem',
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
          }}
        >
          Check my order status
        </Button>
      </Box>

      {/* ---------- RIGHT PANEL (status lookup + receipt) ---------- */}
      <Box
        sx={{
          position: 'relative',
          display: { xs: mobileView === 'form' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          backgroundImage: 'url(/my_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: { xs: '100vh', md: 'auto' },
          overflowY: 'auto',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.12) 55%, rgba(255,255,255,0))',
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            gap: 1.25,
            p: { xs: 2.5, md: 5 },
            pb: 0,
          }}
        >
          <IconButton
            onClick={() => setMobileView('banner')}
            aria-label="Back"
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              bgcolor: 'rgba(0,17,33,0.06)',
              color: 'primary.main',
              '&:hover': { bgcolor: 'rgba(0,17,33,0.12)' },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.25 }, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              to="/order"
              variant="contained"
              size="small"
              sx={{ bgcolor: 'accent.main', color: 'accent.contrastText', fontWeight: 700, textTransform: 'none', px: { xs: 1.5, md: 2.25 }, fontSize: { xs: '0.72rem', md: '0.8125rem' }, boxShadow: 'none', '&:hover': { bgcolor: 'accent.dark', boxShadow: 'none' } }}
            >
              <ChecklistIcon sx={{ mr: 0.75, fontSize: 18 }} />
              Order a Kit
            </Button>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: { xs: 2.5, md: 5 } }}>
          <Box sx={{ width: '100%', maxWidth: 560 }}>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.15, mb: 1, textAlign: 'center', fontSize: { xs: '1.85rem', sm: '2.25rem', md: '3rem' } }}
            >
              Check Order Status
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(0,31,63,0.6)', textAlign: 'center', mb: 3 }}>
              Enter the request number you received when submitting your kit order.
            </Typography>

            <Paper component="form" onSubmit={handleSubmit} sx={{ ...glassSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <TextField
                  label="Request number"
                  value={requestNo}
                  onChange={(e) => setRequestNo(e.target.value)}
                  placeholder="e.g. SK-2026-0002"
                  required
                  fullWidth
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.6)',
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !requestNo.trim()}
                  sx={{ borderRadius: 2.5, px: 3, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' } }}
                >
                  {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SearchIcon />}
                </Button>
              </Box>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Paper>

            {data && (
              <Paper sx={{ ...glassSx, p: { xs: 2.5, md: 4 } }}>
                <Box
                  sx={{
                    maxWidth: 460,
                    mx: 'auto',
                    textAlign: 'left',
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2.5,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: 'inset 0 0 0 1px rgba(15,31,61,0.04)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.05rem' }}>ShuleKit Receipt</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>Order status</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 700, fontFamily: 'Consolas, Menlo, monospace', letterSpacing: 1, fontSize: '0.8rem', color: 'primary.main' }}>
                        {data.requestNumber}
                      </Typography>
                      {statusChip(data.status)}
                      <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)', display: 'block', mt: 0.5 }}>
                        {new Date(data.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed', mb: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Student</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{data.studentName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Class</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{data.className ?? '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Kit</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{data.kitName ?? data.gradeLevel ?? '—'}</Typography>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />

                  {data.items.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.5)', textAlign: 'center', py: 0.5 }}>No items</Typography>
                  )}
                  {data.items.map((it) => (
                    <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</Typography>
                        {Number(it.unitPrice) > 0 ? (
                          <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>
                            {it.quantity} × {Number(it.unitPrice).toLocaleString()} RWF
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>Included in kit</Typography>
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {Number(it.unitPrice) > 0 ? `${Number(it.lineTotal).toLocaleString()} RWF` : 'Included'}
                      </Typography>
                    </Box>
                  ))}

                  <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{Number(data.subtotal).toLocaleString()} RWF</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Delivery ({data.deliveryMethod === 'AT_HOME' ? 'Home' : 'At school'})</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{data.deliveryMethod === 'AT_HOME' ? `${Number(data.homeFee).toLocaleString()} RWF` : 'Free'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Payment method</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{paymentLabel || '—'}</Typography>
                  </Box>
                  <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.05rem' }}>Total</Typography>
                    <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.15rem' }}>{Number(data.total).toLocaleString()} RWF</Typography>
                  </Box>
                  {data.notes && (
                    <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)', display: 'block', mt: 1 }}>
                      Notes: {data.notes}
                    </Typography>
                  )}
                </Box>

                <Stack sx={{ justifyContent: 'center', flexWrap: 'wrap', rowGap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => void downloadReceipt()}
                    startIcon={<FileDownloadOutlinedIcon />}
                    sx={{ borderRadius: 2, px: 3, alignSelf: 'center' }}
                  >
                    Download receipt (PDF)
                  </Button>
                </Stack>

                {data.payments.length > 0 && (
                  <Box sx={{ maxWidth: 460, mx: 'auto', mt: 3, textAlign: 'left' }}>
                    <Divider sx={{ borderStyle: 'dashed', mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>Payments</Typography>
                    {data.payments.map((p) => (
                      <Box key={p.paymentNumber} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px dashed #e2e8f0' }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{p.paymentNumber}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>
                            {paymentMethodText[p.method] ?? p.method} {p.reference ? `· ${p.reference}` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontWeight: 600 }}>{Number(p.amount).toLocaleString()} RWF</Typography>
                          <Typography variant="caption" sx={{ color: p.status === 'COMPLETED' ? '#166534' : '#92400e', fontWeight: 600, display: 'block', mt: 0.25 }}>
                            {p.status}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}