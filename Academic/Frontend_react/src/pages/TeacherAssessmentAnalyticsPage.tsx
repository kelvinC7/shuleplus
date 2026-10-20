import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Chip, Card, CardContent, CircularProgress,
  Divider, LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssessment, getAssessmentStatistics } from '@/services/api';
import type { AssessmentStatistics } from '@/types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f1f5f9', color: '#64748b' },
  OPEN: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  MARK_ENTRY: { bg: 'rgba(59,130,246,0.08)', color: '#2563eb' },
  SUBMITTED: { bg: 'rgba(245,158,11,0.08)', color: '#d97706' },
  REVIEWED: { bg: 'rgba(139,92,246,0.08)', color: '#7c3aed' },
  APPROVED: { bg: 'rgba(34,197,94,0.08)', color: '#16a34a' },
  LOCKED: { bg: 'rgba(0,4,53,0.05)', color: '#000435' },
};

export default function TeacherAssessmentAnalyticsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AssessmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const data = await getAssessmentStatistics(assessmentId);
      setStats(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    }
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>;
  }

  if (error || !stats) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">{error || 'No data available'}</Typography></Box>;
  }

  const { assessment, totalStudents, completedCount, missingCount, absentCount, excusedCount, average, highest, lowest, passRate, distribution } = stats;
  const maxMark = assessment.maxMark || 100;
  const sc = STATUS_COLORS[assessment.status] || STATUS_COLORS.DRAFT;
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  const studentsNeedingSupport = distribution.find((d) => d.label === 'Below 50%');

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f4f6f9' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/teacher')} size="small" sx={{ color: '#64748b' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>{assessment.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.25, alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {assessment.subject?.name} — {assessment.class?.stream ? `${assessment.class?.name} ${assessment.class?.stream}` : assessment.class?.name}
            </Typography>
            <Chip label={assessment.status} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, bgcolor: sc.bg, color: sc.color }} />
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Summary Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{average}%</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average</Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{highest}%</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest</Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{lowest}%</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lowest</Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{passRate}%</Typography>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pass Rate</Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Completion Status */}
          <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Completion Status</Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                  <Box>
                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{totalStudents}</Typography>
                    <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Total Students</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                  <Box>
                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{completedCount}</Typography>
                    <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Completed</Typography>
                  </Box>
                </Box>
                {absentCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#dc2626' }}>A</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{absentCount}</Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Absent</Typography>
                    </Box>
                  </Box>
                )}
                {missingCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: '#d97706' }} />
                    <Box>
                      <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{missingCount}</Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Missing</Typography>
                    </Box>
                  </Box>
                )}
                {excusedCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#7c3aed' }}>E</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{excusedCount}</Typography>
                      <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Excused/Exempt</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: '#16a34a' } }} />
              </Box>
            </CardContent>
          </Card>

          {/* Distribution */}
          <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Score Distribution</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {distribution.map((d) => (
                  <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#475569', width: 100, textAlign: 'right', fontWeight: 500, flexShrink: 0 }}>{d.label}</Typography>
                    <Box sx={{ flex: 1, height: 24, bgcolor: '#f1f5f9', borderRadius: 1, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%`, bgcolor: d.min >= 80 ? '#16a34a' : d.min >= 70 ? '#2563eb' : d.min >= 60 ? '#d97706' : d.min >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 1, transition: 'width 0.5s ease' }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', width: 60, flexShrink: 0 }}>{d.count} student{d.count !== 1 ? 's' : ''}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Students Needing Support */}
          {studentsNeedingSupport && studentsNeedingSupport.count > 0 && (
            <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid rgba(245,158,11,0.3)', bgcolor: 'rgba(245,158,11,0.02)' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningAmberIcon sx={{ fontSize: 18, color: '#d97706' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Academic Attention — {studentsNeedingSupport.count} student{studentsNeedingSupport.count !== 1 ? 's' : ''} below 50%
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  These students may need additional support or intervention.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', pb: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/teacher')} sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}>
              Back to Portal
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
