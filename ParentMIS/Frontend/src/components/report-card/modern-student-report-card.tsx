import { Fragment, useMemo, useRef, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import ReportQrCode from '@/components/report-card/report-qr-code';
import ReportSchoolHeader from '@/components/report-card/report-school-header';
import type { ReportCardDataV2 } from '@/types/report-card';
import { NOT_RECORDED, resolveReportVerifyUrl } from '@/lib/report-cards-utils';
import { REPORT_A4_WIDTH_PX as A4_WIDTH_PX } from '@/lib/report-a4';

const NAVY = '#000435';
const AMBER = '#FCB038';

function defaultDisplay(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n) || n <= 0) return NOT_RECORDED;
  return String(Math.round(n * 10) / 10);
}

function classStreamLabel(report: ReportCardDataV2) {
  const name = report.class?.name?.trim();
  const stream = report.class?.stream?.trim();
  if (name && stream) return `${name} · ${stream}`;
  return name || NOT_RECORDED;
}

function SectionTitle({ children, centered }: { children: ReactNode; centered?: boolean }) {
  return (
    <Typography
      sx={{
        fontSize: '0.6875rem',
        fontWeight: 800,
        color: NAVY,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {children}
    </Typography>
  );
}

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

type ReportSubject = ReportCardDataV2['subjects'][number];

type TermCell = { marks: string; grade: string; hasMarks: boolean; percentage: number };

function formatMarkFraction(score: number, max: number): string {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return NOT_RECORDED;
  const rounded = Math.round(score * 10) / 10;
  const scoreText = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${scoreText}/${max}`;
}

function parseReportTermColumns(report: ReportCardDataV2): string[] {
  if (report.combinedTerms?.length) return report.combinedTerms;
  const t = (report.term ?? '').trim();
  if (!t) return ['Term'];
  if (t.includes('+')) return t.split('+').map((x) => x.trim()).filter(Boolean);
  return [t];
}

function getSubjectTermCell(
  subject: ReportSubject,
  termLabel: string,
  termColumns: string[],
  useTermResults: boolean
): TermCell {
  const empty: TermCell = { marks: NOT_RECORDED, grade: NOT_RECORDED, hasMarks: false, percentage: 0 };

  if (useTermResults) {
    const tr = subject.termResults?.find((r) => normTerm(r.term) === normTerm(termLabel));
    if (!tr?.marksEntered) return empty;
    const max = tr.totalMax ?? subject.defaultCourseMarks ?? 100;
    return {
      marks: formatMarkFraction(tr.totalScore, max),
      grade: tr.grade ?? NOT_RECORDED,
      hasMarks: true,
      percentage: tr.percentage,
    };
  }

  if (termColumns.length > 1 && normTerm(termColumns[0]) !== normTerm(termLabel)) return empty;
  if (!subject.marksEntered) return empty;
  const max = subject.totalMax ?? subject.defaultCourseMarks ?? 100;
  return {
    marks: formatMarkFraction(subject.totalScore, max),
    grade: subject.grade ?? NOT_RECORDED,
    hasMarks: true,
    percentage: subject.percentage,
  };
}

function resolveComponentColumns(report: ReportCardDataV2): Array<{ name: string; weight: number }> {
  const template = report.assessmentTemplate?.components;
  if (template?.length) {
    return template.map((c) => ({
      name: c.name,
      weight: Number(c.weightPercentage) || 0,
    }));
  }
  if (report.componentOrder?.length) {
    const sample = report.subjects.find((s) => Object.keys(s.categoryScores).length > 0);
    return report.componentOrder.map((name) => ({
      name,
      weight: Number(sample?.categoryScores[name]?.weight) || 0,
    }));
  }
  const withMarks = report.subjects.find((s) => s.marksEntered && Object.keys(s.categoryScores).length > 0);
  if (withMarks) {
    return Object.entries(withMarks.categoryScores).map(([name, cs]) => ({
      name,
      weight: Number(cs.weight) || 0,
    }));
  }
  return [];
}

function gradeFromLegend(
  pct: number,
  legend: Array<{ grade: string; minPercentage: number; maxPercentage: number }>
): string | null {
  if (!legend.length || !Number.isFinite(pct) || pct <= 0) return null;
  const p = Math.round(pct * 100) / 100;
  const sorted = [...legend].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const g of sorted) {
    if (p + 0.001 >= g.minPercentage && p - 0.001 <= g.maxPercentage) return g.grade;
  }
  const lowest = sorted[sorted.length - 1];
  if (lowest && p >= lowest.minPercentage) return lowest.grade;
  return null;
}

function formatConvertedMark(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return NOT_RECORDED;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function componentCellDisplay(
  subject: ReportSubject,
  compName: string,
): { text: string; hasData: boolean } {
  const cs = subject.categoryScores[compName];
  const recorded =
    cs?.marksRecorded === true ||
    (cs?.marksRecorded === undefined && Boolean(cs && subject.marksEntered));
  if (!recorded) return { text: NOT_RECORDED, hasData: false };
  const score = cs!.normalizedScore ?? cs!.contribution ?? 0;
  if (!Number.isFinite(Number(score))) return { text: NOT_RECORDED, hasData: false };
  const max = cs!.normalizedMax;
  const scoreText = formatConvertedMark(Number(score));
  const text =
    max != null && Number.isFinite(Number(max)) && Number(max) > 0
      ? `${scoreText}/${formatConvertedMark(Number(max))}`
      : scoreText;
  return { text, hasData: true };
}

function displayMetric(value: string | number | null | undefined, fallback = NOT_RECORDED): string {
  if (value == null || value === '' || value === NOT_RECORDED) return fallback;
  return String(value);
}

function subjectDefaultMarks(subject: ReportSubject, report: ReportCardDataV2): string {
  const v =
    subject.defaultCourseMarks ??
    subject.totalMax ??
    report.assessmentTemplate?.defaultCourseMarks ??
    null;
  return defaultDisplay(v != null ? Number(v) : null);
}

function subjectStudentMarks(subject: ReportSubject, report: ReportCardDataV2): string {
  if (!subject.marksEntered) return NOT_RECORDED;
  const raw = subject.studentMarksOnDefault ?? subject.totalScore;
  const score = Number(raw);
  if (!Number.isFinite(score) || score < 0) return NOT_RECORDED;
  const def = Number(subject.defaultCourseMarks ?? subject.totalMax ?? report.assessmentTemplate?.defaultCourseMarks);
  if (Number.isFinite(def) && def > 0) {
    return `${formatConvertedMark(score)}/${formatConvertedMark(def)}`;
  }
  return formatConvertedMark(score);
}

function getSubjectTotalCell(
  subject: ReportSubject,
  termColumns: string[],
  useTermResults: boolean
): { marks: string; grade: string } {
  if (termColumns.length === 1) {
    const cell = getSubjectTermCell(subject, termColumns[0], termColumns, useTermResults);
    return { marks: cell.marks, grade: cell.grade };
  }
  const cells = termColumns
    .map((t) => getSubjectTermCell(subject, t, termColumns, useTermResults))
    .filter((c) => c.hasMarks);
  if (!cells.length) return { marks: NOT_RECORDED, grade: NOT_RECORDED };
  if (cells.length === 1) return { marks: cells[0].marks, grade: cells[0].grade };
  const avg = cells.reduce((s, c) => s + c.percentage, 0) / cells.length;
  return {
    marks: `${Math.round(avg * 10) / 10}%`,
    grade: subject.grade ?? cells[cells.length - 1].grade,
  };
}

function OverviewStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        px: 0.75,
        py: 1,
        bgcolor: '#f8fafc',
        borderRadius: 1,
        border: '1px solid #e2e8f0',
      }}
    >
      <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: NAVY, mt: 0.25 }}>{value}</Typography>
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
        minHeight: 100,
        p: 1.25,
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
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>{NOT_RECORDED}</Typography>
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
  const studentName =
    [report.student?.firstName, report.student?.lastName].filter(Boolean).join(' ') ||
    (report.student as { fullName?: string })?.fullName ||
    'Student';
  const studentIdLabel =
    (report.student as { admissionNumber?: string | null })?.admissionNumber ||
    (report.student as { studentCode?: string | null })?.studentCode ||
    report.student?.studentUid ||
    NOT_RECORDED;
  const termColumns = useMemo(() => parseReportTermColumns(report), [report]);
  const isSingleTermReport = termColumns.length === 1;
  const useTermResults = useMemo(
    () =>
      termColumns.length > 1 &&
      report.subjects.some((s) => (s.termResults?.length ?? 0) > 0),
    [report.subjects, termColumns.length]
  );
  const componentColumns = useMemo(() => resolveComponentColumns(report), [report]);
  const termPoints = useMemo(() => {
    const avgs = report.growth?.termAverages ?? [];
    return avgs
      .filter((t) => (t.subjectCount ?? 0) > 0 && Number.isFinite(t.averagePercentage))
      .map((t) => ({ label: t.period, value: Math.round(t.averagePercentage * 10) / 10 }));
  }, [report.growth]);

  const termAverageBars = useMemo(() => {
    if (termPoints.length > 0) return termPoints;
    if (report.overallScore > 0) {
      const label = (report.term ?? 'Term').trim() || 'Term';
      return [{ label, value: Math.round(report.overallScore * 10) / 10 }];
    }
    return [];
  }, [termPoints, report.overallScore, report.term]);

  const sortedSubjects = useMemo(() => {
    const list = [...report.subjects];
    list.sort((a, b) => {
      const ac = a.isCore !== false;
      const bc = b.isCore !== false;
      if (ac !== bc) return ac ? -1 : 1;
      return a.subject.localeCompare(b.subject);
    });
    return list;
  }, [report.subjects]);

  const positionDisplay =
    report.position && report.classSize ? `${report.position}/${report.classSize}` : NOT_RECORDED;

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

  const reportDate = fmtDate(report.meta?.generatedAt);
  const verifyUrl = resolveReportVerifyUrl(report);
  const classTeacherComment = report.comments?.classTeacher?.trim();
  const headTeacherComment = report.comments?.headTeacher?.trim();
  const overallGradeDisplay =
    report.overallGrade?.trim() ||
    gradeFromLegend(report.overallScore, gradingLegend) ||
    NOT_RECORDED;

  const profileCells = useMemo(() => {
    const cells: Array<{ label: string; value: string }> = [
      { label: 'Student ID', value: studentIdLabel },
      { label: 'Class', value: classStreamLabel(report) },
      { label: 'Gender', value: displayMetric(report.student?.gender) },
    ];
    const dob = fmtDate(report.student?.dateOfBirth);
    if (dob) cells.push({ label: 'Date of birth', value: dob });
    cells.push({ label: 'Term', value: displayMetric(report.term) });
    return cells;
  }, [report, studentIdLabel]);

  const photoUrl = (report.student as { photoUrl?: string | null })?.photoUrl;

  function renderTermPairCells(subject: ReportSubject, termLabel: string) {
    const cell = getSubjectTermCell(subject, termLabel, termColumns, useTermResults);
    return (
      <Fragment key={termLabel}>
        <td style={{ textAlign: 'center', fontWeight: cell.hasMarks ? 700 : 400, color: cell.hasMarks ? '#0f172a' : '#94a3b8' }}>
          {cell.marks}
        </td>
        <td style={{ textAlign: 'center', fontWeight: 800, color: cell.hasMarks ? '#000435' : '#94a3b8' }}>
          {cell.grade}
        </td>
      </Fragment>
    );
  }

  function subjectGradeDisplay(s: ReportSubject): string {
    if (!s.marksEntered) return NOT_RECORDED;
    if (s.grade?.trim()) return s.grade.trim();
    const fromLegend = gradeFromLegend(s.percentage, gradingLegend);
    return fromLegend ?? NOT_RECORDED;
  }

  function renderTemplateComponentCells(s: ReportSubject) {
    return componentColumns.map((col) => {
      const cell = componentCellDisplay(s, col.name);
      return (
        <td
          key={`${s.subjectId}-${col.name}`}
          style={{
            textAlign: 'center',
            fontWeight: cell.hasData ? 800 : 400,
            color: cell.hasData ? NAVY : '#94a3b8',
          }}
        >
          {cell.text}
        </td>
      );
    });
  }

  function renderSubjectRow(s: ReportSubject) {
    if (isSingleTermReport) {
      const avgPct = s.marksEntered ? `${Math.round(s.percentage * 10) / 10}%` : NOT_RECORDED;
      const gradeCell = subjectGradeDisplay(s);
      return (
        <tr key={s.subjectId} className="course-row">
          <td className="course-col">{s.subject}</td>
          <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>{subjectDefaultMarks(s, report)}</td>
          <td style={{ textAlign: 'center', fontWeight: 800, color: s.marksEntered ? NAVY : '#94a3b8' }}>
            {subjectStudentMarks(s, report)}
          </td>
          {renderTemplateComponentCells(s)}
          <td style={{ textAlign: 'center', fontWeight: 800, color: s.marksEntered ? NAVY : '#94a3b8' }}>{avgPct}</td>
          <td style={{ textAlign: 'center', fontWeight: 800, color: s.marksEntered ? NAVY : '#94a3b8' }}>{gradeCell}</td>
        </tr>
      );
    }
    const total = getSubjectTotalCell(s, termColumns, useTermResults);
    const avgPct =
      total.marks !== NOT_RECORDED && total.marks.includes('%')
        ? total.marks
        : s.marksEntered
          ? `${Math.round(s.percentage * 10) / 10}%`
          : NOT_RECORDED;
    return (
      <tr key={s.subjectId} className="course-row">
        <td className="course-col">{s.subject}</td>
        {termColumns.map((termLabel) => renderTermPairCells(s, termLabel))}
        <td style={{ textAlign: 'center', fontWeight: 800, color: avgPct !== NOT_RECORDED ? NAVY : '#94a3b8' }}>{avgPct}</td>
        <td style={{ textAlign: 'center', fontWeight: 800, color: total.grade !== NOT_RECORDED ? NAVY : '#94a3b8' }}>{total.grade}</td>
      </tr>
    );
  }

  const overallAverageDisplay = report.subjects.some((s) => s.marksEntered)
    ? `${Math.round(report.overallScore * 10) / 10}%`
    : NOT_RECORDED;

  return (
    <Box sx={{ width: '100%', maxWidth: A4_WIDTH_PX, mx: 'auto', p: { xs: 0, md: 1 }, '@media print': { p: 0 } }}>
      <Box
        ref={rootRef}
        data-report-verify-url={verifyUrl || undefined}
        className="modern-report-card midterm-report-card report-a4-document report-a4-babyeyi-frame"
        sx={{
          width: '100%',
          maxWidth: A4_WIDTH_PX,
          mx: 'auto',
          boxSizing: 'border-box',
          bgcolor: '#fff',
          color: '#0f172a',
          fontFamily: "'Montserrat', system-ui, sans-serif",
          border: `2px solid ${NAVY}`,
          borderRadius: '14px',
          p: '3px',
          boxShadow: { xs: 'none', md: '0 2px 12px rgba(0, 4, 53, 0.06)' },
          '@media print': { boxShadow: 'none' },
        }}
      >
        <Box
          className="report-a4-babyeyi-frame-inner"
          sx={{ border: `1.5px solid ${AMBER}`, borderRadius: '11px', boxSizing: 'border-box', overflow: 'hidden' }}
        >
          <ReportSchoolHeader
            compact
            school={school}
            reportTitle="STUDENT ACADEMIC REPORT"
            reportSubtitle={`${report.academicYear}${report.term ? ` · ${report.term}` : ''}`}
          />

          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderBottom: '1px solid #e2e8f0' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '88px 1fr' },
                gap: 2,
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 86,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  bgcolor: '#e2e8f0',
                  mx: { xs: 'auto', sm: 0 },
                }}
              >
                {photoUrl ? (
                  <Box component="img" src={photoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: NAVY,
                      fontWeight: 800,
                      fontSize: '1.25rem',
                    }}
                  >
                    {studentName
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Box>
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Learner
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', color: NAVY, lineHeight: 1.25, mt: 0.25 }}>
                  {studentName}
                </Typography>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    mt: 0.75,
                    borderCollapse: 'collapse',
                    fontSize: '0.6875rem',
                    '& td': { py: 0.45, verticalAlign: 'top' },
                    '& td:first-of-type': { color: '#64748b', fontWeight: 700, width: '38%', pr: 1, whiteSpace: 'nowrap' },
                    '& td:last-of-type': { fontWeight: 600, color: NAVY },
                  }}
                >
                  <tbody>
                    {profileCells.map((cell) => (
                      <tr key={cell.label}>
                        <td>{cell.label}</td>
                        <td>{cell.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            </Box>
          </Box>

      <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.25 }}>
        <SectionTitle centered>Subject performance</SectionTitle>
        <Box sx={{ overflowX: 'auto', mt: 1 }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              minWidth: { xs: 0, sm: 520 },
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
              '& th': {
                bgcolor: '#f8fafc',
                color: NAVY,
                py: 0.65,
                px: 1,
                fontWeight: 700,
                fontSize: '0.625rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                borderBottom: '1px solid #e2e8f0',
              },
              '& td': { py: 0.45, px: 1, borderBottom: '1px solid #eef2f6' },
              '& tfoot td': {
                py: 0.55,
                px: 1,
                fontWeight: 800,
                fontSize: '0.75rem',
                bgcolor: '#f8fafc',
                color: '#0f172a',
                borderTop: '1px solid #cbd5e1',
                borderBottom: 'none',
              },
              '& .course-col': { textAlign: 'left', fontWeight: 700, color: NAVY, minWidth: 120 },
              '& .section-row td': {
                bgcolor: '#f1f5f9',
                color: NAVY,
                fontWeight: 800,
                fontSize: '0.625rem',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                borderBottom: '1px solid #cbd5e1',
                py: 0.55,
              },
            }}
          >
            <thead>
              {isSingleTermReport ? (
                <>
                  <tr>
                    <th className="course-col" rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                      Subject
                    </th>
                    <th rowSpan={2} style={{ textAlign: 'center', width: 52, verticalAlign: 'middle' }}>
                      Default
                    </th>
                    <th
                      rowSpan={2}
                      style={{ textAlign: 'center', width: 88, verticalAlign: 'middle' }}
                      title="All TichaPortal marks converted to course DEFAULT"
                    >
                      Student marks
                    </th>
                    {componentColumns.length > 0 ? (
                      <th
                        colSpan={componentColumns.length}
                        style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}
                      >
                        Component marks
                      </th>
                    ) : null}
                    <th rowSpan={2} style={{ textAlign: 'center', width: 64, verticalAlign: 'middle' }}>
                      Average
                    </th>
                    <th rowSpan={2} style={{ textAlign: 'center', width: 52, verticalAlign: 'middle' }}>
                      Grade
                    </th>
                  </tr>
                  <tr>
                    {componentColumns.map((col) => (
                      <th key={col.name} style={{ textAlign: 'center', fontSize: '0.5625rem' }}>
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </>
              ) : (
                <tr>
                  <th className="course-col" style={{ textAlign: 'left' }}>
                    Subject
                  </th>
                  {termColumns.map((term) => (
                    <Fragment key={term}>
                      <th style={{ textAlign: 'center' }}>{term}</th>
                      <th style={{ textAlign: 'center', width: 52 }}>Gr</th>
                    </Fragment>
                  ))}
                  <th style={{ textAlign: 'center', width: 72 }}>Average</th>
                  <th style={{ textAlign: 'center', width: 56 }}>Grade</th>
                </tr>
              )}
            </thead>
            <tbody>
              {sortedSubjects.map((s) => renderSubjectRow(s))}
            </tbody>
            <tfoot>
              <tr>
                {isSingleTermReport ? (
                  <>
                    <td style={{ textAlign: 'left' }}>Total</td>
                    <td style={{ textAlign: 'center' }}>{NOT_RECORDED}</td>
                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{NOT_RECORDED}</td>
                    {componentColumns.map((col) => (
                      <td key={`foot-${col.name}`} style={{ textAlign: 'center', color: '#94a3b8' }}>
                        {NOT_RECORDED}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center' }}>{overallAverageDisplay}</td>
                    <td style={{ textAlign: 'center' }}>{overallGradeDisplay}</td>
                  </>
                ) : (
                  <>
                    <td style={{ textAlign: 'left' }}>Total</td>
                    {termColumns.map((term) => (
                      <Fragment key={`${term}-foot`}>
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>{NOT_RECORDED}</td>
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>{NOT_RECORDED}</td>
                      </Fragment>
                    ))}
                    <td style={{ textAlign: 'center' }}>{overallAverageDisplay}</td>
                    <td style={{ textAlign: 'center' }}>{overallGradeDisplay}</td>
                  </>
                )}
              </tr>
            </tfoot>
          </Box>
        </Box>
        {gradingLegend.length > 0 ? (
          <Box sx={{ mt: 1, px: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {gradingLegend.slice(0, 12).map((g) => (
              <Typography key={g.grade} sx={{ fontSize: '0.5625rem', color: '#64748b' }}>
                <Box component="span" sx={{ fontWeight: 800, color: NAVY }}>
                  {g.grade}
                </Box>{' '}
                {g.minPercentage}–{g.maxPercentage}%
              </Typography>
            ))}
          </Box>
        ) : null}
      </Box>

      <Box className="report-section-overview" sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: '1px solid #e2e8f0' }}>
        <SectionTitle>Academic performance overview</SectionTitle>
        <Box
          className="report-overview-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1.5,
            mt: 1,
            alignItems: 'stretch',
          }}
        >
          <Box className="report-overview-stats" sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, alignContent: 'start' }}>
            <OverviewStatCard label="Class position" value={positionDisplay} />
            <OverviewStatCard label="Percentage" value={overallAverageDisplay} />
          </Box>
          <Box
            className="report-overview-chart"
            sx={{
              bgcolor: '#f8fafc',
              borderRadius: 1,
              border: '1px solid #e2e8f0',
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 140,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.5625rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                mb: 1,
                textAlign: 'center',
              }}
            >
              Percentage marks
            </Typography>
            {termAverageBars.length ? (
              <TermBarChart points={termAverageBars} currentTerm={report.term} />
            ) : (
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', py: 1 }}>{NOT_RECORDED}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      {(strong.length > 0 || improve.length > 0) && (
        <Box className="report-section-analysis" sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: '1px solid #e2e8f0' }}>
          <SectionTitle>Subject performance analysis</SectionTitle>
          <Box className="report-analysis-row" sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.25, mt: 1 }}>
            <CourseList title="Best performing" items={strong} variant="strong" />
            <CourseList title="Needs improvement" items={improve} variant="improve" />
          </Box>
        </Box>
      )}

      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: '1px solid #e2e8f0' }}>
        <SectionTitle>Teacher comments &amp; signatures</SectionTitle>
                        <Box className="report-teacher-signatures" sx={{ mt: 1.25 }}>
          <Box sx={{ border: '1px solid #94a3b8', borderRadius: 0.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #94a3b8', minHeight: 44 }}>
              <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>Class teacher comment</Box>
              <Box sx={{ px: 1, py: 0.75, fontSize: '0.75rem', color: '#334155' }}>{classTeacherComment || '\u00A0'}</Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #94a3b8', minHeight: 44 }}>
              <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>Class teacher signature</Box>
              <Box sx={{ px: 1, py: 0.75 }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', minHeight: 44 }}>
              <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>Parent signature</Box>
              <Box sx={{ px: 1, py: 0.75 }} />
            </Box>
          </Box>
          {headTeacherComment ? (
            <Box sx={{ mt: 1, fontSize: '0.6875rem', color: '#334155' }}>
              <Box component="span" sx={{ fontWeight: 800, color: NAVY }}>Head teacher comment: </Box>{headTeacherComment}
            </Box>
          ) : null}
        </Box>
</Box>

              <Box
          className="report-section-verify"
          sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: '1px solid #e2e8f0' }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: NAVY }}>Head Teacher Signature &amp; Stamp</Typography>
              <Box sx={{ minHeight: 40, borderBottom: '1px solid #94a3b8', mt: 0.5, maxWidth: 320, mx: 'auto' }} />
              {reportDate ? (
                <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', mt: 0.5 }}>Generated {reportDate}</Typography>
              ) : null}
            </Box>
            {verifyUrl ? (
              <Box
                className="report-qr-block"
                data-verify-url={verifyUrl}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
              >
                <ReportQrCode value={verifyUrl} size={68} />
                <Typography sx={{ fontSize: '0.5625rem', fontWeight: 600, color: NAVY }}>Scan to verify</Typography>
              </Box>
            ) : null}
          </Box>
        </Box>

      <Box sx={{ py: 0.65, textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', fontWeight: 600 }}>Shule+ · Term report</Typography>
      </Box>
        </Box>
      </Box>
    </Box>
  );
}
