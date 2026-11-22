import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  fetchBookTree,
  fetchClassRosterSummary,
  fetchCurriculumCatalog,
  fetchLessonPlanningContext,
  generateLessonPlan,
} from '../../services/lessonPlanningApi';
import { booksForAssignment, extractGradeFromClass, subjectsMatch } from '../../utils/curriculumMatch';
import { brand } from '../../theme/theme';

const STEPS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'class', label: 'Class' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'notes', label: 'Notes' },
];

const fieldShellSx = {
  bgcolor: '#F2F4F8',
  borderRadius: 2,
  px: 1.75,
  py: 1,
  fontSize: 15.5,
  color: brand.navy,
  border: '1.5px solid transparent',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  width: '100%',
  '&:hover': { bgcolor: '#EDF0F6' },
  '&.Mui-focused': { bgcolor: '#fff', borderColor: brand.primary },
  '& input, & textarea, & select': {
    fontSize: 15.5,
    fontFamily: 'inherit',
    color: brand.navy,
    '&::placeholder': { color: '#98A2B3', opacity: 1 },
  },
};

const selectSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F2F4F8',
    borderRadius: 2,
    fontSize: 15,
    transition: 'border-color 120ms ease, background-color 120ms ease',
    '& fieldset': { borderColor: 'transparent' },
    '&:hover': { bgcolor: '#EDF0F6' },
    '&:hover fieldset': { borderColor: 'transparent' },
    '&.Mui-focused': { bgcolor: '#fff' },
    '&.Mui-focused fieldset': { borderColor: brand.primary, borderWidth: 2 },
  },
  '& .MuiSelect-select': { py: 1.15 },
};

const inputSx = { ...fieldShellSx, minHeight: 44 };

/** MUI select styled like the Request-edit modal */
function SelectField({ value, onChange, disabled, children }) {
  return (
    <TextField
      select
      fullWidth
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      sx={selectSx}
      SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
    >
      {children}
    </TextField>
  );
}

