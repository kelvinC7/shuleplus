import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Autocomplete, CircularProgress, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import FormStepper from '@/components/FormStepper';
import { createExam } from '@/services/api';

const TABS = ['Details', 'Marks', 'Review'];
const EXAM_TYPES = ['MIDTERM', 'FINAL', 'ASSIGNMENT', 'QUIZ', 'CAT', 'HOMEWORK', 'PRACTICAL'];
const EXAM_TYPE_LABELS: Record<string, string> = {
  MIDTERM: 'Mid-Term', FINAL: 'Final', ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz', CAT: 'CAT', HOMEWORK: 'Homework', PRACTICAL: 'Practical',
};
const STATUSES = ['DRAFT', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', UPCOMING: 'Upcoming', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEARS = ['2025', '2026', '2027', '2028'];

export default function NewExamPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Details');
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>('DRAFT');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [passingMarks, setPassingMarks] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !type || !academicYear) return;
    setLoading(true);
    try {
      await createExam({
        name: name.trim(),
        type,
        academicYear,
        term: term || undefined,
        status: status || undefined,
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        totalMarks: totalMarks ? parseInt(totalMarks) : undefined,
        passingMarks: passingMarks ? parseInt(passingMarks) : undefined,
      });
      setActiveStep(2);
      setSuccess(true);
      setTimeout(() => navigate('/examinations'), 1200);
    } catch {
      /* interceptor toasts the error */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8f9fa', overflow: 'auto' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 3 }, py: 1, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 20, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/examinations')} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8125rem', md: '0.9375rem' } }}>New Exam</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormStepper steps={TABS} activeStep={activeStep} />
          <Button
            variant="contained"
            disabled={activeStep === 2 || loading || success || !name.trim() || !type || !academicYear}
            onClick={handleSubmit}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : success ? <CheckCircleIcon /> : <SaveIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: { xs: 'none', sm: 'flex' } }}
          >
            {loading ? 'Saving...' : success ? 'Created!' : 'Finish & Create'}
          </Button>
          <IconButton onClick={handleSubmit} disabled={activeStep === 2 || loading || success || !name.trim() || !type || !academicYear} sx={{ display: { xs: 'flex', sm: 'none' }, color: 'primary.main' }}>
            {loading ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
        {activeStep < 2 && (
          <>
            {/* Identity Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, mb: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Box sx={{ width: { xs: 96, md: 128 }, height: { xs: 96, md: 128 }, border: '2px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', flexShrink: 0 }}>
                <QuizIcon sx={{ fontSize: 36, mb: 0.5 }} />
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>Exam</Typography>
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <TextField
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Exam Name (e.g. Term 1 Mid-Term Exam)"
                  variant="standard"
                  sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1.125rem', md: '1.5rem' }, fontWeight: 500, '&::placeholder': { color: '#cbd5e1', opacity: 1 } }, '& .MuiInput-underline:before': { borderBottomColor: '#e2e8f0' }, width: '100%', mb: 2 }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                  <SummaryChip icon={<QuizIcon />} label="Type" value={type ? EXAM_TYPE_LABELS[type] : 'N/A'} onClick={() => setActiveTab('Details')} />
                  <SummaryChip icon={<QuizIcon />} label="Year" value={academicYear ?? 'N/A'} onClick={() => setActiveTab('Details')} />
                  <SummaryChip icon={<QuizIcon />} label="Term" value={term ?? 'N/A'} onClick={() => setActiveTab('Details')} />
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', mb: 4, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
              {TABS.filter(t => t !== 'Review').map(tab => (
                <Box
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  sx={{
                    px: { xs: 2, md: 3 }, py: 1.5, fontSize: { xs: '0.75rem', md: '0.8125rem' }, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                    color: activeTab === tab ? 'accent.main' : 'text.secondary',
                    position: 'relative', transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.hover', color: activeTab === tab ? 'accent.main' : 'text.primary' },
                  }}
                >
                  {tab}
                  {activeTab === tab && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, bgcolor: 'accent.main' }} />
                  )}
                </Box>
              ))}
            </Box>

            {/* Tab Content */}
            <Box sx={{ minHeight: 200 }}>
              {activeTab === 'Details' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
                  <Box>
                    <SectionTitle>Exam Details</SectionTitle>
                    <Field label="Type">
                      <Autocomplete options={EXAM_TYPES} value={type} onChange={(_, v) => setType(v)}
                        getOptionLabel={(opt) => EXAM_TYPE_LABELS[opt] ?? opt}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select type" />}
                        fullWidth size="small" />
                    </Field>
                    <Field label="Academic Year">
                      <Autocomplete options={YEARS} value={academicYear} onChange={(_, v) => setAcademicYear(v)}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select year" />}
                        fullWidth size="small" />
                    </Field>
                    <Field label="Term">
                      <Autocomplete options={TERMS} value={term} onChange={(_, v) => setTerm(v)}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select term" />}
                        fullWidth size="small" />
                    </Field>
                    <Field label="Status">
                      <Autocomplete options={STATUSES} value={status} onChange={(_, v) => setStatus(v)}
                        getOptionLabel={(opt) => STATUS_LABELS[opt] ?? opt}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select status" />}
                        fullWidth size="small" />
                    </Field>
                  </Box>
                  <Box>
                    <SectionTitle>Schedule</SectionTitle>
                    <Field label="Start Date">
                      <TextField type="date" value={startDate} onChange={e => setStartDate(e.target.value)} variant="standard" size="small" sx={{ width: '100%' }}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    </Field>
                    <Field label="End Date">
                      <TextField type="date" value={endDate} onChange={e => setEndDate(e.target.value)} variant="standard" size="small" sx={{ width: '100%' }}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    </Field>
                    <Field label="Description">
                      <TextField value={description} onChange={e => setDescription(e.target.value)} variant="standard" size="small" placeholder="Optional description" sx={{ width: '100%' }} multiline minRows={2} />
                    </Field>
                  </Box>
                </Box>
              )}

              {activeTab === 'Marks' && (
                <Box sx={{ maxWidth: 560 }}>
                  <SectionTitle>Marks Configuration</SectionTitle>
                  <Field label="Total Marks">
                    <TextField type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} variant="standard" size="small" placeholder="e.g. 100" sx={{ width: '100%' }} slotProps={{ htmlInput: { min: 1 } }} />
                  </Field>
                  <Field label="Passing Marks">
                    <TextField type="number" value={passingMarks} onChange={e => setPassingMarks(e.target.value)} variant="standard" size="small" placeholder="e.g. 50" sx={{ width: '100%' }} slotProps={{ htmlInput: { min: 1 } }} />
                  </Field>
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 2 }}>
                    Configure the maximum marks and minimum passing marks. These will be used when entering marks for this exam.
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!name.trim() || !type || !academicYear} endIcon={<ChevronRightIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: { xs: '100%', md: 'auto' } }}>
                Review & Create
              </Button>
            </Box>
          </>
        )}

        {activeStep === 2 && !success && (
          <Box sx={{ maxWidth: 700 }}>
            <SectionTitle>Review Exam</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '16px 48px', mb: 4 }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Name</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{name.trim()}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Type</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{type ? EXAM_TYPE_LABELS[type] : '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Academic Year</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{academicYear ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Term</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{term ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Total Marks</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{totalMarks || '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Passing Marks</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{passingMarks || '—'}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Back
              </Button>
              <Button variant="contained" onClick={handleSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {loading ? 'Creating...' : 'Confirm & Create'}
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 2 && success && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Exam Created Successfully!</Typography>
            <Typography color="text.secondary">Redirecting to examinations...</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      {children}
    </Typography>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '120px 1fr' }, alignItems: 'center', mb: 2, gap: { xs: 0.5, md: 0 } }}>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      {children}
    </Box>
  );
}

function SummaryChip({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, cursor: 'pointer', borderBottom: '1px solid transparent', '&:hover': { borderBottomColor: 'divider' }, transition: 'all 0.2s', '&:hover .arrow': { opacity: 1 } }}>
      <Box sx={{ color: 'text.disabled', display: 'flex' }}>{icon}</Box>
      <Box sx={{ flex: 1, fontSize: '0.8125rem' }}>
        <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>{label}:</Box>
        <Box component="span" sx={{ fontWeight: 700 }}>{value}</Box>
      </Box>
      <ChevronRightIcon className="arrow" sx={{ fontSize: 14, color: 'primary.main', opacity: 0, transition: 'opacity 0.2s' }} />
    </Box>
  );
}
