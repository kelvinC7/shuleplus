import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  TablePagination,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import {
  getReportAnalysis,
  getReportAnalysisComparison,
  getReportAnalysisSettings,
  getReportCardV2,
  listReportCardPublications,
  smListClasses,
} from '@/services/api';
import type { ReportCardDataV2 } from '@/types';
import type {
  ReportAnalysisClassComparison,
  ReportAnalysisCourse,
  ReportAnalysisData,
  ReportAnalysisKind,
  ReportAnalysisSettings,
  ReportAnalysisStatus,
  ReportAnalysisStudent,
} from '@/types/report-analysis';
import {
  AMBER,
  BORDER,
  BandChip,
  DistributionBar,
  KpiCard,
  MUTED,
  NAVY,
  ProgressBar,
  Section,
  deltaColor,
  fmtDelta,
  fmtPct,
} from '@/components/report-analysis/analysis-ui';
import { Flex } from '@/components/report-analysis/analysis-ui';
import CourseDrawer from '@/components/report-analysis/CourseDrawer';
import StudentDrawer, { type PublicationInfo } from '@/components/report-analysis/StudentDrawer';
import BandSettingsDialog from '@/components/report-analysis/BandSettingsDialog';
import { exportAnalysisExcel, exportAnalysisPdf, exportClassComparisonExcel } from '@/components/report-analysis/analysis-export';
import ClassComparisonTab from '@/components/report-analysis/ClassComparisonTab';
import ReportCardViewerModal from '@/components/ReportCardViewerModal';

type SmClass = { id: string; name: string; stream?: string | null; category?: string | null };
type PubRow = { studentId: string; reportKind: string; status: string; accessPolicy: string; publishedAt: string | null };

const REPORT_TABS: Array<{ value: ReportAnalysisKind; label: string; hint: string }> = [
  { value: 'beginning', label: 'Beginning of Term', hint: 'Assessments classified as Beginning Term only.' },
  { value: 'midterm', label: 'Mid-Term', hint: 'Mid-Term assessments; compared with Beginning of Term.' },
  { value: 'standard', label: 'Termly', hint: 'All assessments in the term, as used by the Termly report card; compared with Mid-Term.' },
];

const STATUS_OPTIONS: Array<{ value: ReportAnalysisStatus; label: string }> = [
  { value: 'all', label: 'All non-draft' },
  { value: 'in_progress', label: 'Marks in progress' },
  { value: 'submitted', label: 'Submitted / reviewing' },
  { value: 'approved', label: 'Approved / locked' },
];

type StudentSort = 'name' | 'average_desc' | 'average_asc' | 'position' | 'below' | 'missing' | 'delta';
type PageView = 'overview' | 'comparison';
const SORT_OPTIONS: Array<{ value: StudentSort; label: string }> = [
  { value: 'average_desc', label: 'Average (high → low)' },
  { value: 'average_asc', label: 'Average (low → high)' },
  { value: 'position', label: 'Position' },
  { value: 'below', label: 'Courses below threshold' },
  { value: 'missing', label: 'Missing marks' },
  { value: 'delta', label: 'Change vs previous' },
  { value: 'name', label: 'Name (A–Z)' },
];

const DEFAULT_BAND_SETTINGS: ReportAnalysisSettings = {
  bands: [
    { label: 'Excellent', min: 80, color: '#059669' },
    { label: 'Very Good', min: 70, color: '#2563EB' },
    { label: 'Average', min: 50, color: '#D97706' },
    { label: 'Needs Improvement', min: 0, color: '#DC2626' },
  ],
  atRiskBelow: 50,
  trendDelta: 5,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', fontSize: '0.875rem' },
};

function reportKindLabel(kind: ReportAnalysisKind) {
  return kind === 'beginning' ? 'Beginning of Term' : kind === 'midterm' ? 'Mid-Term' : 'Termly';
}

function sortStudents(list: ReportAnalysisStudent[], sort: StudentSort, courseSubject: string | null) {
  const copy = [...list];
  const num = (v: number | null | undefined, fallback: number) => (v == null ? fallback : v);
  switch (sort) {
    case 'average_desc':
      return copy.sort((a, b) => num(b.average, -1) - num(a.average, -1));
    case 'average_asc':
      return copy.sort((a, b) => num(a.average, 1000) - num(b.average, 1000));
    case 'position':
      return copy.sort((a, b) => num(a.position, 1e9) - num(b.position, 1e9));
    case 'below':
      return copy.sort((a, b) => b.coursesBelow - a.coursesBelow);
    case 'missing':
      return copy.sort((a, b) => b.missingCourses - a.missingCourses);
    case 'delta':
      return copy.sort((a, b) => num(b.delta, -1000) - num(a.delta, -1000));
    case 'name':
    default:
      if (courseSubject) return copy.sort((a, b) => a.name.localeCompare(b.name));
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function courseScore(s: ReportAnalysisStudent, subject: string) {
  return s.subjects.find((c) => c.subject === subject)?.percentage ?? null;
}

function StatusFilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Chip
      size="small"
      label={label}
      onClick={onClick}
      variant={active ? 'filled' : 'outlined'}
      sx={{ fontWeight: 700, bgcolor: active ? NAVY : '#fff', color: active ? '#fff' : NAVY, borderColor: BORDER }}
    />
  );
}

