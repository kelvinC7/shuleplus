import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Tooltip, LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssessment, getAssessmentMarks, enterAssessmentMarks, updateAssessmentStatus } from '@/services/api';
import { toast } from '@/lib/toast';
import type { ApiAssessment, ApiAssessmentMark } from '@/types';

const MARK_STATUSES = [
  { value: 'PRESENT', label: 'Present', color: '#16a34a' },
  { value: 'ABSENT', label: 'Absent', color: '#dc2626' },
  { value: 'EXCUSED', label: 'Excused', color: '#d97706' },
  { value: 'EXEMPT', label: 'Exempt', color: '#7c3aed' },
  { value: 'MISSING', label: 'Missing', color: '#94a3b8' },
  { value: 'NOT_APPLICABLE', label: 'N/A', color: '#64748b' },
];

interface MarkEntry {
  studentId: string;
  score: string;
  markStatus: string;
  remarks: string;
}

export default function TeacherMarkEntryPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [marks, setMarks] = useState<ApiAssessmentMark[]>([]);
  const [entries, setEntries] = useState<Map<string, MarkEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline' | null>(null);
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  const fetchData = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const aData = await getAssessment(assessmentId);
      setAssessment(aData);
      setMarks(aData.marks || []);

      const entryMap = new Map<string, MarkEntry>();
      for (const m of (aData.marks || [])) {
        entryMap.set(m.studentId, {
          studentId: m.studentId,
          score: m.score != null ? String(m.score) : '',
          markStatus: m.markStatus || 'PRESENT',
          remarks: m.remarks || '',
        });
      }
      setEntries(entryMap);
    } catch {
      toast.error('Failed to load assessment');
    }
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxMark = assessment?.maxMark ?? 0;

  const validateMark = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Invalid number';
    if (num < 0) return 'Mark cannot be negative';
    if (num > maxMark) return `Mark cannot exceed ${maxMark}`;
    return '';
  };

  const handleScoreChange = (studentId: string, value: string) => {
    const err = validateMark(value);
    setValidationErrors((prev) => {
      const next = new Map(prev);
      if (err) next.set(studentId, err);
      else next.delete(studentId);
      return next;
    });
    setEntries((prev) => {
      const next = new Map(prev);
      const entry = next.get(studentId) || { studentId, score: '', markStatus: 'PRESENT', remarks: '' };
      entry.score = value;
      next.set(studentId, entry);
      return next;
    });
    isDirty.current = true;
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const entry = next.get(studentId) || { studentId, score: '', markStatus: 'PRESENT', remarks: '' };
      entry.markStatus = status;
      if (status !== 'PRESENT') entry.score = '';
      next.set(studentId, entry);
      return next;
    });
    isDirty.current = true;
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const entry = next.get(studentId) || { studentId, score: '', markStatus: 'PRESENT', remarks: '' };
      entry.remarks = value;
      next.set(studentId, entry);
      return next;
    });
    isDirty.current = true;
  };

  const saveToServer = async (showToast = true) => {
    if (!assessmentId || validationErrors.size > 0) return false;
    setSaveStatus('saving');
    try {
      const marksPayload = Array.from(entries.values())
        .filter((e) => e.score || e.markStatus !== 'PRESENT')
        .map((e) => ({
          studentId: e.studentId,
          score: e.score ? parseFloat(e.score) : undefined,
          markStatus: e.markStatus,
          remarks: e.remarks || undefined,
        }));

      await enterAssessmentMarks(assessmentId, { marks: marksPayload }, { skipToast: !showToast });
      const now = new Date();
      setLastSaved(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setSaveStatus('saved');
      isDirty.current = false;
      return true;
    } catch (e: any) {
      if (navigator.onLine) {
        setSaveStatus(null);
        if (!showToast) toast.error(e?.response?.data?.message || e?.message || 'Failed to save');
      } else {
        setSaveStatus('offline');
        localStorage.setItem(`mark-entry-${assessmentId}`, JSON.stringify(Array.from(entries.values())));
      }
      return false;
    }
  };

  useEffect(() => {
    if (entries.size === 0 || !isDirty.current) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => saveToServer(false), 15000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [entries]);

  useEffect(() => {
    const onOnline = async () => {
      const stored = localStorage.getItem(`mark-entry-${assessmentId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as MarkEntry[];
          const restored = new Map<string, MarkEntry>();
          for (const e of parsed) restored.set(e.studentId, e);
          setEntries(restored);
          localStorage.removeItem(`mark-entry-${assessmentId}`);
          await saveToServer(false);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [assessmentId]);

  const handleSubmit = async () => {
    if (!assessmentId) return;
    const saved = await saveToServer(false);
    if (!saved) return;
    try {
      await updateAssessmentStatus(assessmentId, 'SUBMITTED');
      navigate('/teacher');
    } catch {
      /* interceptor toasts the error */
    }
  };

  const entryArray = Array.from(entries.values());
  const completedCount = entryArray.filter((e) => e.markStatus === 'PRESENT' && e.score).length;
  const absentCount = entryArray.filter((e) => e.markStatus === 'ABSENT').length;
  const excusedCount = entryArray.filter((e) => e.markStatus === 'EXCUSED' || e.markStatus === 'EXEMPT' || e.markStatus === 'NOT_APPLICABLE').length;
  const missingCount = entryArray.filter((e) => e.markStatus === 'MISSING' || (!e.score && e.markStatus === 'PRESENT')).length;
  const totalStudents = entryArray.length;
  const completionPct = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>;
  }

  if (!assessment) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Assessment not found</Typography></Box>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/teacher')} size="small" sx={{ color: '#64748b' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>{assessment.title}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {assessment.subject?.name} — {assessment.class?.stream ? `${assessment.class?.name} ${assessment.class?.stream}` : assessment.class?.name}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>Max: {maxMark}</Typography>
        {saveStatus === 'saved' && <CloudDoneIcon sx={{ fontSize: 16, color: '#16a34a' }} />}
        {saveStatus === 'offline' && <CloudOffIcon sx={{ fontSize: 16, color: '#d97706' }} />}
      </Box>

      {/* Progress Bar */}
      <Box sx={{ px: 3, pt: 1, pb: 0.5, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <LinearProgress variant="determinate" value={completionPct} sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: completionPct === 100 ? '#16a34a' : '#d97706' } }} />
      </Box>

      {/* Status Chips */}
      <Box sx={{ display: 'flex', gap: 1, px: 3, py: 1, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap' }}>
        <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={`${completedCount}/${totalStudents} completed (${completionPct}%)`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(34,197,94,0.08)', color: '#16a34a' }} />
        {absentCount > 0 && <Chip label={`${absentCount} absent`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626' }} />}
        {excusedCount > 0 && <Chip label={`${excusedCount} excused/exempt`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(124,58,237,0.08)', color: '#7c3aed' }} />}
        {missingCount > 0 && <Chip icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={`${missingCount} missing`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(245,158,11,0.08)', color: '#d97706' }} />}
        <Box sx={{ flex: 1 }} />
        {lastSaved && <Typography sx={{ fontSize: '0.6875rem', color: '#16a34a', alignSelf: 'center' }}>Last saved: {lastSaved}</Typography>}
      </Box>

      {/* Student Table */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc', width: 40, textAlign: 'center' }}>#</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc' }}>Student Name</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc', textAlign: 'center', width: 130 }}>Status</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc', textAlign: 'center', width: 100 }}>Mark</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc', textAlign: 'center', width: 80 }}>%</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc' }}>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {marks.map((m, idx) => {
                const entry = entries.get(m.studentId);
                const markStatus = entry?.markStatus || 'PRESENT';
                const score = entry?.score || '';
                const pct = score && maxMark > 0 ? Math.round((parseFloat(score) / maxMark) * 10000) / 100 : null;
                const ve = validationErrors.get(m.studentId);
                const statusInfo = MARK_STATUSES.find((s) => s.value === markStatus);

                return (
                  <TableRow key={m.studentId} sx={{ bgcolor: idx % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white' }}>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>{idx + 1}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{m.student?.firstName} {m.student?.lastName}</Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{m.student?.studentUid}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select value={markStatus} onChange={(e) => handleStatusChange(m.studentId, e.target.value)} sx={{ fontSize: '0.75rem', height: 32 }}>
                          {MARK_STATUSES.map((s) => (
                            <MenuItem key={s.value} value={s.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color }} />
                                {s.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {markStatus === 'PRESENT' ? (
                        <TextField
                          size="small" type="number" value={score}
                          onChange={(e) => handleScoreChange(m.studentId, e.target.value)}
                          placeholder="—" error={!!ve} helperText={ve}
                          slotProps={{ htmlInput: { min: 0, max: maxMark, step: 0.5, style: { textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600 } } }}
                          sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                      ) : (
                        <Chip label={markStatus.replace('_', ' ')} size="small"
                          sx={{ fontSize: '0.625rem', fontWeight: 600, height: 22, bgcolor: (statusInfo?.color || '#94a3b8') + '15', color: statusInfo?.color || '#94a3b8' }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: pct != null ? '#000435' : '#cbd5e1' }}>
                      {pct != null ? `${pct}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={entry?.remarks || ''}
                        onChange={(e) => handleRemarksChange(m.studentId, e.target.value)}
                        placeholder="Optional"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: '0.75rem' } }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {marks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#94a3b8', borderBottom: 'none' }}>
                    <Typography variant="body2">No students enrolled in this assessment. Open the assessment from the admin panel to add students.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, p: 2.5, px: 3, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
        <Button variant="outlined" onClick={() => saveToServer(true)} disabled={saving} startIcon={<SaveIcon />} sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}>
          {saving ? 'Saving...' : 'Save Marks'}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || completionPct < 100}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
          Submit for Review
        </Button>
      </Box>
    </Box>
  );
}
