import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import { getReportAnalysis, getReportAnalysisSettings, smListClasses } from '@/services/api';
import type {
  ReportAnalysisCourse,
  ReportAnalysisData,
  ReportAnalysisKind,
  ReportAnalysisSettings,
  ReportAnalysisStudent,
  ReportAnalysisSubjectCell,
} from '@/types/report-analysis';
import {
  AMBER,
  BORDER,
  BandChip,
  Flex,
  MUTED,
  NAVY,
  Section,
  fmtPct,
} from '@/components/report-analysis/analysis-ui';

type SmClass = { id: string; name: string; stream?: string | null; category?: string | null };

const REPORT_OPTIONS: Array<{ value: ReportAnalysisKind; label: string; hint: string }> = [
  { value: 'beginning', label: 'Beginning', hint: 'Assessments classified as Beginning Term only.' },
  { value: 'midterm', label: 'Mid Term', hint: 'Mid-Term assessments for this term.' },
  { value: 'standard', label: 'Term', hint: 'All assessments in the term, as used by the Termly report card.' },
];

const KIND_LABEL: Record<ReportAnalysisKind, string> = {
  beginning: 'Beginning',
  midterm: 'Mid Term',
  standard: 'Term',
};

const NAVY_RGB: [number, number, number] = [0, 4, 53];

function isKind(v: string | null): v is ReportAnalysisKind {
  return v === 'beginning' || v === 'midterm' || v === 'standard';
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function cellFor(s: ReportAnalysisStudent, subjectId: string): ReportAnalysisSubjectCell | null {
  return s.subjects.find((sc) => sc.subjectId === subjectId) ?? null;
}

function cellText(cell: ReportAnalysisSubjectCell | null): string {
  if (!cell) return '—';
  if (cell.status === 'absent') return 'Absent';
  if (cell.status === 'missing' || cell.percentage == null) return '—';
  return `${cell.percentage.toFixed(1)}%`;
}

function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY_RGB);
  doc.text(title, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 115);
  doc.text(subtitle, 14, 22);
}

