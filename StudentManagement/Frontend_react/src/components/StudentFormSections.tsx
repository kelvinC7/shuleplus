import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormControl,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import type { ApiParent } from '@/types';
import { updateParent } from '@/services/api';

export type ParentSelection = { parentId: string; role: 'FATHER' | 'MOTHER' | 'GUARDIAN'; label: string };

export type StudentExtendedForm = {
  fullName: string;
  familyName: string;
  gender: string;
  dob: string;
  nationality: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  sdmCode: string;
  bloodGroup: string;
  allergies: string;
  hasMedicalCondition: string;
  medicalConditionDetails: string;
  fatherLiving: boolean;
  motherLiving: boolean;
  academicYear: string;
  term: string;
  joiningDate: string;
  formerSchool: string;
  leavingReason: string;
  studentType: 'DAY' | 'BOARDING';
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function givenNamesFrom(fullName: string, familyName?: string) {
  const full = fullName.trim();
  const family = familyName?.trim();
  if (family) {
    const stripped = full.replace(new RegExp(`\\s+${escapeRegExp(family)}$`, 'i'), '').trim();
    if (stripped && stripped.toLowerCase() !== full.toLowerCase()) return stripped;
  }
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, -1).join(' ');
  return full;
}

export function inferFamilyName(fullName: string, currentFamilyName?: string) {
  const full = fullName.trim();
  const current = currentFamilyName?.trim();
  if (current && new RegExp(`(?:^|\\s)${escapeRegExp(current)}$`, 'i').test(full)) return current;
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts[parts.length - 1] ?? '';
  return current ?? '';
}

export function applyFamilyName(fullName: string, previousFamilyName: string, nextFamilyName: string) {
  const family = nextFamilyName.trim();
  const given = givenNamesFrom(fullName, previousFamilyName);
  return {
    familyName: nextFamilyName,
    fullName: [given, family].filter(Boolean).join(' '),
  };
}
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      {children}
    </Typography>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '120px 1fr' }, alignItems: 'center', mb: 2, gap: { xs: 0.5, md: 0 } }}>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      {children}
    </Box>
  );
}

export function ResidenceFields({
  form,
  set,
}: {
  form: Pick<StudentExtendedForm, 'district' | 'sector' | 'cell' | 'village'>;
  set: (field: string, value: string) => void;
}) {
  return (
    <>
      <SectionTitle>Residence</SectionTitle>
      <Field label="District">
        <TextField value={form.district} onChange={(e) => set('district', e.target.value)} variant="standard" size="small" placeholder="e.g. Gasabo" sx={{ width: '100%' }} />
      </Field>
      <Field label="Sector">
        <TextField value={form.sector} onChange={(e) => set('sector', e.target.value)} variant="standard" size="small" placeholder="e.g. Remera" sx={{ width: '100%' }} />
      </Field>
      <Field label="Cell">
        <TextField value={form.cell} onChange={(e) => set('cell', e.target.value)} variant="standard" size="small" placeholder="e.g. Rukiri I" sx={{ width: '100%' }} />
      </Field>
      <Field label="Village">
        <TextField value={form.village} onChange={(e) => set('village', e.target.value)} variant="standard" size="small" placeholder="e.g. Amahoro" sx={{ width: '100%' }} />
      </Field>
    </>
  );
}

export function StudentTypeFields({
  form,
  set,
}: {
  form: Pick<StudentExtendedForm, 'studentType'>;
  set: (field: string, value: string) => void;
}) {
  return (
    <>
      <SectionTitle>Student type</SectionTitle>
      <Field label="Residence">
        <RadioGroup
          row
          value={form.studentType}
          onChange={(e) => set('studentType', e.target.value)}
        >
          <FormControlLabel value="DAY" control={<Radio size="small" />} label="Day Scholar" />
          <FormControlLabel value="BOARDING" control={<Radio size="small" />} label="Boarding Student" />
        </RadioGroup>
      </Field>
    </>
  );
}

