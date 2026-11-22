import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { requestMarkEdit } from '../../services/marksApi.js';
import { fetchAssessment, fetchAssessmentMarks, fetchClassStudents } from '../../services/teacherPortalApi';
import { useTpToast } from '../../components/TpToast.jsx';
import { brand } from '../../theme/theme';

const REASONS = [
  'Wrong score entered',
  'Student score missing',
  'Calculation error',
  'Incorrect student record',
  'Other',
];

function newRow() {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, studentId: '', currentScore: '', requestedScore: '' };
}

const fieldShellSx = {
  bgcolor: '#F2F4F8',
  borderRadius: 2,
  px: 1.75,
  py: 1,
  fontSize: 15.5,
  color: brand.navy,
  border: '1.5px solid transparent',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': { bgcolor: '#EDF0F6' },
  '&.Mui-focused': { bgcolor: '#fff', borderColor: brand.primary },
  '& input, & textarea': {
    fontSize: 15.5,
    '&::placeholder': { color: '#98A2B3', opacity: 1 },
  },
};

const selectSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F2F4F8',
    borderRadius: 2,
    fontSize: 15.5,
    transition: 'border-color 120ms ease, background-color 120ms ease',
    '& fieldset': { borderColor: 'transparent' },
    '&:hover': { bgcolor: '#EDF0F6' },
    '&:hover fieldset': { borderColor: 'transparent' },
    '&.Mui-focused': { bgcolor: '#fff' },
    '&.Mui-focused fieldset': { borderColor: brand.primary, borderWidth: 2 },
  },
  '& .MuiSelect-select': { py: 1.2 },
};

const labelSx = { fontSize: 12.5, fontWeight: 700, color: brand.muted || 'rgba(19,33,61,0.55)', mb: 0.5 };

