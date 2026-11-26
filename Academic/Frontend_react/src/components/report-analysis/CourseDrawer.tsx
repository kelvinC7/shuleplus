import { Box, Button, Drawer, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  BORDER,
  BandChip,
  DistributionBar,
  KpiCard,
  MUTED,
  NAVY,
  deltaColor,
  fmtDelta,
  fmtPct,
} from './analysis-ui';
import { Flex } from './analysis-ui';
import type { ReportAnalysisCourse, ReportAnalysisSettings } from '@/types/report-analysis';

type Props = {
  course: ReportAnalysisCourse | null;
  settings: ReportAnalysisSettings;
  comparisonLabel: string | null;
  onClose: () => void;
  onOpenStudent: (studentId: string) => void;
};

export default function CourseDrawer({ course, settings, comparisonLabel, onClose, onOpenStudent }: Props) {
  const aboveShare = course && course.assessed ? Math.round((course.above / course.assessed) * 100) : 0;

  return (
    <Drawer
      anchor="right"
      open={Boolean(course)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500 }, maxWidth: '100%', bgcolor: '#F8FAFC', fontFamily: "'Montserrat', system-ui, sans-serif" } } }}
    >
      {course ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Flex direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ px: 2.5, pt: 2.5, pb: 1.5, bgcolor: '#fff', borderBottom: `1px solid ${BORDER}` }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }} noWrap>{course.subject}</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>
                Teacher: {course.teacherName ?? 'Not recorded'}
              </Typography>
              <Box sx={{ mt: 1 }}><BandChip band={course.band} /></Box>
            </Box>
            <IconButton onClick={onClose} aria-label="Close course details"><CloseRoundedIcon /></IconButton>
          </Flex>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' } }}>
              <KpiCard label="Course average" value={fmtPct(course.average)} accent={course.band?.color ?? '#94a3b8'} deltaText={fmtDelta(course.delta)} deltaTone={deltaColor(course.delta)} hint={comparisonLabel ?? undefined} />
              <KpiCard label="Students assessed" value={`${course.assessed}`} accent="#2563EB" hint={course.missing ? `${course.missing} missing` : 'No missing marks'} />
              <KpiCard label="Highest mark" value={fmtPct(course.highest)} accent="#059669" />
              <KpiCard label="Lowest mark" value={fmtPct(course.lowest)} accent="#DC2626" />
              <KpiCard label="Below threshold" value={`${course.below}`} accent="#DC2626" hint={`Under ${settings.atRiskBelow}%`} />
              <KpiCard label="Above threshold" value={`${course.above}`} accent="#059669" hint={`${aboveShare}% of assessed`} />
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.875rem', mb: 1.5 }}>Performance distribution</Typography>
              <DistributionBar
                items={course.distribution.map((d) => ({
                  label: d.label,
                  color: d.color,
                  count: d.count,
                  percent: course.assessed ? (d.count / course.assessed) * 100 : 0,
                }))}
              />
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${BORDER}` }}>
              <Flex direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.875rem' }}>Students requiring improvement</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: MUTED }}>{course.needsImprovement.length} student(s)</Typography>
              </Flex>
              <Flex spacing={0.5}>
                {course.needsImprovement.slice(0, 40).map((s) => (
                  <Flex key={s.studentId} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.75, borderBottom: `1px solid ${BORDER}` }}>
                    <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY, minWidth: 0 }}>{s.name}</Typography>
                    <Flex direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#b91c1c' }}>{fmtPct(s.percentage, 0)}</Typography>
                      <Button size="small" onClick={() => onOpenStudent(s.studentId)} sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0 }}>Open</Button>
                    </Flex>
                  </Flex>
                ))}
                {!course.needsImprovement.length ? (
                  <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>No students below the threshold in this course.</Typography>
                ) : null}
              </Flex>
            </Box>
          </Box>
        </Box>
      ) : null}
    </Drawer>
  );
}