function pdfFooter(doc: jsPDF, generatedAt: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated ${new Date(generatedAt).toLocaleString()} · Shule+`,
      14,
      doc.internal.pageSize.getHeight() - 6,
    );
    doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 6);
  }
}

/* PDF: every student in the class + per-course percentage + overall percentage */
function exportStudentsPdf(
  data: ReportAnalysisData,
  kindLabel: string,
  students: ReportAnalysisStudent[],
  fileSuffix: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const subjects = data.courses.map((c) => c.subject);
  pdfHeader(
    doc,
    'Academic Performance',
    `${data.period.classLabel || 'Class'} · ${kindLabel} · ${data.period.academicYear}${data.period.term ? ` · ${data.period.term}` : ''}`,
  );

  autoTable(doc, {
    startY: 28,
    head: [['#', 'Student', 'Admission no.', ...subjects, 'Percentage', 'Position']],
    body: students.map((s, i) => [
      String(i + 1),
      s.name,
      s.admissionNo ?? '',
      ...data.courses.map((c) => {
        const cell = cellFor(s, c.subjectId);
        return cellText(cell);
      }),
      s.average != null ? `${s.average.toFixed(1)}%` : '—',
      s.position != null ? String(s.position) : '—',
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: NAVY_RGB, fontSize: 7 },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 42 } },
  });

  pdfFooter(doc, data.generatedAt);
  doc.save(`academic-performance-${safeName(data.period.classLabel || 'class')}-${safeName(kindLabel)}-${safeName(fileSuffix)}.pdf`);
}

/* PDF: one course tab — course summary + every student's mark in that course */
function exportCoursePdf(
  data: ReportAnalysisData,
  course: ReportAnalysisCourse,
  kindLabel: string,
  rows: Array<{ student: ReportAnalysisStudent; cell: ReportAnalysisSubjectCell | null }>,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdfHeader(
    doc,
    `Academic Performance · ${course.subject}`,
    `${data.period.classLabel || 'Class'} · ${kindLabel} · ${data.period.academicYear}${data.period.term ? ` · ${data.period.term}` : ''}`,
  );

  autoTable(doc, {
    startY: 28,
    head: [['Course', 'Teacher', 'Average %', 'Highest %', 'Lowest %', 'Assessed', 'Below threshold', 'Missing']],
    body: [[
      course.subject,
      course.teacherName ?? '—',
      course.average != null ? `${course.average.toFixed(1)}%` : '—',
      course.highest != null ? `${course.highest.toFixed(1)}%` : '—',
      course.lowest != null ? `${course.lowest.toFixed(1)}%` : '—',
      String(course.assessed),
      String(course.below),
      String(course.missing),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: NAVY_RGB },
  });

  const startY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40;
  autoTable(doc, {
    startY: startY + 6,
    head: [['#', 'Student', 'Admission no.', `${course.subject} mark`, 'Status']],
    body: rows.map((r, i) => [
      String(i + 1),
      r.student.name,
      r.student.admissionNo ?? '',
      r.cell?.percentage != null ? `${r.cell.percentage.toFixed(1)}%` : '—',
      r.cell ? (r.cell.status === 'entered' ? 'Entered' : r.cell.status === 'absent' ? 'Absent' : 'Missing') : 'Not in course',
    ]),
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: NAVY_RGB },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 60 } },
  });

  pdfFooter(doc, data.generatedAt);
  doc.save(`academic-performance-${safeName(data.period.classLabel || 'class')}-${safeName(course.subject)}-${safeName(kindLabel)}.pdf`);
}

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', fontSize: '0.875rem' } };

export default function AcademicPerformancePage() {
  const { settings, ready, academicYear, term, setAcademicYear, setTerm } = useOrgAcademicPeriod();
  const [searchParams, setSearchParams] = useSearchParams();

  const kindParam = searchParams.get('kind');
  const kind: ReportAnalysisKind = isKind(kindParam) ? kindParam : 'beginning';
  const kindOption = REPORT_OPTIONS.find((o) => o.value === kind) ?? REPORT_OPTIONS[0];

  const [classes, setClasses] = useState<SmClass[]>([]);
  const [classId, setClassId] = useState('');
  const [bandSettings, setBandSettings] = useState<ReportAnalysisSettings | null>(null);
  const [data, setData] = useState<ReportAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('all');

  const setKind = useCallback(
    (value: ReportAnalysisKind) => {
      const next = new URLSearchParams(searchParams);
      next.set('kind', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    getReportAnalysisSettings().then(setBandSettings).catch(() => setBandSettings(null));
  }, []);

  useEffect(() => {
    smListClasses()
      .then((rows) => setClasses(Array.isArray(rows) ? rows : []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (classId) return;
    if (classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const load = useCallback(async () => {
    if (!classId || !academicYear) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getReportAnalysis({
        classId,
        academicYear,
        term: term || undefined,
        reportKind: kind,
        status: 'all',
      });
      setData(result);
      setTab('all');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not load academic performance for this class.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear, term, kind]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const classLabel = useMemo(() => {
    const c = classes.find((x) => x.id === classId);
    return c ? [c.name, c.stream].filter(Boolean).join(' ') : data?.period.classLabel ?? '';
  }, [classes, classId, data]);

  const sortedStudents = useMemo(() => {
    if (!data) return [];
    return [...data.students].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const activeCourse = useMemo(() => {
    if (!data || tab === 'all') return null;
    return data.courses.find((c) => c.subjectId === tab) ?? null;
  }, [data, tab]);

  const courseRows = useMemo(() => {
    if (!data || !activeCourse) return [];
    return data.students
      .map((student) => ({ student, cell: cellFor(student, activeCourse.subjectId) }))
      .filter((r) => r.cell != null) // only students belonging to this course
      .sort((a, b) => {
        const pa = a.cell?.percentage ?? -1;
        const pb = b.cell?.percentage ?? -1;
        if (pb !== pa) return pb - pa;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [data, activeCourse]);

  const courseAssessedCount = useMemo(
    () => courseRows.filter((r) => r.cell?.status === 'entered' && r.cell.percentage != null).length,
    [courseRows],
  );

  const threshold = bandSettings?.atRiskBelow ?? data?.settings.atRiskBelow ?? 50;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: '#F5F7FA', fontFamily: "'Montserrat', system-ui, sans-serif", pb: 6 }}>
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2.25, md: 2.75 }, pb: 2, bgcolor: '#fff', borderBottom: `1px solid ${BORDER}` }}>
        <Flex direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B7791F' }}>
              Academic Performance
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: { xs: '1.375rem', md: '1.75rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
              {kindOption.label}
            </Typography>
            <Flex direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
              <Chip size="small" icon={<InsightsRoundedIcon />} label={`Academic year ${academicYear || '—'}`} sx={{ fontWeight: 700, bgcolor: '#FFF7E6', color: '#92400E' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>
                {classLabel || 'Choose a class'}
                {data?.period.term ? ` · ${data.period.term}` : ''}
              </Typography>
            </Flex>
          </Box>
        </Flex>
      </Box>

      <Box sx={{ px: { xs: 1.5, md: 3 }, pt: { xs: 2, md: 2.5 }, display: 'grid', gap: 2.5, minWidth: 0 }}>
        {/* Controls */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3, border: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            <FormControl size="small" sx={fieldSx}>
              <InputLabel id="academic-performance-report">Report</InputLabel>
              <Select labelId="academic-performance-report" label="Report" value={kind} onChange={(e) => setKind(e.target.value as ReportAnalysisKind)}>
                {REPORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              select
              size="small"
              label="Academic year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              sx={fieldSx}
            >
              {(settings?.academicYears ?? [academicYear]).filter(Boolean).map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </TextField>

            <TextField select size="small" label="Term" value={term} onChange={(e) => setTerm(e.target.value)} sx={fieldSx}>
              {(settings?.terms ?? [term]).filter(Boolean).map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              sx={fieldSx}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>{[c.name, c.stream].filter(Boolean).join(' ')}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Typography sx={{ mt: 1.25, fontSize: '0.8125rem', color: MUTED }}>{kindOption.hint}</Typography>
        </Paper>

        {loading ? <LinearProgress sx={{ borderRadius: 1 }} /> : null}
        {error ? <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}

        {data ? (
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <Tabs
              value={tab}
              onChange={(_, v: string) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 1,
                borderBottom: `1px solid ${BORDER}`,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.8125rem' },
                '& .Mui-selected': { color: `${NAVY} !important` },
                '& .MuiTabs-indicator': { bgcolor: AMBER, height: 3 },
              }}
            >
              <Tab value="all" label={`All students (${data.students.length})`} />
              {data.courses.map((c) => (
                <Tab key={c.subjectId} value={c.subjectId} label={c.subject} />
              ))}
            </Tabs>

            {tab === 'all' ? (
              <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                <Section
                  title={`${kindOption.label} · all students`}
                  subtitle={`${data.students.length} student(s) · percentage per course + overall percentage`}
                  action={
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<FileDownloadOutlinedIcon />}
                      onClick={() => exportStudentsPdf(data, KIND_LABEL[kind], sortedStudents, 'all-students')}
                      sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#1B2D52' } }}
                    >
                      Download PDF
                    </Button>
                  }
                >
                  {data.courses.length === 0 || data.students.length === 0 ? (
                    <Typography sx={{ color: MUTED, fontSize: '0.875rem' }}>
                      No {kindOption.label.toLowerCase()} marks for this class yet. Check the term and mark entry.
                    </Typography>
                  ) : (
                    <TableContainer sx={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={thSx}>#</TableCell>
                            <TableCell sx={thSx}>Student</TableCell>
                            <TableCell sx={thSx}>Admission no.</TableCell>
                            {data.courses.map((c) => (
                              <TableCell key={c.subjectId} sx={{ ...thSx, textAlign: 'right' }}>{c.subject}</TableCell>
                            ))}
                            <TableCell sx={{ ...thSx, textAlign: 'right' }}>Percentage</TableCell>
                            <TableCell sx={{ ...thSx, textAlign: 'right' }}>Position</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedStudents.map((s, i) => (
                            <TableRow key={s.studentId} hover>
                              <TableCell sx={tdSx}>{i + 1}</TableCell>
                              <TableCell sx={tdSx}><Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.8125rem' }}>{s.name}</Typography></TableCell>
                              <TableCell sx={tdSx}>{s.admissionNo ?? '—'}</TableCell>
                              {data.courses.map((c) => {
                                const cell = cellFor(s, c.subjectId);
                                const val = cell?.percentage;
                                return (
                                  <TableCell key={c.subjectId} sx={{ ...tdSx, textAlign: 'right', fontWeight: 700, color: val == null ? MUTED : val >= threshold ? '#047857' : '#b91c1c' }}>
                                    {cellText(cell)}
                                  </TableCell>
                                );
                              })}
                              <TableCell sx={{ ...tdSx, textAlign: 'right', fontWeight: 800, color: NAVY }}>{fmtPct(s.average)}</TableCell>
                              <TableCell sx={{ ...tdSx, textAlign: 'right' }}>{s.position ?? '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Section>
              </Box>
            ) : activeCourse ? (
              <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'grid', gap: 2 }}>
                <Flex direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Flex direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.125rem' }}>{activeCourse.subject}</Typography>
                      <BandChip band={activeCourse.band} />
                    </Flex>
                    <Typography sx={{ fontSize: '0.8125rem', color: MUTED, mt: 0.25 }}>
                      Teacher: {activeCourse.teacherName ?? 'Not recorded'} · students in {classLabel || 'this class'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<FileDownloadOutlinedIcon />}
                    onClick={() => exportCoursePdf(data, activeCourse, KIND_LABEL[kind], courseRows)}
                    sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#1B2D52' }, flexShrink: 0 }}
                  >
                    Download PDF
                  </Button>
                </Flex>

                <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                  <CourseKpi label="Course average" value={fmtPct(activeCourse.average)} accent={activeCourse.band?.color ?? '#94a3b8'} />
                  <CourseKpi label="Students assessed" value={`${courseAssessedCount}/${courseRows.length}`} accent="#2563EB" />
                  <CourseKpi label="Highest" value={fmtPct(activeCourse.highest)} accent="#059669" />
                  <CourseKpi label="Lowest" value={fmtPct(activeCourse.lowest)} accent="#DC2626" />
                </Box>

                <TableContainer sx={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={thSx}>#</TableCell>
                        <TableCell sx={thSx}>Student</TableCell>
                        <TableCell sx={thSx}>Admission no.</TableCell>
                        <TableCell sx={{ ...thSx, textAlign: 'right' }}>{activeCourse.subject} mark</TableCell>
                        <TableCell sx={{ ...thSx, textAlign: 'right' }}>Percentage</TableCell>
                        <TableCell sx={thSx}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courseRows.map((r, i) => {
                        const val = r.cell?.percentage;
                        return (
                          <TableRow key={r.student.studentId} hover>
                            <TableCell sx={tdSx}>{i + 1}</TableCell>
                            <TableCell sx={tdSx}><Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.8125rem' }}>{r.student.name}</Typography></TableCell>
                            <TableCell sx={tdSx}>{r.student.admissionNo ?? '—'}</TableCell>
                            <TableCell sx={{ ...tdSx, textAlign: 'right', fontWeight: 700, color: val == null ? MUTED : val >= threshold ? '#047857' : '#b91c1c' }}>
                              {cellText(r.cell)}
                            </TableCell>
                            <TableCell sx={{ ...tdSx, textAlign: 'right', fontWeight: 800, color: NAVY }}>{fmtPct(val)}</TableCell>
                            <TableCell sx={tdSx}>
                              <Chip
                                size="small"
                                label={r.cell ? (r.cell.status === 'entered' ? 'Entered' : r.cell.status === 'absent' ? 'Absent' : 'Missing') : 'Not in course'}
                                sx={{ fontWeight: 700 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!courseRows.length ? (
                        <TableRow><TableCell colSpan={6} sx={{ py: 3, textAlign: 'center', color: MUTED }}>No students in this class.</TableCell></TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : null}
          </Paper>
        ) : !loading && !error ? (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px dashed ${BORDER}`, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Choose a class to see academic performance</Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: MUTED }}>
              Pick a report (Beginning / Mid Term / Term), class and term.
            </Typography>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}

const thSx = {
  bgcolor: '#F8FAFC',
  color: NAVY,
  fontWeight: 800,
  fontSize: '0.6875rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap' as const,
};

const tdSx = {
  borderBottom: `1px solid #EEF2F6`,
  color: '#0f172a',
  fontSize: '0.8125rem',
  whiteSpace: 'nowrap' as const,
};

function CourseKpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Paper elevation={0} sx={{ p: 1.75, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent }} />
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: '1.5rem', fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Paper>
  );
}
