import { Fragment, type ReactNode, type Ref } from 'react';
import { Box, Typography } from '@mui/material';
import ReportQrCode from '@/components/ReportQrCode';
import ReportSchoolHeader from '@/components/reports/ReportSchoolHeader';
import { REPORT_A4_WIDTH_PX } from '@/lib/report-a4';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { getStoredReportFooterSettings } from '@/services/api';
import type {
  NurseryReportSnapshot,
  NurseryReportSubject,
} from '@/types/nursery';

type Props = {
  report: NurseryReportSnapshot;
  documentRef?: Ref<HTMLDivElement>;
};

const NAVY = '#000435';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

function fmt(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0$/, '');
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function kindMeta(report: NurseryReportSnapshot) {
  const kind = report.reportKind ?? 'standard';
  if (kind === 'beginning') {
    return { title: 'BEGINNING TERM NURSERY REPORT', label: 'Beginning term report' };
  }
  if (kind === 'midterm') {
    return { title: 'MID-TERM NURSERY REPORT', label: 'Mid-term report' };
  }
  return { title: 'TERM 1 NURSERY REPORT', label: 'Term 1 report' };
}

function PerformanceFill({ color, label }: { color?: string | null; label?: string | null }) {
  return (
    <Box
      component="td"
      title={label ?? undefined}
      sx={{
        p: 0,
        height: 34,
        bgcolor: color || '#f8fafc',
        borderBottom: '1px solid #eef2f6',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    />
  );
}

function SubjectRow({ subject }: { subject: NurseryReportSubject }) {
  return (
    <Box
      component="tr"
      sx={{
        '& td': { py: 0.75, px: 1, borderBottom: '1px solid #eef2f6', verticalAlign: 'middle' },
        '@media print': { breakInside: 'avoid' },
      }}
    >
      <Box component="td">
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
          {subject.subjectName}
        </Typography>
      </Box>
      <PerformanceFill color={subject.band?.color} label={subject.band?.label} />
    </Box>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: '0.6875rem',
        fontWeight: 800,
        color: NAVY,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        textAlign: 'center',
      }}
    >
      {children}
    </Typography>
  );
}

