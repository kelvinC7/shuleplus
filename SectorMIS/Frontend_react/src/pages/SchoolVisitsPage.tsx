import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { fetchSchoolVisits, fetchSchools, startSchoolVisit, updateSchoolVisit } from '@/services/sei-api';
import type { SchoolRecord, SchoolVisit } from '@/types';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

const CHECKLIST_KEYS = [
  'studentAttendanceVerified',
  'staffAttendanceVerified',
  'devicesVerified',
  'recordsVerified',
  'observationsCaptured',
] as const;

export default function SchoolVisitsPage() {
  const [visits, setVisits] = useState<SchoolVisit[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [activeVisit, setActiveVisit] = useState<SchoolVisit | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  async function reload() {
    const [v, s] = await Promise.all([fetchSchoolVisits(), fetchSchools()]);
    setVisits(v);
    setSchools(s);
    if (!schoolId && s[0]) setSchoolId(s[0].id);
    const open = v.find((x) => !x.completedAt);
    setActiveVisit(open ?? null);
    if (open?.observations && typeof open.observations === 'object') {
      setChecklist(open.observations as Record<string, boolean>);
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleStart() {
    const school = schools.find((s) => s.id === schoolId);
    if (!school) return;
    setStarting(true);
    try {
      await startSchoolVisit({ schoolId: school.id, schoolName: school.name });
      await reload();
    } finally {
      setStarting(false);
    }
  }

  async function saveProgress(complete?: boolean) {
    if (!activeVisit) return;
    await updateSchoolVisit(activeVisit.id, {
      observations: { ...checklist, notes },
      report: { summary: notes, completedChecklist: checklist },
      complete,
    });
    await reload();
    if (complete) {
      setChecklist({});
      setNotes('');
    }
  }

  if (loading) return <PageLoading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionCard
        title="School visit mode"
        subtitle="Verify attendance, devices, and records; capture evidence and recommendations"
      >
        <TextField select fullWidth size="small" label="School" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} sx={{ mb: 2 }}>
          {schools.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" disabled={starting || Boolean(activeVisit)} onClick={handleStart}>
          Start school visit
        </Button>
      </SectionCard>

      {activeVisit ? (
        <SectionCard title={`Visit in progress · ${activeVisit.schoolName}`}>
          {CHECKLIST_KEYS.map((key) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={Boolean(checklist[key])}
                  onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                />
              }
              label={key.replace(/([A-Z])/g, ' $1')}
            />
          ))}
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Observations & recommendations"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={() => saveProgress(false)}>
              Save progress
            </Button>
            <Button variant="contained" onClick={() => saveProgress(true)}>
              Complete visit
            </Button>
          </Box>
        </SectionCard>
      ) : null}

      <SectionCard title="Recent visits">
        <List dense>
          {visits.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No visits recorded.</Typography>
          ) : (
            visits.map((v) => (
              <ListItem key={v.id} divider>
                <ListItemText
                  primary={v.schoolName}
                  secondary={`Started ${new Date(v.startedAt).toLocaleString()}${v.completedAt ? ` · Completed ${new Date(v.completedAt).toLocaleString()}` : ' · In progress'}`}
                />
              </ListItem>
            ))
          )}
        </List>
      </SectionCard>
    </Box>
  );
}