export default function RequestEditModal({ open, onClose, assessment, onSuccess }) {
  const toast = useTpToast();
  const [reasonType, setReasonType] = useState(REASONS[0]);
  const [explanation, setExplanation] = useState('');
  const [rows, setRows] = useState([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [students, setStudents] = useState([]);
  const [marksByStudent, setMarksByStudent] = useState({});
  const [maxMark, setMaxMark] = useState(100);
  const [formError, setFormError] = useState(null);

  const resetForm = useCallback(() => {
    setReasonType(REASONS[0]);
    setExplanation('');
    setRows([newRow()]);
    setFormError(null);
  }, []);

  useEffect(() => {
    if (!open || !assessment?.id) return;
    resetForm();
    let cancelled = false;
    setLoadingRoster(true);
    (async () => {
      try {
        let classId = assessment.class_id || assessment.classId;
        let className = assessment.class_name || assessment.className;
        let academicYear = assessment.academic_year || assessment.academicYear;
        let max = Number(assessment.max_mark ?? assessment.maxMark ?? 100);

        try {
          const detail = await fetchAssessment(assessment.id);
          classId = classId || detail?.classId || detail?.class?.id;
          className = className || (detail?.class ? [detail.class.name, detail.class.stream].filter(Boolean).join(' ') : '');
          academicYear = academicYear || detail?.academicYear;
          max = Number(detail?.maxMark ?? max);
        } catch {
          /* use props */
        }

        const marksPayload = await fetchAssessmentMarks(assessment.id).catch(() => null);
        const marksList = Array.isArray(marksPayload?.marks)
          ? marksPayload.marks
          : Array.isArray(marksPayload)
            ? marksPayload
            : [];
        const scoreMap = {};
        for (const m of marksList) {
          if (m.studentId != null && m.score != null) scoreMap[m.studentId] = Number(m.score);
        }

        let roster = [];
        if (classId || className) {
          try {
            roster = await fetchClassStudents(classId || className, className, academicYear);
          } catch {
            roster = [];
          }
        }

        if (!roster.length && marksList.length) {
          roster = marksList
            .filter((m) => m.student)
            .map((m) => ({
              id: m.studentId,
              fullName: `${m.student.firstName || ''} ${m.student.lastName || ''}`.trim(),
              studentCode: m.student.studentUid,
            }));
        }

        if (!cancelled) {
          setStudents(Array.isArray(roster) ? roster : []);
          setMarksByStudent(scoreMap);
          setMaxMark(max);
        }
      } finally {
        if (!cancelled) setLoadingRoster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, assessment, resetForm]);

  const usedStudentIds = useMemo(() => new Set(rows.map((r) => r.studentId).filter(Boolean)), [rows]);

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        label: [s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(), s.studentCode].filter(Boolean).join(' · '),
      })),
    [students],
  );

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onSelectStudent(key, studentId) {
    const current = marksByStudent[studentId];
    updateRow(key, {
      studentId,
      currentScore: current != null ? String(current) : '',
      requestedScore: '',
    });
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  async function handleSubmit() {
    setFormError(null);
    const reason =
      reasonType === 'Other' && explanation.trim()
        ? explanation.trim()
        : `${reasonType}${explanation.trim() ? ` - ${explanation.trim()}` : ''}`;

    const payloadRows = rows.filter((r) => r.studentId);
    if (!payloadRows.length) {
      setFormError('Add at least one student.');
      return;
    }
    for (const r of payloadRows) {
      if (r.requestedScore === '' || r.requestedScore == null) {
        setFormError('Enter the new score for each selected student.');
        return;
      }
      const req = Number(r.requestedScore);
      if (Number.isNaN(req) || req < 0 || req > maxMark) {
        setFormError(`New scores must be between 0 and ${maxMark}.`);
        return;
      }
    }

    setSubmitting(true);
    let ok = 0;
    const errors = [];
    try {
      for (const r of payloadRows) {
        try {
          const res = await requestMarkEdit({
            assessment_id: assessment.id,
            student_id: r.studentId,
            current_score: Number(r.currentScore || marksByStudent[r.studentId] || 0),
            requested_score: Number(r.requestedScore),
            reason,
          });
          if (res?.success === false) errors.push(res?.message || 'Request failed');
          else ok += 1;
        } catch (err) {
          errors.push(err?.response?.data?.message || err?.message || 'Request failed');
        }
      }
      if (ok > 0) {
        toast.success(ok === 1 ? 'Edit request sent' : `${ok} edit requests sent`);
        onSuccess?.();
        onClose();
      }
      if (errors.length) setFormError(errors[0]);
    } finally {
      setSubmitting(false);
    }
  }

  if (!assessment) return null;

  const titleLine = [assessment.title, assessment.subject || assessment.subject_name, assessment.class_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={submitting ? undefined : onClose}
      PaperProps={{
        role: 'dialog',
        'aria-label': 'Request marks edit',
        sx: {
          width: '100%',
          maxWidth: 520,
          mx: 'auto',
          maxHeight: '92dvh',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          bgcolor: '#fff',
          color: brand.navy,
          boxShadow: '0 -12px 40px rgba(0,4,53,0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,2,31,0.55)' } } }}
    >
      {/* Header — drag handle + centred title */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 1.5,
          borderBottom: '1px solid #E5E8EF',
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: 'absolute', top: 6, width: 36, height: 4, borderRadius: 2, bgcolor: '#D5D9E3' }} />
        <Box sx={{ textAlign: 'center', mt: 0.5, px: 5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Request marks edit</Typography>
          {titleLine ? (
            <Typography noWrap sx={{ mt: 0.15, fontSize: 11.5, color: brand.muted || '#64748B', maxWidth: 280 }}>
              {titleLine}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          size="small"
          disabled={submitting}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, pt: 1.75, pb: 2 }}>
        <Box sx={{ mb: 1.75 }}>
          <Typography sx={labelSx}>Reason</Typography>
          <TextField
            select
            fullWidth
            value={reasonType}
            onChange={(e) => setReasonType(e.target.value)}
            sx={selectSx}
          >
            {REASONS.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ mb: 1.75 }}>
          <Typography sx={labelSx}>Notes</Typography>
          <InputBase
            fullWidth
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Optional details"
            multiline
            minRows={2}
            maxRows={5}
            sx={fieldShellSx}
          />
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted || '#64748B' }}>
            Students
          </Typography>
          <ButtonBase
            onClick={addRow}
            disabled={loadingRoster}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              color: brand.navy,
              bgcolor: '#F2F4F8',
              '&:hover': { bgcolor: '#EDF0F6' },
              '&.Mui-disabled': { opacity: 0.45 },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
            Add
          </ButtonBase>
        </Stack>

        {loadingRoster ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 5, color: '#64748B' }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 13.5 }}>Loading class roster…</Typography>
          </Stack>
        ) : students.length === 0 ? (
          <Box
            sx={{
              borderRadius: 2,
              bgcolor: '#FFF8E8',
              border: '1px solid #FDE68A',
              px: 1.5,
              py: 1.25,
              fontSize: 12.5,
              color: '#78350F',
              lineHeight: 1.4,
            }}
          >
            No students found for this class. Open marks entry first or check class linkage.
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {rows.map((row) => (
              <Box
                key={row.key}
                sx={{
                  borderRadius: 2,
                  bgcolor: '#F8F9FC',
                  p: 1.5,
                  display: 'grid',
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography sx={{ ...labelSx, mb: 0.4 }}>Student</Typography>
                  <TextField
                    select
                    fullWidth
                    value={row.studentId}
                    onChange={(e) => onSelectStudent(row.key, e.target.value)}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select student</MenuItem>
                    {studentOptions.map((opt) => (
                      <MenuItem
                        key={opt.id}
                        value={opt.id}
                        disabled={usedStudentIds.has(opt.id) && opt.id !== row.studentId}
                      >
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, alignItems: 'end' }}>
                  <Box>
                    <Typography sx={{ ...labelSx, mb: 0.4 }}>Current</Typography>
                    <InputBase
                      fullWidth
                      type="number"
                      value={row.currentScore}
                      readOnly
                      inputProps={{ min: 0, max: maxMark }}
                      sx={{
                        ...fieldShellSx,
                        fontVariantNumeric: 'tabular-nums',
                        opacity: 0.85,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={{ ...labelSx, mb: 0.4 }}>New / {maxMark}</Typography>
                    <InputBase
                      fullWidth
                      type="number"
                      value={row.requestedScore}
                      onChange={(e) => updateRow(row.key, { requestedScore: e.target.value })}
                      placeholder="0"
                      inputProps={{ min: 0, max: maxMark }}
                      sx={{ ...fieldShellSx, fontVariantNumeric: 'tabular-nums' }}
                    />
                  </Box>
                  <IconButton
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length <= 1}
                    aria-label="Remove row"
                    size="small"
                    sx={{
                      mb: 0.25,
                      color: '#94A3B8',
                      '&:hover': { bgcolor: '#FEF2F2', color: '#DC2626' },
                      '&.Mui-disabled': { opacity: 0.3 },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Pinned footer CTA */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: '1px solid #E5E8EF',
          p: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {formError ? (
          <Typography role="alert" sx={{ mb: 1.25, fontSize: 12.5, fontWeight: 600, color: brand.danger || '#DC2626', textAlign: 'center' }}>
            {formError}
          </Typography>
        ) : null}
        <Button
          fullWidth
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting || loadingRoster}
          sx={{
            height: 48,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 800,
            fontSize: 15,
            bgcolor: brand.navy,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(19,33,61,0.22)',
            '&:hover': { bgcolor: '#1B2D52' },
            '&.Mui-disabled': { bgcolor: 'rgba(19,33,61,0.35)', color: 'rgba(255,255,255,0.8)' },
          }}
        >
          {submitting ? 'Sending…' : 'Submit request'}
        </Button>
      </Box>
    </Drawer>
  );
}
