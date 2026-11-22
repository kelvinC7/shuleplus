import { useEffect, useMemo, useState } from 'react';
import { TP_EMPTY } from '../../utils/tpEmpty';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';
import CircularProgress from '@mui/material/CircularProgress';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { assignmentKey, coursesForClass, newQuestion, uniqueClasses } from './utils';
import { brand } from '../../theme/theme';

const STEPS = ['Details', 'Type & Content', 'Review'];

const TYPE_CARDS = [
  {
    id: 'QUIZ',
    Icon: AssignmentOutlinedIcon,
    title: 'Manual Quiz',
    desc: 'Multiple choice, true/false, short and long answers.',
  },
  {
    id: 'FILE',
    Icon: UploadFileOutlinedIcon,
    title: 'File Assignment',
    desc: 'PDF, DOCX, or image with instructions.',
  },
  {
    id: 'RESOURCE',
    Icon: LinkOutlinedIcon,
    title: 'Online Resource',
    desc: 'Link, video, or external learning resource.',
  },
];

function FieldLabel({ children, required }) {
  return (
    <Typography
      component="label"
      sx={{ display: 'block', mb: 0.5, fontSize: 12.5, fontWeight: 700, color: brand.muted }}
    >
      {children}
      {required ? <Box component="span" sx={{ color: brand.primary }}> *</Box> : null}
    </Typography>
  );
}

