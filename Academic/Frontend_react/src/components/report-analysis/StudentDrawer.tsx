import type { ReactNode } from 'react';
import { Box, Button, Chip, Drawer, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import {
  AMBER,
  BORDER,
  BandChip,
  MUTED,
  NAVY,
  ProgressBar,
  deltaColor,
  fmtDelta,
  fmtPct,
} from './analysis-ui';
import { Flex } from './analysis-ui';
import type {
  ReportAnalysisCourse,
  ReportAnalysisSettings,
  ReportAnalysisStudent,
} from '@/types/report-analysis';

export type PublicationInfo = {
  status: string;
  accessPolicy: string;
  publishedAt: string | null;
} | null;

type Props = {
  student: ReportAnalysisStudent | null;
  courses: ReportAnalysisCourse[];
  settings: ReportAnalysisSettings;
  publication: PublicationInfo;
  comparisonLabel: string | null;
  onClose: () => void;
  onViewReport: (studentId: string) => void;
};

function recommendations(
  s: ReportAnalysisStudent,
  courses: ReportAnalysisCourse[],
  settings: ReportAnalysisSettings,
) {
  const items: string[] = [];
  for (const weak of s.weakCourses) {
    const course = courses.find((c) => c.subject === weak);
    const teacher = course?.teacherName ? ` with ${course.teacherName}` : '';
    items.push(`Review ${weak} marks and plan targeted practice${teacher}.`);
  }
  if (s.missingCourses > 0) {
    items.push(`Confirm ${s.missingCourses} missing course mark(s) before the report is final.`);
  }
  if (s.delta != null && s.delta <= -settings.trendDelta) {
    items.push(`Average dropped ${Math.abs(s.delta).toFixed(1)} points since the previous stage. Arrange a parent meeting.`);
  }
  if (s.average != null && s.average < settings.atRiskBelow) {
    items.push('Overall average is below the risk threshold. Start the intervention plan below.');
  }
  if (!items.length) items.push('Performance is on track. Consider enrichment or stretch tasks.');
  return items;
}

function interventionPlan(s: ReportAnalysisStudent, settings: ReportAnalysisSettings) {
  if (s.average == null) {
    return ['Collect marks for every course.', 'Re-check attendance and assessment participation.'];
  }
  if (s.average < settings.atRiskBelow) {
    return [
      'Week 1: Meet the student and agree on two focus courses.',
      'Weeks 2–4: Short remedial sessions in the weakest courses, twice a week.',
      'Week 5: Re-assess the focus courses and compare with the previous stage.',
      'Share progress with the parent after the review.',
    ];
  }
  if (s.weakCourses.length) {
    return ['Set one practice target per weak course.', 'Re-check marks at the next assessment.'];
  }
  return ['No intervention needed. Keep monitoring at the next assessment.'];
}

export default function StudentDrawer({ student, courses, settings, publication, comparisonLabel, onClose, onViewReport }: Props) {
  const open = Boolean(student);
  const subjectCells = student?.subjects ?? [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 460 },
            maxWidth: '100%',
            bgcolor: '#F8FAFC',
            fontFamily: "'Montserrat', system-ui, sans-serif",
          },
        },
      }}
    >
      {student ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Flex direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ px: 2.5, pt: 2.5, pb: 1.5, bgcolor: '#fff', borderBottom: `1px solid ${BORDER}` }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY }} noWrap>{student.name}</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>
                {student.admissionNo ? `${student.admissionNo} · ` : ''}{student.classLabel || 'Class'}
              </Typography>
              <Box sx={{ mt: 1 }}><BandChip band={student.band} /></Box>
            </Box>
            <IconButton onClick={onClose} aria-label="Close student details"><CloseRoundedIcon /></IconButton>
          </Flex>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Stat label="Average" value={fmtPct(student.average)} />
              <Stat label="Position" value={student.position ? `${student.position}/${student.classSize}` : '—'} />
              <Stat label="Below threshold" value={`${student.coursesBelow}`} tone={student.coursesBelow ? '#b91c1c' : undefined} />
            </Box>

            <Panel title="Previous comparison" subtitle={comparisonLabel ?? 'No published earlier stage to compare with yet.'}>
              {student.previousAverage != null ? (
                <Flex direction="row" spacing={2} alignItems="baseline">
                  <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.125rem' }}>{fmtPct(student.previousAverage)}</Typography>
                  <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>→ {fmtPct(student.average)}</Typography>
                  <Typography sx={{ fontWeight: 800, color: deltaColor(student.delta), fontSize: '0.875rem' }}>{fmtDelta(student.delta) ?? ''}</Typography>
                </Flex>
              ) : null}
            </Panel>

            <Panel title="Course marks" subtitle="Sorted by course name. Below-threshold courses are highlighted.">
              <Flex spacing={1.25}>
                {subjectCells.map((c) => {
                  const below = c.percentage != null && c.percentage < settings.atRiskBelow;
                  const teacher = courses.find((x) => x.subjectId === c.subjectId)?.teacherName;
                  return (
                    <Box key={c.subjectId}>
                      <Flex direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY }}>{c.subject}</Typography>
                          {teacher ? <Typography sx={{ fontSize: '0.6875rem', color: MUTED }}>{teacher}</Typography> : null}
                        </Box>
                        {c.status === 'entered' ? (
                          <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: below ? '#b91c1c' : NAVY }}>{fmtPct(c.percentage, 0)}</Typography>
                        ) : (
                          <Chip size="small" label={c.status === 'absent' ? 'Absent / none' : 'Missing'} sx={{ fontWeight: 700, bgcolor: c.status === 'missing' ? '#fffbeb' : '#f1f5f9', color: c.status === 'missing' ? '#a16207' : MUTED }} />
                        )}
                      </Flex>
                      {c.status === 'entered' ? <Box sx={{ mt: 0.5 }}><ProgressBar value={c.percentage} color={below ? '#dc2626' : '#2563EB'} /></Box> : null}
                    </Box>
                  );
                })}
                {!subjectCells.length ? <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>No courses in this stage.</Typography> : null}
              </Flex>
            </Panel>

            <Panel title="Academic weaknesses">
              {student.weakCourses.length ? (
                <Flex direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {student.weakCourses.map((w) => (
                    <Chip key={w} size="small" label={w} sx={{ fontWeight: 700, bgcolor: '#fef2f2', color: '#b91c1c' }} />
                  ))}
                </Flex>
              ) : (
                <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>No courses below the threshold.</Typography>
              )}
            </Panel>

            <Panel title="Teacher recommendations">
              <Bullets items={recommendations(student, courses, settings)} />
            </Panel>

            <Panel title="Suggested intervention plan">
              <Bullets items={interventionPlan(student, settings)} ordered />
            </Panel>

            <Panel title="Parent notification">
              {publication ? (
                <Typography sx={{ fontSize: '0.8125rem', color: NAVY }}>
                  Report {publication.status === 'PUBLISHED' ? 'published' : publication.status.toLowerCase()} ·{' '}
                  {publication.accessPolicy === 'ALL_PARENTS' ? 'Parents have access' : 'Pay-to-view'}
                  {publication.publishedAt ? ` · ${new Date(publication.publishedAt).toLocaleDateString()}` : ''}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>Not published yet for this stage.</Typography>
              )}
              <Typography sx={{ mt: 0.75, fontSize: '0.75rem', color: MUTED }}>Message delivery logs are not tracked on this page.</Typography>
            </Panel>
          </Box>

          <Flex direction="row" spacing={1} sx={{ p: 2, bgcolor: '#fff', borderTop: `1px solid ${BORDER}` }}>
            <Button fullWidth variant="contained" startIcon={<OpenInNewRoundedIcon />} onClick={() => onViewReport(student.studentId)} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, '&:hover': { bgcolor: '#1B2D52' } }}>
              View report card
            </Button>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => onViewReport(student.studentId)} sx={{ textTransform: 'none', fontWeight: 700, borderColor: BORDER, color: NAVY, flexShrink: 0 }}>
              Print
            </Button>
          </Flex>
        </Box>
      ) : null}
    </Drawer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${BORDER}`, minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ mt: 0.25, fontSize: '1rem', fontWeight: 800, color: tone ?? NAVY }}>{value}</Typography>
    </Box>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${BORDER}` }}>
      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.875rem' }}>{title}</Typography>
      {subtitle ? <Typography sx={{ fontSize: '0.75rem', color: MUTED, mt: 0.25, mb: 1 }}>{subtitle}</Typography> : <Box sx={{ mb: 1 }} />}
      {children}
    </Box>
  );
}

function Bullets({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Box component={Tag} sx={{ m: 0, pl: 2.25, display: 'grid', gap: 0.75 }}>
      {items.map((t) => (
        <Box component="li" key={t} sx={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.45, '&::marker': { color: AMBER, fontWeight: 800 } }}>
          {t}
        </Box>
      ))}
    </Box>
  );
}
