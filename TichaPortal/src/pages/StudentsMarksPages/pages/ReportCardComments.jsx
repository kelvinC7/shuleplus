import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import useTpAcademic from '../../../hooks/useTpAcademic';
import {
  fetchClassStudents,
  fetchMyClasses,
  fetchReportCardComments,
  fetchReportCardSettings,
  saveReportCardComments,
  tpApiError,
} from '../../../services/teacherPortalApi';
import { useTpToast } from '../../../components/TpToast.jsx';
import { brand } from '../../../theme/theme';

const labelSx = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8', mb: 0.5 };

export default function ReportCardComments() {
  const { academicYear, term, ready, settings } = useTpAcademic();
  const toast = useTpToast();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [comment, setComment] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const year = academicYear || settings?.currentAcademicYear || '';
  const trm = term || settings?.currentTerm || '';

  useEffect(() => {
    if (!ready) return;
    fetchReportCardSettings()
      .then((s) => {
        setEnabled(s?.enableClassTeacherComments !== false);
        setHint(s?.classTeacherCommentHint || '');
      })
      .catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready || !year || !trm) return;
    fetchMyClasses({ academicYear: year, term: trm })
      .then((r) => setClasses(r?.classes ?? []))
      .catch(() => setClasses([]));
  }, [ready, year, trm]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId('');
      return;
    }
    fetchClassStudents(classId, undefined, year)
      .then((list) => setStudents(Array.isArray(list) ? list : list?.rows ?? []))
      .catch(() => setStudents([]));
  }, [classId, year]);

  const loadComment = useCallback(async () => {
    if (!studentId || !classId || !year) return;
    setLoading(true);
    try {
      const row = await fetchReportCardComments({
        studentId,
        classId,
        academicYear: year,
        term: trm || 'All',
      });
      setComment(row?.classTeacherComment || '');
    } catch {
      setComment('');
    } finally {
      setLoading(false);
    }
  }, [studentId, classId, year, trm]);

  useEffect(() => {
    void loadComment();
  }, [loadComment]);

  async function handleSave(e) {
    e.preventDefault();
    if (!enabled) {
      toast.error('Class teacher comments are disabled in school settings');
      return;
    }
    setSaving(true);
    try {
      await saveReportCardComments({
        studentId,
        classId,
        academicYear: year,
        term: trm || 'All',
        classTeacherComment: comment,
        role: 'class',
      });
      toast.success('Comment saved on report card');
    } catch (err) {
      toast.error(tpApiError(err, 'Could not save comment'));
    } finally {
      setSaving(false);
    }
  }

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        label: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.studentCode,
      })),
    [students]
  );

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: brand.navy }}>Report card comments</Typography>
          <Typography sx={{ mt: 0.25, fontSize: 12, color: '#64748B' }}>{year} - {trm}</Typography>
        </Box>

        {!enabled && (
          <Alert severity="warning">
            Class teacher comments are turned off. Ask your organization admin to enable them under Academic settings.
          </Alert>
        )}

        <Paper component="form" onSubmit={handleSave} variant="outlined" sx={{ borderRadius: 3, borderColor: '#E2E8F0', p: 2.5, boxShadow: '0 1px 2px rgba(19,33,61,0.05)' }}>
          <Stack spacing={2}>
            <Box>
              <Box component="span" sx={labelSx}>Class</Box>
              <TextField select fullWidth size="small" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <MenuItem value="">Select class</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.label || c.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Box component="span" sx={labelSx}>Student</Box>
              <TextField select fullWidth size="small" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId}>
                <MenuItem value="">Select student</MenuItem>
                {studentOptions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Box component="span" sx={labelSx}>Comment</Box>
              {hint ? <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.5 }}>{hint}</Typography> : null}
              <TextField
                fullWidth
                multiline
                minRows={4}
                size="small"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={!studentId || loading}
                placeholder="Write a short comment for this student's report card"
              />
            </Box>

            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !studentId || !enabled}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ bgcolor: brand.primary, color: brand.navy, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: brand.primaryStrong } }}
              >
                Save comment
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
