import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import LessonPlanFilterBar from '../../components/lessonPlanning/LessonPlanFilterBar';
import { fetchCoursePerformance, fetchLessonPlanningContext } from '../../services/lessonPlanningApi';
import { EmptyState } from '../../components/ui';
import { brand } from '../../theme/theme';

export default function CoursePerformancePage() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ academicYear: '', term: '' });
  const [data, setData] = useState(null);
  const [ctxOptions, setCtxOptions] = useState({ years: [], terms: [] });

  useEffect(() => {
    fetchLessonPlanningContext().then((ctx) => {
      setCtxOptions({
        years: ctx.academicYears?.length ? ctx.academicYears : [ctx.academicYear].filter(Boolean),
        terms: ctx.terms?.length ? ctx.terms : ['Term 1', 'Term 2', 'Term 3'],
      });
      setFilters({ academicYear: ctx.academicYear, term: ctx.term });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchCoursePerformance(filters);
        if (!cancelled) setData(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const s = data?.summary || {};

  return (
    <LessonPlanningLayout
      title="Course performance"
      subtitle="Planning vs teaching coverage by course."
      filterBar={
        <LessonPlanFilterBar
          filters={[
            {
              key: 'year',
              label: 'Academic year',
              value: filters.academicYear,
              onChange: (v) => setFilters((f) => ({ ...f, academicYear: v })),
              options: [{ value: '', label: 'All years' }, ...ctxOptions.years.map((y) => ({ value: y, label: y }))],
            },
            {
              key: 'term',
              label: 'Term',
              flex: 0.85,
              value: filters.term,
              onChange: (v) => setFilters((f) => ({ ...f, term: v })),
              options: [{ value: '', label: 'All terms' }, ...ctxOptions.terms.map((t) => ({ value: t, label: t }))],
            },
          ]}
        />
      }
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: brand.navy }} />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
              border: `1px solid ${brand.navy}`,
              overflow: 'hidden',
            }}
          >
            {[
              {
                label: 'Planned',
                value: s.uniquePlannedLessons ?? 0,
                hint: `of ${s.totalCurriculumLessons ?? 0} (${s.planningCoveragePercent ?? 0}%)`,
              },
              {
                label: 'Taught',
                value: s.taughtLessons ?? 0,
                hint: `${s.teachingCoveragePercent ?? 0}% coverage`,
              },
              {
                label: 'Curriculum',
                value: s.totalCurriculumLessons ?? 0,
                hint: 'Total lessons',
              },
              {
                label: 'Coverage',
                value: `${s.planningCoveragePercent ?? 0}%`,
                hint: 'Planning progress',
              },
            ].map((card, i) => (
              <Box
                key={card.label}
                sx={{
                  bgcolor: brand.navy,
                  color: '#fff',
                  px: 1.75,
                  py: 1.5,
                  minHeight: 88,
                  borderRadius: 0,
                  borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.65)' }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {card.value}
                </Typography>
                <Typography sx={{ mt: 0.35, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{card.hint}</Typography>
              </Box>
            ))}
          </Box>

          <Stack spacing={1.5} sx={{ mt: 0, display: { md: 'none' } }}>
            {(data?.courses || []).map((c) => (
              <Box component="article" key={`${c.subject}-${c.className}`} sx={{ borderBottom: '1px solid #E2E8F0', py: 2, '&:last-of-type': { borderBottom: 'none' } }}>
                <Typography sx={{ fontWeight: 700, color: brand.navy }}>{c.subject}</Typography>
                <Typography sx={{ fontSize: 12, color: '#64748B' }}>{c.className}</Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#94A3B8' }}>Planning</Typography>
                    <Bar value={c.planningCoveragePercent} fullWidth />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#94A3B8' }}>Teaching</Typography>
                    <Bar value={c.teachingCoveragePercent} fullWidth />
                  </Box>
                </Stack>
                <Box component="dl" sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: 12 }}>
                  <Box>
                    <Typography component="dt" sx={{ fontSize: 12, color: '#94A3B8' }}>Saved plans</Typography>
                    <Typography component="dd" sx={{ m: 0, fontSize: 12, fontWeight: 600, color: brand.navy }}>{c.savedPlans}</Typography>
                  </Box>
                  <Box>
                    <Typography component="dt" sx={{ fontSize: 12, color: '#94A3B8' }}>Remaining</Typography>
                    <Typography component="dd" sx={{ m: 0, fontSize: 12, fontWeight: 600, color: brand.navy }}>{c.remainingLessons}</Typography>
                  </Box>
                </Box>
              </Box>
            ))}
            {!data?.courses?.length ? (
              <EmptyState
                title="No course progress yet"
                description="Generate lesson plans to see planning and teaching coverage by course."
              />
            ) : null}
          </Stack>

          <Paper variant="outlined" sx={{ mt: 3, display: { xs: 'none', md: 'block' }, borderRadius: 2, borderColor: '#E2E8F0', overflow: 'hidden' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <Box component="thead" sx={{ bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <Box component="tr">
                  {['Course', 'Class', 'Planning %', 'Teaching %', 'Saved plans', 'Remaining'].map((h, i) => (
                    <Box
                      component="th"
                      key={h}
                      sx={{ px: 2, py: 1.5, textAlign: i < 2 ? 'left' : 'right', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', color: '#64748B' }}
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {(data?.courses || []).map((c) => (
                  <Box component="tr" key={`${c.subject}-${c.className}`} sx={{ borderBottom: '1px solid #F1F5F9', '&:hover': { bgcolor: '#F8FAFC' } }}>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontWeight: 600, color: brand.navy }}>{c.subject}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{c.className}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><Bar value={c.planningCoveragePercent} /></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><Bar value={c.teachingCoveragePercent} /></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, textAlign: 'right' }}>{c.savedPlans}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, textAlign: 'right' }}>{c.remainingLessons}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
            {!data?.courses?.length ? (
              <Typography sx={{ p: 4, textAlign: 'center', fontSize: 14, color: '#64748B' }}>No course progress yet. Generate lesson plans to see coverage.</Typography>
            ) : null}
          </Paper>
        </>
      )}
    </LessonPlanningLayout>
  );
}

function Bar({ value, color = '#334155', fullWidth = false }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <Box sx={{ display: fullWidth ? 'flex' : 'inline-flex', alignItems: 'center', gap: 1, width: fullWidth ? '100%' : 'auto', minWidth: fullWidth ? 0 : 100 }}>
      <Box sx={{ height: 8, flex: 1, borderRadius: 999, bgcolor: '#F1F5F9' }}>
        <Box sx={{ height: 8, borderRadius: 999, width: `${v}%`, bgcolor: color }} />
      </Box>
      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}%</Box>
    </Box>
  );
}
