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
import useTpAcademic from '../../hooks/useTpAcademic';
import {
  createAssessment,
  fetchAssessmentTemplates,
  fetchMyClasses,
  fetchMyCourses,
  tpApiError,
  updateAssessment,
} from '../../services/teacherPortalApi';
import { activeTemplateComponents, templateMatchesClass } from '../../utils/assessmentTemplateMatch.js';
import {
  ASSESSMENT_CATEGORY_OPTIONS,
  CAT_ALLOCATION_OPTIONS,
  componentClassification,
  guessCategoryFromName,
  stageForCategory,
} from '../../utils/assessmentCategory.js';
import { assessmentMaxMark, mapUiStatus, UI_STATUS } from '../coursesMarks/statusUtils.js';
import { brand } from '../../theme/theme';

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function assignmentKey(a) {
  return `${a.subjectName}::${a.classLabel || a.className}`;
}

function assessmentTitle(a) {
  return a?.title || a?.name || a?.assessmentName || a?.component?.name || 'Assessment';
}

function assessmentClassLabel(a) {
  if (!a) return '';
  if (a.class) return [a.class.name, a.class.stream].filter(Boolean).join(' ');
  return a.className || a.class_name || '';
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

const readOnlySx = {
  ...fieldShellSx,
  bgcolor: '#F8F9FC',
  color: 'rgba(19,33,61,0.72)',
  border: '1.5px dashed #D7DCE7',
  '&:hover': { bgcolor: '#F8F9FC' },
  cursor: 'default',
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
    '&.Mui-disabled': { bgcolor: '#F8F9FC' },
    '&.Mui-disabled fieldset': { borderColor: '#E2E6EF' },
  },
  '& .MuiSelect-select': { py: 1.2 },
};

const labelSx = {
  fontSize: 12.5,
  fontWeight: 700,
  color: brand.muted || 'rgba(19,33,61,0.55)',
  mb: 0.5,
};

const sectionTitleSx = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(19,33,61,0.4)',
  mb: 1.25,
};

function initialForm({ mode, assessment, academicYear, term }) {
  if (mode === 'edit' && assessment) {
    const category = assessment.assessmentCategory || assessment.assessment_category || '';
    const stage = String(assessment.reportingStage || assessment.reporting_stage || '').toUpperCase();
    return {
      title: assessmentTitle(assessment) === 'Assessment' ? '' : assessmentTitle(assessment),
      courseKey: '',
      templateId: assessment.templateId || assessment.template?.id || '',
      componentId: assessment.componentId || assessment.component?.id || '',
      assessmentCategory: category,
      catAllocationStage:
        category === 'CAT_CONTINUOUS' && ['BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL'].includes(stage)
          ? stage
          : 'MID_TERM',
      maxMark: String(assessmentMaxMark(assessment)),
      assessmentDate: String(assessment.assessmentDate || assessment.assessment_date || '').slice(0, 10),
      duration: assessment.duration || '',
      description: assessment.description || '',
      academicYear: assessment.academicYear || assessment.academic_year || academicYear || '',
      term: assessment.term || term || '',
    };
  }
  return {
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
    academicYear: academicYear || '',
    term: term || '',
  };
}

/**
 * Unified assessment bottom sheet — the same fields and inputs for
 * creating and editing, with a mobile-first responsive layout.
 */
