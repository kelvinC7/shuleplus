import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import Alert from '@mui/material/Alert';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import useTpAcademic from '../hooks/useTpAcademic';
import {
  createAssessment,
  fetchAssessmentTemplates,
  fetchMyClasses,
  fetchMyCourses,
  tpApiError,
} from '../services/teacherPortalApi';
import { activeTemplateComponents, templateMatchesClass } from '../utils/assessmentTemplateMatch.js';
import {
  ASSESSMENT_CATEGORY_OPTIONS,
  CAT_ALLOCATION_OPTIONS,
  componentClassification,
  guessCategoryFromName,
  stageForCategory,
} from '../utils/assessmentCategory.js';
import { brand } from '../theme/theme';

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function assignmentKey(a) {
  return `${a.subjectName}::${a.classLabel || a.className}`;
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

/**
 * Bottom-sheet create form (same shell as Request edit / action-plan FormSheet).
 */
export default function CreateAssessmentSheet({
  open,
  onClose,
  onCreated,
  preset = null,
}) {
  const { term, academicYear, ready } = useTpAcademic();
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    courseKey: '',
    templateId: '',
    componentId: '',
    assessmentCategory: '',
    catAllocationStage: 'MID_TERM',
    maxMark: '20',
    assessmentDate: new Date().toISOString().split('T')[0],
    duration: '',
    description: '',
    academicYear: '',
    term: '',
  });

  const resetForm = useCallback(() => {
    setError(null);
    setForm({
      title: '',
      courseKey: '',
      templateId: '',
      componentId: '',
      maxMark: '20',
      assessmentDate: new Date().toISOString().split('T')[0],
      duration: '',
      description: '',
      academicYear: academicYear || '',
      term: term || '',
    });
  }, [academicYear, term]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (academicYear) setForm((p) => ({ ...p, academicYear: p.academicYear || academicYear }));
    if (term) setForm((p) => ({ ...p, term: p.term || term }));
  }, [academicYear, term]);

  const load = useCallback(async () => {
    if (!ready || !open) return;
    setLoading(true);
    try {
      const [courseResp, classResp, tmpl] = await Promise.all([
        fetchMyCourses({
          academicYear: form.academicYear || academicYear || undefined,
          term: form.term || term || undefined,
        }).catch(() => null),
        fetchMyClasses({
          academicYear: form.academicYear || academicYear || undefined,
          term: form.term || term || undefined,
        }).catch(() => null),
        fetchAssessmentTemplates({
          academicYear: form.academicYear || academicYear || undefined,
          term: form.term || term || undefined,
        }).catch(() => []),
      ]);
      const assignments = courseResp?.assignments ?? [];
      setCourses(assignments);
      setClasses(classResp?.classes ?? []);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);

      const qSubject = preset?.subject || '';
      const qClassId = preset?.classId || '';
      const qClassName = preset?.className || '';
      const match = assignments.find((a) => {
        if (qClassId && a.classId === qClassId && (!qSubject || normalize(a.subjectName) === normalize(qSubject))) return true;
        if (qSubject && qClassName) {
          return (
            normalize(a.subjectName) === normalize(qSubject) &&
            (normalize(a.classLabel || a.className) === normalize(qClassName) || normalize(a.className) === normalize(qClassName))
          );
        }
        return false;
      });
      if (match) setForm((p) => ({ ...p, courseKey: p.courseKey || assignmentKey(match) }));
    } finally {
      setLoading(false);
    }
  }, [ready, open, form.academicYear, form.term, academicYear, term, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCourse = useMemo(
    () => courses.find((c) => assignmentKey(c) === form.courseKey) ?? null,
    [courses, form.courseKey],
  );
  const resolvedClass = useMemo(() => {
    if (!selectedCourse) return null;
    if (selectedCourse.classId) {
      const byId = classes.find((c) => c.id === selectedCourse.classId);
      if (byId) return byId;
    }
    const wanted = normalize(selectedCourse.classLabel || selectedCourse.className);
    return classes.find((c) => normalize(c.label) === wanted || normalize(c.name) === wanted) ?? null;
  }, [selectedCourse, classes]);
  const classTemplates = useMemo(
    () => templates.filter((t) => templateMatchesClass(t, resolvedClass, form.term)),
    [templates, resolvedClass, form.term],
  );
  const selectedTemplate = classTemplates.find((t) => t.id === form.templateId);
  const selectedComponents = useMemo(() => activeTemplateComponents(selectedTemplate), [selectedTemplate]);
  const selectedComponentObj = selectedComponents.find((c) => c.id === form.componentId) ?? null;
  const componentLocked = componentClassification(selectedComponentObj).locked;

  function updateField(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!selectedCourse) {
      setError('Select an assigned course from your timetable');
      return;
    }
    const classId = selectedCourse.classId || resolvedClass?.id;
    const className = resolvedClass?.label || selectedCourse.classLabel || selectedCourse.className;
    if (!classId && !className) {
      setError('This course is not linked to a Student Management class yet');
      return;
    }
    if (!form.assessmentCategory) {
      setError('Select assessment category (Beginning Test, CAT/Continuous, Mid-Term Test, or End-of-Term Exam)');
      return;
    }
    if (form.assessmentCategory === 'CAT_CONTINUOUS' && !form.catAllocationStage) {
      setError('Select CAT reporting allocation to avoid double counting');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAssessment({
        title: form.title.trim(),
        subjectName: selectedCourse.subjectName,
        classId: classId || className,
        className,
        templateId: form.templateId || undefined,
        componentId: form.componentId || undefined,
        maxMark: parseFloat(form.maxMark) || 20,
        assessmentDate: form.assessmentDate || undefined,
        duration: form.duration || undefined,
        description: form.description || undefined,
        academicYear: form.academicYear,
        term: form.term,
        assessmentCategory: form.assessmentCategory,
        reportingStage: stageForCategory(form.assessmentCategory, form.catAllocationStage),
        catAllocationStage: form.assessmentCategory === 'CAT_CONTINUOUS' ? form.catAllocationStage : undefined,
      });
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(tpApiError(err, 'Failed to create assessment'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        role: 'dialog',
        'aria-label': 'Create assessment',
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
        <Typography sx={{ fontSize: 14, fontWeight: 800, mt: 0.5 }}>Create assessment</Typography>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          size="small"
          disabled={saving}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, pt: 1.75, pb: 2 }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6, color: '#64748B' }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 13.5 }}>Loading courses…</Typography>
          </Stack>
        ) : (
          <>
            {courses.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 1.75, borderRadius: 2 }}>
                No timetable courses for this period. Ask Timetable admin to assign you a subject and class.
              </Alert>
            ) : null}

            <Box sx={{ mb: 1.75 }}>
              <Typography sx={labelSx}>Assigned course *</Typography>
              <TextField
                select
                fullWidth
                value={form.courseKey}
                onChange={(e) => updateField('courseKey', e.target.value)}
                sx={selectSx}
              >
                <MenuItem value="">Select subject and class…</MenuItem>
                {courses.map((c) => (
                  <MenuItem key={assignmentKey(c)} value={assignmentKey(c)}>
                    {c.subjectName} · {c.classLabel || c.className}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ mb: 1.75 }}>
              <Typography sx={labelSx}>Title *</Typography>
              <InputBase
                fullWidth
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={
                  selectedCourse
                    ? `e.g. Mid-term ${selectedCourse.subjectName}`
                    : 'e.g. Mid-Term Exam Mathematics'
                }
                sx={fieldShellSx}
              />
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 0.25 }}>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Template</Typography>
                <TextField
                  select
                  fullWidth
                  value={form.templateId}
                  onChange={(e) => {
                    updateField('templateId', e.target.value);
                    updateField('componentId', '');
                  }}
                  disabled={!resolvedClass}
                  sx={selectSx}
                >
                  <MenuItem value="">
                    {!resolvedClass
                      ? 'Select course first…'
                      : classTemplates.length
                        ? 'None'
                        : 'No template for this class'}
                  </MenuItem>
                  {classTemplates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {selectedComponents.length > 0 ? (
                <Box sx={{ mb: 1.75 }}>
                  <Typography sx={labelSx}>Component</Typography>
                  <TextField
                    select
                    fullWidth
                    value={form.componentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const comp = selectedComponents.find((c) => c.id === id);
                      const cls = componentClassification(comp);
                      setForm((p) => {
                        if (cls.locked) {
                          return { ...p, componentId: id, assessmentCategory: cls.category, catAllocationStage: cls.stage };
                        }
                        if (!id) return { ...p, componentId: '', assessmentCategory: '' };
                        const guess = guessCategoryFromName(comp?.name, comp?.code);
                        return {
                          ...p,
                          componentId: id,
                          assessmentCategory: guess || p.assessmentCategory,
                          catAllocationStage: guess ? stageForCategory(guess, p.catAllocationStage) : p.catAllocationStage,
                        };
                      });
                    }}
                    sx={selectSx}
                  >
                    <MenuItem value="">Select component…</MenuItem>
                    {selectedComponents.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name || c.label}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              ) : null}
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 0.25 }}>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Assessment category *</Typography>
                <TextField
                  select
                  fullWidth
                  value={form.assessmentCategory}
                  disabled={componentLocked}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((p) => ({
                      ...p,
                      assessmentCategory: value,
                      catAllocationStage:
                        value === 'BEGINNING_TEST'
                          ? 'BEGINNING_TERM'
                          : value === 'MIDTERM_TEST'
                            ? 'MID_TERM'
                            : value === 'END_OF_TERM_EXAM'
                              ? 'TERM_FINAL'
                              : p.catAllocationStage || 'MID_TERM',
                    }));
                  }}
                  sx={selectSx}
                >
                  <MenuItem value="">Select reporting category…</MenuItem>
                  {ASSESSMENT_CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>
                  Reporting allocation {form.assessmentCategory === 'CAT_CONTINUOUS' ? '*' : ''}
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={form.catAllocationStage}
                  disabled={form.assessmentCategory !== 'CAT_CONTINUOUS' || componentLocked}
                  onChange={(e) => updateField('catAllocationStage', e.target.value)}
                  sx={selectSx}
                >
                  {CAT_ALLOCATION_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <Typography sx={{ mt: 0.75, fontSize: 11.5, color: brand.muted || '#64748B' }}>
                  {form.assessmentCategory === 'CAT_CONTINUOUS'
                    ? 'Required for CATs to prevent the same assessment being counted twice.'
                    : form.assessmentCategory === 'BEGINNING_TEST'
                      ? 'Automatically allocated to Beginning Term report.'
                      : form.assessmentCategory === 'MIDTERM_TEST'
                        ? 'Automatically allocated to Mid-Term report.'
                        : form.assessmentCategory === 'END_OF_TERM_EXAM'
                          ? 'Automatically allocated to Termly/End-of-Term report.'
                          : 'Choose a category to set reporting allocation.'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '1fr 1fr', mb: 0.25 }}>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Max mark</Typography>
                <InputBase
                  fullWidth
                  type="number"
                  value={form.maxMark}
                  onChange={(e) => updateField('maxMark', e.target.value)}
                  inputProps={{ min: 1 }}
                  sx={{ ...fieldShellSx, fontVariantNumeric: 'tabular-nums' }}
                />
              </Box>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Date</Typography>
                <InputBase
                  fullWidth
                  type="date"
                  value={form.assessmentDate}
                  onChange={(e) => updateField('assessmentDate', e.target.value)}
                  sx={fieldShellSx}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '1fr 1fr', mb: 0.25 }}>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Year</Typography>
                <InputBase
                  fullWidth
                  value={form.academicYear}
                  onChange={(e) => updateField('academicYear', e.target.value)}
                  sx={fieldShellSx}
                />
              </Box>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Term</Typography>
                <InputBase
                  fullWidth
                  value={form.term}
                  onChange={(e) => updateField('term', e.target.value)}
                  sx={fieldShellSx}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 1.75 }}>
              <Typography sx={labelSx}>Duration (optional)</Typography>
              <InputBase
                fullWidth
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="e.g. 60 min"
                sx={fieldShellSx}
              />
            </Box>

            <Box sx={{ mb: 0.5 }}>
              <Typography sx={labelSx}>Description (optional)</Typography>
              <InputBase
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Notes for this assessment"
                sx={fieldShellSx}
              />
            </Box>
          </>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          borderTop: '1px solid #E5E8EF',
          p: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {error ? (
          <Typography
            role="alert"
            sx={{ mb: 1.25, fontSize: 12.5, fontWeight: 600, color: brand.danger || '#DC2626', textAlign: 'center' }}
          >
            {error}
          </Typography>
        ) : null}
        <Button
          fullWidth
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || loading || courses.length === 0}
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
          {saving ? 'Creating…' : 'Create assessment'}
        </Button>
      </Box>
    </Drawer>
  );
}
