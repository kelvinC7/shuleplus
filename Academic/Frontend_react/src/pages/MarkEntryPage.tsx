import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f1f5f9', color: '#64748b' },
  OPEN: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  MARK_ENTRY: { bg: 'rgba(59,130,246,0.08)', color: '#2563eb' },
  SUBMITTED: { bg: 'rgba(245,158,11,0.08)', color: '#d97706' },
  REVIEWED: { bg: 'rgba(139,92,246,0.08)', color: '#7c3aed' },
  APPROVED: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  LOCKED: { bg: 'rgba(0,4,53,0.05)', color: '#000435' },
};

interface MarkEntry {
  studentId: string;
  score: string;
  markStatus: string;
  remarks: string;
}

export default function MarkEntryPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [marks, setMarks] = useState<ApiAssessmentMark[]>([]);
  const [entries, setEntries] = useState<Map<string, MarkEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());

  const fetchData = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const [aData, marksData] = await Promise.all([
        getAssessment(assessmentId),
        getAssessmentMarks(assessmentId),
      ]);
      setAssessment(aData);
      setMarks(aData.marks || []);

      const entryMap = new Map<string, MarkEntry>();
      const enrolled = aData.marks || [];
      for (const m of enrolled) {
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

  const validateMark = (value: string, studentId: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Invalid number';
    if (num < 0) return 'Mark cannot be negative';
    if (num > maxMark) return `Mark cannot exceed ${maxMark}`;
    return '';
  };

  const handleScoreChange = (studentId: string, value: string) => {
    const err = validateMark(value, studentId);
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
  };

  const handleSave = async (showToast = true) => {
    if (!assessmentId || validationErrors.size > 0) return;
    setSaving(true);
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
    } catch {
      if (showToast) toast.error('Failed to save marks');
    }
    setSaving(false);
  };

  useEffect(() => {
    if (entries.size === 0) return;
    const timer = setTimeout(() => handleSave(false), 30000);
    return () => clearTimeout(timer);
  }, [entries]);

  const handleSubmit = async () => {
    if (!assessmentId) return;
    try {
      await handleSave(false);
      await updateAssessmentStatus(assessmentId, 'SUBMITTED');
      navigate('/assessments');
    } catch {
      toast.error('Failed to submit');
    }
  };

  const entryArray = Array.from(entries.values());
  const completedCount = entryArray.filter((e) => e.markStatus === 'PRESENT' && e.score).length;
  const absentCount = entryArray.filter((e) => e.markStatus === 'ABSENT').length;
  const missingCount = entryArray.filter((e) => e.markStatus === 'MISSING' || (!e.score && e.markStatus === 'PRESENT')).length;
  const totalStudents = entryArray.length;
  const completionPct = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>;
  }

  if (!assessment) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Assessment not found</Typography></Box>;
  }

  const sc = STATUS_COLORS[assessment.status] || STATUS_COLORS.DRAFT;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/assessments')} size="small" sx={{ color: '#64748b' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>{assessment.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{assessment.subject?.name} — {assessment.class?.stream ? `${assessment.class?.name} ${assessment.class?.stream}` : assessment.class?.name}</Typography>
            <Chip label={assessment.status} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Max: {maxMark}</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, px: 3, py: 1.5, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap' }}>
        <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={`${completedCount}/${totalStudents} completed`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(34,197,94,0.08)', color: '#16a34a' }} />
        {absentCount > 0 && <Chip label={`${absentCount} absent`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626' }} />}
        {missingCount > 0 && <Chip icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={`${missingCount} missing marks`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(245,158,11,0.08)', color: '#d97706' }} />}
        <Box sx={{ flex: 1 }} />
        {lastSaved && <Typography sx={{ fontSize: '0.6875rem', color: '#16a34a', alignSelf: 'center' }}>Saved {lastSaved}</Typography>}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc' }, width: 40, textAlign: 'center' }}>#</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc' }}>Student Name</TableCell>
                <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#f8fafc', textAlign: 'center', width: 120 }}>Status</TableCell>
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

                return (
                  <TableRow key={m.studentId} sx={{ bgcolor: idx % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white' }}>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>{idx + 1}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{m.student?.firstName} {m.student?.lastName}</Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{m.student?.studentUid}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <Select
                          value={markStatus}
                          onChange={(e) => handleStatusChange(m.studentId, e.target.value)}
                          sx={{ fontSize: '0.75rem', height: 32 }}
                        >
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
                          size="small"
                          type="number"
                          value={score}
                          onChange={(e) => handleScoreChange(m.studentId, e.target.value)}
                          placeholder="—"
                          error={!!ve}
                          helperText={ve}
                          slotProps={{ htmlInput: { min: 0, max: maxMark, step: 0.5, style: { textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600 } } }}
                          sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                      ) : (
                        <Chip label={markStatus} size="small" sx={{ fontSize: '0.625rem', fontWeight: 600, height: 22, bgcolor: MARK_STATUSES.find((s) => s.value === markStatus)?.color + '15', color: MARK_STATUSES.find((s) => s.value === markStatus)?.color }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: pct != null ? '#000435' : '#cbd5e1' }}>
                      {pct != null ? `${pct}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={entry?.remarks || ''}
                        onChange={(e) => {
                          setEntries((prev) => {
                            const next = new Map(prev);
                            const ent = next.get(m.studentId) || { studentId: m.studentId, score: '', markStatus: 'PRESENT', remarks: '' };
                            ent.remarks = e.target.value;
                            next.set(m.studentId, ent);
                            return next;
                          });
                        }}
                        placeholder="Optional"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: '0.75rem' } }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, p: 2.5, px: 3, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
        <Button variant="outlined" onClick={() => handleSave(true)} disabled={saving} startIcon={<SaveIcon />} sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}>
          {saving ? 'Saving...' : 'Save Marks'}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || completionPct < 100} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
          Submit for Review
        </Button>
      </Box>
    </Box>
  );
}
