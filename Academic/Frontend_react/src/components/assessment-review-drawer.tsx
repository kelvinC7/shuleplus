import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { getAssessment, getAssessmentStatistics } from '@/services/api';
import type { ApiAssessment, AssessmentStatistics } from '@/types';
import {
  AMBER,
  NAVY,
  classLabel,
  rankStudentsByPerformance,
  studentDisplayName,
  workflowStatusLabel,
} from '@/lib/assessment-records';

type TabKey = 'marks' | 'performance';

interface Props {
  assessmentId: string | null;
  open: boolean;
  onClose: () => void;
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid #e2e8f0',
        bgcolor: '#fff',
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: accent ?? NAVY, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', mt: 0.5, letterSpacing: '0.06em' }}>
        {label}
      </Typography>
    </Box>
  );
}

export function AssessmentReviewDrawer({ assessmentId, open, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [tab, setTab] = useState<TabKey>('marks');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [stats, setStats] = useState<AssessmentStatistics | null>(null);

  useEffect(() => {
    if (!open || !assessmentId) return;
    setTab('marks');
    setLoading(true);
    setAssessment(null);
    setStats(null);
    (async () => {
      try {
        const [a, s] = await Promise.all([
          getAssessment(assessmentId),
          getAssessmentStatistics(assessmentId).catch(() => null),
        ]);
        setAssessment(a);
        setStats(s);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, assessmentId]);

  const maxMark = Number(assessment?.maxMark ?? 100);
  const { ranked, top, weak } = useMemo(
    () => rankStudentsByPerformance(assessment?.marks, maxMark),
    [assessment?.marks, maxMark],
  );

  const distMax = Math.max(...(stats?.distribution?.map((d) => d.count) ?? [1]), 1);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: fullScreen ? '100%' : { xs: '100%', md: 'min(920px, 96vw)' },
            maxWidth: '100%',
            bgcolor: '#f1f5f9',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            px: 2,
            py: 2,
            bgcolor: NAVY,
            color: '#fff',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: AMBER, textTransform: 'uppercase' }}>
              Marks review
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.25rem' }, fontWeight: 800, mt: 0.5, lineHeight: 1.25 }}>
              {assessment?.title ?? (loading ? 'Loading…' : 'Assessment')}
            </Typography>
            {assessment ? (
              <Typography sx={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>
                {assessment.subject?.name} · {classLabel(assessment)} · Max {maxMark}
              </Typography>
            ) : null}
            {assessment ? (
              <Chip
                size="small"
                label={workflowStatusLabel(assessment.status)}
                sx={{ mt: 1.25, height: 22, fontWeight: 700, bgcolor: 'rgba(252,176,56,0.2)', color: AMBER }}
              />
            ) : null}
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#fff', mt: -0.5 }} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.8125rem', textTransform: 'none', color: '#64748b' },
            '& .Mui-selected': { color: `${NAVY} !important` },
            '& .MuiTabs-indicator': { bgcolor: AMBER, height: 3 },
          }}
        >
          <Tab value="marks" label="Students & marks" />
          <Tab value="performance" label="Performance" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 2.5 } }}>
          {loading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} sx={{ color: NAVY }} />
            </Box>
          ) : !assessment ? (
            <Typography color="text.secondary">Could not load this assessment.</Typography>
          ) : tab === 'marks' ? (
            <Box sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 'calc(100dvh - 220px)' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['#', 'Student', 'ID', 'Score', '%', 'Status'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(assessment.marks ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
                          No mark rows yet for this assessment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (assessment.marks ?? []).map((m, idx) => {
                        const pct =
                          m.score != null && maxMark > 0 ? Math.round((Number(m.score) / maxMark) * 1000) / 10 : null;
                        return (
                          <TableRow key={m.id} hover>
                            <TableCell sx={{ color: '#94a3b8', width: 40 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: NAVY }}>{studentDisplayName(m)}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {m.student?.studentUid ?? ''}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {m.score != null ? m.score : ''}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: pct != null && pct < 50 ? '#dc2626' : '#059669' }}>
                              {pct != null ? `${pct}%` : ''}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={m.markStatus}
                                size="small"
                                sx={{ height: 20, fontSize: '0.625rem', fontWeight: 700 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {stats ? (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                    <Kpi label="Average" value={`${stats.average}%`} />
                    <Kpi label="Pass rate" value={`${stats.passRate}%`} accent="#2563eb" />
                    <Kpi label="Highest" value={`${stats.highest}%`} accent="#059669" />
                    <Kpi label="Lowest" value={`${stats.lowest}%`} accent="#dc2626" />
                  </Box>

                  <Box sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
                      Score distribution
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {(stats.distribution ?? []).map((d) => (
                        <Box key={d.label} sx={{ display: 'grid', gridTemplateColumns: '88px 1fr 36px', alignItems: 'center', gap: 1.5 }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{d.label}</Typography>
                          <Box sx={{ height: 10, borderRadius: 999, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                            <Box
                              sx={{
                                height: '100%',
                                width: `${(d.count / distMax) * 100}%`,
                                minWidth: d.count > 0 ? 8 : 0,
                                borderRadius: 999,
                                background: `linear-gradient(90deg, ${AMBER}, ${NAVY})`,
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: NAVY, textAlign: 'right' }}>{d.count}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </>
              ) : (
                <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>Performance stats appear once marks are entered.</Typography>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <TrendingUpIcon sx={{ color: '#059669', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>Strong performers</Typography>
                  </Box>
                  {top.length === 0 ? (
                    <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>No scored marks yet.</Typography>
                  ) : (
                    top.map((row, i) => (
                      <Box
                        key={row.mark.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: i < top.length - 1 ? '1px solid rgba(5,150,105,0.15)' : 'none',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>{studentDisplayName(row.mark)}</Typography>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#059669' }}>
                          {row.score}/{maxMark} ({Math.round(row.pct)}%)
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
                <Box sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #fecaca', bgcolor: '#fef2f2' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <TrendingDownIcon sx={{ color: '#dc2626', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>Needs support</Typography>
                  </Box>
                  {weak.length === 0 ? (
                    <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>No scored marks yet.</Typography>
                  ) : (
                    weak.map((row, i) => (
                      <Box
                        key={row.mark.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: i < weak.length - 1 ? '1px solid rgba(220,38,38,0.12)' : 'none',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>{studentDisplayName(row.mark)}</Typography>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#dc2626' }}>
                          {row.score}/{maxMark} ({Math.round(row.pct)}%)
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>

              {ranked.length > 0 ? (
                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                  Based on {ranked.length} student{ranked.length !== 1 ? 's' : ''} with marks entered.
                </Typography>
              ) : null}
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
