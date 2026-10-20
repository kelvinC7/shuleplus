import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, CircularProgress, IconButton,
  FormControl, InputLabel, MenuItem, Select,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClassIcon from '@mui/icons-material/Class';
import FormStepper from '@/components/FormStepper';
import { api } from '@/services/api';

const TABS = ['Basic Info'];
const EDUCATION_LEVELS = [
  { value: 'NURSERY', label: 'Nursery' },
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'SECONDARY', label: 'Secondary' },
  { value: 'TVET', label: 'TVET' },
] as const;

export default function NewClassPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Basic Info');
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [streamInput, setStreamInput] = useState('');
  const [educationLevel, setEducationLevel] = useState('');

  const parseStreams = (input: string) =>
    input
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);

  const streams = parseStreams(streamInput);

  const classDisplayName = () => {
    const base = name.trim() || 'N/A';
    if (!streams.length) return base;
    return streams.map((stream) => `${base} ${stream}`).join(', ');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !educationLevel) return;
    setLoading(true);
    try {
      const base = {
        name: name.trim(),
        category: educationLevel,
      };
      const streamValues = streams.map((s) => s.trim()).filter(Boolean);
      if (streamValues.length === 0) {
        await api.post('/classes', base);
      } else {
        for (const stream of streamValues) {
          await api.post('/classes', { ...base, stream });
        }
      }
      setActiveStep(1);
      setSuccess(true);
      setTimeout(() => navigate('/classes'), 1200);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8f9fa', overflow: 'auto' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 3 }, py: 1, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 20, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/classes')} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8125rem', md: '0.9375rem' } }}>New Class</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormStepper steps={['Information', 'Review']} activeStep={activeStep} />
          <Button
            variant="contained"
            disabled={activeStep === 1 || loading || success || !name.trim() || !educationLevel}
            onClick={handleSubmit}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : success ? <CheckCircleIcon /> : <SaveIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: { xs: 'none', sm: 'flex' } }}
          >
            {loading ? 'Saving...' : success ? 'Created!' : 'Finish & Create'}
          </Button>
          <IconButton onClick={handleSubmit} disabled={activeStep === 1 || loading || success || !name.trim() || !educationLevel} sx={{ display: { xs: 'flex', sm: 'none' }, color: 'primary.main' }}>
            {loading ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
        {activeStep === 0 && (
          <>
            {/* Identity Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, mb: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Box sx={{ width: { xs: 96, md: 128 }, height: { xs: 96, md: 128 }, border: '2px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', flexShrink: 0 }}>
                <ClassIcon sx={{ fontSize: 36, mb: 0.5 }} />
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>Class</Typography>
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <TextField
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Class Name (e.g. N1, Baby, P2, S4)"
                  variant="standard"
                  sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1.125rem', md: '1.5rem' }, fontWeight: 500, '&::placeholder': { color: '#cbd5e1', opacity: 1 } }, '& .MuiInput-underline:before': { borderBottomColor: '#e2e8f0' }, width: '100%', mb: 2 }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(2, 1fr)' }, gap: 1 }}>
                  <SummaryChip icon={<ClassIcon />} label="Level" value={educationLevel || 'N/A'} onClick={() => setActiveTab('Basic Info')} />
                  <SummaryChip icon={<ClassIcon />} label="Stream" value={streams.length ? streams.join(', ') : 'N/A'} onClick={() => setActiveTab('Basic Info')} />
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', mb: 4, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
              {TABS.map(tab => (
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
              {activeTab === 'Basic Info' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
                  <Box>
                    <SectionTitle>Class Details</SectionTitle>
                    <Field label="Level">
                      <FormControl variant="standard" fullWidth required size="small">
                        <InputLabel>Choose education level</InputLabel>
                        <Select
                          value={educationLevel}
                          onChange={(e) => setEducationLevel(e.target.value)}
                        >
                          {EDUCATION_LEVELS.map((level) => (
                            <MenuItem key={level.value} value={level.value}>
                              {level.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Field>
                     <Field label="Stream">
                      <TextField
                        value={streamInput}
                        onChange={(e) => setStreamInput(e.target.value)}
                        variant="standard"
                        size="small"
                        placeholder="e.g. A, B, Blue"
                        fullWidth
                      />
                    </Field>
                  </Box>
                  <Box>
                    <SectionTitle>Sort Order</SectionTitle>
                    <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      Auto-assigned based on class name when possible
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!name.trim() || !educationLevel} endIcon={<ChevronRightIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: { xs: '100%', md: 'auto' } }}>
                Review & Create
              </Button>
            </Box>
          </>
        )}

        {activeStep === 1 && !success && (
          <Box sx={{ maxWidth: 700 }}>
            <SectionTitle>Review Class</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '16px 48px', mb: 4 }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Class</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{classDisplayName()}</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>Level: {educationLevel}</Typography>
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

        {activeStep === 1 && success && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Class Created Successfully!</Typography>
            <Typography color="text.secondary">Redirecting to classes...</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider', ...sx }}>
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
    <Box
      onClick={onClick}
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, cursor: 'pointer', borderBottom: '1px solid transparent', '&:hover': { borderBottomColor: 'divider' }, transition: 'all 0.2s', '&:hover .arrow': { opacity: 1 } }}
    >
      <Box sx={{ color: 'text.disabled', display: 'flex' }}>{icon}</Box>
      <Box sx={{ flex: 1, fontSize: '0.8125rem' }}>
        <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>{label}:</Box>
        <Box component="span" sx={{ fontWeight: 700 }}>{value}</Box>
      </Box>
      <ChevronRightIcon className="arrow" sx={{ fontSize: 14, color: 'primary.main', opacity: 0, transition: 'opacity 0.2s' }} />
    </Box>
  );
}
