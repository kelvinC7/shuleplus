import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckIcon from '@mui/icons-material/Check';
import PersonIcon from '@mui/icons-material/Person';
import {
  HrDrawer, HrBtnPrimary, HrBtnOutline, HrField, HrInput, HrTextarea, HrSelect,
} from './hrDrawerUi';
import { brand } from '../theme/theme';

export const PERMISSION_TYPES = [
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OFFICIAL', label: 'Official' },
  { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
  { value: 'EARLY_DEPARTURE', label: 'Early Departure' },
  { value: 'OTHER', label: 'Other' },
];

const STEPS = ['Permission details', 'Reason', 'Review'];

function calcPermissionDays(start, end) {
  if (!start || !end) return 0;
  const diff = new Date(end) - new Date(start);
  if (Number.isNaN(diff)) return 0;
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
}

function typeLabel(value, otherText) {
  if (value === 'OTHER' && otherText?.trim()) return otherText.trim();
  return PERMISSION_TYPES.find((p) => p.value === value)?.label || String(value || 'Other').replace(/_/g, ' ');
}

const emptyForm = () => ({
  permission_type: '',
  permission_type_other: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  reason: '',
  emergency_phone: '',
  alt_contact: '',
});

function Stepper({ step }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
      {STEPS.map((label, i) => (
        <Stack key={label} direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: 10,
              fontWeight: 500,
              bgcolor: i === step ? '#B26A00' : i < step ? '#FFFBEB' : '#F1F5F9',
              color: i === step ? '#fff' : i < step ? '#B26A00' : '#94A3B8',
            }}
          >
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
              {i < step ? <CheckIcon sx={{ fontSize: 10 }} /> : i + 1}
            </Box>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{label}</Box>
          </Stack>
          {i < STEPS.length - 1 && <ChevronRightIcon sx={{ fontSize: 12, color: '#CBD5E1', mx: 0.25, flexShrink: 0 }} />}
        </Stack>
      ))}
    </Stack>
  );
}