export default function AssessmentFormSheet({
  open,
  mode = 'create',
  assessment = null,
  preset = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit' && Boolean(assessment);
  const isDraft = isEdit && String(assessment?.status || '').toUpperCase() === 'DRAFT';
  const { term, academicYear, ready } = useTpAcademic();
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(() =>
    initialForm({ mode, assessment, academicYear: '', term: '' }),
  );

  const assessmentId = assessment?.id || '';

  useEffect(() => {
    if (!open) return;
    setForm(initialForm({ mode, assessment, academicYear, term }));
    setError(null);
    // Reset only when the sheet opens or switches to another assessment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, assessmentId]);

  useEffect(() => {
    if (!open) return;
    setForm((p) => ({
      ...p,
      academicYear: p.academicYear || academicYear || '',
      term: p.term || term || '',
    }));
  }, [open, academicYear, term]);

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

      if (isEdit) return;

      const qSubject = preset?.subject || '';
      const qClassId = preset?.classId || '';
      const qClassName = preset?.className || '';
      const match = assignments.find((a) => {
        if (qClassId && a.classId === qClassId && (!qSubject || normalize(a.subjectName) === normalize(qSubject))) {
          return true;
        }
        if (qSubject && qClassName) {
          return (
            normalize(a.subjectName) === normalize(qSubject) &&
            (normalize(a.classLabel || a.className) === normalize(qClassName) ||
              normalize(a.className) === normalize(qClassName))
          );
        }
        return false;
      });
      if (match) setForm((p) => ({ ...p, courseKey: p.courseKey || assignmentKey(match) }));
    } finally {
      setLoading(false);
    }
  }, [ready, open, isEdit, form.academicYear, form.term, academicYear, term, preset]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCourse = useMemo(
    () => courses.find((c) => assignmentKey(c) === form.courseKey) ?? null,
    [courses, form.courseKey],
  );

  const resolvedClass = useMemo(() => {
    if (isEdit) {
      const wanted = normalize(assessmentClassLabel(assessment));
      const byId = classes.find((c) => c.id === (assessment?.classId || assessment?.class?.id));
      if (byId) return byId;
      return classes.find((c) => normalize(c.label) === wanted || normalize(c.name) === wanted) ?? null;
    }
    if (!selectedCourse) return null;
    if (selectedCourse.classId) {
      const byId = classes.find((c) => c.id === selectedCourse.classId);
      if (byId) return byId;
    }
    const wanted = normalize(selectedCourse.classLabel || selectedCourse.className);
    return classes.find((c) => normalize(c.label) === wanted || normalize(c.name) === wanted) ?? null;
  }, [isEdit, assessment, classes, selectedCourse]);

  const classTemplates = useMemo(() => {
    const list = templates.filter((t) => templateMatchesClass(t, resolvedClass, form.term));
    const current = templates.find((t) => t.id === form.templateId);
    if (current && !list.some((t) => t.id === current.id)) list.unshift(current);
    return list;
  }, [templates, resolvedClass, form.term, form.templateId]);

  const selectedTemplate = classTemplates.find((t) => t.id === form.templateId);
  const selectedComponents = useMemo(() => {
    const list = activeTemplateComponents(selectedTemplate);
    if (isEdit && assessment?.component?.id && !list.some((c) => c.id === assessment.component.id)) {
      list.push(assessment.component);
    }
    return list;
  }, [selectedTemplate, isEdit, assessment]);
  const selectedComponentObj = selectedComponents.find((c) => c.id === form.componentId) ?? null;
  const componentLocked = componentClassification(selectedComponentObj).locked;

  const courseLabel = isEdit
    ? [assessment?.subject?.name || assessment?.subjectName || assessment?.subject_name, assessmentClassLabel(assessment)]
        .filter(Boolean)
        .join(' · ')
    : null;

  const statusLabel = isEdit
    ? (UI_STATUS[mapUiStatus(assessment?.status, assessment?.correction_request)] || {}).label || assessment?.status
    : null;

  function updateField(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required';
    if (!isEdit) {
      if (!selectedCourse) return 'Select an assigned course from your timetable';
      const classId = selectedCourse.classId || resolvedClass?.id;
      const className = resolvedClass?.label || selectedCourse.classLabel || selectedCourse.className;
      if (!classId && !className) return 'This course is not linked to a Student Management class yet';
    }
    if (!form.assessmentCategory) {
      return 'Select assessment category (Beginning Test, CAT/Continuous, Mid-Term Test, or End-of-Term Exam)';
    }
    if (form.assessmentCategory === 'CAT_CONTINUOUS' && !form.catAllocationStage) {
      return 'Select CAT reporting allocation to avoid double counting';
    }
    if (!Number.isFinite(Number(form.maxMark)) || Number(form.maxMark) <= 0) {
      return 'Maximum mark must be greater than 0';
    }
    return null;
  }

  async function handleSave() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const reportingStage = stageForCategory(form.assessmentCategory, form.catAllocationStage);
      const base = {
        title: form.title.trim(),
        maxMark: parseFloat(form.maxMark) || 20,
        description: form.description || undefined,
        assessmentDate: form.assessmentDate || undefined,
        duration: form.duration || undefined,
        assessmentCategory: form.assessmentCategory,
        reportingStage,
      };
      if (form.assessmentCategory === 'CAT_CONTINUOUS') {
        base.catAllocationStage = form.catAllocationStage;
      }

      if (isEdit) {
        const originalTemplateId = assessment?.templateId || assessment?.template?.id || '';
        const originalComponentId = assessment?.componentId || assessment?.component?.id || '';
        if ((form.templateId || '') !== originalTemplateId) base.templateId = form.templateId || null;
        if ((form.componentId || '') !== originalComponentId) base.componentId = form.componentId || null;
        await updateAssessment(assessment.id, base);
      } else {
        const classId = selectedCourse.classId || resolvedClass?.id;
        const className = resolvedClass?.label || selectedCourse.classLabel || selectedCourse.className;
        await createAssessment({
          ...base,
          subjectName: selectedCourse.subjectName,
          classId: classId || className,
          className,
          templateId: form.templateId || undefined,
          componentId: form.componentId || undefined,
          academicYear: form.academicYear,
          term: form.term,
        });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(tpApiError(err, isEdit ? 'Failed to update assessment' : 'Failed to create assessment'));
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
        'aria-label': isEdit ? 'Edit assessment' : 'Create assessment',
        sx: {
          width: '100%',
          maxWidth: 560,
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
          gap: 1,
          py: 1.5,
          px: 2,
          borderBottom: '1px solid #E5E8EF',
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: 'absolute', top: 6, width: 36, height: 4, borderRadius: 2, bgcolor: '#D5D9E3' }} />
        <Typography sx={{ fontSize: 14, fontWeight: 800, mt: 0.5, textAlign: 'center' }}>
          {isEdit ? 'Edit assessment' : 'Create assessment'}
        </Typography>
        {isEdit && statusLabel ? (
          <Box
            component="span"
            sx={{
              mt: 0.5,
              borderRadius: 999,
              bgcolor: '#F1F5F9',
              px: 1,
              py: 0.15,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#475569',
            }}
          >
            {statusLabel}
          </Box>
        ) : null}
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

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          px: { xs: 1.75, sm: 2.5 },
          pt: 2,
          pb: 2,
        }}
      >
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6, color: '#64748B' }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 13.5 }}>Loading assessment settings…</Typography>
          </Stack>
        ) : (
          <>
            {!isEdit && courses.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 1.75, borderRadius: 2 }}>
                No timetable courses for this period. Ask Timetable admin to assign you a subject and class.
              </Alert>
            ) : null}

            {isEdit && assessment?.status === 'DRAFT' ? (
              <Alert severity="info" sx={{ mb: 1.75, borderRadius: 2, py: 0.25 }}>
                Draft — students’ marks stay editable and this assessment is not counted in report cards yet.
              </Alert>
            ) : null}

            <Typography sx={sectionTitleSx}>Course</Typography>

            <Box sx={{ mb: 2 }}>
              <Typography sx={labelSx}>Assigned course {isEdit ? '' : '*'}</Typography>
              {isEdit ? (
                <Box sx={readOnlySx}>{courseLabel || '—'}</Box>
              ) : (
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
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={labelSx}>Title *</Typography>
              <InputBase
                fullWidth
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={
                  selectedCourse
                    ? `e.g. Mid-term ${selectedCourse.subjectName}`
                    : isEdit
                      ? 'e.g. Mid-Term Mathematics'
                      : 'e.g. Mid-Term Exam Mathematics'
                }
                sx={fieldShellSx}
              />
            </Box>

            <Typography sx={sectionTitleSx}>Classification</Typography>

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
                  disabled={!resolvedClass && !isEdit}
                  sx={selectSx}
                >
                  <MenuItem value="">
                    {!resolvedClass && !isEdit
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

            <Typography sx={sectionTitleSx}>Schedule & marks</Typography>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 0.25 }}>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Max mark *</Typography>
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

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 0.25 }}>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Year</Typography>
                <InputBase
                  fullWidth
                  value={form.academicYear}
                  onChange={(e) => updateField('academicYear', e.target.value)}
                  readOnly={isEdit}
                  sx={isEdit ? readOnlySx : fieldShellSx}
                />
              </Box>
              <Box sx={{ mb: 1.75 }}>
                <Typography sx={labelSx}>Term</Typography>
                <InputBase
                  fullWidth
                  value={form.term}
                  onChange={(e) => updateField('term', e.target.value)}
                  readOnly={isEdit}
                  sx={isEdit ? readOnlySx : fieldShellSx}
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
          bgcolor: '#fff',
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
        <Stack direction="row" spacing={1}>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{
              height: 48,
              px: 2.5,
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 14,
              color: 'rgba(19,33,61,0.7)',
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving || loading || (!isEdit && courses.length === 0)}
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
            {saving ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} sx={{ color: '#fff' }} />
                <span>{isEdit ? 'Saving…' : 'Creating…'}</span>
              </Stack>
            ) : isDraft ? (
              'Save draft'
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create assessment'
            )}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
