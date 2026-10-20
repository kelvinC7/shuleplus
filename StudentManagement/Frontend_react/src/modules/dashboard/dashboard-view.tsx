import { Box, CircularProgress, Typography } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import AddIcon from '@mui/icons-material/Add';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { Link } from 'react-router-dom';
import type { DashboardSummary } from '@/types';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { ChartCard } from '@/components/charts/chart-card';
import { ChartAcademicYearMenu } from '@/components/charts/chart-academic-year-menu';
import {
  DonutChart,
  LAVENDER,
  ModernVerticalBarChart,
  NAVY,
  PRIMARY,
  TEAL,
} from '@/components/charts/sm-charts';
import { useDashboardCharts, formatAcademicYear } from './hooks/use-dashboard-charts';

const QUICK_ACTIONS = [
  { label: 'Student Reports', href: '/students/reports', icon: AssessmentOutlinedIcon, accent: PRIMARY },
  { label: 'Add Student', href: '/students/new', icon: AddIcon, accent: NAVY },
  { label: 'View Students', href: '/students', icon: PeopleOutlinedIcon, accent: PRIMARY },
  { label: 'Manage Classes', href: '/classes', icon: ClassOutlinedIcon, accent: NAVY },
  { label: 'Settings', href: '/settings', icon: SettingsOutlinedIcon, accent: PRIMARY },
];

export function DashboardView({ summary }: { summary: DashboardSummary }) {
  const charts = useDashboardCharts();

  const classBars = charts.chartData?.studentsByClass ?? summary.studentsByClass ?? [];
  const categoryItems = charts.chartData?.studentsByCategory ?? summary.studentsByCategory ?? [];
  const categoryTotal = categoryItems.reduce((sum, item) => sum + item.value, 0);
  const categorySegments = categoryItems
    .filter((item) => item.value > 0)
    .map((item, i) => ({
      label: item.label,
      value: item.value,
      color: [PRIMARY, NAVY, TEAL, LAVENDER, '#f97316'][i % 5],
    }));

  const totalStudents = summary.studentCount;
  const yearLabel = charts.academicYear ? formatAcademicYear(charts.academicYear) : '';

  const academicYearMenuProps = {
    years: charts.years,
    value: charts.academicYear,
    onChange: charts.setAcademicYear,
    disabled: charts.loading,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <StatsGrid>
        <StatCard
          label="Total Students"
          value={totalStudents.toLocaleString()}
          delta={`${summary.enrollmentRate ?? 0}% enrolled`}
          icon={<PeopleOutlinedIcon />}
        />
        <StatCard
          label="Active Classes"
          value={summary.classCount}
          delta={`${summary.activeEnrollments} enrollments`}
          icon={<ClassOutlinedIcon />}
        />
        <StatCard
          label="Current Enrollments"
          value={summary.activeEnrollments}
          delta="Active this year"
          icon={<HowToRegOutlinedIcon />}
        />
        <StatCard
          label="New This Month"
          value={summary.newStudentsMonth ?? 0}
          delta="Registered recently"
          icon={<PersonAddOutlinedIcon />}
        />
      </StatsGrid>

      <ChartCard
        title="Students by Class"
        subtitle={yearLabel ? `Enrollment across classes · ${yearLabel}` : 'Enrollment across classes'}
        headerAction={<ChartAcademicYearMenu {...academicYearMenuProps} />}
      >
        {charts.loading && !charts.chartData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} sx={{ color: PRIMARY }} />
          </Box>
        ) : (
          <ModernVerticalBarChart
            data={classBars.length ? classBars : [{ label: 'No data', value: 0, male: 0, female: 0 }]}
            color={NAVY}
            accentColor={PRIMARY}
          />
        )}
      </ChartCard>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          alignItems: 'stretch',
        }}
      >
        <ChartCard
          title="Students by Category"
          subtitle={yearLabel ? `Distribution across school levels · ${yearLabel}` : 'Distribution across school levels'}
          headerAction={<ChartAcademicYearMenu {...academicYearMenuProps} />}
          metric={
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: NAVY }}>
              {categoryTotal.toLocaleString()}
              <Typography component="span" sx={{ ml: 1, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
                enrolled
              </Typography>
            </Typography>
          }
        >
          {charts.loading && !charts.chartData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={22} sx={{ color: PRIMARY }} />
            </Box>
          ) : categorySegments.length > 0 ? (
            <DonutChart
              segments={categorySegments}
              centerLabel={`${categoryTotal}`}
              size={180}
            />
          ) : (
            <Typography sx={{ py: 4, textAlign: 'center', fontSize: '0.875rem', color: 'text.secondary' }}>
              No category data for this year
            </Typography>
          )}
        </ChartCard>

        <Box
          sx={{
            borderRadius: 3,
            bgcolor: '#fff',
            p: { xs: 2, sm: 3 },
            boxShadow: '0 2px 14px -4px rgba(0,4,53,0.08)',
            border: '1px solid rgba(0,4,53,0.06)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
              <Box>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Quick Actions
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  Common student management tasks
                </Typography>
              </Box>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PRIMARY }} />
            </Box>

            <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Box
                    key={action.href}
                    component={Link}
                    to={action.href}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      bgcolor: '#fff',
                      px: 2,
                      py: 2,
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: NAVY,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      transition: 'all 0.3s',
                      boxShadow: '0 1px 3px rgba(0,4,53,0.04)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 20px -8px rgba(0,4,53,0.12)',
                        borderColor: action.accent === PRIMARY ? 'rgba(252,176,56,0.4)' : 'rgba(0,4,53,0.15)',
                      },
                    }}
                  >
                    <Icon sx={{ fontSize: 20, color: action.accent }} />
                    {action.label}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box
            sx={{
              mt: 3,
              borderRadius: 2,
              bgcolor: 'rgba(0,4,53,0.03)',
              border: '1px solid rgba(0,4,53,0.06)',
              px: 2,
              py: 1.5,
            }}
          >
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Organization
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>
              {summary.organizationName}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Status: {summary.status}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
