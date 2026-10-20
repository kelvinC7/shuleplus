import type { DashboardSummary } from '@/types';
import { Box, Typography, Paper, Grid } from '@mui/material';

export function DashboardView({ summary }: { summary: DashboardSummary }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Academic overview for {summary.organizationName}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
              Students
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {summary.studentCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
              Classes
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {summary.classCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
              Enrollments
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {summary.activeEnrollments}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
