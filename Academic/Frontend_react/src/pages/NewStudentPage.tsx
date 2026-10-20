import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Select, MenuItem, Button, IconButton,
  CircularProgress, Autocomplete, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GroupIcon from '@mui/icons-material/Group';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import SchoolIcon from '@mui/icons-material/School';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormStepper from '@/components/FormStepper';
import { api, searchParents, createParent, fetchNextStudentCode } from '@/services/api';
import type { ApiClass, ApiParent } from '@/types';

const TABS = ['Personal', 'Family', 'Medical', 'Academic'];

type ParentSelection = { parentId: string; role: 'FATHER' | 'MOTHER' | 'GUARDIAN'; label: string } | null;

export default function NewStudentPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Personal');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [nextCode, setNextCode] = useState<{ code: string; districtCode: string; orgCode: string; seq: string; year: string } | null>(null);

  const [form, setForm] = useState({
    fullName: '', gender: 'Male', dob: '', nationality: 'Rwandan', residence: '',
    sdmCode: '', bloodGroup: 'Unknown', allergies: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, term: 'Term 1', joiningDate: '', formerSchool: '', leavingReason: '',
  });

  const [selectedClass, setSelectedClass] = useState<ApiClass | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const [selectedFather, setSelectedFather] = useState<ParentSelection>(null);
  const [selectedMother, setSelectedMother] = useState<ParentSelection>(null);
  const [fatherOptions, setFatherOptions] = useState<ApiParent[]>([]);
  const [motherOptions, setMotherOptions] = useState<ApiParent[]>([]);
  const [fatherSearchLoading, setFatherSearchLoading] = useState(false);
  const [motherSearchLoading, setMotherSearchLoading] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogRole, setCreateDialogRole] = useState<'FATHER' | 'MOTHER' | 'GUARDIAN'>('FATHER');
  const [createDialogLoading, setCreateDialogLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', nationalId: '', occupation: '', address: '',
  });

  useEffect(() => {
    setClassesLoading(true);
    api.get('/classes').then(r => setClasses(r.data.data ?? [])).catch(() => {}).finally(() => setClassesLoading(false));
  }, []);

  useEffect(() => {
    void fetchNextStudentCode(form.academicYear || undefined)
      .then(setNextCode)
      .catch(() => setNextCode(null));
  }, [form.academicYear]);

  const gradeOptions = useMemo(() => {
    const names = [...new Set(classes.map(c => c.name).filter(Boolean))] as string[];
    return names.sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      const aPrefix = a.replace(/\d/g, '');
      const bPrefix = b.replace(/\d/g, '');
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      return aNum - bNum;
    });
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!selectedGrade) return classes;
    return classes.filter(c => c.name === selectedGrade);
  }, [classes, selectedGrade]);

  function classLabel(c: ApiClass): string {
    const parts = [c.name];
    if (c.combination?.name) parts.push(c.combination.name);
    if (c.stream) parts.push(c.stream);
    return parts.join(' ');
  }

  function parentLabel(p: ApiParent): string {
    return `${p.firstName} ${p.lastName}`;
  }

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPhotoUrl(res.data.data.url);
    } catch {
    } finally {
      setPhotoUploading(false);
    }
  };

  const searchFather = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setFatherOptions([]); return; }
    setFatherSearchLoading(true);
    try {
      const data = await searchParents(q);
      setFatherOptions(data);
    } catch {} finally {
      setFatherSearchLoading(false);
    }
  }, []);

  const searchMother = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setMotherOptions([]); return; }
    setMotherSearchLoading(true);
    try {
      const data = await searchParents(q);
      setMotherOptions(data);
    } catch {} finally {
      setMotherSearchLoading(false);
    }
  }, []);

  const openCreateDialog = (role: 'FATHER' | 'MOTHER' | 'GUARDIAN') => {
    setCreateDialogRole(role);
    setCreateForm({ firstName: '', lastName: '', phone: '', email: '', nationalId: '', occupation: '', address: '' });
    setCreateDialogOpen(true);
  };

  const handleCreateParent = async () => {
    setCreateDialogLoading(true);
    try {
      const newParent = await createParent(createForm);
      const selection: ParentSelection = {
        parentId: newParent.id,
        role: createDialogRole,
        label: parentLabel(newParent),
      };
      if (createDialogRole === 'FATHER') {
        setSelectedFather(selection);
        setFatherOptions(prev => [newParent, ...prev]);
      } else if (createDialogRole === 'MOTHER') {
        setSelectedMother(selection);
        setMotherOptions(prev => [newParent, ...prev]);
      }
      setCreateDialogOpen(false);
    } catch {} finally {
      setCreateDialogLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!form.fullName.trim()) {
      setSubmitError('Enter the student full name before enrolling.');
      setActiveTab('Personal');
      return;
    }
    if (!selectedClass?.id) {
      setSubmitError('Select a Target Class on the Academic tab before Finish & Enroll. Without a class the student will not appear in any class list.');
      setActiveTab('Academic');
      return;
    }

    setLoading(true);
    const nameParts = form.fullName.trim().split(/\s+/);
    const parents: { parentId: string; role: string }[] = [];
    if (selectedFather) parents.push({ parentId: selectedFather.parentId, role: 'FATHER' });
    if (selectedMother) parents.push({ parentId: selectedMother.parentId, role: 'MOTHER' });

    const payload = {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
      gender: form.gender === 'Male' ? 'MALE' : 'FEMALE',
      dateOfBirth: form.dob || undefined,
      nationality: form.nationality || undefined,
      district: form.residence || undefined,
      bloodGroup: form.bloodGroup === 'Unknown' ? undefined : form.bloodGroup,
      allergies: form.allergies || undefined,
      sdmCode: form.sdmCode || undefined,
      formerSchool: form.formerSchool || undefined,
      leavingReason: form.leavingReason || undefined,
      studentPhoto: photoUrl || undefined,
      classId: selectedClass.id,
      academicYear: form.academicYear || undefined,
      term: form.term || undefined,
      joiningDate: form.joiningDate || undefined,
      parents: parents.length > 0 ? parents : undefined,
    };
    try {
      await api.post('/students', payload);
      setActiveStep(1);
      setSuccess(true);
      setTimeout(() => navigate('/students'), 1200);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not enroll student. Check that a class is selected and try again.';
      setSubmitError(message);
      setActiveTab('Academic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8f9fa', overflow: 'auto' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 3 }, py: 1, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 20, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/students')} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.8125rem', md: '0.9375rem' } }}>Student Enrollment</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormStepper steps={['Information', 'Review']} activeStep={activeStep} />
          <Button
            variant="contained"
            disabled={activeStep === 1 || loading || success}
            onClick={() => void handleSubmit()}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : success ? <CheckCircleIcon /> : <SaveIcon />}
            sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: { xs: 'none', sm: 'flex' } }}
          >
            {loading ? 'Saving...' : success ? 'Enrolled!' : 'Finish & Enroll'}
          </Button>
          <IconButton onClick={handleSubmit} disabled={activeStep === 1 || loading || success} sx={{ display: { xs: 'flex', sm: 'none' }, color: 'primary.main' }}>
            {loading ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
        {submitError ? (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        ) : null}
        {activeStep === 0 && (
          <>
            {/* Identity Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, mb: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Box onClick={() => photoRef.current?.click()} sx={{ width: { xs: 96, md: 128 }, height: { xs: 96, md: 128 }, border: photoUrl ? 'none' : '2px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', cursor: 'pointer', overflow: 'hidden', '&:hover': { borderColor: 'primary.main', color: 'primary.main' }, position: 'relative', flexShrink: 0 }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>{photoUploading ? <CircularProgress size={24} /> : <CameraAltIcon sx={{ fontSize: 28, mb: 0.5 }} />}</>
                )}
                {!photoUrl && <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>Student Photo</Typography>}
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
              </Box>
              <Box sx={{ flex: 1, width: '100%' }}>
                <TextField
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  placeholder="Student's Full Legal Name"
                  variant="standard"
                  sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1.125rem', md: '1.5rem' }, fontWeight: 500, '&::placeholder': { color: '#cbd5e1', opacity: 1 } }, '& .MuiInput-underline:before': { borderBottomColor: '#e2e8f0' }, width: '100%', mb: 2 }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr' }, gap: 1 }}>
                  <SummaryChip icon={<GroupIcon />} label="Class" value={selectedClass ? classLabel(selectedClass) : 'N/A'} onClick={() => setActiveTab('Academic')} />
                  <SummaryChip icon={<FingerprintIcon />} label="Student Code" value={nextCode?.code || 'Auto'} onClick={() => setActiveTab('Personal')} />
                  <SummaryChip icon={<SmartphoneIcon />} label="Father" value={selectedFather?.label || 'N/A'} onClick={() => setActiveTab('Family')} />
                  <SummaryChip icon={<SchoolIcon />} label="Joining Date" value={form.joiningDate || 'N/A'} onClick={() => setActiveTab('Academic')} />
                </Box>
                {nextCode && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip size="small" label={`District ${nextCode.districtCode}`} sx={{ bgcolor: '#0004350A', fontWeight: 600, fontSize: '0.6875rem' }} />
                    <Chip size="small" label={`Org ${nextCode.orgCode}`} sx={{ bgcolor: '#0004350A', fontWeight: 600, fontSize: '0.6875rem' }} />
                    <Chip size="small" label={`Seq ${nextCode.seq}`} sx={{ bgcolor: '#0004350A', fontWeight: 600, fontSize: '0.6875rem' }} />
                    <Chip size="small" label={`Year ${nextCode.year}`} sx={{ bgcolor: '#FCB03822', color: '#000435', fontWeight: 700, fontSize: '0.6875rem' }} />
                  </Box>
                )}
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
            <Box sx={{ minHeight: 300 }}>
              {activeTab === 'Personal' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
                  <Box>
                    <SectionTitle>Identity Details</SectionTitle>
                    <Field label="Gender">
                      <Select value={form.gender} onChange={e => set('gender', e.target.value)} size="small" variant="standard" sx={{ width: '100%' }}>
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                      </Select>
                    </Field>
                    <Field label="Date of Birth">
                      <TextField type="date" value={form.dob} onChange={e => set('dob', e.target.value)} variant="standard" size="small" sx={{ width: '100%' }} />
                    </Field>
                    <Field label="SDM Code">
                      <TextField value={form.sdmCode} onChange={e => set('sdmCode', e.target.value)} variant="standard" size="small" placeholder="National SDM code" sx={{ width: '100%' }} />
                    </Field>
                  </Box>
                  <Box>
                    <SectionTitle>Origin</SectionTitle>
                    <Field label="Nationality">
                      <TextField value={form.nationality} onChange={e => set('nationality', e.target.value)} variant="standard" size="small" placeholder="e.g. Rwandan" sx={{ width: '100%' }} />
                    </Field>
                    <Field label="Residence">
                      <TextField value={form.residence} onChange={e => set('residence', e.target.value)} variant="standard" size="small" placeholder="District, Sector" sx={{ width: '100%' }} />
                    </Field>
                  </Box>
                </Box>
              )}

              {activeTab === 'Family' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
                  <Box>
                    <SectionTitle>Father</SectionTitle>
                    <Field label="Father">
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', width: '100%' }}>
                        <Autocomplete
                          options={fatherOptions}
                          value={selectedFather ? { parentId: selectedFather.parentId, role: 'FATHER', label: selectedFather.label } as any : null}
                          onChange={(_, v) => {
                            if (v) setSelectedFather({ parentId: v.id, role: 'FATHER', label: parentLabel(v) });
                            else setSelectedFather(null);
                          }}
                          onInputChange={(_, v) => searchFather(v)}
                          loading={fatherSearchLoading}
                          getOptionLabel={(o) => (o as any).label || ''}
                          isOptionEqualToValue={(o, v) => (o as any).id === (v as any).parentId}
                          filterOptions={(o) => o}
                          sx={{ flex: 1 }}
                          slotProps={{
                            listbox: { style: { maxHeight: 180 } },
                            paper: { sx: { '& .MuiAutocomplete-listbox .MuiAutocomplete-option + .MuiAutocomplete-option': { borderTop: '1px solid', borderColor: 'divider' } } },
                          }}
                          renderOption={(props, option) => {
                            const p = option as any;
                            return (
                              <Box component="li" {...props} key={p.id}>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.firstName} {p.lastName}</Typography>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                    {p.phone && `Phone: ${p.phone}`}{p.phone && p.nationalId && ' | '}{p.nationalId && `ID: ${p.nationalId}`}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          }}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Search parent..." variant="standard" sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }} />
                          )}
                        />
                        <IconButton onClick={() => openCreateDialog('FATHER')} size="small" sx={{ color: 'primary.main', mb: 0.5 }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Field>
                  </Box>
                  <Box>
                    <SectionTitle>Mother</SectionTitle>
                    <Field label="Mother">
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', width: '100%' }}>
                        <Autocomplete
                          options={motherOptions}
                          value={selectedMother ? { parentId: selectedMother.parentId, role: 'MOTHER', label: selectedMother.label } as any : null}
                          onChange={(_, v) => {
                            if (v) setSelectedMother({ parentId: v.id, role: 'MOTHER', label: parentLabel(v) });
                            else setSelectedMother(null);
                          }}
                          onInputChange={(_, v) => searchMother(v)}
                          loading={motherSearchLoading}
                          getOptionLabel={(o) => (o as any).label || ''}
                          isOptionEqualToValue={(o, v) => (o as any).id === (v as any).parentId}
                          filterOptions={(o) => o}
                          sx={{ flex: 1 }}
                          slotProps={{
                            listbox: { style: { maxHeight: 180 } },
                            paper: { sx: { '& .MuiAutocomplete-listbox .MuiAutocomplete-option + .MuiAutocomplete-option': { borderTop: '1px solid', borderColor: 'divider' } } },
                          }}
                          renderOption={(props, option) => {
                            const p = option as any;
                            return (
                              <Box component="li" {...props} key={p.id}>
                                <Box>
                                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.firstName} {p.lastName}</Typography>
                                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                    {p.phone && `Phone: ${p.phone}`}{p.phone && p.nationalId && ' | '}{p.nationalId && `ID: ${p.nationalId}`}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          }}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Search parent..." variant="standard" sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }} />
                          )}
                        />
                        <IconButton onClick={() => openCreateDialog('MOTHER')} size="small" sx={{ color: 'primary.main', mb: 0.5 }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Field>
                  </Box>
                </Box>
              )}

              {activeTab === 'Medical' && (
                <Box sx={{ maxWidth: 600 }}>
                  <SectionTitle>Health & Well-being</SectionTitle>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
                    <Field label="Blood Group">
                      <Select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} variant="standard" size="small" sx={{ width: '100%' }}>
                        {['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                      </Select>
                    </Field>
                    <Field label="Allergies">
                      <TextField value={form.allergies} onChange={e => set('allergies', e.target.value)} variant="standard" size="small" placeholder="List any allergies" sx={{ width: '100%' }} />
                    </Field>
                  </Box>
                </Box>
              )}

              {activeTab === 'Academic' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
                  <Box>
                    <SectionTitle>Enrollment Details</SectionTitle>
                    <Field label="Grade">
                      <Autocomplete
                        options={gradeOptions}
                        value={selectedGrade}
                        onChange={(_, v) => { setSelectedGrade(v); setSelectedClass(null); }}
                        forcePopupIcon
                        loading={classesLoading}
                        noOptionsText="No grades available"
                        sx={{ width: '100%' }}
                        slotProps={{
                          listbox: { style: { maxHeight: 180 } },
                          paper: { sx: { '& .MuiAutocomplete-listbox .MuiAutocomplete-option + .MuiAutocomplete-option': { borderTop: '1px solid', borderColor: 'divider' } } },
                        }}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select Grade" variant="standard" required sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }} />
                        )}
                      />
                    </Field>
                    <Field label="Academic Year">
                      <Autocomplete
                        options={['2024-2025', '2025-2026']}
                        value={form.academicYear || null}
                        onChange={(_, v) => set('academicYear', v ?? '')}
                        forcePopupIcon
                        sx={{ width: '100%' }}
                        slotProps={{
                          listbox: { style: { maxHeight: 180 } },
                          paper: { sx: { '& .MuiAutocomplete-listbox .MuiAutocomplete-option + .MuiAutocomplete-option': { borderTop: '1px solid', borderColor: 'divider' } } },
                        }}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select Year" variant="standard" required sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }} />
                        )}
                      />
                    </Field>
                    <Field label="Term">
                      <Select value={form.term} onChange={e => set('term', e.target.value)} variant="standard" size="small" displayEmpty sx={{ width: '100%' }}>
                        <MenuItem value="" disabled>Select Term</MenuItem>
                        <Divider />
                        <MenuItem value="Term 1">Term 1</MenuItem>
                        <Divider />
                        <MenuItem value="Term 2">Term 2</MenuItem>
                        <Divider />
                        <MenuItem value="Term 3">Term 3</MenuItem>
                      </Select>
                    </Field>
                    <Field label="Target Class">
                      <Autocomplete
                        options={filteredClasses}
                        value={selectedClass}
                        onChange={(_, v) => setSelectedClass(v)}
                        sx={{ width: '100%' }}
                        loading={classesLoading}
                        getOptionLabel={classLabel}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        slotProps={{
                          listbox: { style: { maxHeight: 180 } },
                          paper: { sx: { '& .MuiAutocomplete-listbox .MuiAutocomplete-option + .MuiAutocomplete-option': { borderTop: '1px solid', borderColor: 'divider' } } },
                        }}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select Class" variant="standard" required sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }} />
                        )}
                      />
                    </Field>
                    <Field label="Joining Date">
                      <TextField type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} variant="standard" size="small" sx={{ width: '100%' }} />
                    </Field>
                  </Box>
                  <Box>
                    <SectionTitle>Previous Education</SectionTitle>
                    <Field label="Former School">
                      <TextField value={form.formerSchool} onChange={e => set('formerSchool', e.target.value)} variant="standard" size="small" placeholder="Last school attended" sx={{ width: '100%' }} />
                    </Field>
                    <Field label="Leaving Reason">
                      <TextField value={form.leavingReason} onChange={e => set('leavingReason', e.target.value)} variant="standard" size="small" placeholder="e.g. Relocation" sx={{ width: '100%' }} />
                    </Field>
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="contained" onClick={() => setActiveStep(1)} endIcon={<ChevronRightIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: { xs: '100%', md: 'auto' } }}>
                Review & Enroll
              </Button>
            </Box>
          </>
        )}

        {activeStep === 1 && !success && (
          <Box sx={{ maxWidth: 700 }}>
            <SectionTitle>Review Enrollment</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '16px 48px', mb: 4 }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Student</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{form.fullName}</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{form.gender} | {form.dob || 'No DOB'} | {form.nationality}</Typography>
                {form.sdmCode && <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>SDM: {form.sdmCode}</Typography>}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Enrollment</Typography>
                <Typography sx={{ fontSize: '0.875rem' }}>{selectedClass ? classLabel(selectedClass) : '—'}</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{form.academicYear} | {form.term || '—'} | {form.joiningDate || '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Parents</Typography>
                {selectedFather && <Typography sx={{ fontSize: '0.8125rem' }}>Father: {selectedFather.label}</Typography>}
                {selectedMother && <Typography sx={{ fontSize: '0.8125rem' }}>Mother: {selectedMother.label}</Typography>}
                {!selectedFather && !selectedMother && <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>No parents selected</Typography>}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>Other</Typography>
                <Typography sx={{ fontSize: '0.8125rem' }}>Blood: {form.bloodGroup} {form.allergies ? `| Allergies: ${form.allergies}` : ''}</Typography>
                {form.formerSchool && <Typography sx={{ fontSize: '0.8125rem' }}>Former: {form.formerSchool} {form.leavingReason ? `(${form.leavingReason})` : ''}</Typography>}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Back
              </Button>
              <Button variant="contained" onClick={handleSubmit} disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {loading ? 'Enrolling...' : 'Confirm & Enroll'}
              </Button>
            </Box>
          </Box>
        )}

        {activeStep === 1 && success && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Student Enrolled Successfully!</Typography>
            <Typography color="text.secondary">Redirecting to student directory...</Typography>
          </Box>
        )}
      </Box>

      {/* Create Parent Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Add {createDialogRole === 'FATHER' ? 'Father' : createDialogRole === 'MOTHER' ? 'Mother' : 'Guardian'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <TextField label="First Name" value={createForm.firstName} onChange={e => setCreateForm(p => ({ ...p, firstName: e.target.value }))} size="small" required />
            <TextField label="Last Name" value={createForm.lastName} onChange={e => setCreateForm(p => ({ ...p, lastName: e.target.value }))} size="small" required />
            <TextField label="Phone" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} size="small" />
            <TextField label="Email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} size="small" />
            <TextField label="National ID" value={createForm.nationalId} onChange={e => setCreateForm(p => ({ ...p, nationalId: e.target.value }))} size="small" />
            <TextField label="Occupation" value={createForm.occupation} onChange={e => setCreateForm(p => ({ ...p, occupation: e.target.value }))} size="small" />
            <TextField label="Address" value={createForm.address} onChange={e => setCreateForm(p => ({ ...p, address: e.target.value }))} size="small" fullWidth sx={{ gridColumn: '1 / -1' }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateParent} disabled={createDialogLoading || !createForm.firstName || !createForm.lastName} startIcon={createDialogLoading ? <CircularProgress size={14} color="inherit" /> : <AddIcon />} sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>
            {createDialogLoading ? 'Creating...' : 'Create & Select'}
          </Button>
        </DialogActions>
      </Dialog>
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
