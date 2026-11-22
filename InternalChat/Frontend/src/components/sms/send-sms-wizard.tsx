import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getMainScrollEl } from '@/shared/main-scroll';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { smsApi, type SendPayload, type SmsPreviewResult, type SmsUsage, type StudentDirectoryRow } from '@/services/sms-api';
import { countSmsSegments, smsEncodingLabel, smsSegmentHint } from '@/utils/sms-segments';
import { SMS_AMBER, SMS_NAVY } from './sms-theme';

type Mode = SendPayload['mode'];

const STEPS = ['Recipients', 'Compose', 'Review', 'Send'];

type Props = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  classes: string[];
  schoolName?: string;
  usage: SmsUsage | null;
};

export function SendSmsWizard({ open, onClose, onSent, classes, schoolName, usage }: Props) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [mountEl, setMountEl] = useState<HTMLElement | undefined>();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>('SELECTED_STUDENTS');
  const [parentTarget, setParentTarget] = useState<'FATHER' | 'MOTHER' | 'BOTH'>('BOTH');
  const [className, setClassName] = useState('');
  const [q, setQ] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [students, setStudents] = useState<StudentDirectoryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customNumbers, setCustomNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<SmsPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    setPreview(null);
    setMessage('');
    setSelected(new Set());
    setMountEl(getMainScrollEl());
  }, [open]);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (open) onClose();
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open || mode !== 'SELECTED_STUDENTS') return;
    const t = setTimeout(() => {
      smsApi.students({ q, className: filterClass || undefined }).then(({ data }) => setStudents(data.data ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [open, mode, q, filterClass]);

  const school = schoolName?.trim() || 'School';

  const sampleBody = useMemo(() => {
    const msg = message.trim() || 'Mwirewe neza!';
    return `Mubyeyi, ${msg}. Kumubyeyi w'umunyeshuri witwa Student (Class), CODE, wiga mu ishuri rya ${school}. | Shule+`;
  }, [message, school]);

  const sampleSegments = countSmsSegments(sampleBody);
  const encoding = smsEncodingLabel(sampleBody);
  const segmentHint = smsSegmentHint(sampleBody);

  const payload = useMemo((): SendPayload => {
    const base = { message, parentTarget };
    if (mode === 'CUSTOM_NUMBERS') {
      return {
        ...base,
        mode,
        customNumbers: customNumbers
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
    }
    if (mode === 'BULK_CLASS') return { ...base, mode, className, parentTarget };
    if (mode === 'BULK_SCHOOL') return { ...base, mode: 'BULK_SCHOOL', parentTarget };
    return { ...base, mode, studentIds: [...selected] };
  }, [mode, message, parentTarget, className, customNumbers, selected]);

  async function loadPreview() {
    setBusy(true);
    setError('');
    try {
      const { data } = await smsApi.preview(payload);
      setPreview(data.data);
      setStep(2);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendNow() {
    setBusy(true);
    setError('');
    try {
      await smsApi.send(payload);
      setStep(3);
      onSent();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  function toggleStudent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(students.map((s) => s.studentId)));
  }

  const quotaOk = useMemo(() => {
    if (!preview?.recipientCount) return false;
    if (!usage?.smsEnabled) return false;
    if (preview.segmentsTotal > (usage?.remaining ?? 0)) return false;
    return true;
  }, [preview, usage]);

  const dialogScoped = Boolean(mountEl) && !fullScreen;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      disablePortal={dialogScoped}
      container={mountEl}
      scroll="paper"
      sx={
        dialogScoped
          ? {
              position: 'absolute',
              zIndex: 1300,
              '& .MuiBackdrop-root': { position: 'absolute' },
            }
          : { zIndex: 1400 }
      }
      PaperProps={{
        sx: {
          m: fullScreen ? 0 : { xs: 1, sm: 2 },
          width: fullScreen ? '100%' : { xs: 'calc(100% - 16px)', sm: 'calc(100% - 32px)' },
          maxWidth: fullScreen ? '100%' : 720,
          maxHeight: fullScreen ? '100%' : 'calc(100% - 24px)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogContent
        sx={{
          p: { xs: 2, md: 3 },
          fontFamily: "'Montserrat', sans-serif",
          overflow: 'auto',
          flex: 1,
        }}
      >
        <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 800, color: SMS_NAVY, mb: 2 }}>Send SMS</Typography>

        <Stepper
          activeStep={step}
          alternativeLabel={!compact}
          orientation={compact ? 'vertical' : 'horizontal'}
          sx={{ mb: 2, '& .MuiStepLabel-label': { fontSize: 10, fontWeight: 600 } }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <LinearProgress variant="determinate" value={((step + 1) / 4) * 100} sx={{ mb: 2.5, height: 3, borderRadius: 1, bgcolor: 'rgba(0,4,53,0.08)', '& .MuiLinearProgress-bar': { bgcolor: SMS_AMBER } }} />

        {step === 0 ? (
          <Box>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <FormControlLabel
                value="SELECTED_STUDENTS"
                control={<Radio sx={{ color: SMS_NAVY, '&.Mui-checked': { color: SMS_AMBER } }} />}
                label="Pick students"
              />
              <FormControlLabel value="CUSTOM_NUMBERS" control={<Radio />} label="Custom numbers" />
              <FormControlLabel value="BULK_CLASS" control={<Radio />} label="Whole class" />
              <FormControlLabel value="BULK_SCHOOL" control={<Radio />} label="Whole school" />
            </RadioGroup>

            {(mode === 'SELECTED_STUDENTS' || mode.startsWith('BULK')) && mode !== 'CUSTOM_NUMBERS' ? (
              <Box sx={{ mt: 1.5 }}>
                <RadioGroup row value={parentTarget} onChange={(e) => setParentTarget(e.target.value as typeof parentTarget)}>
                  <FormControlLabel value="FATHER" control={<Radio size="small" />} label="Father" />
                  <FormControlLabel value="MOTHER" control={<Radio size="small" />} label="Mother" />
                  <FormControlLabel value="BOTH" control={<Radio size="small" />} label="Both" />
                </RadioGroup>
              </Box>
            ) : null}

            {mode === 'SELECTED_STUDENTS' ? (
              <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField size="small" label="Search name, ShuleCode, or ID" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
                  <TextField select size="small" label="Class" value={filterClass} onChange={(e) => setFilterClass(e.target.value)} sx={{ minWidth: 140 }}>
                    <MenuItem value="">All classes</MenuItem>
                    {classes.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button size="small" onClick={selectAllFiltered} sx={{ fontWeight: 700 }}>
                    Select filtered
                  </Button>
                </Box>
                <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid rgba(0,4,53,0.1)', borderRadius: 2, bgcolor: '#fff' }}>
                  {students.length === 0 ? (
                    <Typography sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>Search to find students.</Typography>
                  ) : null}
                  {students.map((s) => (
                    <Box key={s.studentId} sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,4,53,0.06)' }}>
                      <FormControlLabel
                        control={<Checkbox checked={selected.has(s.studentId)} onChange={() => toggleStudent(s.studentId)} />}
                        label={
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.studentName}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {s.studentCode} · {s.className?.trim() || 'No class'} · {s.parents.length} contact(s)
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{selected.size} student(s) selected</Typography>
              </Box>
            ) : null}

            {mode === 'CUSTOM_NUMBERS' ? (
              <TextField
                multiline
                minRows={4}
                fullWidth
                sx={{ mt: 2 }}
                label="Phone numbers"
                placeholder="+250788..."
                value={customNumbers}
                onChange={(e) => setCustomNumbers(e.target.value)}
              />
            ) : null}

            {mode === 'BULK_CLASS' ? (
              <TextField select fullWidth sx={{ mt: 2 }} label="Class" value={className} onChange={(e) => setClassName(e.target.value)}>
                {classes.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
          </Box>
        ) : null}

        {step === 1 ? (
          <Box>
            <TextField
              multiline
              minRows={6}
              fullWidth
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mwirewe neza!"
              helperText="Ubutumwa: Mubyeyi, … Kumubyeyi w'umunyeshuri witwa …, wiga mu ishuri rya …"
            />
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,4,53,0.03)' }}>
              <Typography sx={{ fontSize: 12, color: SMS_NAVY, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{sampleBody}</Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(0,4,53,0.45)', mt: 0.75 }}>
                {segmentHint.length} characters · {encoding} · {sampleSegments} segment{sampleSegments === 1 ? '' : 's'} billable
              </Typography>
              {segmentHint.overSingleLimit ? (
                <Typography sx={{ fontSize: 11, color: '#c2410c', mt: 0.75, lineHeight: 1.45 }}>
                  One SMS can hold at most {segmentHint.singleMax} characters ({encoding}). Longer text is split by the
                  phone network into {sampleSegments} parts; each part counts toward your quota. Shorten the message to use
                  1 segment.
                </Typography>
              ) : null}
            </Box>
          </Box>
        ) : null}

        {step === 2 && preview ? (
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <SummaryPill label="Recipients" value={preview.recipientCount} />
              <SummaryPill label="Est. segments" value={preview.segmentsTotal} accent />
              <SummaryPill label="Remaining quota" value={usage?.remaining?.toLocaleString() ?? '0'} />
              {preview.missingContacts ? <SummaryPill label="Missing contacts" value={preview.missingContacts} warn /> : null}
              {preview.duplicatePhones ? <SummaryPill label="Duplicates merged" value={preview.duplicatePhones} /> : null}
            </Box>
            {!quotaOk ? (
              <Typography sx={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, mb: 1.5 }}>
                Need {preview.segmentsTotal} segments · {usage?.remaining ?? 0} left
              </Typography>
            ) : null}
            <Box sx={{ maxHeight: 280, overflow: 'auto', border: '1px solid rgba(0,4,53,0.1)', borderRadius: 2 }}>
              {preview.preview.map((r, i) => (
                <Box key={i} sx={{ p: 1.5, borderBottom: '1px solid rgba(0,4,53,0.06)' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{r.parentName ?? r.phoneMasked}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.studentSummary ?? 'Custom'} · {r.segments} seg</Typography>
                  <Typography sx={{ fontSize: 12, mt: 0.5, color: SMS_NAVY }}>{r.messageBody.slice(0, 160)}{r.messageBody.length > 160 ? '…' : ''}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}

        {step === 3 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: SMS_NAVY }}>Sent</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>See Campaign history for status.</Typography>
          </Box>
        ) : null}

        {error ? <Typography sx={{ color: 'error.main', mt: 2, fontSize: 13, fontWeight: 600 }}>{error}</Typography> : null}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={onClose} sx={{ fontWeight: 600 }}>
            {step === 3 ? 'Done' : 'Cancel'}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {step > 0 && step < 3 ? (
              <Button onClick={() => setStep((s) => s - 1)} disabled={busy}>
                Back
              </Button>
            ) : null}
            {step === 0 ? (
              <Button
                variant="contained"
                sx={{ bgcolor: SMS_NAVY, fontWeight: 700 }}
                onClick={() => setStep(1)}
                disabled={
                  (mode === 'SELECTED_STUDENTS' && !selected.size) ||
                  (mode === 'BULK_CLASS' && !className) ||
                  (mode === 'CUSTOM_NUMBERS' && !customNumbers.trim())
                }
              >
                Continue
              </Button>
            ) : null}
            {step === 1 ? (
              <Button variant="contained" sx={{ bgcolor: SMS_NAVY, fontWeight: 700 }} onClick={() => void loadPreview()} disabled={!message.trim() || busy}>
                Review
              </Button>
            ) : null}
            {step === 2 ? (
              <Button
                variant="contained"
                sx={{ bgcolor: SMS_AMBER, color: SMS_NAVY, fontWeight: 800 }}
                onClick={() => void sendNow()}
                disabled={busy || !quotaOk || !preview?.recipientCount}
              >
                Send campaign
              </Button>
            ) : null}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({ label, value, accent, warn }: { label: string; value: number | string; accent?: boolean; warn?: boolean }) {
  return (
    <Box sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: warn ? 'rgba(185,28,28,0.08)' : accent ? 'rgba(252,176,56,0.15)' : 'rgba(0,4,53,0.04)' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: warn ? '#b91c1c' : SMS_NAVY }}>{value}</Typography>
    </Box>
  );
}
