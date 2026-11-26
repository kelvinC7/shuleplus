import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import * as XLSX from 'xlsx';
import { useOrgAcademicPeriod } from '@/contexts/academic-settings-context';
import {
  generateNurseryClassReports,
  generateNurseryReport,
  getNurseryReport,
  listNurseryClasses,
  listNurseryReports,
  publishNurseryReports,
  updateNurseryReportComments,
} from '@/services/api';
import type {
  NurseryClassRow,
  NurseryReport,
  NurseryReportKind,
  NurseryReportsResponse,
  NurseryStudentReportRow,
} from '@/types/nursery';
import NurseryReportViewer from '@/components/nursery/NurseryReportViewer';
import NurseryCommentDialog from '@/components/nursery/NurseryCommentDialog';
import NurseryReportCard from '@/components/nursery/NurseryReportCard';
import { downloadReportPdf, printReportPdf, downloadReportPdfBatch, printReportPdfBatch } from '@/lib/downloadReportPdf';
import { toast } from '@/lib/toast';

const NAVY = '#000435';
const BORDER = '#e2e8f0';
const MUTED = '#64748b';

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', fontSize: '0.875rem' },
};

const REPORT_KIND_OPTIONS: Array<{ value: NurseryReportKind; label: string; short: string; hint: string }> = [
  {
    value: 'beginning',
    label: 'Beginning Term',
    short: 'Beginning',
    hint: 'Only marks the teacher allocated to Beginning Term in TichaPortal.',
  },
  {
    value: 'midterm',
    label: 'Mid Term',
    short: 'Mid-term',
    hint: 'Only marks allocated to Mid Term or continuous assessment in TichaPortal.',
  },
  {
    value: 'standard',
    label: 'Term 1',
    short: 'Term 1',
    hint: 'All marks for the term: beginning, continuous, mid-term and examination.',
  },
];

function reportKindLabel(kind: NurseryReportKind) {
  return REPORT_KIND_OPTIONS.find((option) => option.value === kind)?.short ?? 'Term 1';
}

function reportKindHint(kind: NurseryReportKind) {
  return REPORT_KIND_OPTIONS.find((option) => option.value === kind)?.hint ?? '';
}

function statusChip(status: string) {
  if (status === 'PUBLISHED') {
    return <Chip size="small" label="Published" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 800 }} />;
  }
  if (status === 'GENERATED') {
    return <Chip size="small" label="Generated" sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }} />;
  }
  return <Chip size="small" label="Pending" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 800 }} />;
}

function fmt(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0$/, '');
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${BORDER}`, boxShadow: 'none', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${tone}18`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.35rem', fontWeight: 900, color: NAVY, lineHeight: 1.2 }}>{value}</Typography>
        {hint ? <Typography sx={{ fontSize: '0.6875rem', color: MUTED }}>{hint}</Typography> : null}
      </Box>
    </Paper>
  );
}

