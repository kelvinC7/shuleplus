import { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { useAuth } from '@/contexts/auth-context';
import { fetchDeoSettings, updateDeoSettings } from '@/services/deo-api';
import type { SeiSettings } from '@/types';
import { SectionCard } from '@/modules/shared/section-card';

export default function SettingsPage() {
  const { summary } = useAuth();
  const [settings, setSettings] = useState<SeiSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeoSettings().then(setSettings);
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await updateDeoSettings(settings);
      setSettings(next);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <SectionCard title="SEI module settings" subtitle="Morning compliance, refresh, and scheduled reports">
      <Typography sx={{ fontSize: '0.875rem', mb: 2 }}>
        Organization: {summary?.organizationName ?? '-'} · Sector: {summary?.sector ?? '-'}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, maxWidth: 480 }}>
        <TextField
          label="Morning cutoff (HH:mm)"
          size="small"
          value={settings.morningCutoffTime ?? '08:00'}
          onChange={(e) => setSettings({ ...settings, morningCutoffTime: e.target.value })}
        />
        <TextField
          label="Auto-refresh (seconds)"
          size="small"
          type="number"
          value={settings.autoRefreshSeconds ?? 120}
          onChange={(e) => setSettings({ ...settings, autoRefreshSeconds: Number(e.target.value) })}
        />
        <TextField
          label="Scheduled report email"
          size="small"
          value={settings.reportSchedule?.email ?? ''}
          onChange={(e) =>
            setSettings({
              ...settings,
              reportSchedule: { ...settings.reportSchedule, email: e.target.value },
            })
          }
        />
        <TextField
          select
          label="Report hour (local)"
          size="small"
          value={settings.reportSchedule?.hourLocal ?? 8}
          onChange={(e) =>
            setSettings({
              ...settings,
              reportSchedule: { ...settings.reportSchedule, hourLocal: Number(e.target.value) },
            })
          }
        >
          {Array.from({ length: 24 }, (_, h) => (
            <MenuItem key={h} value={h}>
              {String(h).padStart(2, '0')}:00
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Daily email report"
          size="small"
          value={settings.reportSchedule?.enabled ? 'yes' : 'no'}
          onChange={(e) =>
            setSettings({
              ...settings,
              reportSchedule: { ...settings.reportSchedule, enabled: e.target.value === 'yes' },
            })
          }
        >
          <MenuItem value="yes">Enabled</MenuItem>
          <MenuItem value="no">Disabled</MenuItem>
        </TextField>
      </Box>
      <Button sx={{ mt: 2 }} variant="contained" disabled={saving} onClick={save}>
        Save settings
      </Button>
    </SectionCard>
  );
}
