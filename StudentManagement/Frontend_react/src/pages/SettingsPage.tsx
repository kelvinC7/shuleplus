import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import { fetchAcademicSettings, updateAcademicSettings } from '@/services/api';
import type { AcademicSettings } from '@/types';

const NAVY = '#000435';
const PRIMARY = '#FCB038';
const YEAR_PATTERN = /^\d{4}-\d{4}$/;

function validateYear(value: string): boolean {
  if (!YEAR_PATTERN.test(value)) return false;
  const [a, b] = value.split('-').map(Number);
  return b === a + 1;
}

function suggestNextYear(years: string[]): string {
  if (!years.length) {
    const start = new Date().getFullYear();
    return `${start}-${start + 1}`;
  }
  const sorted = [...years].sort();
  const last = sorted[sorted.length - 1];
  const end = Number(last.split('-')[1]);
  return `${end}-${end + 1}`;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [newYear, setNewYear] = useState('');
  const [newTerm, setNewTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAcademicSettings();
      setSettings(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const data = await updateAcademicSettings(settings);
      setSettings(data);
      setToast('Academic settings saved successfully');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save settings';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function addYear() {
    if (!settings) return;
    const value = newYear.trim() || suggestNextYear(settings.academicYears);
    if (!validateYear(value)) {
      setError('Invalid academic year. Use format 2025-2026');
      return;
    }
    if (settings.academicYears.includes(value)) {
      setError('Academic year already exists');
      return;
    }
    setSettings({
      ...settings,
      academicYears: [...settings.academicYears, value].sort(),
      currentAcademicYear: settings.currentAcademicYear ?? value,
    });
    setNewYear('');
    setError(null);
  }

  function removeYear(year: string) {
    if (!settings || settings.academicYears.length <= 1) return;
    const academicYears = settings.academicYears.filter((y) => y !== year);
    setSettings({
      ...settings,
      academicYears,
      currentAcademicYear:
        settings.currentAcademicYear === year ? academicYears[0] : settings.currentAcademicYear,
    });
  }

  function addTerm() {
    if (!settings) return;
    const value = newTerm.trim();
    if (!value) return;
    if (settings.terms.includes(value)) {
      setError('Term already exists');
      return;
    }
    setSettings({
      ...settings,
      terms: [...settings.terms, value],
      currentTerm: settings.currentTerm ?? value,
    });
    setNewTerm('');
    setError(null);
  }

  function removeTerm(term: string) {
    if (!settings || settings.terms.length <= 1) return;
    const terms = settings.terms.filter((t) => t !== term);
    setSettings({
      ...settings,
      terms,
      currentTerm: settings.currentTerm === term ? terms[0] : settings.currentTerm,
    });
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '40vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={22} sx={{ color: PRIMARY }} />
      </Box>
    );
  }

  if (!settings) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error ?? 'Unable to load settings'}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 900 }}>
      <Box>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }}>
          Academic Settings
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
          Configure academic years (e.g. 2025-2026) and school terms for enrollments and reporting.
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid rgba(0,4,53,0.08)',
            boxShadow: '0 2px 14px -4px rgba(0,4,53,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: NAVY, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarMonthOutlinedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: NAVY }}>Academic Years</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Format: 2025-2026</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {settings.academicYears.map((year) => (
              <Chip
                key={year}
                label={year}
                onDelete={settings.academicYears.length > 1 ? () => removeYear(year) : undefined}
                deleteIcon={<DeleteOutlinedIcon />}
                sx={{
                  fontWeight: 700,
                  bgcolor: settings.currentAcademicYear === year ? PRIMARY : '#f4f6fb',
                  color: settings.currentAcademicYear === year ? NAVY : 'text.primary',
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="2025-2026"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addYear()}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              variant="outlined"
              onClick={addYear}
              startIcon={<AddIcon />}
              sx={{ borderRadius: 2, flexShrink: 0, borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
            >
              Add
            </Button>
          </Box>

          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
            Current academic year
          </Typography>
          <Select
            fullWidth
            size="small"
            value={settings.currentAcademicYear ?? ''}
            onChange={(e) => setSettings({ ...settings, currentAcademicYear: e.target.value })}
            sx={{ borderRadius: 2 }}
          >
            {settings.academicYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: '1px solid rgba(0,4,53,0.08)',
            boxShadow: '0 2px 14px -4px rgba(0,4,53,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: NAVY, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EventNoteOutlinedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: NAVY }}>Terms</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>School terms for the year</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {settings.terms.map((term) => (
              <Chip
                key={term}
                label={term}
                onDelete={settings.terms.length > 1 ? () => removeTerm(term) : undefined}
                deleteIcon={<DeleteOutlinedIcon />}
                sx={{
                  fontWeight: 700,
                  bgcolor: settings.currentTerm === term ? PRIMARY : '#f4f6fb',
                  color: settings.currentTerm === term ? NAVY : 'text.primary',
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Term 1"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTerm()}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              variant="outlined"
              onClick={addTerm}
              startIcon={<AddIcon />}
              sx={{ borderRadius: 2, flexShrink: 0, borderColor: 'rgba(0,4,53,0.15)', color: NAVY }}
            >
              Add
            </Button>
          </Box>

          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
            Current term
          </Typography>
          <Select
            fullWidth
            size="small"
            value={settings.currentTerm ?? ''}
            onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
            sx={{ borderRadius: 2 }}
          >
            {settings.terms.map((term) => (
              <MenuItem key={term} value={term}>
                {term}
              </MenuItem>
            ))}
          </Select>
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={saving}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
          sx={{
            borderRadius: 2,
            bgcolor: NAVY,
            px: 3,
            py: 1.25,
            fontWeight: 700,
            '&:hover': { bgcolor: '#0a1055' },
          }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