function QuestionRow({ question, index, onChange, onDuplicate, onRemove }) {
  const update = (patch) => onChange({ ...question, ...patch });

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: 'rgba(248,250,252,0.8)', p: { xs: 1.5, sm: 2 }, borderColor: 'rgba(0,0,0,0.06)' }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
          Question {index + 1}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={onDuplicate} title="Duplicate" sx={{ color: '#94A3B8', '&:hover': { bgcolor: '#fff', color: '#475569' } }}>
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={onRemove} title="Delete" sx={{ color: '#94A3B8', '&:hover': { bgcolor: '#fff', color: '#EF4444' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Stack>

      <TextField
        select
        fullWidth
        size="small"
        value={question.type}
        onChange={(e) => onChange(newQuestion(e.target.value))}
        sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
      >
        <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
        <MenuItem value="TRUE_FALSE">True / False</MenuItem>
        <MenuItem value="SHORT_ANSWER">Short Answer</MenuItem>
        <MenuItem value="LONG_ANSWER">Long Answer</MenuItem>
      </TextField>

      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        placeholder="Question text…"
        value={question.text}
        onChange={(e) => update({ text: e.target.value })}
        sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
      />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <Typography sx={{ fontSize: 12, color: '#64748B' }}>Points</Typography>
        <TextField
          type="number"
          size="small"
          value={question.points}
          onChange={(e) => update({ points: Number(e.target.value) || 1 })}
          inputProps={{ min: 1 }}
          sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
        />
      </Stack>

      {question.type === 'MULTIPLE_CHOICE' ? (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {(question.options || []).map((opt, oi) => (
            <Stack key={opt.id} direction="row" spacing={1} alignItems="center">
              <ButtonBase
                onClick={() =>
                  update({
                    options: question.options.map((o) => ({ ...o, isCorrect: o.id === opt.id })),
                  })
                }
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: '50%',
                  border: `1px solid ${opt.isCorrect ? '#10B981' : '#E2E8F0'}`,
                  bgcolor: opt.isCorrect ? '#ECFDF5' : '#fff',
                  color: opt.isCorrect ? '#047857' : '#94A3B8',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {String.fromCharCode(65 + oi)}
              </ButtonBase>
              <TextField
                size="small"
                fullWidth
                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                value={opt.text}
                onChange={(e) =>
                  update({
                    options: question.options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                  })
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff' } }}
              />
            </Stack>
          ))}
          <ButtonBase
            onClick={() =>
              update({
                options: [...(question.options || []), { id: crypto.randomUUID(), text: '', isCorrect: false }],
              })
            }
            sx={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, color: '#B26A00' }}
          >
            + Add option
          </ButtonBase>
        </Stack>
      ) : null}

      {question.type === 'TRUE_FALSE' ? (
        <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {[true, false].map((val) => {
            const active = question.correctAnswer === val;
            return (
              <ButtonBase
                key={String(val)}
                onClick={() => update({ correctAnswer: val })}
                sx={{
                  borderRadius: 1.5,
                  border: `1px solid ${active ? '#10B981' : '#E2E8F0'}`,
                  bgcolor: active ? '#ECFDF5' : '#fff',
                  color: active ? '#047857' : '#475569',
                  px: 1.5,
                  py: 1.25,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {val ? 'True' : 'False'}
              </ButtonBase>
            );
          })}
        </Box>
      ) : null}
    </Paper>
  );
}

function defaultForm(academicYear, term) {
  return {
    title: '',
    description: '',
    academicYear: academicYear || '',
    term: term || '',
    className: '',
    classId: null,
    courseName: '',
    homeworkType: 'QUIZ',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    dueTime: '17:00',
    estimatedMinutes: '30',
    maxScore: '20',
    questions: [newQuestion()],
    resourceUrl: '',
    submissionMode: 'SYSTEM',
    fileName: '',
    fileBase64: '',
  };
}

const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff' } };

export default function CreateHomeworkModal({ open, onClose, onSave, saving, academicYear, term, assignments }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => defaultForm(academicYear, term));

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(defaultForm(academicYear, term));
  }, [open, academicYear, term]);

  const classes = useMemo(() => uniqueClasses(assignments), [assignments]);
  const courses = useMemo(() => coursesForClass(assignments, form.className), [assignments, form.className]);
  const totalMarks = useMemo(
    () => (form.homeworkType === 'QUIZ' ? form.questions.reduce((s, q) => s + (Number(q.points) || 0), 0) : Number(form.maxScore) || 0),
    [form]
  );

  function buildPayload(asDraft) {
    let dueDate = null;
    if (form.dueDate) {
      dueDate = new Date(`${form.dueDate}T${form.dueTime || '17:00'}:00`).toISOString();
    }
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      academicYear: form.academicYear,
      term: form.term,
      className: form.className,
      classId: form.classId,
      courseName: form.courseName,
      homeworkType: form.homeworkType,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueDate,
      estimatedMinutes: Number(form.estimatedMinutes) || null,
      maxScore: form.homeworkType === 'QUIZ' ? totalMarks : Number(form.maxScore) || null,
      questions: form.homeworkType === 'QUIZ' ? form.questions : [],
      resourceUrl: form.homeworkType === 'RESOURCE' ? form.resourceUrl : null,
      submissionMode: form.submissionMode,
      fileBase64: form.fileBase64 || undefined,
      fileName: form.fileName || undefined,
      status: asDraft ? 'DRAFT' : undefined,
    };
  }

  async function handleSave(asDraft) {
    await onSave(buildPayload(asDraft), asDraft);
  }

  function onFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('File must be under 8 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, fileName: file.name, fileBase64: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  const canNext = form.title.trim() && form.className && form.courseName;
  const canPublish = canNext && form.dueDate;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        'aria-labelledby': 'hw-modal-title',
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
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, maxHeight: '92dvh' }}>
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
            <Typography id="hw-modal-title" sx={{ fontSize: 11, fontWeight: 600, color: brand.muted }}>
              Create homework · {step + 1}/{STEPS.length}
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: brand.navy }}>{STEPS[step]}</Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            size="small"
            disabled={saving}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flexShrink: 0, overflowX: 'auto', px: { xs: 2, sm: 3 }, pb: 1.5 }}>
          <Stack direction="row" spacing={0.75} sx={{ minWidth: 'min(100%, 20rem)', bgcolor: 'rgba(241,245,249,0.9)', borderRadius: 1.5, p: 0.5 }}>
            {STEPS.map((label, i) => (
              <Box
                key={label}
                sx={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  borderRadius: 1,
                  px: 1,
                  py: 1,
                  textAlign: 'center',
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: 600,
                  bgcolor: i === step ? brand.navy : i < step ? '#fff' : 'transparent',
                  color: i === step ? '#fff' : i < step ? '#047857' : '#64748B',
                  boxShadow: i === step ? 1 : 0,
                }}
              >
                {label}
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: { xs: 2, sm: 3 }, py: 1 }}>
          {step === 0 ? (
            <Stack spacing={2} sx={{ pb: 1 }}>
              <Box>
                <FieldLabel required>Homework title</FieldLabel>
                <TextField fullWidth size="small" placeholder="e.g. Algebra practice, week 3" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} sx={inputSx} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                  <FieldLabel>Academic year</FieldLabel>
                  <TextField fullWidth size="small" placeholder="2025-2026" value={form.academicYear} onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))} sx={inputSx} />
                </Box>
                <Box>
                  <FieldLabel>Term</FieldLabel>
                  <TextField fullWidth size="small" placeholder="Term 1" value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))} sx={inputSx} />
                </Box>
              </Box>
              <Box>
                <FieldLabel required>Class</FieldLabel>
                <TextField
                  select fullWidth size="small" value={form.className}
                  onChange={(e) => {
                    const cls = classes.find((c) => c.className === e.target.value);
                    setForm((p) => ({ ...p, className: e.target.value, classId: cls?.classId || null, courseName: '' }));
                  }}
                  sx={inputSx}
                >
                  <MenuItem value="">Select class</MenuItem>
                  {classes.map((c) => <MenuItem key={c.className} value={c.className}>{c.className}</MenuItem>)}
                </TextField>
              </Box>
              <Box>
                <FieldLabel required>Course</FieldLabel>
                <TextField
                  select fullWidth size="small" value={form.courseName} disabled={!form.className}
                  onChange={(e) => setForm((p) => ({ ...p, courseName: e.target.value }))}
                  sx={inputSx}
                >
                  <MenuItem value="">Select course</MenuItem>
                  {courses.map((c) => <MenuItem key={assignmentKey(c)} value={c.subjectName}>{c.subjectName}</MenuItem>)}
                </TextField>
              </Box>
              <Box>
                <FieldLabel>Instructions</FieldLabel>
                <TextField fullWidth multiline minRows={3} size="small" placeholder="Optional instructions for students and parents…" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} sx={inputSx} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <Box>
                  <FieldLabel>Start date</FieldLabel>
                  <TextField fullWidth type="date" size="small" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} sx={inputSx} InputLabelProps={{ shrink: true }} />
                </Box>
                <Box>
                  <FieldLabel required>Due date</FieldLabel>
                  <TextField fullWidth type="date" size="small" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} sx={inputSx} InputLabelProps={{ shrink: true }} />
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                <Box>
                  <FieldLabel>Due time</FieldLabel>
                  <TextField fullWidth type="time" size="small" value={form.dueTime} onChange={(e) => setForm((p) => ({ ...p, dueTime: e.target.value }))} sx={inputSx} InputLabelProps={{ shrink: true }} />
                </Box>
                <Box>
                  <FieldLabel>Duration (min)</FieldLabel>
                  <TextField fullWidth size="small" value={form.estimatedMinutes} onChange={(e) => setForm((p) => ({ ...p, estimatedMinutes: e.target.value }))} sx={inputSx} inputProps={{ inputMode: 'numeric' }} />
                </Box>
                <Box>
                  <FieldLabel>Max score</FieldLabel>
                  <TextField fullWidth size="small" value={form.maxScore} onChange={(e) => setForm((p) => ({ ...p, maxScore: e.target.value }))} sx={inputSx} inputProps={{ inputMode: 'numeric' }} />
                </Box>
              </Box>
            </Stack>
          ) : null}

          {step === 1 ? (
            <Stack spacing={2} sx={{ pb: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                {TYPE_CARDS.map((t) => {
                  const Icon = t.Icon;
                  const selected = form.homeworkType === t.id;
                  return (
                    <ButtonBase
                      key={t.id}
                      onClick={() => setForm((p) => ({ ...p, homeworkType: t.id }))}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${selected ? brand.navy : 'rgba(0,0,0,0.06)'}`,
                        bgcolor: selected ? 'rgba(19,33,61,0.04)' : '#fff',
                        p: 1.5,
                        textAlign: 'left',
                        alignItems: { xs: 'flex-start', sm: 'flex-start' },
                        flexDirection: { xs: 'row', sm: 'column' },
                        boxShadow: selected ? `0 0 0 2px rgba(19,33,61,0.12)` : 0,
                        '&:hover': { borderColor: selected ? brand.navy : '#CBD5E1' },
                      }}
                    >
                      <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0, borderRadius: 1.5, bgcolor: selected ? brand.navy : '#F1F5F9', color: selected ? '#fff' : brand.navy }}>
                        <Icon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{t.title}</Typography>
                        <Typography sx={{ mt: 0.25, fontSize: 12, lineHeight: 1.5, color: '#64748B' }}>{t.desc}</Typography>
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Box>

              {form.homeworkType === 'QUIZ' ? (
                <Stack spacing={1.5}>
                  {form.questions.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      index={i}
                      onChange={(next) =>
                        setForm((p) => ({ ...p, questions: p.questions.map((x, j) => (j === i ? next : x)) }))
                      }
                      onDuplicate={() =>
                        setForm((p) => ({
                          ...p,
                          questions: [...p.questions.slice(0, i + 1), { ...q, id: crypto.randomUUID() }, ...p.questions.slice(i + 1)],
                        }))
                      }
                      onRemove={() =>
                        setForm((p) => ({ ...p, questions: p.questions.length > 1 ? p.questions.filter((_, j) => j !== i) : p.questions }))
                      }
                    />
                  ))}
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => setForm((p) => ({ ...p, questions: [...p.questions, newQuestion()] }))}
                    sx={{ borderColor: brand.border, color: brand.navy, py: 1 }}
                  >
                    Add question
                  </Button>
                </Stack>
              ) : null}

              {form.homeworkType === 'FILE' ? (
                <Stack spacing={1.5}>
                  <ButtonBase
                    component="label"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      border: '2px dashed #E2E8F0',
                      bgcolor: 'rgba(248,250,252,0.8)',
                      px: 2,
                      py: 5,
                      textAlign: 'center',
                      '&:hover': { borderColor: 'rgba(178,106,0,0.5)', bgcolor: 'rgba(255,251,235,0.3)' },
                    }}
                  >
                    <DescriptionOutlinedIcon sx={{ fontSize: 36, color: '#94A3B8' }} />
                    <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 500, color: brand.navy }}>{form.fileName || 'Tap to upload'}</Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 12, color: '#64748B' }}>PDF, DOCX, or image · max 8 MB</Typography>
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx" style={{ display: 'none' }} onChange={onFilePick} />
                  </ButtonBase>
                  <Box>
                    <FieldLabel>How students submit</FieldLabel>
                    <TextField select fullWidth size="small" value={form.submissionMode} onChange={(e) => setForm((p) => ({ ...p, submissionMode: e.target.value }))} sx={inputSx}>
                      <MenuItem value="SYSTEM">Answer in system</MenuItem>
                      <MenuItem value="FILE">Upload a file</MenuItem>
                      <MenuItem value="BOTH">Both options</MenuItem>
                    </TextField>
                  </Box>
                </Stack>
              ) : null}

              {form.homeworkType === 'RESOURCE' ? (
                <Box>
                  <FieldLabel>Resource URL</FieldLabel>
                  <TextField
                    fullWidth size="small" placeholder="https://…" value={form.resourceUrl}
                    onChange={(e) => setForm((p) => ({ ...p, resourceUrl: e.target.value }))}
                    InputProps={{ startAdornment: <LinkOutlinedIcon sx={{ fontSize: 16, color: '#94A3B8', mr: 1 }} /> }}
                    sx={inputSx}
                  />
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {step === 2 ? (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, borderColor: 'rgba(0,0,0,0.06)', background: 'linear-gradient(135deg, #F8FAFC, #fff)', p: { xs: 2, sm: 2.5 } }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: brand.navy }}>{form.title.trim() || 'Untitled homework'}</Typography>
              <Typography sx={{ mt: 0.5, fontSize: 14, color: '#64748B' }}>
                {form.className || TP_EMPTY} · {form.courseName || TP_EMPTY}
              </Typography>
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 1.5 }}>
                {[
                  ['Type', TYPE_CARDS.find((t) => t.id === form.homeworkType)?.title],
                  ['Questions', form.homeworkType === 'QUIZ' ? form.questions.length : TP_EMPTY],
                  ['Total marks', totalMarks],
                  ['Due', `${form.dueDate || TP_EMPTY} ${form.dueTime}`],
                  ['Est. time', `${form.estimatedMinutes} min`],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: 14, color: '#64748B' }}>{label}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              {form.description ? (
                <Typography sx={{ mt: 2, fontSize: 14, lineHeight: 1.5, color: '#475569' }}>{form.description}</Typography>
              ) : null}
            </Paper>
          ) : null}
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
            <Button
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => s - 1)}
              startIcon={<ChevronLeftIcon />}
              sx={{
                height: 48,
                flex: 1,
                borderRadius: 999,
                border: '1px solid #E5E8EF',
                color: brand.navy,
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Back
            </Button>
            <Button
              disabled={saving}
              onClick={() => void handleSave(true)}
              sx={{
                height: 48,
                flex: 1,
                borderRadius: 999,
                border: '1px solid #E5E8EF',
                color: brand.navy,
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Draft
            </Button>
            {step < 2 ? (
              <Button
                variant="contained"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                endIcon={<ChevronRightIcon />}
                sx={{
                  height: 48,
                  flex: 1.2,
                  borderRadius: 999,
                  bgcolor: brand.navy,
                  color: '#fff',
                  fontWeight: 800,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1B2D52' },
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={saving || !canPublish}
                onClick={() => void handleSave(false)}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
                sx={{
                  height: 48,
                  flex: 1.2,
                  borderRadius: 999,
                  bgcolor: brand.navy,
                  color: '#fff',
                  fontWeight: 800,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1B2D52' },
                }}
              >
                Publish
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}
