import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Chip, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssessment, getAssessmentStatistics, updateAssessmentStatus } from '@/services/api';
import type { ApiAssessment, AssessmentStatistics } from '@/types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f1f5f9', color: '#64748b' },
  OPEN: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  MARK_ENTRY: { bg: 'rgba(59,130,246,0.08)', color: '#2563eb' },
  SUBMITTED: { bg: 'rgba(245,158,11,0.08)', color: '#d97706' },
  REVIEWED: { bg: 'rgba(139,92,246,0.08)', color: '#7c3aed' },
  APPROVED: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  LOCKED: { bg: 'rgba(0,4,53,0.05)', color: '#000435' },
};

const LIFECYCLE = ['DRAFT', 'OPEN', 'MARK_ENTRY', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'];

export default function AssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [stats, setStats] = useState<AssessmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId) return;
    (async () => {
      setLoading(true);
      try {
        const [aData, sData] = await Promise.all([
          getAssessment(assessmentId),
          getAssessmentStatistics(assessmentId).catch(() => null),
        ]);
        setAssessment(aData);
        setStats(sData);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [assessmentId]);

  const handleStatusChange = async (status: string) => {
    if (!assessmentId) return;
    try {
      await updateAssessmentStatus(assessmentId, status);
      const aData = await getAssessment(assessmentId);
      setAssessment(aData);
      const sData = await getAssessmentStatistics(assessmentId).catch(() => null);
      setStats(sData);
    } catch {
      /* interceptor toasts the error */
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>;
  if (!assessment) return <Box sx={{ p: 4 }}><Typography>Not found</Typography></Box>;

  const sc = STATUS_COLORS[assessment.status] || STATUS_COLORS.DRAFT;
  const currentIdx = LIFECYCLE.indexOf(assessment.status);
  const nextStatus = currentIdx < LIFECYCLE.length - 1 ? LIFECYCLE[currentIdx + 1] : null;
  const prevStatus = currentIdx > 0 ? LIFECYCLE[currentIdx - 1] : null;

  const needsAttention = stats ? [
    stats.missingCount > 0 ? `${stats.missingCount} students missing marks` : null,
    stats.absentCount > 0 ? `${stats.absentCount} students absent` : null,
  ].filter(Boolean) : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/assessments')} size="small" sx={{ color: '#64748b' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>{assessment.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.25, alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{assessment.subject?.name} — {assessment.class?.stream ? `${assessment.class?.name} ${assessment.class?.stream}` : assessment.class?.name}</Typography>
            <Chip label={assessment.status} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
          </Box>
        </Box>
        {assessment.status !== 'LOCKED' && assessment.status !== 'APPROVED' && (
          <IconButton onClick={() => navigate(`/mark-entry/${assessmentId}`)} size="small" sx={{ color: '#000435' }}>
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
          <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Assessment Details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Max Mark</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#000435' }}>{assessment.maxMark}</Typography></Box>
              <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Date</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{assessment.assessmentDate ? new Date(assessment.assessmentDate).toLocaleDateString('en-GB') : '—'}</Typography></Box>
              <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Duration</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{assessment.duration || '—'}</Typography></Box>
              <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Category</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{assessment.component?.name || '—'}</Typography></Box>
            </Box>
          </Box>

          {stats && (
            <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>Performance</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Average</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#000435' }}>{stats.average}%</Typography></Box>
                <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Pass Rate</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#16a34a' }}>{stats.passRate}%</Typography></Box>
                <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Highest</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{stats.highest}%</Typography></Box>
                <Box><Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Lowest</Typography><Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{stats.lowest}%</Typography></Box>
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff', mb: 3 }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Status Lifecycle</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            {LIFECYCLE.map((step, i) => {
              const isActive = step === assessment.status;
              const isPast = i < currentIdx;
              return (
                <Box key={step} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip
                    label={step.replace('_', ' ')}
                    size="small"
                    sx={{
                      height: 28, fontSize: '0.6875rem', fontWeight: isActive ? 700 : 600,
                      bgcolor: isActive ? '#000435' : isPast ? 'rgba(34,197,94,0.08)' : '#f1f5f9',
                      color: isActive ? '#fff' : isPast ? '#16a34a' : '#94a3b8',
                    }}
                  />
                  {i < LIFECYCLE.length - 1 && <Box sx={{ width: 20, height: 2, bgcolor: isPast ? '#16a34a' : '#e2e8f0', mx: 0.25 }} />}
                </Box>
              );
            })}
          </Box>
        </Box>

        {needsAttention.length > 0 && (
          <Box sx={{ p: 2, border: '1px solid #fecaca', borderRadius: '12px', bgcolor: '#fef2f2', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WarningAmberIcon sx={{ fontSize: 18, color: '#dc2626' }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#dc2626' }}>Academic Attention</Typography>
            </Box>
            {needsAttention.map((n, i) => (
              <Typography key={i} sx={{ fontSize: '0.75rem', color: '#991b1b', ml: 3.5 }}>⚠ {n}</Typography>
            ))}
          </Box>
        )}

        {stats && stats.distribution.length > 0 && (
          <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Score Distribution</Typography>
            {stats.distribution.map((d) => (
              <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#475569', width: 80 }}>{d.label}</Typography>
                <Box sx={{ flex: 1, height: 24, bgcolor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${stats.totalStudents > 0 ? (d.count / stats.totalStudents) * 100 : 0}%`, bgcolor: d.label.includes('80') || d.label.includes('70') ? '#16a34a' : d.label.includes('50') ? '#d97706' : '#dc2626', borderRadius: '4px', transition: 'width 0.3s' }} />
                </Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', width: 60, textAlign: 'right' }}>{d.count} students</Typography>
              </Box>
            ))}
          </Box>
        )}

        {stats && stats.marks && stats.marks.length > 0 && (
          <Box sx={{ mt: 3, p: 2.5, border: '1px solid #e2e8f0', borderRadius: '14px', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Student Marks</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc' }}>#</TableCell>
                    <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc' }}>Student</TableCell>
                    <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', textAlign: 'center' }}>Status</TableCell>
                    <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', textAlign: 'center' }}>Score</TableCell>
                    <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', textAlign: 'center' }}>%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.marks.map((m: any, idx: number) => {
                    const pct = m.score != null && stats.assessment.maxMark > 0 ? Math.round((m.score / stats.assessment.maxMark) * 10000) / 100 : null;
                    return (
                      <TableRow key={m.id}>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{m.student?.firstName} {m.student?.lastName}</Typography>
                          <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{m.student?.studentUid}</Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip label={m.markStatus} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 600, bgcolor: m.markStatus === 'PRESENT' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: m.markStatus === 'PRESENT' ? '#16a34a' : '#dc2626' }} />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{m.score != null ? m.score : '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>{pct != null ? `${pct}%` : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, p: 2.5, px: 3, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
        {prevStatus && (
          <Button variant="outlined" onClick={() => handleStatusChange(prevStatus)} sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}>
            Move to {prevStatus.replace('_', ' ')}
          </Button>
        )}
        {nextStatus && (
          <Button variant="contained" onClick={() => handleStatusChange(nextStatus)} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#000435', '&:hover': { bgcolor: '#00064d' } }}>
            Move to {nextStatus.replace('_', ' ')}
          </Button>
        )}
      </Box>
    </Box>
  );
}