export default function ReportAnalysisPage() {
  const { settings, ready, academicYear, term, setAcademicYear, setTerm } = useOrgAcademicPeriod();
  const [classes, setClasses] = useState<SmClass[]>([]);
  const [classId, setClassId] = useState('');
  const [level, setLevel] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [status, setStatus] = useState<ReportAnalysisStatus>('all');
  const [reportKind, setReportKind] = useState<ReportAnalysisKind>('midterm');
  const [data, setData] = useState<ReportAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publications, setPublications] = useState<PubRow[]>([]);
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [sort, setSort] = useState<StudentSort>('average_desc');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [needsTab, setNeedsTab] = useState<'below' | 'weakest' | 'declining' | 'missing'>('below');
  const [recogTab, setRecogTab] = useState<'top' | 'consistent' | 'improved'>('top');
  const [courseOpen, setCourseOpen] = useState<ReportAnalysisCourse | null>(null);
  const [studentOpen, setStudentOpen] = useState<ReportAnalysisStudent | null>(null);
  const [bandsOpen, setBandsOpen] = useState(false);
  const [bandSettings, setBandSettings] = useState<ReportAnalysisSettings | null>(null);
  const [classComparison, setClassComparison] = useState<ReportAnalysisClassComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [view, setView] = useState<PageView>('overview');
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [viewerReport, setViewerReport] = useState<ReportCardDataV2 | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const docRef = useRef<HTMLDivElement | null>(null);
  const analysisRequestRef = useRef(0);

  useEffect(() => {
    getReportAnalysisSettings()
      .then(setBandSettings)
      .catch(() => setBandSettings(null));
  }, []);

  useEffect(() => {
    smListClasses()
      .then((rows) => setClasses(Array.isArray(rows) ? rows : []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (classId) return;
    const pool = level ? classes.filter((c) => c.category === level) : classes;
    if (pool.length) setClassId(pool[0].id);
  }, [classes, classId, level]);

  const levelOptions = useMemo(
    () => [...new Set(classes.map((c) => c.category).filter((x): x is string => Boolean(x)))].sort(),
    [classes],
  );
  const visibleClasses = useMemo(
    () => (level ? classes.filter((c) => c.category === level) : classes),
    [classes, level],
  );
  const classLabel = (c: SmClass) => [c.name, c.stream].filter(Boolean).join(' ');

  const siblingClassIds = useMemo(() => {
    const selected = classes.find((c) => c.id === classId);
    if (!selected) return [];
    return classes.filter((c) => c.name === selected.name).map((c) => c.id);
  }, [classes, classId]);

  const comparisonGroupLabel = useMemo(() => {
    const selected = classes.find((c) => c.id === classId);
    if (!selected) return '';
    return siblingClassIds.length > 1 ? `${selected.name} · ${siblingClassIds.length} streams` : selected.name;
  }, [classes, classId, siblingClassIds]);

  useEffect(() => {
    if (!academicYear || siblingClassIds.length < 2) {
      setClassComparison(null);
      setComparisonError(null);
      setComparisonLoading(false);
      return;
    }
    let cancelled = false;
    setClassComparison(null);
    setComparisonError(null);
    setComparisonLoading(true);
    getReportAnalysisComparison({
      classIds: siblingClassIds,
      academicYear,
      term: term || undefined,
      reportKind,
      status,
    })
      .then((result) => {
        if (!cancelled) setClassComparison(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setClassComparison(null);
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setComparisonError(message || 'Could not load the class comparison. Check roster and assessment services, then retry.');
        }
      })
      .finally(() => {
        if (!cancelled) setComparisonLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siblingClassIds, academicYear, term, reportKind, status]);

  const loadAnalysis = useCallback(async () => {
    const requestId = ++analysisRequestRef.current;
    if (!classId || !academicYear) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    setPage(0);
    try {
      const result = await getReportAnalysis({
        classId,
        academicYear,
        term: term || undefined,
        reportKind,
        status,
      });
      if (requestId !== analysisRequestRef.current) return;
      setData(result);
      setPage(0);
    } catch (err) {
      if (requestId !== analysisRequestRef.current) return;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not load the report analysis for this class.');
      setData(null);
    } finally {
      if (requestId === analysisRequestRef.current) setLoading(false);
    }
  }, [classId, academicYear, term, reportKind, status]);

  useEffect(() => {
    if (!ready) return;
    void loadAnalysis();
    return () => {
      analysisRequestRef.current += 1;
    };
  }, [ready, loadAnalysis]);

  useEffect(() => {
    if (!classId || !academicYear) return;
    listReportCardPublications({ academicYear, term: term || undefined, classId })
      .then((rows) => setPublications(Array.isArray(rows) ? rows : []))
      .catch(() => setPublications([]));
  }, [classId, academicYear, term]);

  useEffect(() => {
    setCourseFilter('');
    setSearch('');
    setBandFilter('');
    setPage(0);
  }, [classId, reportKind]);

  const threshold = data?.settings.atRiskBelow ?? 50;
  const bands = data?.settings.bands ?? [];
  const comparisonLabel = data?.comparison
    ? `vs ${reportKindLabel(data.comparison.previousReportKind)} (published)`
    : null;

  const publicationFor = useCallback(
    (studentId: string): PublicationInfo => {
      const row = publications.find((p) => p.studentId === studentId && p.reportKind === reportKind);
      return row ? { status: row.status, accessPolicy: row.accessPolicy, publishedAt: row.publishedAt } : null;
    },
    [publications, reportKind],
  );

  const publishedCount = useMemo(
    () => new Set(publications.filter((p) => p.reportKind === reportKind && p.status === 'PUBLISHED').map((p) => p.studentId)).size,
    [publications, reportKind],
  );

  const visibleCourses = useMemo(() => {
    if (!data) return [];
    const list = courseFilter ? data.courses.filter((c) => c.subject === courseFilter) : data.courses;
    return [...list].sort((a, b) => (a.average ?? 1000) - (b.average ?? 1000));
  }, [data, courseFilter]);

  const tableRows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = data.students.filter((s) => {
      if (q && !`${s.name} ${s.admissionNo ?? ''}`.toLowerCase().includes(q)) return false;
      if (bandFilter && s.band?.label !== bandFilter) return false;
      if (courseFilter && courseScore(s, courseFilter) == null) return false;
      return true;
    });
    list = sortStudents(list, sort, courseFilter || null);
    if (sortAsc) list = [...list].reverse();
    return list;
  }, [data, search, bandFilter, courseFilter, sort, sortAsc]);

  const pageRows = tableRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const needsList = useMemo(() => {
    if (!data) return [];
    switch (needsTab) {
      case 'weakest':
        return data.lists.weakestCourses.map((c) => ({ kind: 'course' as const, course: c }));
      case 'declining':
        return data.lists.declining.map((s) => ({ kind: 'student' as const, student: s }));
      case 'missing':
        return data.lists.missingAssessments.map((s) => ({ kind: 'student' as const, student: s }));
      case 'below':
      default:
        return data.lists.needsImprovement.map((s) => ({ kind: 'student' as const, student: s }));
    }
  }, [data, needsTab]);

  const recognitionList = useMemo(() => {
    if (!data) return [];
    if (recogTab === 'consistent') return data.lists.consistentPerformers;
    if (recogTab === 'improved') return data.lists.bestImprovement;
    return data.lists.topPerformers;
  }, [data, recogTab]);

  const recommendations = useMemo(() => {
    if (!data) return [];
    const items: string[] = [];
    const weakest = data.lists.weakestCourses[0];
    if (weakest?.average != null && weakest.average < threshold) {
      items.push(
        `Prioritise ${weakest.subject} (average ${fmtPct(weakest.average)}). Run remedial sessions and review marks with ${weakest.teacherName ?? 'the subject teacher'}.`,
      );
    }
    const missingCourses = data.courses.reduce((n, c) => n + c.missing, 0);
    if (data.summary.missingMarksStudents > 0) {
      items.push(
        `${data.summary.missingMarksStudents} student(s) have ${missingCourses} missing course mark(s). Complete mark entry before publishing.`,
      );
    }
    if (data.comparison && data.comparison.declinedStudents > 0) {
      items.push(`${data.comparison.declinedStudents} student(s) declined since ${reportKindLabel(data.comparison.previousReportKind)}. Schedule parent meetings.`);
    }
    if (data.summary.needsImprovement > 0) {
      items.push(
        `${data.summary.needsImprovement} student(s) (${fmtPct(data.summary.needsImprovementPercent)}) are below ${threshold}%. Assign intervention plans.`,
      );
    }
    if (data.summary.goodPerformers > 0) {
      items.push(`${fmtPct(data.summary.goodPercent)} of assessed students are in the top two bands. Recognise them in assembly or on the honour roll.`);
    }
    return items;
  }, [data, threshold]);

  async function openReport(studentId: string) {
    if (!data) return;
    setViewerLoading(true);
    try {
      const report = await getReportCardV2(
        studentId,
        data.period.classId,
        data.period.academicYear,
        data.period.term ?? undefined,
        undefined,
        reportKind,
      );
      setViewerReport(report);
    } catch {
      setError('Could not open this report card. It may not have marks for this stage yet.');
    } finally {
      setViewerLoading(false);
    }
  }

  const openStudentFromCourse = (studentId: string) => {
    const s = data?.students.find((x) => x.studentId === studentId) ?? null;
    setCourseOpen(null);
    setStudentOpen(s);
  };

  const headerNote = data
    ? `${data.period.classLabel || 'Class'} · ${data.period.academicYear}${data.period.term ? ` · ${data.period.term}` : ''}`
    : 'Choose a class to begin';

  return (
    <Box sx={{ minHeight: '100%', bgcolor: '#F5F7FA', fontFamily: "'Montserrat', system-ui, sans-serif", pb: 6 }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2.25, md: 2.75 }, pb: 2, bgcolor: '#fff', borderBottom: `1px solid ${BORDER}` }}>
        <Flex direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-end' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B7791F' }}>
              Academic Performance
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: { xs: '1.375rem', md: '1.75rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
              Report Cards & Performance Analytics
            </Typography>
            <Flex direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
              <Chip size="small" label={`Academic year ${academicYear || '—'}`} sx={{ fontWeight: 700, bgcolor: '#FFF7E6', color: '#92400E' }} />
              <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>{headerNote}</Typography>
            </Flex>
          </Box>
          <Flex direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              startIcon={<TuneRoundedIcon />}
              onClick={() => setBandsOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: BORDER, color: NAVY, borderRadius: 2 }}
            >
              Bands
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon />}
              disabled={view === 'comparison' ? !(classComparison && classComparison.classes.length > 1) : !data}
              onClick={(e) => setExportAnchor(e.currentTarget)}
              sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, borderRadius: 2, '&:hover': { bgcolor: '#1B2D52' } }}
            >
              Export
            </Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              {view === 'overview' ? (
                [
                  <MenuItem key="excel" onClick={() => { setExportAnchor(null); if (data) exportAnalysisExcel(data, tableRows); }}>Excel (.xlsx)</MenuItem>,
                  <MenuItem key="pdf" onClick={() => { setExportAnchor(null); if (data) exportAnalysisPdf(data, tableRows); }}>PDF management report</MenuItem>,
                ]
              ) : (
                <MenuItem
                  onClick={() => {
                    setExportAnchor(null);
                    if (classComparison && classComparison.classes.length > 1) {
                      exportClassComparisonExcel(classComparison.classes, {
                        groupLabel: comparisonGroupLabel,
                        stageLabel: reportKindLabel(reportKind),
                        academicYear,
                        term: term || null,
                      });
                    }
                  }}
                >
                  Class comparison (.xlsx)
                </MenuItem>
              )}
            </Menu>
          </Flex>
        </Flex>
      </Box>

      <Box sx={{ px: { xs: 1.5, md: 3 }, pt: { xs: 2, md: 2.5 }, display: 'grid', gap: 2.5, minWidth: 0 }}>
        {/* View tabs */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <Tabs
            value={view}
            onChange={(_, v: PageView) => setView(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 1,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 56, fontSize: '0.875rem' },
              '& .Mui-selected': { color: `${NAVY} !important` },
              '& .MuiTabs-indicator': { bgcolor: AMBER, height: 3 },
            }}
          >
            <Tab
              value="overview"
              label="Performance overview"
              icon={<InsightsRoundedIcon fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              value="comparison"
              label="Class comparison"
              icon={<CompareArrowsRoundedIcon fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Filter toolbar */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3, border: `1px solid ${BORDER}` }}>
          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: {
                xs: '1fr 1fr',
                md: 'repeat(3, 1fr)',
                xl: view === 'overview' ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)',
              },
            }}
          >
            <TextField select size="small" label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} sx={fieldSx}>
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
              label="Education level"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setClassId('');
              }}
              sx={fieldSx}
              disabled={!levelOptions.length}
            >
              <MenuItem value="">All levels</MenuItem>
              {levelOptions.map((l) => (
                <MenuItem key={l} value={l}>{l}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} sx={fieldSx}>
              {visibleClasses.map((c) => (
                <MenuItem key={c.id} value={c.id}>{classLabel(c)}</MenuItem>
              ))}
            </TextField>
            {view === 'overview' ? (
              <TextField select size="small" label="Course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} sx={fieldSx} disabled={!data}>
                <MenuItem value="">All courses</MenuItem>
                {(data?.courses ?? []).map((c) => (
                  <MenuItem key={c.subjectId} value={c.subject}>{c.subject}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField select size="small" label="Assessment status" value={status} onChange={(e) => setStatus(e.target.value as ReportAnalysisStatus)} sx={fieldSx}>
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Box>
        </Paper>

        {/* Report type tabs */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <Tabs
            value={reportKind}
            onChange={(_, v: ReportAnalysisKind) => setReportKind(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 1,
              borderBottom: `1px solid ${BORDER}`,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.875rem' },
              '& .Mui-selected': { color: `${NAVY} !important` },
              '& .MuiTabs-indicator': { bgcolor: AMBER, height: 3 },
            }}
          >
            {REPORT_TABS.map((t) => (
              <Tab key={t.value} value={t.value} label={t.label} />
            ))}
          </Tabs>
          <Typography sx={{ px: 2.5, py: 1.25, fontSize: '0.8125rem', color: MUTED }}>
            {REPORT_TABS.find((t) => t.value === reportKind)?.hint} Marks are never mixed across report types.
          </Typography>
        </Paper>

        {view === 'overview' && loading ? <LinearProgress sx={{ borderRadius: 1 }} /> : null}
        {error ? <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}
        {view === 'comparison' && comparisonError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{comparisonError}</Alert> : null}

        {view === 'comparison' ? (
          <ClassComparisonTab
            rows={classComparison?.classes ?? []}
            loading={comparisonLoading}
            selectedClassId={classId}
            groupLabel={comparisonGroupLabel}
            stageLabel={reportKindLabel(reportKind)}
            threshold={threshold}
            onSelectClass={setClassId}
          />
        ) : (
          <>
        {!data && !loading && !error ? (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px dashed ${BORDER}`, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Choose a class to see its analysis</Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: MUTED }}>Course averages, student rankings and intervention lists appear here.</Typography>
          </Paper>
        ) : null}

        {data ? (
          <>
            {data.period.assessmentCount === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No {reportKindLabel(reportKind)} assessments match these filters yet. Check the term and assessment status.
              </Alert>
            ) : null}

            {/* KPI cards */}
            <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' } }}>
              <KpiCard label="Total students" value={String(data.summary.totalStudents)} accent="#2563EB" hint={`${data.summary.assessedStudents} with marks`} />
              <KpiCard
                label="Class average"
                value={fmtPct(data.summary.classAverage)}
                accent={bands.length ? bands[Math.floor(bands.length / 2)].color : '#94a3b8'}
                deltaText={data.comparison ? `${fmtDelta(data.comparison.classAverageDelta) ?? '—'} vs ${reportKindLabel(data.comparison.previousReportKind)}` : null}
                deltaTone={deltaColor(data.comparison?.classAverageDelta)}
                hint={data.comparison ? undefined : 'No published earlier stage yet'}
              />
              <KpiCard label="Good performers" value={String(data.summary.goodPerformers)} accent="#059669" hint={`${fmtPct(data.summary.goodPercent)} of students`} />
              <KpiCard label="Needs improvement" value={String(data.summary.needsImprovement)} accent="#DC2626" hint={`Below ${threshold}% · ${fmtPct(data.summary.needsImprovementPercent)}`} />
              <KpiCard label="Missing marks" value={String(data.summary.missingMarksStudents)} accent="#D97706" hint="Students with incomplete courses" />
            </Box>

            {/* Distribution */}
            <Section title="Student performance distribution" subtitle={`${data.summary.assessedStudents} assessed students · bands set in Bands settings`}>
              <DistributionBar items={data.distribution} />
              <Box sx={{ mt: 2, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color: MUTED, fontWeight: 700 }}>Students below {threshold}%</Typography>
                  <Typography sx={{ fontWeight: 800, color: '#b91c1c', fontSize: '1.125rem' }}>{data.summary.needsImprovement}</Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color: MUTED, fontWeight: 700 }}>Students with missing marks</Typography>
                  <Typography sx={{ fontWeight: 800, color: '#a16207', fontSize: '1.125rem' }}>{data.summary.missingMarksStudents}</Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: `1px solid ${BORDER}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color: MUTED, fontWeight: 700 }}>Report publishing</Typography>
                  <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.125rem' }}>
                    {publishedCount} <Box component="span" sx={{ fontSize: '0.8125rem', color: MUTED }}>of {data.summary.totalStudents} published</Box>
                  </Typography>
                </Box>
              </Box>
            </Section>

            {/* Course analysis + comparison */}
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' } }}>
              <Section title="Course performance" subtitle="Weakest courses first. Tap a course for details." id="course-performance">
                {visibleCourses.length === 0 ? (
                  <Typography sx={{ color: MUTED, fontSize: '0.875rem' }}>No courses in this stage.</Typography>
                ) : (
                  <Flex spacing={1}>
                    {visibleCourses.map((c) => (
                      <Box
                        key={c.subjectId}
                        role="button"
                        tabIndex={0}
                        onClick={() => setCourseOpen(c)}
                        onKeyDown={(e) => e.key === 'Enter' && setCourseOpen(c)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: `1px solid ${BORDER}`,
                          cursor: 'pointer',
                          transition: 'border-color 120ms ease, box-shadow 120ms ease',
                          '&:hover': { borderColor: AMBER, boxShadow: '0 4px 14px -8px rgba(0,4,53,0.25)' },
                          '&:focus-visible': { outline: `2px solid ${NAVY}`, outlineOffset: 2 },
                        }}
                      >
                        <Flex direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>{c.subject}</Typography>
                            <Typography noWrap sx={{ fontSize: '0.75rem', color: MUTED }}>{c.teacherName ?? 'Teacher not recorded'}</Typography>
                          </Box>
                          <BandChip band={c.band} />
                        </Flex>
                        <Flex direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                          <Typography sx={{ minWidth: 56, fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(c.average)}</Typography>
                          <Box sx={{ flex: 1 }}><ProgressBar value={c.average} color={c.band?.color ?? '#94a3b8'} /></Box>
                        </Flex>
                        <Flex direction="row" spacing={2} sx={{ mt: 0.75, fontSize: '0.75rem', color: MUTED, flexWrap: 'wrap' }}>
                          <span>{c.below} below {threshold}%</span>
                          <span>{c.assessed} assessed</span>
                          {c.missing ? <span style={{ color: '#a16207', fontWeight: 700 }}>{c.missing} missing</span> : null}
                        </Flex>
                      </Box>
                    ))}
                  </Flex>
                )}
              </Section>

              <Section title="Course comparison" subtitle="Strongest at the top, weakest at the bottom">
                {data.courses.length === 0 ? (
                  <Typography sx={{ color: MUTED, fontSize: '0.875rem' }}>No courses to compare.</Typography>
                ) : (
                  <Flex spacing={1.1}>
                    {[...data.courses]
                      .filter((c) => c.average != null)
                      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
                      .map((c, i, arr) => (
                        <Flex key={c.subjectId} direction="row" alignItems="center" spacing={1}>
                          <Typography noWrap sx={{ width: { xs: 96, sm: 130 }, fontSize: '0.8125rem', fontWeight: 700, color: NAVY, flexShrink: 0 }}>
                            {c.subject}
                          </Typography>
                          <Box sx={{ flex: 1, height: 14, borderRadius: 999, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                            <Box sx={{ width: `${Math.max(2, c.average ?? 0)}%`, height: '100%', bgcolor: c.band?.color ?? '#94a3b8', borderRadius: 999 }} />
                          </Box>
                          <Typography sx={{ width: 50, textAlign: 'right', fontSize: '0.8125rem', fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtPct(c.average, 0)}
                          </Typography>
                          {i === 0 ? <Chip size="small" label="Strongest" sx={{ height: 20, fontWeight: 800, bgcolor: '#ecfdf5', color: '#047857' }} /> : null}
                          {i === arr.length - 1 && arr.length > 1 ? <Chip size="small" label="Weakest" sx={{ height: 20, fontWeight: 800, bgcolor: '#fef2f2', color: '#b91c1c' }} /> : null}
                        </Flex>
                      ))}
                  </Flex>
                )}
              </Section>
            </Box>

            {/* Recognition & intervention */}
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
              <Section title="Top performers" subtitle={`${data.summary.goodPerformers} students in the top two bands`}>
                <Flex direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                  <StatusFilterChip label="Top 10" active={recogTab === 'top'} onClick={() => setRecogTab('top')} />
                  <StatusFilterChip label="Consistent" active={recogTab === 'consistent'} onClick={() => setRecogTab('consistent')} />
                  <StatusFilterChip label="Best improvement" active={recogTab === 'improved'} onClick={() => setRecogTab('improved')} />
                </Flex>
                <Flex spacing={0.75}>
                  {recognitionList.map((s, i) => (
                    <Flex key={s.studentId} direction="row" alignItems="center" spacing={1.25} sx={{ p: 1, borderRadius: 2, bgcolor: '#F0FDF4', border: '1px solid #bbf7d0' }}>
                      <Typography sx={{ width: 22, fontWeight: 800, color: '#047857', textAlign: 'center' }}>{i + 1}</Typography>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }}>{s.name}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: MUTED }}>
                          {recogTab === 'improved' ? `${fmtPct(s.previousAverage)} → ${fmtPct(s.average)}` : `Position ${s.position ?? '—'}${s.classSize ? `/${s.classSize}` : ''}`}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 800, color: recogTab === 'improved' ? '#047857' : NAVY, fontSize: '0.9375rem' }}>
                        {recogTab === 'improved' ? fmtDelta(s.delta) : fmtPct(s.average)}
                      </Typography>
                    </Flex>
                  ))}
                  {!recognitionList.length ? (
                    <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>
                      {recogTab === 'improved' ? `No student improved by ${data.settings.trendDelta}+ points yet. Trends need a published earlier stage.` : 'No students in this list yet.'}
                    </Typography>
                  ) : null}
                </Flex>
              </Section>

              <Section
                title="Needs improvement"
                subtitle={`${data.summary.needsImprovement} students below ${threshold}% · ${data.summary.missingMarksStudents} with missing marks`}
                action={
                  <Button
                    size="small"
                    startIcon={<FileDownloadOutlinedIcon />}
                    onClick={() => data && exportAnalysisExcel(data, needsTab === 'below' ? data.lists.needsImprovement : tableRows)}
                    sx={{ textTransform: 'none', fontWeight: 700, color: NAVY }}
                  >
                    Export list
                  </Button>
                }
              >
                <Flex direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                  <StatusFilterChip label={`Below ${threshold}%`} active={needsTab === 'below'} onClick={() => setNeedsTab('below')} />
                  <StatusFilterChip label="Weakest courses" active={needsTab === 'weakest'} onClick={() => setNeedsTab('weakest')} />
                  <StatusFilterChip label="Declining" active={needsTab === 'declining'} onClick={() => setNeedsTab('declining')} />
                  <StatusFilterChip label="Missing marks" active={needsTab === 'missing'} onClick={() => setNeedsTab('missing')} />
                </Flex>
                <Flex spacing={0.75}>
                  {needsList.map((item, idx) =>
                    item.kind === 'course' ? (
                      <Flex
                        key={item.course.subjectId}
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        role="button"
                        tabIndex={0}
                        onClick={() => setCourseOpen(item.course)}
                        sx={{ p: 1, borderRadius: 2, bgcolor: '#FEF2F2', border: '1px solid #fecaca', cursor: 'pointer' }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography noWrap sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }}>{item.course.subject}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: MUTED }}>{item.course.below} student(s) below {threshold}%</Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 800, color: '#b91c1c' }}>{fmtPct(item.course.average)}</Typography>
                      </Flex>
                    ) : (
                      <Flex
                        key={`${item.student.studentId}-${idx}`}
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        role="button"
                        tabIndex={0}
                        onClick={() => setStudentOpen(item.student)}
                        onKeyDown={(e) => e.key === 'Enter' && setStudentOpen(item.student)}
                        sx={{ p: 1, borderRadius: 2, bgcolor: '#fff', border: `1px solid ${BORDER}`, cursor: 'pointer', '&:hover': { borderColor: AMBER } }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography noWrap sx={{ fontWeight: 700, color: NAVY, fontSize: '0.875rem' }}>{item.student.name}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: MUTED }}>
                            {needsTab === 'declining'
                              ? `${fmtPct(item.student.previousAverage)} → ${fmtPct(item.student.average)}`
                              : needsTab === 'missing'
                                ? `${item.student.missingCourses} missing course(s)`
                                : `${item.student.coursesBelow} course(s) below ${threshold}%`}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 800, color: needsTab === 'declining' ? '#b91c1c' : NAVY }}>
                          {needsTab === 'declining' ? fmtDelta(item.student.delta) : fmtPct(item.student.average)}
                        </Typography>
                      </Flex>
                    ),
                  )}
                  {!needsList.length ? <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>Nothing to action in this list.</Typography> : null}
                </Flex>
              </Section>
            </Box>

            {/* Trends */}
            <Section
              title="Performance trends"
              subtitle={
                data.comparison
                  ? `Comparing ${reportKindLabel(reportKind)} with ${reportKindLabel(data.comparison.previousReportKind)} (both published)`
                  : reportKind === 'beginning'
                    ? 'Beginning of Term is the first stage, so there is nothing earlier to compare with.'
                    : `Trends appear once the earlier stage (${reportKind === 'standard' ? 'Mid-Term' : 'Beginning of Term'}) has marks and is published for this term.`
              }
            >
              {data.comparison ? (
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <KpiCard label={`${reportKindLabel(data.comparison.previousReportKind)} avg`} value={fmtPct(data.comparison.previousClassAverage)} accent="#94a3b8" />
                    <KpiCard label={`${reportKindLabel(reportKind)} avg`} value={fmtPct(data.summary.classAverage)} accent="#2563EB" deltaText={fmtDelta(data.comparison.classAverageDelta)} deltaTone={deltaColor(data.comparison.classAverageDelta)} />
                    <KpiCard label="Improved students" value={String(data.comparison.improvedStudents)} accent="#059669" hint={`+${data.settings.trendDelta} pts or more`} />
                    <KpiCard label="Declined students" value={String(data.comparison.declinedStudents)} accent="#DC2626" hint={`−${data.settings.trendDelta} pts or more`} />
                  </Box>
                  <Flex spacing={1}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: NAVY }}>Course improvement</Typography>
                    {data.courses.filter((c) => c.previousAverage != null).map((c) => (
                      <Box key={c.subjectId}>
                        <Flex direction="row" justifyContent="space-between" alignItems="baseline">
                          <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY, minWidth: 0 }}>{c.subject}</Typography>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: deltaColor(c.delta) }}>
                            {c.delta != null ? `${fmtPct(c.previousAverage)} → ${fmtPct(c.average)} (${fmtDelta(c.delta)})` : '—'}
                          </Typography>
                        </Flex>
                        <Box sx={{ position: 'relative', height: 8, mt: 0.5, borderRadius: 999, bgcolor: '#f1f5f9' }}>
                          <Box sx={{ position: 'absolute', inset: 0, width: `${c.previousAverage ?? 0}%`, bgcolor: '#cbd5e1', borderRadius: 999 }} />
                          <Box sx={{ position: 'absolute', inset: 0, width: `${c.average ?? 0}%`, bgcolor: c.band?.color ?? '#2563EB', opacity: 0.85, borderRadius: 999 }} />
                        </Box>
                      </Box>
                    ))}
                    {!data.courses.some((c) => c.previousAverage != null) ? (
                      <Typography sx={{ fontSize: '0.8125rem', color: MUTED }}>Courses were not assessed in the earlier stage.</Typography>
                    ) : null}
                  </Flex>
                </Box>
              ) : null}
            </Section>

            {/* Recommendations */}
            <Section title="Academic recommendations" subtitle="Generated from the current marks. Review before acting.">
              {recommendations.length ? (
                <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1 }}>
                  {recommendations.map((r) => (
                    <Box component="li" key={r} sx={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, '&::marker': { color: AMBER, fontWeight: 800 } }}>{r}</Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: MUTED, fontSize: '0.875rem' }}>No recommendations yet. Marks are still being entered.</Typography>
              )}
            </Section>

            {/* Student table */}
            <Section
              title="Individual student performance"
              subtitle={`${tableRows.length} of ${data.students.length} students${courseFilter ? ` · ${courseFilter}` : ''}`}
              action={
                <Flex direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title={sortAsc ? 'Ascending' : 'Descending'}>
                    <IconButton size="small" aria-label="Toggle sort direction" onClick={() => setSortAsc((v) => !v)}>
                      <SwapVertRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Flex>
              }
            >
              <Flex direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Search name or admission number"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
                  sx={{ ...fieldSx, flex: 1, minWidth: 0 }}
                />
                <TextField select size="small" label="Band" value={bandFilter} onChange={(e) => { setBandFilter(e.target.value); setPage(0); }} sx={{ ...fieldSx, minWidth: { md: 180 } }}>
                  <MenuItem value="">All bands</MenuItem>
                  {bands.map((b) => (
                    <MenuItem key={b.label} value={b.label}>{b.label}</MenuItem>
                  ))}
                </TextField>
                <TextField select size="small" label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as StudentSort)} sx={{ ...fieldSx, minWidth: { md: 220 } }}>
                  {SORT_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>
              </Flex>

              {/* Mobile cards */}
              <Flex spacing={1} sx={{ display: { xs: 'flex', md: 'none' } }}>
                {pageRows.map((s) => (
                  <Box key={s.studentId} onClick={() => setStudentOpen(s)} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: '#fff', cursor: 'pointer' }}>
                    <Flex direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>{s.name}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: MUTED }}>{s.admissionNo ?? '—'} · Position {s.position ?? '—'}</Typography>
                      </Box>
                      <BandChip band={s.band} />
                    </Flex>
                    <Flex direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.05rem' }}>{fmtPct(s.average)}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: s.coursesBelow ? '#b91c1c' : MUTED, fontWeight: 700 }}>
                        {s.coursesBelow} below · {s.missingCourses} missing
                      </Typography>
                    </Flex>
                  </Box>
                ))}
                {!pageRows.length ? <Typography sx={{ py: 3, textAlign: 'center', color: MUTED, fontSize: '0.875rem' }}>No students match these filters.</Typography> : null}
              </Flex>

              {/* Desktop table */}
              <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', '& th': { textAlign: 'left', px: 1.25, py: 1, bgcolor: '#F8FAFC', color: NAVY, fontWeight: 800, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${BORDER}` }, '& td': { px: 1.25, py: 1, borderBottom: `1px solid #EEF2F6`, color: '#0f172a' }, '& tbody tr:hover': { bgcolor: '#FFFBF0', cursor: 'pointer' } }}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Average</th>
                      <th>Position</th>
                      <th>Courses below {threshold}%</th>
                      {courseFilter ? <th>{courseFilter}</th> : null}
                      <th>Missing</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((s) => (
                      <tr key={s.studentId} onClick={() => setStudentOpen(s)}>
                        <td>
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.8125rem' }}>{s.name}</Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{s.admissionNo ?? '—'}</Typography>
                        </td>
                        <td style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(s.average)}</td>
                        <td>{s.position ? `${s.position}${s.classSize ? ` / ${s.classSize}` : ''}` : '—'}</td>
                        <td style={{ color: s.coursesBelow ? '#b91c1c' : undefined, fontWeight: s.coursesBelow ? 800 : 400 }}>{s.coursesBelow}</td>
                        {courseFilter ? <td>{fmtPct(courseScore(s, courseFilter), 0)}</td> : null}
                        <td style={{ color: s.missingCourses ? '#a16207' : undefined, fontWeight: s.missingCourses ? 700 : 400 }}>{s.missingCourses}</td>
                        <td><BandChip band={s.band} /></td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Performance details">
                            <IconButton size="small" aria-label={`Details for ${s.name}`} onClick={() => setStudentOpen(s)}><VisibilityOutlinedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Report card">
                            <IconButton size="small" aria-label={`Report card for ${s.name}`} disabled={viewerLoading} onClick={() => void openReport(s.studentId)}><PrintOutlinedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                    {!pageRows.length ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: MUTED, padding: 24 }}>No students match these filters.</td></tr>
                    ) : null}
                  </tbody>
                </Box>
              </Box>

              <TablePagination
                component="div"
                count={tableRows.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Section>
          </>
        ) : null}
          </>
        )}
      </Box>

      <CourseDrawer
        course={courseOpen}
        settings={data?.settings ?? { bands, atRiskBelow: threshold, trendDelta: 5 }}
        comparisonLabel={comparisonLabel}
        onClose={() => setCourseOpen(null)}
        onOpenStudent={openStudentFromCourse}
      />
      <StudentDrawer
        student={studentOpen}
        courses={data?.courses ?? []}
        settings={data?.settings ?? { bands, atRiskBelow: threshold, trendDelta: 5 }}
        publication={studentOpen ? publicationFor(studentOpen.studentId) : null}
        comparisonLabel={comparisonLabel}
        onClose={() => setStudentOpen(null)}
        onViewReport={(id) => void openReport(id)}
      />
      <BandSettingsDialog
        open={bandsOpen}
        settings={bandSettings ?? DEFAULT_BAND_SETTINGS}
        canEdit
        onClose={() => setBandsOpen(false)}
        onSaved={(saved) => {
          setBandSettings(saved);
          void loadAnalysis();
        }}
      />
      <ReportCardViewerModal
        open={Boolean(viewerReport)}
        report={viewerReport}
        documentRef={docRef}
        title={viewerReport ? `${viewerReport.student?.firstName ?? ''} ${viewerReport.student?.lastName ?? ''}`.trim() : undefined}
        onClose={() => setViewerReport(null)}
        onBack={() => setViewerReport(null)}
      />
    </Box>
  );
}
