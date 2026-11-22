import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  getStoredReportFooterSettings,
  listAcademicStaffForReportFooter,
  saveAcademicReportFooterSettings,
  type AcademicReportFooterSettings,
} from '@/services/api';

const DEFAULT_ROLE = 'Head Teacher';

type StaffMember = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

function normalizeStaffMember(value: unknown): StaffMember | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  const base = (profile.profile ?? profile.user ?? profile) as Record<string, unknown> | undefined;
  const id = String(base?.id ?? profile.id ?? profile.userId ?? profile.uuid ?? base?.userId ?? base?.uuid ?? '');
  const name = String(
    base?.fullName ??
      profile.fullName ??
      profile.name ??
      base?.name ??
      [base?.firstName, base?.lastName].filter(Boolean).join(' ') ??
      ''
  );
  if (!id || !name) return null;
  return {
    id,
    name,
    email: String(base?.email ?? profile.email ?? profile.emailAddress ?? base?.emailAddress ?? '') || undefined,
    role: String(base?.role ?? profile.role ?? profile.position ?? profile.title ?? base?.position ?? base?.title ?? '') || undefined,
  };
}

export default function AcademicReportFooterSettingsPage() {
  const { settings, refresh } = useAcademicSettings();
  const saved = useMemo(() => settings?.reportFooter ?? getStoredReportFooterSettings() ?? {
    mode: 'head_teacher',
    roleLabel: DEFAULT_ROLE,
    selectedUserName: '',
  } as AcademicReportFooterSettings, [settings]);

  const [mode, setMode] = useState<'head_teacher' | 'custom'>(() => saved.mode ?? 'head_teacher');
  const [roleLabel, setRoleLabel] = useState(() => saved.roleLabel || DEFAULT_ROLE);
  const [selectedUserId, setSelectedUserId] = useState(() => saved.selectedUserId ?? '');
  const [selectedUserName, setSelectedUserName] = useState(() =>
    !saved.selectedUserName || [DEFAULT_ROLE, 'Authorized Signatory'].includes(saved.selectedUserName.trim())
      ? ''
      : saved.selectedUserName
  );
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffLookupReason, setStaffLookupReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadStaff = async () => {
      setLoadingStaff(true);
      try {
        const rows = await listAcademicStaffForReportFooter();
        if (!active) return;
        const normalized = rows.map(normalizeStaffMember).filter(Boolean) as StaffMember[];
        setStaffMembers(normalized);
        setStaffLookupReason(normalized.length ? '' : 'IAM returned no active organization staff names.');
      } catch (error) {
        if (active) {
          setStaffMembers([]);
          const message = axios.isAxiosError<{ message?: string }>(error)
            ? error.response?.data?.message || error.message
            : 'Unexpected staff lookup error';
          setStaffLookupReason(`The Academic server could not load staff from IAM: ${message}. You can still enter the signatory name manually.`);
        }
      } finally {
        if (active) setLoadingStaff(false);
      }
    };

    void loadStaff();
    return () => {
      active = false;
    };
  }, []);

  const previewRole = mode === 'head_teacher' ? DEFAULT_ROLE : (roleLabel || DEFAULT_ROLE);
  const previewName = selectedUserName.trim() || 'Enter signatory name';
  const headTeacherIsListed = staffMembers.some((staff) =>
    /head teacher|headteacher|principal|deputy principal/i.test(`${staff.role ?? ''} ${staff.name}`)
  );

  async function handleSave() {
    if (!selectedUserName.trim()) {
      setSaveMessage(`Enter the ${mode === 'head_teacher' ? 'Head Teacher' : 'signatory'} name before saving.`);
      return;
    }

    setSaving(true);
    setSaveMessage('');
    try {
      const payload: AcademicReportFooterSettings = {
        mode,
        roleLabel: mode === 'head_teacher' ? DEFAULT_ROLE : (roleLabel || DEFAULT_ROLE),
        selectedUserId: selectedUserId || null,
        selectedUserName: selectedUserName.trim(),
        selectedUserEmail: staffMembers.find((staff) => staff.id === selectedUserId)?.email || null,
      };
      await saveAcademicReportFooterSettings(payload);
      await refresh({ silent: true });
      setSaveMessage('Report footer signature updated successfully.');
    } catch {
      setSaveMessage('The setting was saved locally but the server could not confirm it.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Academic settings
          </Typography>
          <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#000435' }}>
            Report footer signatory
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#000435', '&:hover': { bgcolor: '#1f2a6b' } }}>
          {saving ? 'Saving…' : 'Save setting'}
        </Button>
      </Box>

      {saveMessage ? (
        <Alert severity={saveMessage.includes('successfully') ? 'success' : saveMessage.includes('Enter the') ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {saveMessage}
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#000435', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
            Footer type
          </Typography>

          <FormControl>
            <RadioGroup value={mode} onChange={(event) => setMode(event.target.value as 'head_teacher' | 'custom')}>
              <FormControlLabel value="head_teacher" control={<Radio />} label="Head Teacher" />
              <FormControlLabel value="custom" control={<Radio />} label="Custom signatory" />
            </RadioGroup>
          </FormControl>

          <Stack spacing={2} sx={{ mt: 2.5 }}>
            {mode === 'custom' ? (
              <TextField
                label="Role title"
                value={roleLabel}
                onChange={(event) => setRoleLabel(event.target.value)}
                placeholder="Dean of Study"
                fullWidth
              />
            ) : null}

            {loadingStaff ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748b' }}>
                <CircularProgress size={16} />
                Loading optional staff list from IAM…
              </Box>
            ) : staffMembers.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel id="report-footer-user-label">Choose from IAM (optional)</InputLabel>
                <Select
                  labelId="report-footer-user-label"
                  value={selectedUserId}
                  label="Choose from IAM (optional)"
                  onChange={(event) => {
                    const nextId = String(event.target.value || '');
                    const nextUser = staffMembers.find((staff) => staff.id === nextId);
                    setSelectedUserId(nextId);
                    if (nextUser) setSelectedUserName(nextUser.name);
                  }}
                >
                  <MenuItem value="">Enter a name manually</MenuItem>
                  {staffMembers.map((staff) => (
                    <MenuItem key={staff.id} value={staff.id}>
                      {staff.name}
                      {staff.role ? ` — ${staff.role}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}

            <TextField
              label={mode === 'head_teacher' ? 'Head Teacher name' : 'Signatory name'}
              value={selectedUserName}
              onChange={(event) => {
                setSelectedUserName(event.target.value);
                setSelectedUserId('');
              }}
              placeholder={mode === 'head_teacher' ? 'Enter Head Teacher full name' : 'Enter signatory full name'}
              helperText="You can type a name here even when the IAM staff list is unavailable."
              fullWidth
            />

            {mode === 'head_teacher' ? (
              <Alert severity="info">
                {staffMembers.length > 0 && !headTeacherIsListed
                  ? 'IAM returned staff names, but none is identified as Head Teacher or Principal in its name or role. Academic will not guess and assign another person. Choose the correct person from the optional list or enter the Head Teacher’s full name above.'
                  : 'IAM does not provide a dependable automatic Head Teacher match to Academic. Choose the Head Teacher from the optional staff list or enter their full name above.'}
              </Alert>
            ) : null}

            {!loadingStaff && staffLookupReason ? (
              <Alert severity="warning">
                {staffLookupReason} The list is optional; enter the name manually above.
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#000435', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
            Preview on report cards
          </Typography>
          <Box sx={{ border: '1px solid #94a3b8', borderRadius: 1, p: 2 }}>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: '#000435', mb: 1 }}>
              {previewRole} Signature &amp; Stamp
            </Typography>
            <Box sx={{ borderBottom: '1px solid #94a3b8', minHeight: 44, mb: 0.5 }} />
            <Typography sx={{ fontSize: '0.75rem', color: '#334155', fontWeight: 700 }}>
              {previewName}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