function ParentAutocomplete({
  label,
  options,
  value,
  loading,
  onSearch,
  onSelect,
  onCreate,
  living,
  onLivingChange,
  onEdit,
}: {
  label: string;
  options: ApiParent[];
  value: ParentSelection | null;
  loading: boolean;
  onSearch: (q: string) => void;
  onSelect: (v: ParentSelection | null) => void;
  onCreate: () => void;
  living: boolean;
  onLivingChange: (living: boolean) => void;
  onEdit?: (parentId: string) => void;
}) {
  return (
    <>
      <Field label={label}>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', width: '100%' }}>
          <Autocomplete
            options={options}
            value={value ? ({ id: value.parentId, firstName: value.label.split(' ')[0], lastName: value.label.split(' ').slice(1).join(' ') } as ApiParent) : null}
            onChange={(_, v) => {
              if (v) onSelect({ parentId: v.id, role: label.toUpperCase() as 'FATHER' | 'MOTHER', label: `${v.firstName} ${v.lastName}` });
              else onSelect(null);
            }}
            onInputChange={(_, v) => onSearch(v)}
            loading={loading}
            getOptionLabel={(o) => `${o.firstName} ${o.lastName}`}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            filterOptions={(o) => o}
            sx={{ flex: 1 }}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{option.firstName} {option.lastName}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {[option.phone && `Phone: ${option.phone}`, option.nationalId && `ID: ${option.nationalId}`].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search parent..." variant="standard" sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }} />
            )}
          />
          {value && onEdit ? (
            <IconButton
              onClick={() => onEdit(value.parentId)}
              size="small"
              title={`Edit this ${label.toLowerCase()}`}
              sx={{ color: 'primary.main', mb: 0.5 }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
          <IconButton onClick={onCreate} size="small" sx={{ color: 'primary.main', mb: 0.5 }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </Field>
      <Box sx={{ pl: { md: '120px' }, mb: 2 }}>
        <FormControlLabel
          control={<Checkbox checked={living} onChange={(e) => onLivingChange(e.target.checked)} size="small" />}
          label={
            <Typography sx={{ fontSize: '0.8125rem' }}>
              {living ? 'Living' : 'Deceased'}
              <Typography component="span" sx={{ display: 'block', fontSize: '0.6875rem', color: 'text.secondary' }}>
                Uncheck if no longer living
              </Typography>
            </Typography>
          }
        />
      </Box>
    </>
  );
}

export function FamilyFields({
  selectedFather,
  selectedMother,
  guardians,
  fatherOptions,
  motherOptions,
  guardianOptions,
  fatherSearchLoading,
  motherSearchLoading,
  guardianSearchLoading,
  fatherLiving,
  motherLiving,
  onSearchFather,
  onSearchMother,
  onSearchGuardian,
  onSelectFather,
  onSelectMother,
  onGuardiansChange,
  onFatherLivingChange,
  onMotherLivingChange,
  onCreateFather,
  onCreateMother,
  onCreateGuardian,
  onEditFather,
  onEditMother,
}: {
  selectedFather: ParentSelection | null;
  selectedMother: ParentSelection | null;
  guardians: ParentSelection[];
  fatherOptions: ApiParent[];
  motherOptions: ApiParent[];
  guardianOptions: ApiParent[];
  fatherSearchLoading: boolean;
  motherSearchLoading: boolean;
  guardianSearchLoading: boolean;
  fatherLiving: boolean;
  motherLiving: boolean;
  onSearchFather: (q: string) => void;
  onSearchMother: (q: string) => void;
  onSearchGuardian: (q: string) => void;
  onSelectFather: (v: ParentSelection | null) => void;
  onSelectMother: (v: ParentSelection | null) => void;
  onGuardiansChange: (v: ParentSelection[]) => void;
  onFatherLivingChange: (living: boolean) => void;
  onMotherLivingChange: (living: boolean) => void;
  onCreateFather: () => void;
  onCreateMother: () => void;
  onCreateGuardian: () => void;
  onEditFather: (parentId: string) => void;
  onEditMother: (parentId: string) => void;
}) {
  return (
    <Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
      <Box>
        <SectionTitle>Father</SectionTitle>
        <ParentAutocomplete
          label="Father"
          options={fatherOptions}
          value={selectedFather}
          loading={fatherSearchLoading}
          onSearch={onSearchFather}
          onSelect={onSelectFather}
          onCreate={onCreateFather}
          living={fatherLiving}
          onLivingChange={onFatherLivingChange}
          onEdit={onEditFather}
        />
      </Box>
      <Box>
        <SectionTitle>Mother</SectionTitle>
        <ParentAutocomplete
          label="Mother"
          options={motherOptions}
          value={selectedMother}
          loading={motherSearchLoading}
          onSearch={onSearchMother}
          onSelect={onSelectMother}
          onCreate={onCreateMother}
          living={motherLiving}
          onLivingChange={onMotherLivingChange}
          onEdit={onEditMother}
        />
      </Box>
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <SectionTitle>Guardians</SectionTitle>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mb: 2 }}>
          Add other guardians (uncle, aunt, sponsor, etc.) responsible for this student.
        </Typography>
        {guardians.map((g, idx) => (
          <Box key={g.parentId} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <TextField value={g.label} size="small" variant="standard" disabled sx={{ flex: 1 }} />
            <IconButton
              size="small"
              color="error"
              onClick={() => onGuardiansChange(guardians.filter((_, i) => i !== idx))}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', maxWidth: 480 }}>
          <Autocomplete
            options={guardianOptions}
            onChange={(_, v) => {
              if (!v) return;
              if (guardians.some((g) => g.parentId === v.id)) return;
              onGuardiansChange([...guardians, { parentId: v.id, role: 'GUARDIAN', label: `${v.firstName} ${v.lastName}` }]);
            }}
            onInputChange={(_, v) => onSearchGuardian(v)}
            loading={guardianSearchLoading}
            getOptionLabel={(o) => `${o.firstName} ${o.lastName}`}
            filterOptions={(o) => o}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search guardian to add..." variant="standard" size="small" />
            )}
          />
          <IconButton onClick={onCreateGuardian} size="small" sx={{ color: 'primary.main', mb: 0.5 }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
    </Box>
  );
}

export function MedicalFields({
  form,
  set,
}: {
  form: Pick<StudentExtendedForm, 'bloodGroup' | 'allergies' | 'hasMedicalCondition' | 'medicalConditionDetails'>;
  set: (field: string, value: string) => void;
}) {
  const hasCondition = form.hasMedicalCondition === 'yes';
  return (
    <Box sx={{ maxWidth: 720 }}>
      <SectionTitle>Health & Well-being</SectionTitle>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px 24px', md: '24px 48px' } }}>
        <Field label="Blood Group">
          <Select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} variant="standard" size="small" sx={{ width: '100%' }}>
            {['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => (
              <MenuItem key={b} value={b}>{b}</MenuItem>
            ))}
          </Select>
        </Field>
        <Field label="Allergies">
          <TextField value={form.allergies} onChange={(e) => set('allergies', e.target.value)} variant="standard" size="small" placeholder="List any allergies" sx={{ width: '100%' }} />
        </Field>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Field label="Medical condition">
          <FormControl>
            <RadioGroup
              row
              value={form.hasMedicalCondition}
              onChange={(e) => {
                set('hasMedicalCondition', e.target.value);
                if (e.target.value === 'no') set('medicalConditionDetails', '');
              }}
            >
              <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
              <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
            </RadioGroup>
          </FormControl>
        </Field>
        {hasCondition ? (
          <Field label="Specify condition">
            <TextField
              value={form.medicalConditionDetails}
              onChange={(e) => set('medicalConditionDetails', e.target.value)}
              variant="standard"
              size="small"
              placeholder="Describe the condition, medication, or special care needed"
              multiline
              minRows={2}
              sx={{ width: '100%' }}
            />
          </Field>
        ) : null}
      </Box>
    </Box>
  );
}

export function EditParentDialog({
  open,
  role,
  parent,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: 'FATHER' | 'MOTHER';
  parent: ApiParent | null;
  onClose: () => void;
  onSaved: (updated: ApiParent) => void;
}) {
  const [formState, setFormState] = useState({
    firstName: '', lastName: '', phone: '', email: '', nationalId: '', occupation: '', address: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && parent) {
      setFormState({
        firstName: parent.firstName ?? '',
        lastName: parent.lastName ?? '',
        phone: parent.phone ?? '',
        email: parent.email ?? '',
        nationalId: parent.nationalId ?? '',
        occupation: parent.occupation ?? '',
        address: parent.address ?? '',
      });
    }
  }, [open, parent]);

  const handleSave = async () => {
    if (!parent) return;
    setSaving(true);
    try {
      onSaved(await updateParent(parent.id, formState));
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
        Edit {role === 'FATHER' ? 'Father' : 'Mother'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1 }}>
          <TextField label="First Name" value={formState.firstName} onChange={e => setFormState(p => ({ ...p, firstName: e.target.value }))} size="small" required />
          <TextField label="Last Name" value={formState.lastName} onChange={e => setFormState(p => ({ ...p, lastName: e.target.value }))} size="small" required />
          <TextField label="Phone" value={formState.phone} onChange={e => setFormState(p => ({ ...p, phone: e.target.value }))} size="small" />
          <TextField label="Email" value={formState.email} onChange={e => setFormState(p => ({ ...p, email: e.target.value }))} size="small" />
          <TextField label="National ID" value={formState.nationalId} onChange={e => setFormState(p => ({ ...p, nationalId: e.target.value }))} size="small" />
          <TextField label="Occupation" value={formState.occupation} onChange={e => setFormState(p => ({ ...p, occupation: e.target.value }))} size="small" />
          <TextField label="Address" value={formState.address} onChange={e => setFormState(p => ({ ...p, address: e.target.value }))} size="small" fullWidth sx={{ gridColumn: '1 / -1' }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !formState.firstName || !formState.lastName}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
          sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function buildStudentPayload(form: StudentExtendedForm, nameParts: string[], photoUrl: string, selectedClassId: string, parents: { parentId: string; role: string }[]) {
  const familyName = form.familyName.trim() || nameParts.slice(1).join(' ') || nameParts[0] || '';
  const givenNames = givenNamesFrom(form.fullName, familyName) || nameParts[0] || familyName;
  return {
    firstName: givenNames,
    lastName: familyName,
    gender: form.gender === 'Male' ? 'MALE' : 'FEMALE',
    dateOfBirth: form.dob || undefined,
    nationality: form.nationality || undefined,
    district: form.district || undefined,
    sector: form.sector || undefined,
    cell: form.cell || undefined,
    village: form.village || undefined,
    bloodGroup: form.bloodGroup === 'Unknown' ? undefined : form.bloodGroup,
    allergies: form.allergies || undefined,
    hasMedicalCondition: form.hasMedicalCondition === 'yes',
    medicalConditionDetails: form.hasMedicalCondition === 'yes' ? form.medicalConditionDetails || undefined : undefined,
    fatherLiving: form.fatherLiving,
    motherLiving: form.motherLiving,
    sdmCode: form.sdmCode || undefined,
    formerSchool: form.formerSchool || undefined,
    leavingReason: form.leavingReason || undefined,
    studentPhoto: photoUrl || undefined,
    classId: selectedClassId,
    academicYear: form.academicYear || undefined,
    term: form.term || undefined,
    joiningDate: form.joiningDate || undefined,
    isBoarding: form.studentType === 'BOARDING',
    parents: parents.length > 0 ? parents : undefined,
  };
}
