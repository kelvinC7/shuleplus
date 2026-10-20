'use client';

import { useMemo, useRef } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import ReportQrCode from '@/components/report-card/report-qr-code';
import type { ReportCardDataV2 } from '@/types/report-card';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function normTerm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isCurrentTerm(period: string, reportTerm: string | null | undefined) {
  if (!reportTerm) return false;
  return normTerm(period) === normTerm(reportTerm);
}

function TermBarChart({ points, currentTerm }: { points: Array<{ label: string; value: number }>; currentTerm?: string | null }) {
  if (!points.length) return null;
  const max = Math.max(...points.map((p) => p.value), 100);
  const h = 120;
  const barW = Math.min(48, 240 / Math.max(points.length, 1));

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: h, borderBottom: '1px solid #e2e8f0', pb: 0.5 }}>
        {points.map((p) => {
          const barH = max > 0 ? (p.value / max) * (h - 24) : 0;
          const current = isCurrentTerm(p.label, currentTerm);
          return (
            <Box key={p.label} sx={{ textAlign: 'center', width: barW + 16 }}>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#000435', mb: 0.25 }}>{p.value}%</Typography>
              <Box
                sx={{
                  height: barH,
                  width: barW,
                  mx: 'auto',
                  borderRadius: '4px 4px 0 0',
                  bgcolor: current ? '#FCB038' : '#000435',
                }}
              />
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 0.75 }}>
        {points.map((p) => (
          <Typography
            key={`${p.label}-lbl`}
            sx={{
              fontSize: '0.625rem',
              fontWeight: isCurrentTerm(p.label, currentTerm) ? 800 : 600,
              color: isCurrentTerm(p.label, currentTerm) ? '#000435' : '#64748b',
              width: barW + 16,
              textAlign: 'center',
            }}
          >
            {p.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function CourseList({
  title,
  items,
  variant,
}: {
  title: string;
  items: Array<{ subject: string; percentage: number; grade?: string | null }>;
  variant: 'strong' | 'improve';
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 140,
        p: 1.5,
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        bgcolor: '#fafbfc',
      }}
    >
      <Typography sx={{ fontSize: '0.5625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.length ? (
          items.map((c) => (
            <Box key={c.subject}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{c.subject}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#000435' }}>
                  {c.percentage}%{c.grade ? ` · ${c.grade}` : ''}
                </Typography>
              </Box>
              <Box sx={{ height: 5, borderRadius: 3, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                <Box
                  sx={{
                    width: `${Math.min(100, c.percentage)}%`,
                    height: '100%',
                    bgcolor: variant === 'strong' ? '#000435' : '#FCB038',
                    borderRadius: 3,
                  }}
                />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>—</Typography>
        )}
      </Box>
    </Box>
  );
}

type Props = {
  report: ReportCardDataV2;
  documentRef?: React.RefObject<HTMLDivElement | null>;
};

export default function ModernStudentReportCard({ report, documentRef }: Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const rootRef = documentRef ?? internalRef;

  const school = report.school;
  const studentName = [report.student?.firstName, report.student?.lastName].filter(Boolean).join(' ');
  const componentCols = useMemo(() => {
    if (report.assessmentTemplate?.components?.length) {
      return report.assessmentTemplate.components.map((c) => c.name);
    }
    if (report.componentOrder?.length) return report.componentOrder;
    const keys = new Set<string>();
    report.subjects.forEach((s) => Object.keys(s.categoryScores || {}).forEach((k) => keys.add(k)));
    return [...keys];
  }, [report]);

  const componentWeights = useMemo(() => {
    const map = new Map<string, number>();
    report.assessmentTemplate?.components?.forEach((c) => map.set(c.name, c.weightPercentage));
    report.subjects.forEach((s) => {
      Object.entries(s.categoryScores || {}).forEach(([name, data]) => {
        if (data.weight != null && !map.has(name)) map.set(name, data.weight);
      });
    });
    return map;
  }, [report]);

  const templateDefaultMarks =
    report.assessmentTemplate?.defaultCourseMarks ??
    report.subjects.find((s) => s.defaultCourseMarks)?.defaultCourseMarks ??
    100;

  const coursesWithMarks = useMemo(
    () => report.subjects.filter((s) => s.marksEntered).length,
    [report.subjects]
  );

  const termPoints = useMemo(() => {
    const avgs = report.growth?.termAverages ?? [];
    return avgs.map((t) => ({ label: t.period, value: Math.round(t.averagePercentage * 10) / 10 }));
  }, [report.growth]);

  const strong = report.strongCourses ?? [];
  const improve = report.improvementCourses ?? [];

  const gradingLegend = useMemo(() => {
    const rows = report.gradingLegend ?? [];
    const seen = new Set<string>();
    return rows.filter((g) => {
      if (seen.has(g.grade)) return false;
      seen.add(g.grade);
      return true;
    });
  }, [report.gradingLegend]);

  const enteredSubjects = useMemo(() => report.subjects.filter((s) => s.marksEntered), [report.subjects]);
  const totalMarks =
    report.summary?.totalMarks ?? enteredSubjects.reduce((s, x) => s + x.totalScore, 0);
  const totalMax =
    report.summary?.totalMax ?? enteredSubjects.reduce((s, x) => s + (x.totalMax ?? 0), 0);
  const reportDate = fmtDate(report.meta?.generatedAt);
  const verifyUrl = report.meta?.verifyUrl || '';
  const classStream = [report.class?.name, report.class?.stream].filter(Boolean).join(' ');
  const contactLine = [school?.phone, school?.email, school?.website].filter(Boolean).join(' · ');
  const classTeacherComment = report.comments?.classTeacher?.trim();
  const headTeacherComment = report.comments?.headTeacher?.trim();
  const overallGradeDisplay = report.overallGrade || '—';

  return (
    <Box
      ref={rootRef}
      className="modern-report-card report-a4-document"
      sx={{
        width: '100%',
        maxWidth: 794,
        mx: 'auto',
        bgcolor: '#fff',
        color: '#0f172a',
        fontFamily: "'Montserrat', system-ui, sans-serif",
        boxShadow: { xs: 'none', md: '0 8px 40px rgba(0,4,53,0.08)' },
        border: { xs: 'none', md: '1px solid #e2e8f0' },
        borderRadius: { xs: 0, md: '4px' },
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5, pb: 2, borderBottom: '3px solid #000435' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {school?.logoUrl ? (
            <Box component="img" src={school.logoUrl} alt="" sx={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
          ) : null}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: '#000435' }}>{school?.name || 'School'}</Typography>
            {school?.motto ? (
              <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic', mt: 0.25 }}>{school.motto}</Typography>
            ) : null}
            {school?.address ? <Typography sx={{ fontSize: '0.6875rem', color: '#475569', mt: 0.75 }}>{school.address}</Typography> : null}
            {contactLine ? <Typography sx={{ fontSize: '0.625rem', color: '#64748b', mt: 0.25 }}>{contactLine}</Typography> : null}
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.12em', color: '#000435' }}>REPORT CARD</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: '#334155', mt: 0.5 }}>
              {report.academicYear} · {report.term || 'Term'}
            </Typography>
            <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>{reportDate}</Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '72px 1fr', sm: '88px 1fr auto' },
          gap: 2,
          alignItems: 'center',
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {(report.student as { photoUrl?: string })?.photoUrl ? (
          <Box
            component="img"
            src={(report.student as { photoUrl?: string }).photoUrl!}
            alt=""
            sx={{ width: { xs: 72, sm: 88 }, height: { xs: 88, sm: 104 }, objectFit: 'cover', borderRadius: '6px', border: '2px solid #fff' }}
          />
        ) : (
          <Box sx={{ width: { xs: 72, sm: 88 }, height: { xs: 88, sm: 104 }, borderRadius: '6px', bgcolor: '#e2e8f0' }} />
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75, fontSize: '0.75rem' }}>
          <Typography sx={{ gridColumn: '1 / -1', fontSize: '1.0625rem', fontWeight: 800, color: '#000435' }}>{studentName}</Typography>
          <span><strong style={{ color: '#94a3b8', fontWeight: 600 }}>ID</strong> {report.student?.studentUid}</span>
          <span><strong style={{ color: '#94a3b8', fontWeight: 600 }}>Class</strong> {classStream}</span>
          <span><strong style={{ color: '#94a3b8', fontWeight: 600 }}>Gender</strong> {report.student?.gender || '—'}</span>
          {(report.student as { parentGuardian?: string })?.parentGuardian ? (
            <span><strong style={{ color: '#94a3b8', fontWeight: 600 }}>Guardian</strong> {(report.student as { parentGuardian?: string }).parentGuardian}</span>
          ) : null}
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, minWidth: 280 }}>
          {[
            { l: 'Position', v: `${report.position}/${report.classSize}`, accent: '#000435' },
            { l: 'Average', v: `${report.overallScore}%`, accent: '#FCB038' },
            { l: 'Total', v: totalMax ? `${totalMarks}/${totalMax}` : '—', accent: '#000435' },
            { l: 'Attendance', v: report.attendance?.rate != null ? `${report.attendance.rate}%` : '—', accent: '#000435' },
            { l: 'Courses', v: `${coursesWithMarks}/${report.subjects.length}`, accent: '#000435' },
            { l: 'Grade', v: overallGradeDisplay, accent: '#FCB038' },
          ].map((k) => (
            <Box key={k.l} sx={{ textAlign: 'center', px: 1, py: 0.75, bgcolor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{k.l}</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 800, color: k.accent ?? '#000435' }}>{k.v}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              minWidth: 640,
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
              '& th': { bgcolor: '#000435', color: '#fff', fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase', py: 0.75, px: 0.75 },
              '& td': { py: 0.75, px: 0.75, borderBottom: '1px solid #eef2f6' },
              '& tbody tr:nth-of-type(even) td': { bgcolor: '#fafbfc' },
              '& .course-col': { position: 'sticky', left: 0, bgcolor: '#fff', fontWeight: 700, color: '#000435', zIndex: 1 },
              '& tbody tr:nth-of-type(even) .course-col': { bgcolor: '#fafbfc' },
            }}
          >
            <thead>
              <tr>
                <th className="course-col" rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'bottom' }}>
                  Course
                </th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'bottom' }}>
                  Default
                </th>
                <th colSpan={componentCols.length || 1} style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  Assessment components
                </th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'bottom' }}>
                  Course result
                </th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'bottom' }}>
                  Total %
                </th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'bottom' }}>
                  Position
                </th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'bottom' }}>
                  Grade
                </th>
              </tr>
              <tr>
                {componentCols.length ? (
                  componentCols.map((c) => (
                    <th key={`${c}-w`} style={{ textAlign: 'center', fontSize: '0.5625rem', fontWeight: 600 }}>
                      {c}
                      {componentWeights.get(c) != null ? (
                        <span style={{ display: 'block', opacity: 0.85 }}>{componentWeights.get(c)}%</span>
                      ) : null}
                    </th>
                  ))
                ) : (
                  <th style={{ textAlign: 'center' }}>—</th>
                )}
              </tr>
            </thead>
            <tbody>
              {report.subjects.map((s) => {
                const hasMarks = Boolean(s.marksEntered);
                const slash = '/';
                const dcm = s.defaultCourseMarks ?? templateDefaultMarks;
                return (
                  <tr key={s.subjectId}>
                    <td className="course-col">{s.subject}</td>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{dcm}</td>
                    {componentCols.length ? (
                      componentCols.map((cat) => {
                        const data = s.categoryScores?.[cat];
                        const cell = !hasMarks ? slash : data?.marksDisplay || slash;
                        const tip =
                          data?.rawMarksDisplay && data?.weight != null
                            ? `Performance: ${data.rawMarksDisplay}\nWeight: ${data.weight}% of course default\nComponent cap: ${data.normalizedMax ?? '—'} (= default × weight)\nContribution: ${data.marksDisplay ?? cell} (toward course total)`
                            : data?.rawMarksDisplay
                              ? `Performance: ${data.rawMarksDisplay}`
                              : '';
                        return (
                          <td key={cat} style={{ textAlign: 'center', color: data ? '#0f172a' : '#94a3b8' }}>
                            {tip ? (
                              <Tooltip title={<span style={{ whiteSpace: 'pre-line', fontSize: '0.6875rem' }}>{tip}</span>} arrow>
                                <span style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>{cell}</span>
                              </Tooltip>
                            ) : (
                              cell
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>{slash}</td>
                    )}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#000435' }}>
                      {!hasMarks ? slash : `${s.totalScore}/${s.totalMax ?? dcm}`}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{!hasMarks ? slash : `${s.percentage}%`}</td>
                    <td style={{ textAlign: 'center' }}>
                      {!hasMarks ? slash : s.rank && s.classSize ? `${s.rank}/${s.classSize}` : slash}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: hasMarks && s.grade ? '#000435' : '#94a3b8' }}>
                      {!hasMarks ? slash : s.grade || slash}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="course-col" style={{ fontWeight: 800, backgroundColor: '#000435', color: '#fff' }}>
                  Overall
                </td>
                <td style={{ textAlign: 'center', backgroundColor: '#000435', color: '#fff' }}>—</td>
                {componentCols.map((c) => (
                  <td key={c} style={{ backgroundColor: '#000435' }} />
                ))}
                <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#000435', color: '#fff' }}>
                  {totalMax ? `${totalMarks}/${totalMax}` : '—'}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#000435', color: '#fff' }}>{report.overallScore}%</td>
                <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#000435', color: '#fff' }}>
                  {report.position}/{report.classSize}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#FCB038', color: '#000435' }}>{overallGradeDisplay}</td>
              </tr>
            </tbody>
          </Box>
        </Box>
      </Box>

      {gradingLegend.length > 0 && (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {gradingLegend.map((g) => (
            <Typography key={g.grade} sx={{ fontSize: '0.5625rem', color: '#64748b' }}>
              <strong>{g.grade}</strong> {g.minPercentage}–{g.maxPercentage}%
            </Typography>
          ))}
        </Box>
      )}

      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fafbfc' }}>
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: '#000435', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
          Term performance
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', p: 2 }}>
            {termPoints.length ? (
              <>
                <TermBarChart points={termPoints} currentTerm={report.term} />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(termPoints.length, 3)}, 1fr)`,
                    gap: 1,
                    mt: 2,
                  }}
                >
                  {termPoints.map((t) => {
                    const current = isCurrentTerm(t.label, report.term);
                    return (
                      <Box
                        key={t.label}
                        sx={{
                          textAlign: 'center',
                          py: 1,
                          px: 0.5,
                          borderRadius: '6px',
                          border: current ? '2px solid #FCB038' : '1px solid #e2e8f0',
                          bgcolor: current ? 'rgba(252,176,56,0.08)' : '#fff',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#94a3b8' }}>{t.label}</Typography>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#000435' }}>{t.value}%</Typography>
                        {current ? (
                          <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: '#c87800' }}>Current</Typography>
                        ) : null}
                      </Box>
                    );
                  })}
                </Box>
              </>
            ) : (
              <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', py: 2, textAlign: 'center' }}>
                Term trend appears when marks exist for more than one term.
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: { md: 220 } }}>
            <CourseList title="Performed well" items={strong} variant="strong" />
            <CourseList title="Needs improvement" items={improve} variant="improve" />
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'stretch' }}>
          <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: 2, minHeight: 160, display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mb: 1 }}>Class teacher</Typography>
            <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.55, color: '#334155', flex: 1, minHeight: 72 }}>
              {classTeacherComment || ' '}
            </Typography>
            <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Signature</Typography>
            </Box>
          </Box>
          <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: 2, minHeight: 160, display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: '0.5625rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mb: 1 }}>Head teacher</Typography>
            <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.55, color: '#334155', flex: 1, minHeight: 72 }}>
              {headTeacherComment || ' '}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, borderTop: '1px solid #e2e8f0', pt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8' }}>Signature</Typography>
                {school?.signatureUrl ? (
                  <Box component="img" src={school.signatureUrl} alt="" sx={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', mt: 0.5 }} />
                ) : null}
              </Box>
              {school?.stampUrl ? (
                <Box component="img" src={school.stampUrl} alt="" sx={{ maxHeight: 48, maxWidth: 48, objectFit: 'contain', opacity: 0.9 }} />
              ) : null}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 1.5,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography sx={{ fontSize: '0.625rem', color: '#64748b' }}>Parent / guardian · signature · date</Typography>
        {verifyUrl ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportQrCode value={verifyUrl} size={64} />
            <Typography sx={{ fontSize: '0.5rem', color: '#94a3b8', maxWidth: 80 }}>Scan to verify</Typography>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ px: 3, py: 1.25, bgcolor: '#000435', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Generated by Shule+</Typography>
        <Typography sx={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.65)' }}>{reportDate}</Typography>
      </Box>
    </Box>
  );
}
