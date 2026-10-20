import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { useAuth } from '@/contexts/auth-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { notifyCriticalAlerts } from '@/services/sei-api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function CommandDashboardPage() {
  const { summary, reload } = useAuth();
  useAutoRefresh(() => reload(), summary?.autoRefreshSeconds ?? 120, Boolean(summary));

  if (!summary) return <PageLoading />;

  const ms = summary.morningSummary;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <StatsGrid>
        <StatCard label="Schools in sector" value={summary.totalSchools} icon={<SchoolOutlinedIcon />} />
        <StatCard label="Total students" value={summary.totalStudents.toLocaleString()} icon={<GroupsOutlinedIcon />} />
        <StatCard label="Total staff" value={summary.totalStaff} icon={<BadgeOutlinedIcon />} />
        <StatCard label="Students present" value={summary.studentsPresent.toLocaleString()} icon={<HowToRegOutlinedIcon />} />
        <StatCard label="Students absent" value={summary.studentsAbsent.toLocaleString()} icon={<PersonOffOutlinedIcon />} />
        <StatCard label="Staff present / absent" value={`${summary.staffPresent} / ${summary.staffAbsent}`} icon={<BadgeOutlinedIcon />} />
        <StatCard label="Late arrivals" value={summary.lateArrivals} icon={<ScheduleOutlinedIcon />} />
        <StatCard
          label="Attendance %"
          value={`${summary.attendancePercentage}%`}
          delta={`Staff ${summary.staffAttendancePercentage}%`}
          icon={<PercentOutlinedIcon />}
        />
        <StatCard
          label="Morning compliant"
          value={`${ms.compliant ?? 0}/${summary.totalSchools}`}
          delta={`Cutoff ${summary.morningCutoffTime ?? '08:00'}`}
        />
        <StatCard
          label="Schools not reporting"
          value={summary.schoolsNotReporting}
          href="/attention"
          highlight={summary.schoolsNotReporting > 0}
          icon={<ReportProblemOutlinedIcon />}
        />
        <StatCard
          label="Requires attention"
          value={summary.schoolsRequiringAttention}
          href="/attention"
          highlight
          icon={<ReportProblemOutlinedIcon />}
        />
      </StatsGrid>

      <SectionCard
        title="Attendance Intelligence"
        subtitle="Decision support, not just percentages"
        action={
          <Button component={Link} to="/analytics" variant="outlined" size="small" sx={{ borderColor: '#FCB038', color: '#000435' }}>
            Open analytics
          </Button>
        }
      >
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(252,176,56,0.1)',
              border: '1px solid rgba(252,176,56,0.35)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PsychologyOutlinedIcon sx={{ color: '#000435' }} />
              <Typography sx={{ fontWeight: 800, color: '#000435' }}>Attendance insight</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.9375rem', color: '#000435', lineHeight: 1.5 }}>{summary.insight.headline}</Typography>
            <Typography sx={{ mt: 1.5, fontSize: '0.8125rem', color: 'text.secondary' }}>
              Affected schools: {summary.insight.affectedSchools} · Levels: {summary.insight.affectedLevels.join(', ')} · Data completeness:{' '}
              {summary.insight.dataCompletenessPct}% · Device problems: {summary.insight.deviceProblems}
            </Typography>
            {summary.insight.followUpRequired ? (
              <Button component={Link} to="/follow-up" size="small" sx={{ mt: 2 }} variant="contained">
                Follow-up required
              </Button>
            ) : null}
          </Box>
          <Box sx={{ flex: 1, minWidth: { sm: 260 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1 }}>{ms.timeLabel} · Sector status</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Normal: {ms.normal}</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Monitoring: {ms.monitoring}</Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>Attention required: {ms.attention}</Typography>
            <Button component={Link} to="/morning" fullWidth sx={{ mt: 2 }} variant="outlined">
              Morning command center
            </Button>
          </Box>
        </Box>
      </SectionCard>

      <SectionCard
        title="Smart SEI notifications"
        subtitle="Alerts without constant manual checking"
        action={
          <Button size="small" variant="outlined" onClick={() => notifyCriticalAlerts()}>
            Email critical alerts
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {summary.notifications.map((n) => (
            <Box
              key={n.id}
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-start',
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#f4f6fb',
              }}
            >
              <NotificationsActiveOutlinedIcon
                sx={{
                  color: n.level === 'critical' ? '#dc2626' : n.level === 'warning' ? '#ea580c' : '#ca8a04',
                  mt: 0.25,
                }}
              />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{n.title}</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{n.message}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </SectionCard>
    </Box>
  );
}
