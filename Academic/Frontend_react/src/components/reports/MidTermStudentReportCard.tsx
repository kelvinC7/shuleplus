import { useMemo, type ReactNode, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import ReportQrCode from '@/components/ReportQrCode';
import type { ReportCardDataV2 } from '@/types';
import { NOT_RECORDED, resolveReportVerifyUrl } from '@/components/reports/report-cards-utils';
import ReportSchoolHeader from '@/components/reports/ReportSchoolHeader';
import { REPORT_A4_WIDTH_PX as A4_WIDTH_PX } from '@/lib/report-a4';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { getStoredReportFooterSettings } from '@/services/api';

const NAVY = '#000435';
const AMBER = '#FCB038';

function fmtPct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return NOT_RECORDED;
  return `${n.toFixed(2)}%`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function scaledMarks(score: number, courseDefault: number, entered: boolean) {
  if (!entered || !Number.isFinite(score) || courseDefault <= 0) return NOT_RECORDED;
  const s = Math.round(score * 10) / 10;
  return `${s}`;
}

function defaultDisplay(n: number) {
  if (!Number.isFinite(n) || n <= 0) return NOT_RECORDED;
  return String(Math.round(n * 10) / 10);
}

function classStreamLabel(report: ReportCardDataV2) {
  const name = report.class?.name?.trim();
  const stream = report.class?.stream?.trim();
  if (name && stream) return `${name} · ${stream}`;
  return name || NOT_RECORDED;
}

type Props = {
  report: ReportCardDataV2;
  documentRef?: RefObject<HTMLDivElement | null>;
  classTeacherName?: string | null;
};

export default function MidTermStudentReportCard({ report, documentRef, classTeacherName }: Props) {
  const school = report.school;
  const studentName =
    [report.student?.firstName, report.student?.lastName].filter(Boolean).join(' ') || 'Student';
  const studentCode =
    (report.student as { studentCode?: string })?.studentCode ||
    report.student?.studentUid ||
    NOT_RECORDED;
  const photoUrl = (report.student as { photoUrl?: string | null })?.photoUrl;
  const verifyUrl = resolveReportVerifyUrl(report);
  const reportDate = fmtDate(report.meta?.generatedAt) ?? NOT_RECORDED;
  const reportNumber = report.meta?.reportNumber || '';
  const { settings } = useAcademicSettings();
  const footerSettings = settings?.reportFooter ?? getStoredReportFooterSettings() ?? {
    mode: 'head_teacher',
    roleLabel: 'Head Teacher',
    selectedUserName: 'Head Teacher',
  };
  const footerRoleLabel = footerSettings.mode === 'head_teacher' ? 'Head Teacher' : (footerSettings.roleLabel || 'Head Teacher');
  const footerName = footerSettings.selectedUserName?.trim() || (footerSettings.mode === 'head_teacher' ? 'Head Teacher' : 'Authorized Signatory');

  const subjectRows = useMemo(() => {
    const rows = report.subjects.map((s) => {
      const courseDefault = s.defaultCourseMarks ?? s.totalMax ?? 0;
      const studentMarks = s.studentMarksOnDefault ?? s.totalScore;
      const scaled = scaledMarks(studentMarks, courseDefault, Boolean(s.marksEntered));
      const displayedMarks = s.marksEntered && Number.isFinite(Number(studentMarks))
        ? Math.round(Number(studentMarks) * 10) / 10
        : 0;
      const grade = s.marksEntered ? s.grade ?? NOT_RECORDED : NOT_RECORDED;
      return {
        id: s.subjectId,
        subject: s.subject,
        courseDefault,
        defaultLabel: defaultDisplay(courseDefault),
        scaled,
        grade,
        entered: s.marksEntered,
        assessedInReportPeriod: s.assessedInReportPeriod,
        displayedMarks,
        displayedDefault: Math.round((s.totalMax ?? courseDefault) * 10) / 10,
        isCore: s.isCore !== false,
      };
    });
    rows.sort((a, b) => {
      if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
      return a.subject.localeCompare(b.subject);
    });
    return rows;
  }, [report.subjects]);

  const footerStats = useMemo(() => {
    const included = subjectRows.filter((r) =>
      r.assessedInReportPeriod === true ||
      (r.assessedInReportPeriod == null && r.entered)
    );
    const totalScored = included.reduce((n, r) => n + (r.entered ? r.displayedMarks : 0), 0);
    const totalDefault = included.reduce((n, r) => n + r.displayedDefault, 0);
    return {
      totalScored: Math.round(totalScored * 10) / 10,
      totalDefault: Math.round(totalDefault * 10) / 10,
      avgPct: totalDefault > 0
        ? Math.round((totalScored / totalDefault) * 10000) / 100
        : included.length
          ? report.overallScore
          : null,
    };
  }, [subjectRows, report.overallScore]);

  const classTeacherComment = report.comments?.classTeacher?.trim();
  const headTeacherComment = report.comments?.headTeacher?.trim();
  const gradingLegend = report.gradingLegend ?? [];

  const dob = fmtDate(report.student?.dateOfBirth);
  const teacher = classTeacherName?.trim();

  const profileCells: Array<{ label: string; value: string }> = [
    { label: 'Student ID', value: studentCode },
    { label: 'Class', value: classStreamLabel(report) },
    { label: 'Gender', value: report.student?.gender?.trim() || NOT_RECORDED },
  ];
  if (teacher) profileCells.push({ label: 'Class teacher', value: teacher });
  if (dob) profileCells.push({ label: 'Date of birth', value: dob });

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: A4_WIDTH_PX,
        mx: 'auto',
        p: { xs: 0, md: 1 },
        '@media print': { p: 0 },
      }}
    >
      <Box
        ref={documentRef}
        className="midterm-report-card report-a4-document report-a4-babyeyi-frame"
        sx={{
          width: '100%',
          maxWidth: A4_WIDTH_PX,
          mx: 'auto',
          boxSizing: 'border-box',
          bgcolor: '#fff',
          color: '#0f172a',
          fontFamily: "'Montserrat', system-ui, sans-serif",
          border: '2px solid #000000',
          borderRadius: '14px',
          p: '3px',
          boxShadow: { xs: 'none', md: '0 2px 12px rgba(0, 4, 53, 0.06)' },
          '@media print': { boxShadow: 'none' },
        }}
      >
        <Box
          className="report-a4-babyeyi-frame-inner"
          sx={{
            border: `1.5px solid ${AMBER}`,
            borderRadius: '11px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
      <ReportSchoolHeader
        compact
        school={school}
        reportTitle={report.reportKind === "beginning" ? "BEGINNING TERM ACADEMIC REPORT" : "MID-TERM ACADEMIC REPORT"}
        reportSubtitle={`${report.academicYear}${report.term ? ` · ${report.term}` : ''}`}
      />

        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderBottom: '1px solid #e2e8f0' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <Box
              sx={{
                width: 92,
                alignSelf: 'stretch',
                minHeight: 104,
                position: 'relative',
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
                    bgcolor: '#e2e8f0',
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
                  '& td:first-of-type': {
                    color: '#64748b',
                    fontWeight: 700,
                    width: '38%',
                    pr: 1,
                    whiteSpace: 'nowrap',
                  },
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
          <SectionTitle centered>Continuous assessment results</SectionTitle>
          <Box sx={{ overflowX: 'auto', mt: 1 }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                minWidth: 400,
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
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Subject</th>
                  <th style={{ textAlign: 'center', width: 64 }}>Default</th>
                  <th style={{ textAlign: 'center' }}>Student marks</th>
                  <th style={{ textAlign: 'center', width: 56 }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: NAVY }}>{r.subject}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>{r.defaultLabel}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: r.entered ? NAVY : '#94a3b8' }}>{r.scaled}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: r.entered ? NAVY : '#94a3b8' }}>
                      {r.entered && r.grade !== NOT_RECORDED ? r.grade : NOT_RECORDED}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ textAlign: 'left' }}>Total</td>
                  <td style={{ textAlign: 'center' }}>
                    {footerStats.totalDefault > 0 ? defaultDisplay(footerStats.totalDefault) : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {footerStats.totalDefault > 0
                      ? `${footerStats.totalScored}`
                      : NOT_RECORDED}
                  </td>
                  <td style={{ textAlign: 'center' }}>{report.overallGrade ?? '—'}</td>
                </tr>
              </tfoot>
            </Box>
          </Box>

          <Box className="report-overview-stats" sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}>
            <Box sx={{ textAlign: 'center', px: 0.75, py: 1, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #94a3b8' }}>
              <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Class position</Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: NAVY, mt: 0.25 }}>
                {report.position != null ? `${report.position}${report.classSize ? ` / ${report.classSize}` : ''}` : NOT_RECORDED}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', px: 0.75, py: 1, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #94a3b8' }}>
              <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Percentage</Typography>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: NAVY, mt: 0.25 }}>
                {footerStats.avgPct != null ? fmtPct(footerStats.avgPct) : NOT_RECORDED}
              </Typography>
            </Box>
          </Box>

          {gradingLegend.length > 0 ? (
            <Box sx={{ mt: 1, px: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {gradingLegend.slice(0, 10).map((g) => (
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

        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: '1px solid #e2e8f0' }}>
                              <Box className="report-teacher-signatures" sx={{ mt: 1.25 }}>
            <Box sx={{ border: '1px solid #94a3b8', borderRadius: 0.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #94a3b8', minHeight: 44 }}>
                <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>Class Teacher's Comment</Box>
                <Box sx={{ px: 1, py: 0.75, fontSize: '0.75rem', color: '#334155' }}>{classTeacherComment || '\u00A0'}</Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #94a3b8', minHeight: 44 }}>
                <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>Class teacher's signature</Box>
                <Box sx={{ px: 1, py: 0.75 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', minHeight: 44 }}>
                <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>Parent's Signature</Box>
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

        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: NAVY }}>{footerRoleLabel} Signature &amp; Stamp</Typography>
            <Box sx={{ minHeight: 40, borderBottom: '1px solid #94a3b8', mt: 0.5, maxWidth: 320, mx: 'auto' }} />
            <Typography sx={{ fontSize: '0.5625rem', color: '#000435', fontWeight: 700, mt: 0.5 }}>{footerName}</Typography>
            <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', mt: 0.5 }}>
              Issued on {reportDate}
              {reportNumber ? ` · ${reportNumber}` : ''}
            </Typography>
          </Box>
          {verifyUrl ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <ReportQrCode value={verifyUrl} size={72} />
              <Typography sx={{ fontSize: '0.5625rem', fontWeight: 600, color: NAVY }}>Scan to verify</Typography>
            </Box>
          ) : null}
        </Box>

        <Box sx={{ py: 0.65, textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', fontWeight: 600 }}>
            Shule+ &middot; {report.reportKind === 'beginning' ? 'Beginning term report' : 'Mid-term report'}
          </Typography>
        </Box>
        </Box>
      </Box>
    </Box>
  );
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
