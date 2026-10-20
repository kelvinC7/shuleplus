import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Autocomplete, CircularProgress, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FormStepper from '@/components/FormStepper';
import { getSubjectById, updateSubject } from '@/services/api';

const TABS = ['Basic Info', 'Review'];
const CATEGORIES = ['Core', 'Sciences', 'Languages', 'Humanities', 'Technical'];

export default function EditSubjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Basic Info');
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSubjectById(id).then((subject) => {
      setName(subject.name ?? '');
      setCode(subject.code ?? '');
      setCategory(subject.category ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateSubject(id!, {
        name: name.trim(),
        code: code.trim() || undefined,
        category: category || undefined,
      });
      setActiveStep(1);
      setSuccess(true);
      setTimeout(() => navigate('/subjects'), 1200);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to update subject');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8f9fa', overflow: 'auto' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 3 }, py: 1, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 20, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/subjects')} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8125rem', md: '0.9375rem' } }}>Edit Subject</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormStepper steps={['Information', 'Review']} activeStep={activeStep} />
          <Button
            variant="contained"
            disabled={activeStep === 1 || saving || success || !name.trim()}
            onClick={handleUpdate}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : success ? <CheckCircleIcon /> : <SaveIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: { xs: 'none', sm: 'flex' } }}
          >
            {saving ? 'Saving...' : success ? 'Saved!' : 'Finish & Save'}
          </Button>
          <IconButton onClick={handleUpdate} disabled={activeStep === 1 || saving || success || !name.trim()} sx={{ display: { xs: 'flex', sm: 'none' }, color: 'primary.main' }}>
            {saving ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
        {activeStep === 0 && (
          <>
            {/* Identity Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, mb: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Box sx={{ width: { xs: 96, md: 128 }, height: { xs: 96, md: 128 }, border: '2px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', flexShrink: 0 }}>
                <MenuBookIcon sx={{ fontSize: 36, mb: 0.5 }} />
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>Subject</Typography>
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <TextField
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Subject Name (e.g. Mathematics, Physics)"
                  variant="standard"
                  sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1.125rem', md: '1.5rem' }, fontWeight: 500, '&::placeholder': { color: '#cbd5e1', opacity: 1 } }, '& .MuiInput-underline:before': { borderBottomColor: '#e2e8f0' }, width: '100%', mb: 2 }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                  <SummaryChip icon={<MenuBookIcon />} label="Code" value={code.trim() || 'N/A'} onClick={() => setActiveTab('Basic Info')} />
                  <SummaryChip icon={<MenuBookIcon />} label="Category" value={category ?? 'N/A'} onClick={() => setActiveTab('Basic Info')} />
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
                    <SectionTitle>Subject Details</SectionTitle>
                    <Field label="Code">
                      <TextField value={code} onChange={e => setCode(e.target.value.toUpperCase())} variant="standard" size="small" placeholder="e.g. MTH (optional)" sx={{ width: '100%' }} slotProps={{ htmlInput: { maxLength: 5 } }} />
                    </Field>
                    <Field label="Category">
                      <Autocomplete
                        options={CATEGORIES}
                        value={category}
                        onChange={(_, v) => setCategory(v)}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Select category" />}
                        fullWidth
                        size="small"
                      />
                    </Field>
                  </Box>
                  <Box>
                    <SectionTitle>Additional Info</SectionTitle>
                    <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      Short codes are used in report cards and schedules. Categories help organize subjects for reporting.
                    </Typography>
                  </Box>
                </Box>
              )}

              {activeTab === 'Review' && (
                <Box sx={{ maxWidth: 560 }}>
                  <SectionTitle>Review Subject</SectionTitle>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '16px 48px', mb: 4 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Subject</Typography>
                      <Typography sx={{ fontSize: '0.875rem' }}>{name.trim() || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Code</Typography>
                      <Typography sx={{ fontSize: '0.875rem' }}>{code.trim() || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Category</Typography>
                      <Typography sx={{ fontSize: '0.875rem' }}>{category ?? '—'}</Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!name.trim()} endIcon={<ChevronRightIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: { xs: '100%', md: 'auto' } }}>
                Review & Save
              </Button>
            </Box>
          </>
        )}

        {activeStep === 1 && !success && (
          <Box sx={{ maxWidth: 700 }}>
            <SectionTitle>Review Subject</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '16px 48px', mb: 4 }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Subject</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{name.trim()}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Code</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{code.trim() || '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Category</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{category ?? '—'}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Back
              </Button>
              <Button variant="contained" onClick={handleUpdate} disabled={saving} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {saving ? 'Saving...' : 'Confirm & Save'}
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 1 && success && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Subject Updated Successfully!</Typography>
            <Typography color="text.secondary">Redirecting to subjects...</Typography>
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