export default function PermissionRequestModal({
  open,
  onClose,
  teacherName = 'Teacher',
  teacherMeta = {},
  onSubmit,
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalDays = calcPermissionDays(form.start_date, form.end_date);
  const displayType = typeLabel(form.permission_type, form.permission_type_other);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setForm(emptyForm());
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const reasonParts = [form.reason.trim()];
      if (form.emergency_phone.trim()) reasonParts.push(`Emergency: ${form.emergency_phone.trim()}`);
      if (form.alt_contact.trim()) reasonParts.push(`Alt contact: ${form.alt_contact.trim()}`);

      const payload = {
        permission_type: form.permission_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason:
          form.permission_type === 'OTHER' && form.permission_type_other.trim()
            ? `[${form.permission_type_other.trim()}] ${reasonParts.filter(Boolean).join(' · ')}`
            : reasonParts.filter(Boolean).join(' · '),
        teacher_name: teacherName,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 0) {
      if (!form.permission_type || !form.start_date || !form.end_date) {
        setError('Complete permission type and dates.');
        return;
      }
      if (form.permission_type === 'OTHER' && !form.permission_type_other.trim()) {
        setError('Specify permission type.');
        return;
      }
      if (new Date(form.end_date) < new Date(form.start_date)) {
        setError('End date cannot be before start date.');
        return;
      }
    }
    if (step === 1 && !form.reason.trim()) {
      setError('Please provide a reason for your request.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const teacherInitial = useMemo(() => (teacherName || '?')[0]?.toUpperCase() || '?', [teacherName]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ p: 2, borderRadius: 2, border: '1px solid #FEF3C7', bgcolor: '#FFFBEB' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, bgcolor: '#B26A00', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500 }}>
                {teacherInitial}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>{teacherName}</Typography>
                {teacherMeta.position || teacherMeta.department ? (
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                    {[teacherMeta.position, teacherMeta.department].filter(Boolean).join(' · ')}
                  </Typography>
                ) : (
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25, fontSize: 12, color: '#64748B' }}>
                    <PersonIcon sx={{ fontSize: 12 }} /> <Box component="span">Teacher</Box>
                  </Stack>
                )}
                <Typography sx={{ mt: 0.5, fontSize: 12, color: '#B26A00' }}>Submitting on your behalf</Typography>
              </Box>
            </Stack>

            <HrField label="Permission type" required>
              <HrSelect
                value={form.permission_type}
                onChange={(e) => {
                  set('permission_type', e.target.value);
                  if (e.target.value !== 'OTHER') set('permission_type_other', '');
                }}
              >
                <option value="">Select...</option>
                {PERMISSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </HrSelect>
            </HrField>

            {form.permission_type === 'OTHER' && (
              <HrField label="Specify permission type" required>
                <HrInput
                  value={form.permission_type_other}
                  onChange={(e) => set('permission_type_other', e.target.value)}
                  placeholder="e.g. Medical appointment, workshop..."
                />
              </HrField>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <HrField label="Start date" required>
                <HrInput type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </HrField>
              <HrField label="End date" required>
                <HrInput type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </HrField>
            </Box>

            {form.start_date && form.end_date && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F0F9FF', border: '1px solid #E0F2FE', fontSize: 14 }}>
                <Box component="span" sx={{ color: '#64748B' }}>Total days requested: </Box>
                <Box component="span" sx={{ fontWeight: 500, color: brand.navy }}>{totalDays}</Box>
              </Box>
            )}
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={2}>
            <HrField label="Reason for permission" required>
              <HrTextarea
                rows={5}
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
                placeholder="Explain the reason for your permission request..."
                maxLength={500}
              />
              <Typography sx={{ mt: 0.5, fontSize: 10, color: '#94A3B8', textAlign: 'right' }}>{form.reason.length}/500</Typography>
            </HrField>
            <HrField label="Emergency phone">
              <HrInput
                value={form.emergency_phone}
                onChange={(e) => set('emergency_phone', e.target.value)}
                placeholder="+250 7XX XXX XXX"
              />
            </HrField>
            <HrField label="Alternative contact">
              <HrInput value={form.alt_contact} onChange={(e) => set('alt_contact', e.target.value)} placeholder="Name or number" />
            </HrField>
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={1.5} sx={{ fontSize: 14 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid #A7F3D0', bgcolor: '#ECFDF5' }}>
              <Typography sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: '#64748B', mb: 0.5 }}>Request summary</Typography>
              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                Duration: <Box component="span" sx={{ fontWeight: 600 }}>{totalDays} day{totalDays !== 1 ? 's' : ''}</Box>
                {' · '}
                Awaiting manager approval
              </Typography>
            </Box>
            {[
              ['Teacher', teacherName],
              ['Permission type', displayType],
              ['Dates', `${form.start_date} -> ${form.end_date}`],
              ['Total days', totalDays],
              ['Reason', form.reason || '-'],
              ['Emergency phone', form.emergency_phone || '-'],
              ['Alternative contact', form.alt_contact || '-'],
            ].map(([k, v]) => (
              <Stack key={k} direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1, borderBottom: '1px solid #F8FAFC' }}>
                <Box component="span" sx={{ fontSize: 12, textTransform: 'uppercase', color: '#94A3B8' }}>{k}</Box>
                <Box component="span" sx={{ fontSize: 14, textAlign: 'right', maxWidth: '60%', color: '#334155', fontWeight: 500 }}>{v}</Box>
              </Stack>
            ))}
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <HrDrawer
      open={open}
      onClose={onClose}
      title="Request Permission"
      footer={
        <>
          {step > 0 ? (
            <HrBtnOutline sx={{ flex: 1 }} onClick={prev} disabled={submitting}>
              <ChevronLeftIcon sx={{ fontSize: 14 }} /> Previous
            </HrBtnOutline>
          ) : (
            <HrBtnOutline sx={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</HrBtnOutline>
          )}
          {step < STEPS.length - 1 ? (
            <HrBtnPrimary sx={{ flex: 1 }} onClick={next}>
              Next <ChevronRightIcon sx={{ fontSize: 14 }} />
            </HrBtnPrimary>
          ) : (
            <HrBtnPrimary sx={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? <CircularProgress size={14} color="inherit" /> : <CheckIcon sx={{ fontSize: 14 }} />} Submit
            </HrBtnPrimary>
          )}
        </>
      }
    >
      <Stepper step={step} />
      {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: 14 }}>{error}</Alert> : null}
      {renderStep()}
    </HrDrawer>
  );
}
