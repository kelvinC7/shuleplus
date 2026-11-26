import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { saveReportAnalysisSettings } from '@/services/api';
import type { ReportAnalysisSettings } from '@/types/report-analysis';
import { BORDER, NAVY, MUTED } from './analysis-ui';
import { Flex } from './analysis-ui';

type Props = {
  open: boolean;
  settings: ReportAnalysisSettings;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (settings: ReportAnalysisSettings) => void;
};

function validate(s: ReportAnalysisSettings): string | null {
  if (s.bands.length < 2 || s.bands.length > 6) return 'Use between 2 and 6 bands.';
  if (s.bands.some((b) => !b.label.trim())) return 'Every band needs a name.';
  if (s.bands.some((b) => !Number.isFinite(b.min) || b.min < 0 || b.min > 100)) return 'Thresholds must be between 0 and 100.';
  if (new Set(s.bands.map((b) => b.min)).size !== s.bands.length) return 'Each band needs a different lower threshold.';
  if (!s.bands.some((b) => b.min === 0)) return 'One band must start at 0 to cover the lowest marks.';
  if (!(s.atRiskBelow >= 0 && s.atRiskBelow <= 100)) return 'Below-threshold must be between 0 and 100.';
  if (!(s.trendDelta >= 1 && s.trendDelta <= 50)) return 'Improvement threshold must be between 1 and 50 points.';
  return null;
}

export default function BandSettingsDialog({ open, settings, canEdit, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<ReportAnalysisSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setError(null);
    }
  }, [open, settings]);

  function updateBand(index: number, patch: Partial<ReportAnalysisSettings['bands'][number]>) {
    setDraft((d) => ({ ...d, bands: d.bands.map((b, i) => (i === index ? { ...b, ...patch } : b)) }));
  }

  async function handleSave() {
    const sorted = { ...draft, bands: [...draft.bands].sort((a, b) => b.min - a.min) };
    const message = validate(sorted);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveReportAnalysisSettings(sorted);
      onSaved(saved);
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not save performance settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Performance bands</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontSize: '0.8125rem', color: MUTED, mb: 2 }}>
          Bands classify each student or course average. These settings apply to every report analysis for this school.
        </Typography>
        {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert> : null}
        <Flex spacing={1.25}>
          {draft.bands.map((b, i) => (
            <Flex key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${BORDER}` }}>
              <TextField
                size="small"
                label="Band name"
                value={b.label}
                disabled={!canEdit}
                onChange={(e) => updateBand(i, { label: e.target.value })}
                sx={{ flex: 2, minWidth: 0 }}
              />
              <TextField
                size="small"
                type="number"
                label="From %"
                value={b.min}
                disabled={!canEdit}
                onChange={(e) => updateBand(i, { min: Number(e.target.value) })}
                slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5 } }}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <input
                  type="color"
                  aria-label={`Colour for ${b.label}`}
                  value={b.color}
                  disabled={!canEdit}
                  onChange={(e) => updateBand(i, { color: e.target.value })}
                  style={{ width: 40, height: 36, border: 'none', background: 'none', padding: 0, cursor: canEdit ? 'pointer' : 'default' }}
                />
                {canEdit ? (
                  <IconButton
                    size="small"
                    aria-label={`Remove ${b.label}`}
                    disabled={draft.bands.length <= 2}
                    onClick={() => setDraft((d) => ({ ...d, bands: d.bands.filter((_, idx) => idx !== i) }))}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Box>
            </Flex>
          ))}
        </Flex>
        {canEdit && draft.bands.length < 6 ? (
          <Button
            startIcon={<AddRoundedIcon />}
            onClick={() => setDraft((d) => ({ ...d, bands: [...d.bands, { label: 'New band', min: 0, color: '#64748B' }] }))}
            sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}
          >
            Add band
          </Button>
        ) : null}

        <Flex direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
          <TextField
            size="small"
            type="number"
            label="Students below (%)"
            helperText="Flags needs-improvement lists and course risk."
            value={draft.atRiskBelow}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, atRiskBelow: Number(e.target.value) }))}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
            fullWidth
          />
          <TextField
            size="small"
            type="number"
            label="Improvement threshold (points)"
            helperText="Change needed to count as improving or declining."
            value={draft.trendDelta}
            disabled={!canEdit}
            onChange={(e) => setDraft((d) => ({ ...d, trendDelta: Number(e.target.value) }))}
            slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
            fullWidth
          />
        </Flex>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
        {canEdit ? (
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, '&:hover': { bgcolor: '#1B2D52' } }}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