export default function NurseryReportCard({ report, documentRef }: Props) {
  const template = report.template;
  const accent = template.accentColor || NAVY;
  const student = report.student;
  const totals = report.totals;
  const { title: reportTitle, label: kindLabel } = kindMeta(report);

  const { settings } = useAcademicSettings();
  const footerSettings = settings?.reportFooter ?? getStoredReportFooterSettings() ?? {
    mode: 'head_teacher' as const,
    roleLabel: 'Head Teacher',
    selectedUserName: 'Head Teacher',
  };
  const footerRoleLabel =
    footerSettings.mode === 'head_teacher' ? 'Head Teacher' : footerSettings.roleLabel || 'Head Teacher';
  const footerName =
    footerSettings.selectedUserName?.trim() ||
    (footerSettings.mode === 'head_teacher' ? 'Head Teacher' : 'Authorized Signatory');

  const seenSubjects = new Set<string>();
  const uniqueSubjects = report.subjects.filter((subject) => {
    const key = (subject.subjectName || subject.subjectId || '').trim().toLowerCase();
    if (seenSubjects.has(key)) return false;
    seenSubjects.add(key);
    return true;
  });
  const reportDate = fmtDate(report.meta.generatedAt);
  const teacherTitle = template.teacherTitle || 'Class Teacher';
  const parentLabel = template.parentLabel || 'Parent / Guardian';

  return (
    <Box sx={{ width: '100%', maxWidth: REPORT_A4_WIDTH_PX, mx: 'auto', p: { xs: 0, md: 1 }, '@media print': { p: 0 } }}>
      <Box
        ref={documentRef}
        className="nursery-report-card report-a4-document report-a4-babyeyi-frame"
        sx={{
          width: '100%',
          maxWidth: REPORT_A4_WIDTH_PX,
          mx: 'auto',
          boxSizing: 'border-box',
          bgcolor: '#fff',
          color: '#0f172a',
          fontFamily: "'Montserrat', system-ui, sans-serif",
          border: '2px solid #000000',
          borderRadius: '14px',
          p: '3px',
          boxShadow: { xs: 'none', md: '0 2px 12px rgba(0, 4, 53, 0.06)' },
          '@media print': {
            boxShadow: 'none',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          },
        }}
      >
        <Box
          className="report-a4-babyeyi-frame-inner"
          sx={{
            border: `1.5px solid ${accent}`,
            borderRadius: '11px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <ReportSchoolHeader
            compact
            school={{
              ...report.school,
              logoUrl: template.showLogo ? report.school.logoUrl : null,
              rightLogoUrl: template.showLogo ? report.school.rightLogoUrl : null,
              reportHeaderLines: template.showHeaderLines ? report.school.headerLines ?? [] : [],
            }}
            reportTitle={reportTitle}
            reportSubtitle={`${report.academicYear} · ${report.term}`}
          />

          {template.showStudentDetails ? (
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderBottom: `1px solid ${LINE}` }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: template.showStudentPhoto ? '92px 1fr' : '1fr' },
                  gap: 2,
                  alignItems: 'stretch',
                }}
              >
                {template.showStudentPhoto ? (
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
                    {student.photoUrl ? (
                      <Box component="img" src={student.photoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        {initials(student.name) || 'ST'}
                      </Box>
                    )}
                  </Box>
                ) : null}

                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase' }}>
                    Learner
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', color: NAVY, lineHeight: 1.25, mt: 0.25 }}>
                    {student.name}
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
                        color: MUTED,
                        fontWeight: 700,
                        width: '38%',
                        pr: 1,
                        whiteSpace: 'nowrap',
                      },
                      '& td:last-of-type': { fontWeight: 600, color: NAVY },
                    }}
                  >
                    <tbody>
                      <tr>
                        <td>Student ID</td>
                        <td>{student.studentCode || '—'}</td>
                      </tr>
                      <tr>
                        <td>Class</td>
                        <td>{report.class.name}</td>
                      </tr>
                      <tr>
                        <td>Gender</td>
                        <td>{student.gender || '—'}</td>
                      </tr>
                      <tr>
                        <td>Year / Term</td>
                        <td>{report.academicYear} · {report.term}</td>
                      </tr>
                      <tr>
                        <td>Report</td>
                        <td>{kindLabel}</td>
                      </tr>
                    </tbody>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : null}

          <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.25 }}>
            <SectionTitle>Learning areas and class performance</SectionTitle>
            <Box sx={{ overflowX: 'auto', mt: 1 }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  minWidth: 400,
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                  fontSize: '0.75rem',
                  '& th': {
                    bgcolor: '#f8fafc',
                    color: NAVY,
                    py: 0.8,
                    px: 1,
                    fontWeight: 700,
                    fontSize: '0.625rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${LINE}`,
                  },
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
                    <th style={{ textAlign: 'left', width: '52%' }}>Learning area / Subject</th>
                    <th style={{ textAlign: 'center' }}>Performance level</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueSubjects.length ? (
                    uniqueSubjects.map((subject) => (
                      <Fragment key={subject.subjectId}>
                        <SubjectRow subject={subject} />
                      </Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ padding: '14px 8px', textAlign: 'center', color: MUTED, fontSize: '0.6875rem' }}>
                        No courses assessed for this report stage.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ textAlign: 'left' }}>Percentage</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: NAVY }}>
                      {totals.average == null ? '—' : `${fmt(totals.average, 2)}%`}
                    </td>
                  </tr>
                </tfoot>
              </Box>
            </Box>

            {template.showPerformanceLegend && report.bands.length ? (
              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: `repeat(${Math.min(report.bands.length, 4)}, minmax(0, 1fr))` },
                  gap: 1,
                }}
              >
                {report.bands.map((band) => (
                  <Box
                    key={band.label}
                    sx={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: '#fff',
                    }}
                  >
                    <Box
                      sx={{
                        height: 18,
                        bgcolor: band.color,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                    />
                    <Box sx={{ px: 1, py: 0.75, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
                        {band.label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: MUTED, mt: 0.25, lineHeight: 1.2 }}>
                        {band.minPercentage}–{band.maxPercentage}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>

          <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: `1px solid ${LINE}` }}>
            <Box className="report-teacher-signatures" sx={{ mt: 1.25 }}>
              <Box sx={{ border: '1px solid #94a3b8', borderRadius: 0.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid #94a3b8', minHeight: 44 }}>
                  <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>
                    {teacherTitle}'s Comment
                  </Box>
                  <Box sx={{ px: 1, py: 0.75, fontSize: '0.75rem', color: '#334155' }}>
                    {report.comments.teacher || '\u00A0'}
                  </Box>
                </Box>
                {template.showTeacherSignature ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: template.showParentSignature ? '1px solid #94a3b8' : 'none', minHeight: 44 }}>
                    <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>
                      {teacherTitle}'s signature
                    </Box>
                    <Box sx={{ px: 1, py: 0.75 }} />
                  </Box>
                ) : null}
                {template.showParentSignature ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', minHeight: 44 }}>
                    <Box sx={{ px: 1, py: 0.75, fontSize: '0.625rem', fontWeight: 700, color: NAVY, borderRight: '1px solid #94a3b8', display: 'flex', alignItems: 'center' }}>
                      {parentLabel} Signature
                    </Box>
                    <Box sx={{ px: 1, py: 0.75 }} />
                  </Box>
                ) : null}
              </Box>
              {report.comments.headTeacher ? (
                <Box sx={{ mt: 1, fontSize: '0.6875rem', color: '#334155' }}>
                  <Box component="span" sx={{ fontWeight: 800, color: NAVY }}>
                    {template.headTeacherTitle || 'Head Teacher'} comment:{' '}
                  </Box>
                  {report.comments.headTeacher}
                </Box>
              ) : null}
            </Box>
          </Box>

          {template.showHeadTeacherSignature ? (
            <Box
              sx={{
                px: { xs: 2, md: 2.5 },
                py: 1.25,
                borderTop: `1px solid ${LINE}`,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: NAVY }}>
                  {footerRoleLabel} Signature &amp; Stamp
                </Typography>
                <Box sx={{ minHeight: 40, borderBottom: '1px solid #94a3b8', mt: 0.5, maxWidth: 320, mx: 'auto' }} />
                <Typography sx={{ fontSize: '0.5625rem', color: NAVY, fontWeight: 700, mt: 0.5 }}>
                  {footerName}
                </Typography>
                <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', mt: 0.5 }}>
                  Issued on {reportDate}
                  {report.meta.reportNumber ? ` · ${report.meta.reportNumber}` : ''}
                </Typography>
              </Box>
              {template.showQR && report.meta.verifyUrl ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <ReportQrCode value={report.meta.verifyUrl} size={72} />
                  <Typography sx={{ fontSize: '0.5625rem', fontWeight: 600, color: NAVY }}>Scan to verify</Typography>
                </Box>
              ) : null}
            </Box>
          ) : null}

          <Box sx={{ py: 0.65, textAlign: 'center', borderTop: `1px solid ${LINE}` }}>
            <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', fontWeight: 600 }}>
              Shule+ &middot; {kindLabel}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
