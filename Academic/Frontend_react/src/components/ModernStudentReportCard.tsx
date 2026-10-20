import { Fragment, useMemo, useRef, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import ReportQrCode from '@/components/ReportQrCode';
import type { ReportCardDataV2 } from '@/types';

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

function groupSubjectsByCore(subjects: ReportSubject[]) {
  const core = subjects.filter((s) => s.isCore !== false);
  const nonCore = subjects.filter((s) => s.isCore === false);
  return { core, nonCore };
}

function SectionHeaderRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="section-header-row">
      <td
        colSpan={colSpan}
        style={{
          padding: '9px 14px',
          background: '#FCB038',
          color: '#000435',
          fontWeight: 800,
          fontSize: '0.6875rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          borderTop: '3px solid #000435',
          borderBottom: '1px solid #e2a020',
        }}
      >
        {label}
      </td>
    </tr>
  );
}

type TermCell = { marks: string; grade: string; hasMarks: boolean; percentage: number };

function formatMarkFraction(score: number, max: number): string {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return '—';
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
  const empty: TermCell = { marks: '—', grade: '—', hasMarks: false, percentage: 0 };

  if (useTermResults) {
    const tr = subject.termResults?.find((r) => normTerm(r.term) === normTerm(termLabel));
    if (!tr?.marksEntered) return empty;
    const max = tr.totalMax ?? subject.defaultCourseMarks ?? 100;
    return {
      marks: formatMarkFraction(tr.totalScore, max),
      grade: tr.grade ?? '—',
      hasMarks: true,
      percentage: tr.percentage,
    };
  }

  if (termColumns.length > 1 && normTerm(termColumns[0]) !== normTerm(termLabel)) return empty;
  if (!subject.marksEntered) return empty;
  const max = subject.totalMax ?? subject.defaultCourseMarks ?? 100;
  return {
    marks: formatMarkFraction(subject.totalScore, max),
    grade: subject.grade ?? '—',
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

function componentHeaderLabel(name: string, weight: number) {
  const w = weight > 0 ? ` ${Math.round(weight)}%` : '';
  return `${name.toUpperCase()}${w}`;
}

/** Component column max = course DEFAULT × weight (e.g. 40 × 50% → out of 20). */
function componentHeaderHint(weight: number) {
  if (weight <= 0) return 'Scaled to course total';
  return `Up to ${Math.round(weight)}% of DEFAULT`;
}

function componentCellDisplay(
  subject: ReportSubject,
  compName: string,
): { text: string; sub?: string; title?: string; hasData: boolean } {
  const cs = subject.categoryScores[compName];
  if (!cs || !subject.marksEntered) return { text: '/', hasData: false };
  const norm = cs.normalizedScore;
  const max = cs.normalizedMax;
  const raw = cs.rawMarksDisplay?.trim();
  const showRaw =
    raw &&
    cs.maxMark != null &&
    cs.normalizedMax != null &&
    Math.abs(Number(cs.maxMark) - Number(cs.normalizedMax)) > 0.05;

  if (norm != null && max != null && max > 0) {
    const text = formatMarkFraction(norm, max);
    return {
      text,
      sub: showRaw ? raw : undefined,
      title: showRaw
        ? `Entered ${raw}; shown on course scale as ${text} (component max ${max})`
        : `Component max ${max} = DEFAULT × component weight`,
      hasData: true,
    };
  }
  if (cs.marksDisplay?.trim()) {
    return { text: cs.marksDisplay, sub: showRaw ? raw : undefined, hasData: true };
  }
  if (cs.percentage > 0) return { text: `${Math.round(cs.percentage * 10) / 10}%`, hasData: true };
  return { text: '/', hasData: false };
}

function subjectDefaultMarks(subject: ReportSubject, report: ReportCardDataV2): string {
  const v =
    subject.defaultCourseMarks ??
    subject.totalMax ??
    report.assessmentTemplate?.defaultCourseMarks ??
    null;
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return String(Math.round(Number(v)));
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
  if (!cells.length) return { marks: '—', grade: '—' };
  if (cells.length === 1) return { marks: cells[0].marks, grade: cells[0].grade };
  const avg = cells.reduce((s, c) => s + c.percentage, 0) / cells.length;
  return {
    marks: `${Math.round(avg * 10) / 10}%`,
    grade: subject.grade ?? cells[cells.length - 1].grade,
  };
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
  const studentName =
    [report.student?.firstName, report.student?.lastName].filter(Boolean).join(' ') ||
    (report.student as { fullName?: string })?.fullName ||
    'Student';
  const studentIdLabel =
    (report.student as { admissionNumber?: string | null })?.admissionNumber ||
    (report.student as { studentCode?: string | null })?.studentCode ||
    report.student?.studentUid ||
    '—';
  const termColumns = useMemo(() => parseReportTermColumns(report), [report]);
  const isSingleTermReport = termColumns.length === 1;
  const useTermResults = useMemo(
    () =>
      termColumns.length > 1 &&
      report.subjects.some((s) => (s.termResults?.length ?? 0) > 0),
    [report.subjects, termColumns.length]
  );
  const componentColumns = useMemo(() => resolveComponentColumns(report), [report]);
  const tableColSpan = isSingleTermReport
    ? 3 + componentColumns.length + 4
    : 2 + termColumns.length * 2 + 2;

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
  const contactParts = [school?.phone, school?.email, school?.website].filter(Boolean);
  const classTeacherComment = report.comments?.classTeacher?.trim();
  const headTeacherComment = report.comments?.headTeacher?.trim();
  const overallGradeDisplay = report.overallGrade || '—';
  const { core: coreSubjects, nonCore: nonCoreSubjects } = useMemo(
    () => groupSubjectsByCore(report.subjects),
    [report.subjects]
  );

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

  function renderSubjectRow(s: ReportSubject, rowNum: number) {
    if (isSingleTermReport) {
      const max = s.totalMax ?? s.defaultCourseMarks ?? 100;
      const provisional = s.marksEntered && s.courseComplete === false;
      const courseResult = s.marksEntered ? formatMarkFraction(s.totalScore, max) : '—';
      const pct = s.marksEntered
        ? `${Math.round(s.percentage * 10) / 10}%${provisional ? '*' : ''}`
        : '—';
      const pos =
        s.rank != null && s.classSize != null ? `${s.rank}/${s.classSize}` : provisional ? '—' : '—';
      const courseResultTitle = provisional
        ? `Provisional total (sum of entered components). Pending: ${(s.missingComponents ?? []).join(', ') || 'components'}`
        : 'Sum of converted component scores on course scale';
      return (
        <tr key={s.subjectId} className="course-row">
          <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', width: 36 }}>{rowNum}</td>
          <td className="course-col">{s.subject}</td>
          <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>{subjectDefaultMarks(s, report)}</td>
          {componentColumns.map((col) => {
            const cell = componentCellDisplay(s, col.name);
            return (
              <td
                key={col.name}
                title={cell.title}
                style={{
                  textAlign: 'center',
                  fontWeight: cell.hasData ? 600 : 400,
                  color: cell.hasData ? '#0f172a' : '#cbd5e1',
                  lineHeight: 1.25,
                }}
              >
                {cell.text}
                {cell.sub ? (
                  <div style={{ fontSize: '0.5625rem', fontWeight: 500, color: '#94a3b8', marginTop: 2 }}>
                    {cell.sub}
                  </div>
                ) : null}
              </td>
            );
          })}
          <td
            title={courseResultTitle}
            style={{ textAlign: 'center', fontWeight: 800, color: s.marksEntered ? '#000435' : '#94a3b8' }}
          >
            {courseResult}
            {provisional ? (
              <div style={{ fontSize: '0.5625rem', fontWeight: 600, color: '#d97706' }}>Partial</div>
            ) : null}
          </td>
          <td
            title={provisional ? 'Based on entered components only; not final until all template components are recorded' : undefined}
            style={{ textAlign: 'center', fontWeight: 800, color: s.marksEntered ? '#000435' : '#94a3b8' }}
          >
            {pct}
          </td>
          <td style={{ textAlign: 'center', fontWeight: 600, color: s.marksEntered ? '#334155' : '#94a3b8' }}>{pos}</td>
          <td style={{ textAlign: 'center', fontWeight: 800, color: s.marksEntered ? '#000435' : '#94a3b8' }}>
            {s.grade ?? '—'}
          </td>
        </tr>
      );
    }
    const total = getSubjectTotalCell(s, termColumns, useTermResults);
    return (
      <tr key={s.subjectId} className="course-row">
        <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b', width: 40 }}>{rowNum}</td>
        <td className="course-col">{s.subject}</td>
        {termColumns.map((termLabel) => renderTermPairCells(s, termLabel))}
        <td style={{ textAlign: 'center', fontWeight: 700, color: total.marks !== '—' ? '#0f172a' : '#94a3b8' }}>{total.marks}</td>
        <td style={{ textAlign: 'center', fontWeight: 800, color: total.grade !== '—' ? '#000435' : '#94a3b8' }}>{total.grade}</td>
      </tr>
    );
  }

  function renderSubjectSections() {
    const blocks: ReactNode[] = [];
    let rowNum = 0;
    const pushSection = (header: string, items: ReportSubject[], headerKey: string) => {
      if (!items.length) return;
      blocks.push(<SectionHeaderRow key={headerKey} label={header} colSpan={tableColSpan} />);
      items.forEach((s) => {
        rowNum += 1;
        blocks.push(renderSubjectRow(s, rowNum));
      });
    };
    pushSection('CORE SUBJECTS', coreSubjects, 'core-h');
    pushSection('NON-CORE SUBJECTS', nonCoreSubjects, 'noncore-h');
    if (!coreSubjects.length && !nonCoreSubjects.length) {
      report.subjects.forEach((s) => {
        rowNum += 1;
        blocks.push(renderSubjectRow(s, rowNum));
      });
    }
    return blocks;
  }

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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          {school?.logoUrl ? (
            <Box component="img" src={school.logoUrl} alt="" sx={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
          ) : null}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: '1rem', md: '1.125rem' }, fontWeight: 800, color: '#000435', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {school?.name || 'School'}
            </Typography>
            {school?.motto ? (
              <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic', mt: 0.25 }}>{school.motto}</Typography>
            ) : null}
            {school?.address ? <Typography sx={{ fontSize: '0.6875rem', color: '#475569', mt: 0.75 }}>{school.address}</Typography> : null}
            {contactParts.length ? (
              <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2, fontSize: '0.625rem', color: '#64748b' }}>
                {contactParts.map((line) => (
                  <Box component="li" key={line} sx={{ mb: 0.15 }}>
                    {line}
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        </Box>
        <Box
          sx={{
            mt: 2,
            pt: 1.5,
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', color: '#000435' }}>
            STUDENT ACADEMIC REPORT
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#475569', mt: 0.5 }}>
            Academic year {report.academicYear}
            {report.term ? `  ·  ${report.term}` : ''}
          </Typography>
          {reportDate ? (
            <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', mt: 0.25 }}>Generated {reportDate}</Typography>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '88px 1fr' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {(report.student as { photoUrl?: string })?.photoUrl ? (
            <Box
              component="img"
              src={(report.student as { photoUrl?: string }).photoUrl!}
              alt=""
              sx={{ width: 88, height: 104, objectFit: 'cover', borderRadius: '6px', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            />
          ) : (
            <Box sx={{ width: 88, height: 104, borderRadius: '6px', bgcolor: '#e2e8f0', display: { xs: 'none', sm: 'block' } }} />
          )}
          <Box sx={{ overflowX: 'auto' }}>
            <Typography sx={{ fontSize: '1.0625rem', fontWeight: 800, color: '#000435', mb: 1 }}>{studentName}</Typography>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.75rem',
                '& th, & td': {
                  border: '1px solid #e2e8f0',
                  px: 1.25,
                  py: 0.75,
                  textAlign: 'left',
                },
                '& th': {
                  bgcolor: '#fff',
                  color: '#64748b',
                  fontWeight: 700,
                  width: '32%',
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                },
                '& td': { bgcolor: '#fff', color: '#0f172a', fontWeight: 600 },
              }}
            >
              <tbody>
                <tr>
                  <th scope="row">Student code</th>
                  <td>{studentIdLabel}</td>
                  <th scope="row">Class</th>
                  <td>{report.class?.name || '—'}</td>
                </tr>
                <tr>
                  <th scope="row">Stream</th>
                  <td>{report.class?.stream || '—'}</td>
                  <th scope="row">Gender</th>
                  <td>{report.student?.gender || '—'}</td>
                </tr>
                <tr>
                  <th scope="row">Date of birth</th>
                  <td>{fmtDate(report.student?.dateOfBirth) || '—'}</td>
                  <th scope="row">Academic year</th>
                  <td>{report.academicYear}</td>
                </tr>
                <tr>
                  <th scope="row">Term</th>
                  <td colSpan={3}>{report.term || '—'}</td>
                </tr>
              </tbody>
            </Box>
          </Box>
        </Box>
        {(report.student as { parentGuardian?: string })?.parentGuardian ? (
          <Typography sx={{ fontSize: '0.75rem', color: '#475569', mt: 1.5 }}>
            <Box component="span" sx={{ color: '#94a3b8', fontWeight: 700, mr: 0.5 }}>Guardian</Box>
            {(report.student as { parentGuardian?: string }).parentGuardian}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              minWidth: isSingleTermReport ? 720 : 560,
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
              '& th': {
                bgcolor: '#000435',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.625rem',
                textTransform: 'uppercase',
                py: 0.85,
                px: 0.75,
                borderBottom: '1px solid rgba(255,255,255,0.12)',
              },
              '& td': { py: 0.65, px: 0.75, borderBottom: '1px solid #eef2f6' },
              '& tbody tr.course-row:nth-of-type(even) td': { bgcolor: '#f8fafc' },
              '& tbody tr.section-header-row td': { bgcolor: '#FCB038 !important', borderBottom: '1px solid #e2a020' },
              '& .course-col': {
                textAlign: 'left',
                fontWeight: 700,
                color: '#000435',
                minWidth: 140,
              },
              '& .term-group': { borderLeft: '1px solid rgba(255,255,255,0.15)' },
            }}
          >
            <thead>
              {isSingleTermReport ? (
                <>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: 36 }}>
                      #
                    </th>
                    <th className="course-col" rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                      Course
                    </th>
                    <th
                      rowSpan={2}
                      title="Course total marks from catalog (sum of component columns equals this when all are entered)"
                      style={{ textAlign: 'center', verticalAlign: 'middle', width: 56 }}
                    >
                      Default
                    </th>
                    {componentColumns.length > 0 ? (
                      <th colSpan={componentColumns.length} style={{ textAlign: 'center', background: '#0f172a' }}>
                        Assessment components
                      </th>
                    ) : null}
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', minWidth: 72 }}>
                      Course result
                    </th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: 64 }}>
                      Total %
                    </th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: 64 }}>
                      Position
                    </th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: 52 }}>
                      Grade
                    </th>
                  </tr>
                  <tr>
                    {componentColumns.map((col) => (
                      <th
                        key={col.name}
                        title={componentHeaderHint(col.weight)}
                        style={{
                          textAlign: 'center',
                          fontSize: '0.5625rem',
                          fontWeight: 700,
                          background: '#0f172a',
                          letterSpacing: '0.04em',
                          lineHeight: 1.25,
                        }}
                      >
                        {componentHeaderLabel(col.name, col.weight)}
                        <div style={{ fontSize: '0.5rem', fontWeight: 500, opacity: 0.75, marginTop: 2 }}>
                          {componentHeaderHint(col.weight)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: 40 }}>
                      #
                    </th>
                    <th className="course-col" rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                      Course
                    </th>
                    {termColumns.map((term) => (
                      <th key={term} colSpan={2} className="term-group" style={{ textAlign: 'center' }}>
                        {term}
                      </th>
                    ))}
                    <th colSpan={2} style={{ textAlign: 'center', background: '#1e293b' }}>
                      Total
                    </th>
                  </tr>
                  <tr>
                    {termColumns.map((term) => (
                      <Fragment key={`${term}-sub`}>
                        <th style={{ textAlign: 'center', fontSize: '0.5625rem', fontWeight: 600 }}>Marks</th>
                        <th style={{ textAlign: 'center', fontSize: '0.5625rem', fontWeight: 600 }}>Grade</th>
                      </Fragment>
                    ))}
                    <th style={{ textAlign: 'center', fontSize: '0.5625rem', fontWeight: 600, background: '#1e293b' }}>Marks</th>
                    <th style={{ textAlign: 'center', fontSize: '0.5625rem', fontWeight: 600, background: '#1e293b' }}>Grade</th>
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              {renderSubjectSections()}
              <tr className="overall-row">
                {isSingleTermReport ? (
                  <>
                    <td colSpan={3} style={{ fontWeight: 800, background: '#000435', color: '#fff' }}>
                      Overall
                    </td>
                    {componentColumns.map((col) => (
                      <td key={col.name} style={{ textAlign: 'center', background: '#000435', color: '#64748b' }}>
                        /
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 800, background: '#000435', color: '#fff' }}>
                      {totalMax ? formatMarkFraction(totalMarks, totalMax) : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, background: '#000435', color: '#fff' }}>
                      {Math.round(report.overallScore * 10) / 10}%
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, background: '#000435', color: '#fff' }}>
                      {report.position}/{report.classSize}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, background: '#FCB038', color: '#000435' }}>
                      {overallGradeDisplay}
                    </td>
                  </>
                ) : (
                  <>
                    <td colSpan={2} style={{ fontWeight: 800, background: '#000435', color: '#fff' }}>
                      Overall
                    </td>
                    {termColumns.map((term) => (
                      <Fragment key={`${term}-overall`}>
                        <td style={{ textAlign: 'center', background: '#000435', color: '#fff' }}>—</td>
                        <td style={{ textAlign: 'center', background: '#000435', color: '#fff' }}>—</td>
                      </Fragment>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 800, background: '#000435', color: '#fff' }}>
                      {totalMax ? formatMarkFraction(totalMarks, totalMax) : `${report.overallScore}%`}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, background: '#FCB038', color: '#000435' }}>
                      {overallGradeDisplay}
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </Box>
        </Box>
      </Box>

      {gradingLegend.length > 0 && (
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            pb: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 1, sm: 2 },
          }}
        >
          {gradingLegend.map((g) => (
            <Typography key={g.grade} sx={{ fontSize: '0.5625rem', color: '#64748b' }}>
              <Box component="span" sx={{ fontWeight: 800, color: '#334155' }}>
                {g.grade}
              </Box>{' '}
              {g.minPercentage}–{g.maxPercentage}%
            </Typography>
          ))}
        </Box>
      )}

      <Box sx={{ px: { xs: 2, md: 3 }, pb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
          {[
            { l: 'Position', v: `${report.position}/${report.classSize}`, accent: '#000435' },
            { l: 'Average', v: `${report.overallScore}%`, accent: '#FCB038' },
            { l: 'Total', v: totalMax ? formatMarkFraction(totalMarks, totalMax) : '—', accent: '#000435' },
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
