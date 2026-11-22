import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { kaziSubmitRequest } from '../services/kaziApi';
import {
  computeAvancePlan,
  formatFrw,
  formatPlanDate,
  frequencyLabel,
  periodUnitLabel,
  toApiMonths,
} from '../utils/avanceRepayment';
import { brand } from '../theme/theme';

const FREQUENCIES = [
  { id: 'daily', label: 'Daily', Icon: CalendarTodayIcon },
  { id: 'weekly', label: 'Weekly', Icon: CalendarMonthIcon },
  { id: 'monthly', label: 'Monthly', Icon: CalendarViewMonthIcon },
];

const fieldSx = {
  width: '100%',
  borderRadius: 1.5,
  border: '1px solid rgba(0,0,0,0.1)',
  bgcolor: '#fff',
  px: 2,
  color: brand.navy,
  fontFamily: 'inherit',
  outline: 'none',
  '&:focus': { borderColor: brand.primary },
};

export default function TichaAvanceRequestModal({ open, eligibility, onClose, onSubmitted }) {
  const [amount, setAmount] = useState('');
  const [periodCount, setPeriodCount] = useState(3);
  const [frequency, setFrequency] = useState('monthly');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const available = Number(eligibility?.remaining_cap_rwf || eligibility?.monthly_cap_rwf || 0);

  const plan = useMemo(
    () => computeAvancePlan({ amount, periodCount, periodUnit: 'months', frequency, serviceFee: 0, interest: 0 }),
    [amount, periodCount, frequency]
  );

  const entered = Number(String(amount).replace(/[^\d.]/g, '')) || 0;
  const overLimit = available > 0 && entered > available;
  const blocked = Boolean(eligibility?.status && eligibility.status !== 'Eligible');
  const canSubmit = entered > 0 && periodCount >= 1 && plan.payments > 0 && !overLimit && !blocked && !submitting;

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setPeriodCount(3);
    setFrequency('monthly');
    setScheduleOpen(false);
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function submitAdvance() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const desc = [
        `Loan period: ${plan.periodCount} ${periodUnitLabel('months', plan.periodCount)}`,
        `Frequency: ${frequencyLabel(frequency)}`,
        `${plan.payments} payments of ${formatFrw(plan.perPayment)}`,
      ].join(' · ');
      const result = await kaziSubmitRequest({
        amount: entered,
        months: toApiMonths(periodCount, 'months'),
        purpose: 'Salary advance',
        description: desc,
      });
      if (result?.id || result?.requestNumber) {
        onSubmitted?.(result);
        onClose();
      } else {
        setError(result?.message || 'Submit failed.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Drawer
        anchor="bottom"
        open={Boolean(open)}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: 520,
            mx: 'auto',
            maxHeight: '92vh',
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#fff',
          },
        }}
      >
        <Box sx={{ flexShrink: 0, background: 'linear-gradient(145deg,#0E1F35,#1B3354)', px: { xs: 2, sm: 3 }, pt: { xs: 'max(0.75rem, env(safe-area-inset-top))', sm: 3 }, pb: 2 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto', mb: 2, display: { sm: 'none' } }} />
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
            <Box>
              <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.6, color: 'rgba(251,191,36,0.9)' }}>New Request</Typography>
              <Typography sx={{ mt: 0.25, fontSize: 18, fontWeight: 900, color: '#fff' }}>Request a salary advance</Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close" sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
          <Box sx={{ mt: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.5)' }}>Available</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{available > 0 ? formatFrw(available) : '-'}</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Maximum amount you can currently request.</Typography>
          </Box>
        </Box>

        <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Box component="label" sx={{ display: 'block' }}>
            <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>Amount Requested</Typography>
            <Box sx={{ position: 'relative', mt: 1 }}>
              <Box
                component="input"
                type="number"
                min={0}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                sx={{ ...fieldSx, height: 56, pr: 8, fontSize: 20, fontWeight: 700 }}
              />
              <Box component="span" sx={{ pointerEvents: 'none', position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>Frw</Box>
            </Box>
          </Box>
          {overLimit ? (
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1, fontSize: 12, fontWeight: 500, color: '#B45309' }}>
              <WarningAmberIcon sx={{ fontSize: 13 }} /> <Box component="span">Amount is above your available advance.</Box>
            </Stack>
          ) : blocked ? (
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1, fontSize: 12, fontWeight: 500, color: '#B45309' }}>
              <WarningAmberIcon sx={{ fontSize: 13 }} /> <Box component="span">{eligibility?.message || 'You are not currently eligible for an advance.'}</Box>
            </Stack>
          ) : null}

          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>Loan Period</Typography>
            <Box component="select" value={periodCount} onChange={(e) => setPeriodCount(Number(e.target.value))} sx={{ ...fieldSx, mt: 1, height: 48, fontSize: 14, fontWeight: 600 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>Payment Frequency</Typography>
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {FREQUENCIES.map(({ id, label, Icon }) => {
                const active = frequency === id;
                return (
                  <Box
                    component="button"
                    type="button"
                    key={id}
                    onClick={() => setFrequency(id)}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      minHeight: 88,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: active ? brand.navy : 'rgba(0,0,0,0.1)',
                      bgcolor: active ? brand.navy : '#fff',
                      color: active ? '#fff' : brand.navy,
                      px: 1,
                      py: 1.5,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                    {label}
                    {active ? <CheckIcon sx={{ position: 'absolute', right: 8, top: 8, fontSize: 14, color: brand.primary }} /> : null}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ mt: 2.5, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', bgcolor: '#f8f9fc', p: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>Repayment Summary</Typography>
            <Box component="dl" sx={{ mt: 1.5, m: 0, display: 'flex', flexDirection: 'column', gap: 1.25, fontSize: 14 }}>
              <Row label="Advance Amount" value={entered ? formatFrw(entered) : '-'} />
              <Row label="Loan Period" value={`${plan.periodCount || '-'} ${periodUnitLabel('months', plan.periodCount)}`} />
              <Row label="Payment Frequency" value={frequencyLabel(frequency)} />
              <Row label="Number of Payments" value={plan.payments || '-'} />
              <Row label="Payment Per Period" value={plan.payments ? formatFrw(plan.perPayment) : '-'} accent />
              {plan.serviceFee > 0 ? <Row label="Service Fee" value={formatFrw(plan.serviceFee)} /> : null}
              <Box sx={{ borderTop: '1px dashed rgba(0,0,0,0.1)', pt: 1.25 }}>
                <Row label="Total Repayment" value={entered ? formatFrw(plan.totalRepayment) : '-'} bold />
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>Repayment Preview</Typography>
              <Button
                type="button"
                disabled={!plan.schedule.length}
                onClick={() => setScheduleOpen(true)}
                sx={{ p: 0, minWidth: 0, fontSize: 12, fontWeight: 600, color: brand.navy, textTransform: 'none', '&.Mui-disabled': { opacity: 0.4 } }}
              >
                View Schedule
              </Button>
            </Stack>
            <Box component="dl" sx={{ mt: 1.5, m: 0, display: 'flex', flexDirection: 'column', gap: 1, fontSize: 14 }}>
              <Row label="First Payment" value={plan.firstPayment ? formatPlanDate(plan.firstPayment) : '-'} />
              <Row label="Frequency" value={frequencyLabel(frequency)} />
              <Row label="Number of Payments" value={plan.payments || '-'} />
              <Row label="Payment Amount" value={plan.payments ? formatFrw(plan.perPayment) : '-'} />
              <Row label="Last Payment" value={plan.lastPayment ? formatPlanDate(plan.lastPayment) : '-'} />
            </Box>
          </Box>

          {error ? <Typography sx={{ mt: 2, fontSize: 14, fontWeight: 500, color: '#DC2626' }}>{error}</Typography> : null}
        </Box>

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          justifyContent={{ sm: 'flex-end' }}
          spacing={1}
          sx={{ flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', px: { xs: 2, sm: 3 }, py: 2, pb: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            type="button"
            onClick={onClose}
            sx={{ height: 48, borderRadius: 1.5, border: '1px solid rgba(0,0,0,0.1)', px: 3, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submitAdvance()}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ height: 48, borderRadius: 1.5, bgcolor: brand.navy, px: 3, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', color: '#fff', '&:hover': { bgcolor: brand.navy2 }, '&.Mui-disabled': { opacity: 0.4 } }}
          >
            {submitting ? 'Submitting...' : 'Request Advance'}
          </Button>
        </Stack>
      </Drawer>

      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: brand.navy }}>Repayment schedule</Typography>
          <IconButton onClick={() => setScheduleOpen(false)} aria-label="Close schedule" sx={{ borderRadius: '50%', '&:hover': { bgcolor: '#F8FAFC' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
          <Box component="table" sx={{ width: '100%', textAlign: 'left', fontSize: 14, borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>
                {['#', 'Due Date', 'Amount', 'Status'].map((h) => (
                  <Box component="th" key={h} sx={{ pb: 1.5, fontWeight: 600 }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {plan.schedule.map((row) => (
                <Box component="tr" key={row.n} sx={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <Box component="td" sx={{ py: 1.5, fontWeight: 600, color: brand.navy }}>{row.n}</Box>
                  <Box component="td" sx={{ py: 1.5, color: '#475569' }}>{formatPlanDate(row.due)}</Box>
                  <Box component="td" sx={{ py: 1.5, fontWeight: 600, color: brand.navy }}>{formatFrw(row.amount)}</Box>
                  <Box component="td" sx={{ py: 1.5 }}>
                    <Box component="span" sx={{ borderRadius: 999, bgcolor: '#F0F9FF', px: 1, py: 0.25, fontSize: 10, fontWeight: 600, color: '#075985' }}>{row.status}</Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}

function Row({ label, value, accent, bold }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
      <Typography component="dt" sx={{ fontSize: 'inherit', color: '#64748B' }}>{label}</Typography>
      <Typography
        component="dd"
        sx={{
          m: 0,
          textAlign: 'right',
          fontSize: 'inherit',
          fontWeight: bold ? 700 : accent ? 700 : 600,
          color: accent ? brand.primary : brand.navy,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
