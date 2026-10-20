import { Box } from '@mui/material';
import { StatCard } from '@/components/stat-card';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ManOutlinedIcon from '@mui/icons-material/ManOutlined';
import WomanOutlinedIcon from '@mui/icons-material/WomanOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import type { ReportKpis } from '../types';

export function ReportsKpiCards({ kpis }: { kpis: ReportKpis }) {
  return (
    <Box sx={{ display: 'grid', gap: { xs: 1.5, sm: 2 }, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
      <StatCard label="Total Students" value={kpis.total.toLocaleString()} icon={<PeopleOutlinedIcon />} />
      <StatCard label="Male" value={kpis.male.toLocaleString()} icon={<ManOutlinedIcon />} />
      <StatCard label="Female" value={kpis.female.toLocaleString()} icon={<WomanOutlinedIcon />} />
      <StatCard label="New Students" value={kpis.newStudents.toLocaleString()} delta="Last 30 days" icon={<PersonAddOutlinedIcon />} />
    </Box>
  );
}