function Field({ label, children }) {
  return (
    <Box sx={{ display: 'block', mb: 0.25 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted || '#64748B', mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function StatPill({ label, value }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 500, color: '#94A3B8' }}>{label}</Typography>
      <Typography sx={{ mt: 0.25, fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>
        {value !== '' && value != null ? value : '-'}
      </Typography>
    </Box>
  );
}

export default function GenerateLessonPlanModal({ open, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);
  const [catalog, setCatalog] = useState({ books: [] });
  const [tree, setTree] = useState(null);
  const [assignmentKey, setAssignmentKey] = useState('');
  const [bookId, setBookId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [sessionDuration, setSessionDuration] = useState(null);
  const [form, setForm] = useState({
    academicYear: '',
    term: '',
    lessonDate: '',
    durationMinutes: 40,
    maleLearners: '',
    femaleLearners: '',
    classSize: '',
    language: 'English',
    sen: '',
  });

  useEffect(() => {
    if (!open) return undefined;
    setStep(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const ctx = await fetchLessonPlanningContext();
        if (cancelled) return;
        setContext(ctx);
        const first = ctx.assignments?.[0];
        const cat = await fetchCurriculumCatalog({
          subject: first?.subjectName,
          grade: extractGradeFromClass(first?.className) || first?.className,
        });
        if (cancelled) return;
        setCatalog(cat);
        const key = first ? `${first.subjectName}|${first.className}` : '';
        setAssignmentKey(key);
        setSessionDuration(ctx.sessionDuration?.source === 'timetable' ? ctx.sessionDuration : null);
        setForm((f) => ({
          ...f,
          academicYear: ctx.academicYear || f.academicYear,
          term: ctx.term || f.term,
          lessonDate: ctx.lessonDate || f.lessonDate,
          durationMinutes: ctx.sessionDuration?.durationMinutes || ctx.defaultDurationMinutes || 40,
        }));
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load teacher context');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const assignment = useMemo(() => {
    const list = context?.assignments || [];
    if (!assignmentKey) return list[0] || null;
    const [subjectName, className] = assignmentKey.split('|');
    return list.find((a) => a.subjectName === subjectName && a.className === className) || list[0] || null;
  }, [context, assignmentKey]);

  useEffect(() => {
    if (!assignment || !open || !form.lessonDate) return;
    let cancelled = false;
    (async () => {
      try {
        const ctx = await fetchLessonPlanningContext({
          date: form.lessonDate,
          academicYear: form.academicYear,
          term: form.term,
          subjectName: assignment.subjectName,
          className: assignment.className,
        });
        if (cancelled) return;
        setSessionDuration(ctx.sessionDuration?.source === 'timetable' ? ctx.sessionDuration : null);
        setForm((f) => ({
          ...f,
          durationMinutes:
            ctx.sessionDuration?.durationMinutes ?? ctx.defaultDurationMinutes ?? f.durationMinutes,
        }));
      } catch {
        /* keep current duration */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, open, form.lessonDate, form.academicYear, form.term]);

  useEffect(() => {
    if (!assignment || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const summary = await fetchClassRosterSummary({
          classId: assignment.classId,
          className: assignment.className,
          academicYear: form.academicYear,
        });
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          maleLearners: summary.male ?? '',
          femaleLearners: summary.female ?? '',
          classSize: summary.classSize ?? summary.total ?? '',
        }));
      } catch {
        /* roster optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, open, context, form.academicYear]);

  useEffect(() => {
    if (!open || !assignment) return;
    let cancelled = false;
    (async () => {
      try {
        const cat = await fetchCurriculumCatalog({
          subject: assignment.subjectName,
          grade: extractGradeFromClass(assignment.className) || assignment.className,
        });
        if (!cancelled) setCatalog(cat);
      } catch {
        /* keep previous catalog */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, open]);

  const filteredBooks = useMemo(
    () => booksForAssignment(catalog.books, assignment),
    [catalog.books, assignment]
  );

  const recommendedBook = useMemo(() => {
    if (!filteredBooks.length || !assignment) return null;
    return filteredBooks.find((b) => subjectsMatch(b.subject, assignment.subjectName)) || filteredBooks[0];
  }, [filteredBooks, assignment]);

  useEffect(() => {
    if (!filteredBooks.length) {
      setBookId('');
      setTree(null);
      setUnitId('');
      setLessonId('');
      return;
    }
    const pick = recommendedBook || filteredBooks[0];
    setBookId((current) => {
      if (current && filteredBooks.some((b) => b.id === current)) return current;
      return pick?.id || '';
    });
  }, [filteredBooks, recommendedBook]);

  useEffect(() => {
    if (!bookId || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchBookTree(bookId);
        if (cancelled) return;
        setTree(t);
        const u = t.units?.[0];
        setUnitId(u?.id || '');
        setLessonId(u?.lessons?.[0]?.id || '');
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load curriculum tree');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, open]);

  const selectedUnit = tree?.units?.find((u) => u.id === unitId);
  const lessons = selectedUnit?.lessons || [];

  useEffect(() => {
    if (!bookId || !lessons.length) {
      if (!lessons.length && unitId) setLessonId('');
      return;
    }
    if (!lessons.some((l) => l.id === lessonId)) {
      setLessonId(lessons[0].id);
    }
  }, [bookId, unitId, lessons, lessonId]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(form.academicYear && form.term && form.lessonDate);
    if (step === 1) return Boolean(assignment && (context?.assignments?.length || 0) > 0);
    if (step === 2) return Boolean(bookId && unitId && lessonId);
    return true;
  }, [step, form, assignment, context, bookId, unitId, lessonId]);

  const onSubmit = async () => {
    if (!lessonId) {
      setError('Select unit and lesson from approved curriculum');
      setStep(2);
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result = await generateLessonPlan({
        curriculumLessonId: lessonId,
        durationMinutes: Number(form.durationMinutes),
        classSize: form.classSize ? Number(form.classSize) : undefined,
        maleLearners: form.maleLearners !== '' ? Number(form.maleLearners) : undefined,
        femaleLearners: form.femaleLearners !== '' ? Number(form.femaleLearners) : undefined,
        language: form.language,
        termLabel: form.term,
        academicYear: form.academicYear,
        subjectLabel: assignment?.subjectName,
        gradeLabel: assignment?.className,
        className: assignment?.className,
        lessonDate: form.lessonDate,
        specialEducationalNeeds: form.sen || undefined,
      });
      onClose?.();
      navigate(`/lesson-plans/${result?.plan?.id}`);
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const durationLabel =
    sessionDuration?.source === 'timetable'
      ? `Duration - ${sessionDuration.periodCount} ${sessionDuration.periodCount === 1 ? 'period' : 'periods'}${sessionDuration.startTime ? ` - ${sessionDuration.startTime}` : ''}`
      : 'Duration (minutes)';

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={generating ? undefined : onClose}
      PaperProps={{
        role: 'dialog',
        'aria-labelledby': 'generate-lesson-plan-title',
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
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: brand.muted }}>
              Step {step + 1} of {STEPS.length}
            </Typography>
            <Typography id="generate-lesson-plan-title" sx={{ fontSize: 14, fontWeight: 800 }}>
              {STEPS[step].label}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            size="small"
            disabled={generating}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, pt: 1.75, pb: 2 }}>
          <Box sx={{ width: '100%' }}>
            {error ? (
              <Box sx={{ mb: 2, borderRadius: 1, border: '1px solid #FECACA', bgcolor: '#FEF2F2', px: 1.5, py: 1.25, fontSize: 14, color: '#991B1B' }}>{error}</Box>
            ) : null}

            {loading ? (
              <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8 }}>
                <CircularProgress size={36} sx={{ color: brand.navy }} />
                <Typography sx={{ fontSize: 14, color: '#64748B' }}>Loading...</Typography>
              </Stack>
            ) : (
              <>
                {step === 0 ? (
                  <Box>
                    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                      <Field label="Academic year">
                        <SelectField value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
                          {(context?.academicYears || [form.academicYear]).map((y) => (
                            <MenuItem key={y} value={y}>{y}</MenuItem>
                          ))}
                        </SelectField>
                      </Field>
                      <Field label="Term">
                        <SelectField value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                          {(context?.terms || ['Term 1', 'Term 2', 'Term 3']).map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                          ))}
                        </SelectField>
                      </Field>
                    </Box>
                    <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                      <Field label="Lesson date">
                        <InputBase fullWidth type="date" sx={inputSx} value={form.lessonDate} onChange={(e) => setForm({ ...form, lessonDate: e.target.value })} />
                      </Field>
                      <Field label="Language">
                        <SelectField value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                          <MenuItem value="English">English</MenuItem>
                          <MenuItem value="Kinyarwanda">Kinyarwanda</MenuItem>
                          <MenuItem value="French">French</MenuItem>
                        </SelectField>
                      </Field>
                    </Box>
                  </Box>
                ) : null}

                {step === 1 ? (
                  <Box>
                    {(context?.assignments || []).length === 0 ? (
                      <Typography sx={{ fontSize: 14, color: '#475569' }}>No courses linked. Set up your timetable first.</Typography>
                    ) : (
                      <Field label="Course & class">
                        <SelectField value={assignmentKey} onChange={(e) => setAssignmentKey(e.target.value)}>
                          {(context?.assignments || []).map((a) => {
                            const key = `${a.subjectName}|${a.className}`;
                            return (
                              <MenuItem key={key} value={key}>
                                {a.subjectName} · {a.classLabel || a.className}{a.room ? ` · ${a.room}` : ''}
                              </MenuItem>
                            );
                          })}
                        </SelectField>
                      </Field>
                    )}

                    <Box sx={{ mt: 1.5 }}>
                      <Field label={durationLabel}>
                        <InputBase
                          fullWidth
                          type="number"
                          readOnly={sessionDuration?.source === 'timetable'}
                          inputProps={{ inputMode: 'numeric', min: 20, max: 240 }}
                          sx={{ ...inputSx, fontVariantNumeric: 'tabular-nums', ...(sessionDuration?.source === 'timetable' ? { opacity: 0.85, cursor: 'default' } : {}) }}
                          value={form.durationMinutes}
                          onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                        />
                      </Field>
                    </Box>

                    <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                      <StatPill label="Male" value={form.maleLearners} />
                      <StatPill label="Female" value={form.femaleLearners} />
                      <StatPill label="Total" value={form.classSize} />
                    </Box>
                  </Box>
                ) : null}

                {step === 2 ? (
                  <Box>
                    {recommendedBook && assignment && !subjectsMatch(recommendedBook.subject, assignment.subjectName) ? (
                      <Box sx={{ mb: 1.5, borderRadius: 1, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', px: 1.5, py: 1, fontSize: 12, color: '#475569' }}>
                        Using guide <b>{recommendedBook.subject}</b> ({recommendedBook.grade}) for <b>{assignment.subjectName}</b>.
                      </Box>
                    ) : null}
                    <Field label="Teacher's guide">
                      <SelectField value={bookId} onChange={(e) => setBookId(e.target.value)} disabled={!filteredBooks.length}>
                        {filteredBooks.length === 0 ? (
                          <MenuItem value="">No published guide for {assignment?.subjectName || 'this subject'}</MenuItem>
                        ) : null}
                        {filteredBooks.map((b) => (
                          <MenuItem key={b.id} value={b.id}>{b.subject} · {b.grade} · {b.title}</MenuItem>
                        ))}
                      </SelectField>
                    </Field>
                    <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                      <Field label="Unit">
                        <SelectField
                          value={unitId}
                          disabled={!bookId || !(tree?.units?.length)}
                          onChange={(e) => {
                            setUnitId(e.target.value);
                            const u = tree?.units?.find((x) => x.id === e.target.value);
                            setLessonId(u?.lessons?.[0]?.id || '');
                          }}
                        >
                          {!bookId ? <MenuItem value="">Select a guide first</MenuItem> : null}
                          {(tree?.units || []).map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              Unit {u.unitNumber} · {u.title.slice(0, 40)}{u.title.length > 40 ? '...' : ''}
                            </MenuItem>
                          ))}
                        </SelectField>
                      </Field>
                      <Field label="Lesson">
                        <SelectField value={lessonId} disabled={!unitId || !lessons.length} onChange={(e) => setLessonId(e.target.value)}>
                          {!unitId ? <MenuItem value="">Select a unit first</MenuItem> : null}
                          {lessons.map((l) => (
                            <MenuItem key={l.id} value={l.id}>
                              {l.lessonNumber ? `${l.lessonNumber} · ` : ''}{l.title.slice(0, 36)}{l.title.length > 36 ? '...' : ''}
                            </MenuItem>
                          ))}
                        </SelectField>
                      </Field>
                    </Box>
                  </Box>
                ) : null}

                {step === 3 ? (
                  <Box>
                    <Field label="Differentiation / SEN (optional)">
                      <InputBase
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={8}
                        sx={inputSx}
                        placeholder="Optional notes for this class"
                        value={form.sen}
                        onChange={(e) => setForm({ ...form, sen: e.target.value })}
                      />
                    </Field>
                  </Box>
                ) : null}
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            borderTop: '1px solid #E5E8EF',
            p: 1.5,
            pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Stack direction="row" spacing={1}>
            {step > 0 ? (
              <Button
                type="button"
                disabled={generating}
                onClick={() => setStep((s) => s - 1)}
                startIcon={<ChevronLeftIcon sx={{ fontSize: 18 }} />}
                sx={{
                  height: 48,
                  flex: 1,
                  borderRadius: 999,
                  border: '1px solid #E5E8EF',
                  bgcolor: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  color: brand.navy,
                  textTransform: 'none',
                }}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onClose}
                sx={{
                  height: 48,
                  flex: 1,
                  borderRadius: 999,
                  border: '1px solid #E5E8EF',
                  bgcolor: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  color: brand.navy,
                  textTransform: 'none',
                }}
              >
                Cancel
              </Button>
            )}

            {isLast ? (
              <Button
                type="button"
                disabled={generating || loading || !lessonId}
                onClick={() => void onSubmit()}
                startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
                sx={{
                  height: 48,
                  flex: 1.35,
                  borderRadius: 999,
                  bgcolor: brand.navy,
                  color: '#fff !important',
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: 'none',
                  boxShadow: '0 8px 20px rgba(19,33,61,0.22)',
                  '&:hover': { bgcolor: '#1B2D52' },
                  '&.Mui-disabled': { bgcolor: 'rgba(19,33,61,0.35)', color: 'rgba(255,255,255,0.8)' },
                }}
              >
                Generate plan
              </Button>
            ) : (
              <Button
                type="button"
                disabled={loading || !canNext}
                onClick={() => {
                  setError('');
                  setStep((s) => Math.min(s + 1, STEPS.length - 1));
                }}
                endIcon={<ChevronRightIcon sx={{ fontSize: 18 }} />}
                sx={{
                  height: 48,
                  flex: 1.35,
                  borderRadius: 999,
                  bgcolor: brand.navy,
                  color: '#fff !important',
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: 'none',
                  boxShadow: '0 8px 20px rgba(19,33,61,0.22)',
                  '&:hover': { bgcolor: '#1B2D52' },
                  '&.Mui-disabled': { bgcolor: 'rgba(19,33,61,0.35)', color: 'rgba(255,255,255,0.8)' },
                }}
              >
                Continue
              </Button>
            )}
          </Stack>
        </Box>
    </Drawer>
  );
}
