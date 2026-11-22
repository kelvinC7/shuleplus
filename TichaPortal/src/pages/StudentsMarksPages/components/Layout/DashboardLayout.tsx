import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand } from '../../../../theme/theme';
import '../../marksHub.css';

const PAGE_TITLES = {
  '/marks': { title: 'Marks hub', subtitle: '' },
  '/marks/insights': { title: 'Teacher insights', subtitle: 'AI-powered academic insights for your classes' },
  '/marks/marks-center': { title: 'Marks center', subtitle: 'Full gradebook, analytics, and inline mark editing for your assigned classes' },
  '/marks/assessments': { title: 'Assessments', subtitle: 'Create and manage CATs, exams, and assignments' },
  '/marks/grade-book': { title: 'Grade book', subtitle: 'Full grade overview across subjects and classes' },
  '/marks/student-profiles': { title: 'Student profiles', subtitle: 'Individual learner records and history' },
  '/marks/at-risk': { title: 'At-risk students', subtitle: 'Learners who need early intervention' },
  '/marks/student-performance': { title: 'Student performance', subtitle: 'Analytics and trends per learner' },
  '/marks/competencies': { title: 'CBC competencies', subtitle: 'Competency-based curriculum tracking' },
  '/marks/class-performance': { title: 'Class performance', subtitle: 'Compare classes and subject averages' },
  '/marks/attendance-analytics': { title: 'Attendance analytics', subtitle: 'Correlation between attendance and results' },
  '/marks/parent-communication': { title: 'Parent communication', subtitle: 'Messages and updates to guardians' },
  '/marks/notifications': { title: 'Notifications', subtitle: 'Alerts for marks, deadlines, and reviews' },
  '/marks/reports': { title: 'Academic reports', subtitle: 'Generate and export report documents' },
  '/marks/report-comments': { title: 'Report card comments', subtitle: 'Class teacher comments for term reports' },
  '/marks/performance-reports': { title: 'Performance reports', subtitle: 'Detailed performance summaries' },
  '/marks/interventions': { title: 'Intervention plans', subtitle: 'Structured support for struggling learners' },
};

export default function DashboardLayout() {
  const location = useLocation();
  const meta = PAGE_TITLES[location.pathname] || { title: 'Marks & Exams', subtitle: '' };

  const showPageHeader = location.pathname !== '/marks' && location.pathname !== '/marks/';

  return (
    <Box
      sx={{
        maxWidth: 1480,
        mx: 'auto',
        // /marks index owns its own padding so its sticky filter bar can run edge to edge
        p: showPageHeader ? { xs: '1rem 1.25rem 2rem', md: '1.25rem 1.75rem 2.5rem', lg: '1.5rem 2rem 3rem 2.25rem' } : 0,
      }}
    >
      {showPageHeader ? (
        <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: brand.navy }}>{meta.title}</Typography>
          {meta.subtitle ? <Typography sx={{ mt: 0.25, fontSize: 12, color: '#64748B' }}>{meta.subtitle}</Typography> : null}
        </Box>
      ) : null}
      <Box className="marks-hub">
        <Outlet />
      </Box>
    </Box>
  );
}