export default function NurseryReportsPage() {
  const { settings, ready, academicYear, term, setAcademicYear, setTerm } = useOrgAcademicPeriod();
  const [classes, setClasses] = useState<NurseryClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [reportKind, setReportKind] = useState<NurseryReportKind>('standard');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<NurseryReportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [viewer, setViewer] = useState<NurseryReport | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [commentTarget, setCommentTarget] = useState<NurseryReport | null>(null);
  const [savingComments, setSavingComments] = useState(false);
  const [capture, setCapture] = useState<{ report: NurseryReport; action: 'pdf' | 'print' } | null>(null);
  const [bulkExport, setBulkExport] = useState<{ reports: NurseryReport[]; action: 'pdf' | 'print' } | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuStudent, setMenuStudent] = useState<NurseryStudentReportRow | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const bulkRefs = useRef<Array<HTMLDivElement | null>>([]);

  const years = settings?.academicYears ?? [];
  const terms = settings?.terms ?? [];

  useEffect(() => {
    if (!academicYear) return;
    let active = true;
    setClassesLoading(true);
    void listNurseryClasses(academicYear)
      .then((rows) => {
        if (!active) return;
        setClasses(rows);
      })
      .catch((err) => {
        if (!active) return;
        setClasses([]);
        setError(err instanceof Error ? err.message : 'Could not load classes');
      })
      .finally(() => {
        if (active) setClassesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [academicYear]);

  useEffect(() => {
    if (!classes.length) {
      setClassId('');
      return;
    }
    if (classes.some((row) => row.classId === classId)) return;
    const configured = classes.find((row) => row.configured && row.enabled);
    setClassId(configured?.classId ?? classes[0].classId);
  }, [classes, classId]);

  const load = useCallback(async () => {
    if (!classId || !academicYear || !term) return;
    setLoading(true);
    setError('');
    try {
      const result = await listNurseryReports({ classId, academicYear, term, reportKind });
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Could not load nursery reports');
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear, term, reportKind]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  useEffect(() => {
    if (!capture) return;
    let cancelled = false;
    const run = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const element = captureRef.current;
      if (cancelled || !element) return;
      try {
        const name = capture.report.studentName?.replace(/\s+/g, '_') || 'student';
        const suffix = `${capture.report.term}-${reportKindLabel(capture.report.reportKind ?? 'standard')}`.replace(/\s+/g, '_');
        if (capture.action === 'pdf') {
          await downloadReportPdf(element, `nursery-report-${name}-${suffix}.pdf`);
        } else {
          await printReportPdf(element);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not export the report');
      } finally {
        if (!cancelled) setCapture(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [capture]);

  useEffect(() => {
    if (!bulkExport) return;
    let cancelled = false;
    const run = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;
      const elements = bulkRefs.current.filter((el): el is HTMLDivElement => Boolean(el));
      if (elements.length !== bulkExport.reports.length) {
        toast.error('Could not render every report for export. Try again.');
        setBulkExport(null);
        setBusy(null);
        return;
      }
      const onProgress = (done: number, total: number) => setBulkProgress({ done, total });
      const baseName = `nursery-reports-${(data?.className ?? 'class').replace(/\s+/g, '_')}-${reportKindLabel(reportKind)}-${term}-${academicYear}`;
      try {
        if (bulkExport.action === 'pdf') {
          await downloadReportPdfBatch(elements, `${baseName}.pdf`, onProgress);
          toast.success('All nursery reports exported to one PDF');
        } else {
          await printReportPdfBatch(elements, onProgress);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not export the reports');
      } finally {
        if (!cancelled) {
          setBulkExport(null);
          setBulkProgress(null);
          setBusy(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bulkExport, data?.className, term, academicYear, reportKind]);

  const filteredStudents = useMemo(() => {
    const rows = data?.students ?? [];
    const query = search.trim().toLowerCase();
    const matched = query
      ? rows.filter(
          (row) =>
            row.name.toLowerCase().includes(query) ||
            (row.studentCode ?? '').toLowerCase().includes(query)
        )
      : [...rows];
    // Same order on every stage tab: highest percentage first, then by name.
    return matched.sort((a, b) => {
      const diff = (b.average ?? -1) - (a.average ?? -1);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [data, search]);

  const selectedClass = classes.find((row) => row.classId === classId) ?? null;

  async function fetchReport(row: NurseryStudentReportRow): Promise<NurseryReport | null> {
    if (!row.reportId) return null;
    return getNurseryReport(row.reportId);
  }

  async function handleView(row: NurseryStudentReportRow) {
    if (!row.reportId) {
      await handleGenerate(row, true);
      return;
    }
    setViewerLoading(true);
    setBusy(`view:${row.studentId}`);
    try {
      const report = await fetchReport(row);
      if (report) setViewer(report);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the report');
    } finally {
      setViewerLoading(false);
      setBusy(null);
    }
  }

  async function handleGenerate(row: NurseryStudentReportRow, openAfter = false) {
    if (!classId || !academicYear || !term) return;
    if (row.status === 'PUBLISHED' && !window.confirm(`Regenerating ${row.name}'s published report will move it to draft and require republishing. Continue?`)) return;
    setBusy(`generate:${row.studentId}`);
    try {
      const result = await generateNurseryReport({
        studentId: row.studentId,
        classId,
        academicYear,
        term,
        reportKind,
      });
      toast.success(row.status === 'PUBLISHED'
        ? `Report regenerated for ${row.name}. It is now a draft and must be republished.`
        : `Report generated for ${row.name}`);
      await load();
      if (openAfter && result?.report) setViewer(result.report);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate the report');
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateAll() {
    if (!classId || !academicYear || !term) return;
    const publishedCount = (data?.students ?? []).filter((row) => row.status === 'PUBLISHED').length;
    const publicationNotice = publishedCount
      ? ` This will move ${publishedCount} published report${publishedCount === 1 ? '' : 's'} to draft and require republishing.`
      : '';
    if (!window.confirm(`Generate ${reportKindLabel(reportKind).toLowerCase()} nursery reports for all students in ${data?.className ?? 'this class'}?${publicationNotice}`)) return;
    setBusy('generate-all');
    try {
      const result = await generateNurseryClassReports({ classId, academicYear, term, reportKind });
      if (result.errors.length) {
        toast.error(`${result.generated} generated, ${result.errors.length} failed. ${result.errors[0]}`);
      } else if (publishedCount) {
        toast.success(`${result.generated} reports generated. Published reports are now drafts and must be republished.`);
      } else {
        toast.success(`${result.generated} report${result.generated === 1 ? '' : 's'} generated`);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate class reports');
    } finally {
      setBusy(null);
    }
  }

  async function handlePublish(row: NurseryStudentReportRow) {
    if (!row.reportId) {
      toast.error('Generate the report before publishing');
      return;
    }
    setBusy(`publish:${row.studentId}`);
    try {
      await publishNurseryReports({ ids: [row.reportId] });
      toast.success(`Report published for ${row.name}`);
      await load();
      if (viewer?.id === row.reportId) {
        const refreshed = await getNurseryReport(row.reportId);
        setViewer(refreshed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish the report');
    } finally {
      setBusy(null);
    }
  }

  async function handlePublishAll() {
    const ids = (data?.students ?? []).filter((row) => row.reportId && row.status === 'GENERATED').map((row) => row.reportId!) as string[];
    if (!ids.length) {
      toast.error('Generate at least one report before publishing');
      return;
    }
    if (!window.confirm(`Publish ${ids.length} generated report${ids.length === 1 ? '' : 's'}?`)) return;
    setBusy('publish-all');
    try {
      const result = await publishNurseryReports({ ids });
      toast.success(`${result.published} report${result.published === 1 ? '' : 's'} published`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish reports');
    } finally {
      setBusy(null);
    }
  }

  async function handleExport(row: NurseryStudentReportRow, action: 'pdf' | 'print') {
    setBusy(`${action}:${row.studentId}`);
    try {
      const report = await fetchReport(row);
      if (!report) {
        toast.error('Generate the report first');
        return;
      }
      setCapture({ report, action });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load the report');
    } finally {
      setBusy(null);
    }
  }

  async function handleBulkExport(action: 'pdf' | 'print') {
    const rows = (data?.students ?? []).filter((row) => Boolean(row.reportId));
    if (!rows.length) {
      toast.error('Generate at least one report before exporting');
      return;
    }
    const label = action === 'pdf' ? 'one PDF' : 'one print job';
    if (!window.confirm(`Export ${rows.length} report${rows.length === 1 ? '' : 's'} as ${label}?`)) return;
    setBusy(`bulk:${action}`);
    try {
      const reports: NurseryReport[] = [];
      for (const row of rows) {
        reports.push(await getNurseryReport(row.reportId!));
      }
      bulkRefs.current = [];
      setBulkProgress({ done: 0, total: reports.length });
      setBulkExport({ reports, action });
    } catch (err) {
      setBusy(null);
      setBulkProgress(null);
      toast.error(err instanceof Error ? err.message : 'Could not load the reports');
    }
  }

  async function handleEditComments(row: NurseryStudentReportRow) {
    setBusy(`comments:${row.studentId}`);
    try {
      const report = await fetchReport(row);
      if (!report) {
        toast.error('Generate the report before adding comments');
        return;
      }
      setCommentTarget(report);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load comments');
    } finally {
      setBusy(null);
    }
  }

  async function saveComments(input: { teacherComment: string | null; headTeacherComment: string | null }) {
    if (!commentTarget) return;
    const wasPublished = commentTarget.status === 'PUBLISHED';
    if (wasPublished && !window.confirm('Saving comments will move this published report to draft and require republishing. Continue?')) return;
    setSavingComments(true);
    try {
      const updated = await updateNurseryReportComments(commentTarget.id, input);
      setCommentTarget(null);
      if (viewer?.id === updated.id) setViewer(updated);
      toast.success(wasPublished ? 'Comments saved. The report is now a draft and must be republished.' : 'Comments saved');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save comments');
    } finally {
      setSavingComments(false);
    }
  }

  function exportExcel() {
    const rows = (data?.students ?? []).map((row) => ({
      Student: row.name,
      Code: row.studentCode ?? '',
      'Report stage': reportKindLabel(reportKind),
      Status: row.status,
      Percentage: row.average ?? '',
      Generated: row.generatedAt ? new Date(row.generatedAt).toLocaleString() : '',
      Published: row.publishedAt ? new Date(row.publishedAt).toLocaleString() : '',
    }));
    if (!rows.length) {
      toast.error('Nothing to export yet');
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Nursery reports');
    XLSX.writeFile(book, `nursery-reports-${data?.className ?? 'class'}-${reportKindLabel(reportKind)}-${term}-${academicYear}.xlsx`);
  }

  const stats = data?.stats;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100%' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: NAVY }}>Nursery Reports</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: MUTED, mt: 0.5 }}>
            Generate A4 nursery report cards from recorded marks, add comments, print, and publish.
          </Typography>
        </Box>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={exportExcel}
            disabled={!data?.students.length}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Export Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => void handleBulkExport('pdf')}
            disabled={!stats?.generatedTotal || busy === 'bulk:pdf' || busy === 'bulk:print'}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {busy === 'bulk:pdf' && bulkProgress
              ? `Preparing ${bulkProgress.done}/${bulkProgress.total}…`
              : busy === 'bulk:pdf'
                ? 'Preparing…'
                : 'Export all PDFs'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintOutlinedIcon />}
            onClick={() => void handleBulkExport('print')}
            disabled={!stats?.generatedTotal || busy === 'bulk:pdf' || busy === 'bulk:print'}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {busy === 'bulk:print' ? 'Preparing…' : 'Print all'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PublishOutlinedIcon />}
            onClick={() => void handlePublishAll()}
            disabled={!stats?.generated || busy === 'publish-all'}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Publish all
          </Button>
          <Button
            variant="contained"
            startIcon={<AutorenewRoundedIcon />}
            onClick={() => void handleGenerateAll()}
            disabled={!classId || busy === 'generate-all'}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, bgcolor: NAVY }}
          >
            {busy === 'generate-all' ? 'Generating…' : 'Generate all'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Tabs
          value={reportKind}
          onChange={(_event, value: NurseryReportKind) => setReportKind(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            minHeight: 46,
            bgcolor: '#fff',
            borderRadius: 2.5,
            border: `1px solid ${BORDER}`,
            px: 1,
            '& .MuiTabs-indicator': { height: 3, borderRadius: 3, bgcolor: NAVY },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.8125rem',
              minHeight: 46,
              color: MUTED,
            },
            '& .Mui-selected': { color: `${NAVY} !important` },
          }}
        >
          {REPORT_KIND_OPTIONS.map((option) => (
            <Tab key={option.value} value={option.value} label={option.label} />
          ))}
        </Tabs>
        <Typography sx={{ fontSize: '0.75rem', color: MUTED, mt: 0.75, px: 0.5 }}>
          {reportKindHint(reportKind)}
        </Typography>
      </Box>

      <Paper sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${BORDER}`, boxShadow: 'none', mb: 2.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' }, gap: 1.5 }}>
          <TextField
            select
            size="small"
            label="Academic year"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            sx={fieldSx}
            disabled={!ready}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Term"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            sx={fieldSx}
            disabled={!ready}
          >
            {terms.map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            sx={fieldSx}
            disabled={classesLoading || !classes.length}
            helperText={!classesLoading && !classes.length ? 'No classes found for this year.' : undefined}
          >
            {classes.map((row) => (
              <MenuItem key={row.classId} value={row.classId}>
                {row.label}
                {row.configured ? '' : ' · not configured'}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Search student"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or student code"
            sx={fieldSx}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18, color: MUTED }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        {selectedClass && !selectedClass.configured ? (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
            This class is not configured for nursery reports yet. You can still generate reports, but configure it in{' '}
            <strong>Nursery Settings → Class Configuration</strong> to control subjects and the template.
          </Alert>
        ) : null}
      </Paper>

      {stats ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', lg: 'repeat(3, minmax(0,1fr))' }, gap: 1.5, mb: 2.5 }}>
          <KpiCard label="Total students" value={String(stats.totalStudents)} hint={data?.className} icon={<GroupsOutlinedIcon fontSize="small" />} tone="#2563EB" />
          <KpiCard label="Generated" value={String(stats.generatedTotal)} hint={`${stats.published} published`} icon={<CheckCircleOutlineRoundedIcon fontSize="small" />} tone="#16A34A" />
          <KpiCard label="Pending" value={String(stats.pending)} hint="No report yet" icon={<HourglassEmptyRoundedIcon fontSize="small" />} tone="#D97706" />
        </Box>
      ) : null}

      {loading ? <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} /> : null}
      {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert> : null}

      <Paper sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, boxShadow: 'none', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 430px)', minHeight: 220 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {['#', 'Student', 'Status', 'Percentage', ''].map((heading) => (
                  <TableCell
                    key={heading || 'actions'}
                    sx={{
                      bgcolor: '#f8fafc',
                      color: '#475569',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      py: 1.1,
                      borderBottom: `1px solid ${BORDER}`,
                      textAlign: heading === '' ? 'right' : 'left',
                      width: heading === '#' ? 56 : heading === '' ? 180 : 'auto',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && !filteredStudents.length ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: MUTED }}>
                    {data
                      ? search
                        ? 'No student matches this search.'
                        : 'No students found in this class for the selected year.'
                      : 'Choose a class, year and term to load nursery reports.'}
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredStudents.map((row, index) => {
                const rowBusy = busy?.endsWith(`:${row.studentId}`);
                return (
                  <TableRow
                    key={row.studentId}
                    hover
                    sx={{
                      '& td': { py: 1.15, borderBottom: `1px solid #eef2f6`, verticalAlign: 'middle' },
                      '&:hover': { bgcolor: '#fbfdff' },
                      '&:last-of-type td': { borderBottom: 'none' },
                    }}
                  >
                    <TableCell>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          bgcolor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {index + 1}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar src={row.photoUrl ?? undefined} sx={{ width: 36, height: 36, bgcolor: '#e2e8f0', color: NAVY, fontSize: '0.8125rem', fontWeight: 800 }}>
                          {initials(row.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: NAVY }} noWrap>{row.name}</Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: MUTED }}>{row.studentCode || 'No code'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{statusChip(row.status)}</TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 120, maxWidth: 180 }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: row.average == null ? MUTED : NAVY }}>
                          {row.average == null ? '—' : `${fmt(row.average, 2)}%`}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(100, row.average ?? 0))}
                          sx={{
                            mt: 0.5,
                            height: 5,
                            borderRadius: 3,
                            bgcolor: '#eef2f6',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: row.average == null ? '#cbd5e1' : NAVY,
                            },
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                        <Tooltip title={row.reportId ? 'View report' : 'Generate report'}>
                          <span>
                            <IconButton size="small" disabled={Boolean(rowBusy)} onClick={() => void handleView(row)}>
                              {rowBusy && busy?.startsWith('view') ? <CircularProgress size={16} /> : <VisibilityOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={row.reportId ? 'Regenerate' : 'Generate'}>
                          <span>
                            <IconButton size="small" disabled={Boolean(rowBusy)} onClick={() => void handleGenerate(row)}>
                              {rowBusy && busy?.startsWith('generate') ? <CircularProgress size={16} /> : <AutorenewRoundedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Edit comments">
                          <span>
                            <IconButton size="small" disabled={Boolean(rowBusy)} onClick={() => void handleEditComments(row)}>
                              <EditNoteOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Publish">
                          <span>
                            <IconButton
                              size="small"
                              disabled={Boolean(rowBusy) || !row.reportId || row.status === 'PUBLISHED'}
                              onClick={() => void handlePublish(row)}
                            >
                              <PublishOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            setMenuAnchor(event.currentTarget);
                            setMenuStudent(row);
                          }}
                        >
                          <MoreVertRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {data ? (
          <Box sx={{ px: 2, py: 1.25, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', color: MUTED }}>
              Showing {filteredStudents.length} of {data.students.length} students
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: MUTED }}>
              {data.className} · {reportKindLabel(data.reportKind ?? reportKind)} · {data.term} · {data.academicYear}
            </Typography>
          </Box>
        ) : null}
      </Paper>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          disabled={!menuStudent?.reportId}
          onClick={() => {
            const row = menuStudent;
            setMenuAnchor(null);
            if (row) void handleExport(row, 'pdf');
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 18, mr: 1 }} /> Download PDF
        </MenuItem>
        <MenuItem
          disabled={!menuStudent?.reportId}
          onClick={() => {
            const row = menuStudent;
            setMenuAnchor(null);
            if (row) void handleExport(row, 'print');
          }}
        >
          <PrintOutlinedIcon sx={{ fontSize: 18, mr: 1 }} /> Print
        </MenuItem>
        <MenuItem
          onClick={() => {
            const row = menuStudent;
            setMenuAnchor(null);
            if (row) void handleEditComments(row);
          }}
        >
          <EditNoteOutlinedIcon sx={{ fontSize: 18, mr: 1 }} /> Edit comments
        </MenuItem>
      </Menu>

      <NurseryReportViewer
        open={Boolean(viewer)}
        report={viewer}
        onClose={() => setViewer(null)}
        publishing={Boolean(viewer && busy === `publish:${viewer.studentId}`)}
        onPublish={() => {
          if (!viewer) return;
          const row = data?.students.find((student) => student.studentId === viewer.studentId);
          if (row) void handlePublish(row);
        }}
        onEditComments={() => {
          if (viewer) setCommentTarget(viewer);
        }}
      />

      <NurseryCommentDialog
        open={Boolean(commentTarget)}
        report={commentTarget}
        saving={savingComments}
        onClose={() => setCommentTarget(null)}
        onSave={saveComments}
      />

      {viewerLoading ? (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(15,23,42,0.35)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : null}

      {capture ? (
        <Box aria-hidden sx={{ position: 'fixed', left: -10000, top: 0, width: 794, bgcolor: '#fff' }}>
          <NurseryReportCard report={capture.report.snapshot} documentRef={captureRef} />
        </Box>
      ) : null}

      {bulkExport ? (
        <Box aria-hidden sx={{ position: 'fixed', left: -10000, top: 0, width: 794, bgcolor: '#fff' }}>
          {bulkExport.reports.map((report, index) => (
            <NurseryReportCard
              key={report.id}
              report={report.snapshot}
              documentRef={(element) => {
                bulkRefs.current[index] = element;
              }}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
