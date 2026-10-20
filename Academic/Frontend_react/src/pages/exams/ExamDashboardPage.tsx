import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { fetchExamDashboard } from '@/modules/exams/exam-api';
import type { ExamDashboard } from '@/modules/exams/exam-types';
import { AMBER, ExamToolbar, Kpi, NAVY, ReadinessBar, StatusChip, dateLabel } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';

export default function ExamDashboardPage() {
  const workspace = useExamWorkspace();
  const navigate = useNavigate();
  const [dash, setDash] = useState<ExamDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspace.academicYear) return;
    setLoading(true);
    fetchExamDashboard({ academicYear: workspace.academicYear, term: workspace.term || undefined })
      .then(setDash)
      .catch(() => setDash(null))
      .finally(() => setLoading(false));
  }, [workspace.academicYear, workspace.term]);

  const session = workspace.session;
  const schedules = session?.schedules ?? [];
  const conflicts = session?.conflicts?.filter((c) => !c.resolved) ?? [];
  const seats = session?.seats?.length ?? schedules.reduce((n, s) => n + (s.seats?.length ?? 0), 0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9', overflow: 'hidden' }}>
      <ExamToolbar
        workspace={workspace}
        extra={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/exams/sessions')} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Sessions
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/exams/sessions/new')}
              sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0a0a5a' } }}
            >
              Create Examination
            </Button>
          </Box>
        }
      />
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={24} /></Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
              <Kpi label="Exams" value={schedules.length} hint="Scheduled papers" />
              <Kpi label="Classes" value={session?.classes?.filter((c) => c.selected).length ?? 0} tone="#0f766e" />
              <Kpi label="Rooms" value={session?.rooms?.length ?? 0} tone="#7c3aed" />
              <Kpi label="Exam Days" value={session?.days?.length ?? 0} tone="#d97706" />
              <Kpi label="Scheduled" value={schedules.filter((s) => s.status !== 'CANCELLED').length} tone="#16a34a" />
              <Kpi label="Conflicts" value={conflicts.length} tone={conflicts.length ? '#dc2626' : '#059669'} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 2, mb: 3 }}>
              <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#fff' }}>
                <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1.5 }}>Generation status</Typography>
                {[
                  ['Courses loaded', Boolean(session?.courses?.length)],
                  ['Classes loaded', Boolean(session?.classes?.length)],
                  ['Rooms validated', Boolean(session?.rooms?.length)],
                  ['Capacity checked', Boolean(session?.rooms?.length)],
                  ['Timetable generated', schedules.length > 0],
                  ['Seating assigned', seats > 0],
                  ['Invigilators assigned', (session?.duties?.length ?? 0) > 0],
                ].map(([label, ok]) => (
                  <Box key={String(label)} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography sx={{ fontSize: '0.85rem' }}>{label}</Typography>
                    <Typography sx={{ fontWeight: 800, color: ok ? '#059669' : AMBER }}>{ok ? '✓' : '—'}</Typography>
                  </Box>
                ))}
                {conflicts.length > 0 ? (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {conflicts.length} conflicts require review.{' '}
                    <Link to="/exams/timetable">Open Conflict Center</Link>
                  </Alert>
                ) : null}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <ReadinessBar session={session} />
                <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#fff' }}>
                  <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Live exams</Typography>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: NAVY }}>{dash?.live ?? 0}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{dash?.published ?? 0} published sessions · {dash?.openConflicts ?? 0} open conflicts</Typography>
                  <Button
                    fullWidth
                    onClick={() => navigate('/exams/invigilator-desk')}
                    sx={{ mt: 1.5, textTransform: 'none', fontWeight: 800, color: NAVY }}
                  >
                    Open invigilator dashboard
                  </Button>
                  <Button
                    fullWidth
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => navigate(session ? `/exams/sessions/${session.id}/setup` : '/exams/sessions/new')}
                    sx={{ mt: 2, bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#fdd067' } }}
                  >
                    {session ? 'Continue setup' : 'Start exam setup wizard'}
                  </Button>
                </Box>
              </Box>
            </Box>

            <Box sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#fff' }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Examination sessions</Typography>
              {(dash?.sessionsList ?? workspace.sessions).length === 0 ? (
                <Typography sx={{ color: '#94a3b8' }}>No examination sessions for this academic year and term yet.</Typography>
              ) : (
                (dash?.sessionsList ?? workspace.sessions).map((s) => (
                  <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.25, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {s.academicYear} · {s.term} · {dateLabel(s.startDate)} – {dateLabel(s.endDate)}
                      </Typography>
                      <LinearProgress variant="determinate" value={s.readinessScore ?? 0} sx={{ mt: 0.8, height: 6, borderRadius: 99, maxWidth: 220 }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusChip status={s.status} />
                      <Button size="small" onClick={() => { workspace.setSessionId(s.id); navigate('/exams/timetable'); }} sx={{ textTransform: 'none' }}>Open</Button>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
