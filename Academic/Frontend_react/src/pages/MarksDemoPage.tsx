import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { listClasses, marksDemoApply, marksDemoRemove, marksDemoStatus, type MarksDemoPhase } from '@/services/api';
import { toast } from '@/lib/toast';

const NAVY = '#000435';

export default function MarksDemoPage() {
  const { academicYear, term } = useAcademicSettings();
  const [classes, setClasses] = useState<Array<{ id: string; name: string; stream?: string | null }>>([]);
  const [classId, setClassId] = useState('');
  const [phase, setPhase] = useState<MarksDemoPhase>('quiz');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ enabled: boolean; assessmentCount: number; markRows: number } | null>(
    null
  );

  useEffect(() => {
    listClasses()
      .then((rows) => {
        setClasses(rows);
        const p1 = rows.find((c) => c.name.trim().toLowerCase() === 'p1');
        if (p1?.id) setClassId(p1.id);
        else if (rows[0]?.id) setClassId(rows[0].id);
      })
      .catch(() => toast.error('Could not load classes'));
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await marksDemoStatus(classId || undefined);
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, [classId]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const runApply = async () => {
    if (!classId || !academicYear || !term) {
      toast.error('Choose class, year, and term first');
      return;
    }
    setBusy(true);
    try {
      const data = await marksDemoApply({ classId, academicYear, term, phase });
      toast.success('Demo marks applied', {
        detail: `${data.subjects.length} subjects · ${data.students} students · phase ${data.phase}`,
      });
      await refreshStatus();
    } catch (e) {
      toast.error('Demo apply failed', { detail: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const runDisable = async () => {
    setBusy(true);
    try {
      const data = await marksDemoRemove(classId || undefined);
      toast.success('Demo marks removed', { detail: `${data.deletedAssessments} assessments deleted` });
      await refreshStatus();
    } catch (e) {
      toast.error('Could not remove demo marks', { detail: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === classId);
  const classLabel = selectedClass
    ? [selectedClass.name, selectedClass.stream].filter(Boolean).join(' ')
    : '';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>
        Marks demo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Seed sample Quiz marks first, then add Exam marks, so you can preview term and mid-term reports. Demo data is
        tagged and can be removed in one click.
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {[c.name, c.stream].filter(Boolean).join(' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary">
              Year: <strong>{academicYear || '—'}</strong> · Term: <strong>{term || '—'}</strong> (from Academic settings)
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Phase</InputLabel>
              <Select label="Phase" value={phase} onChange={(e) => setPhase(e.target.value as MarksDemoPhase)}>
                <MenuItem value="quiz">Quiz / continuous only (mid-term reports)</MenuItem>
                <MenuItem value="exam">Exam only (add to existing demo)</MenuItem>
                <MenuItem value="all">Quiz + exam together</MenuItem>
              </Select>
            </FormControl>

            {status && (
              <Alert severity={status.enabled ? 'info' : 'warning'}>
                {status.enabled
                  ? `${status.assessmentCount} demo assessment(s), ${status.markRows} mark row(s)${classLabel ? ` for ${classLabel}` : ''}.`
                  : 'No demo marks loaded yet for this scope.'}
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" disabled={busy} onClick={() => void runApply()} sx={{ flex: 1 }}>
                {busy ? <CircularProgress size={22} color="inherit" /> : 'Apply demo marks'}
              </Button>
              <Button variant="outlined" color="error" disabled={busy} onClick={() => void runDisable()}>
                Remove demo marks
              </Button>
            </Stack>

            <Button component={RouterLink} to="/report-cards" variant="text">
              Open report cards →
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
        {`CLI (Academic Backend):\n  npm run marks:demo -- apply --class "${classLabel || 'P1'}" --year "${academicYear}" --term "${term}"\n  npm run marks:demo -- apply --phase exam ...\n  npm run marks:demo:off`}
      </Typography>
    </Box>
  );
}
