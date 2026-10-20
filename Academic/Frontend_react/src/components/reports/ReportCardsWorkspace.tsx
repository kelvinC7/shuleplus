import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PublishIcon from '@mui/icons-material/Publish';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableViewIcon from '@mui/icons-material/TableView';
import {
  getClassReportSummaries,
  getReportCardV2,
  listReportCardPublications,
  publishReportCard,
  publishReportCardsForClass,
  smListClasses,
  smListStudents,
} from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { toast } from '@/lib/toast';
import { downloadReportPdf, printReportPdf } from '@/lib/downloadReportPdf';
import type { ReportCardDataV2 } from '@/types';
import ReportCardViewerModal from '@/components/ReportCardViewerModal';
import {
  REPORT_TYPE_OPTIONS,
  STATUS_META,
  classDisplayName,
  exportTableCsv,
  mapPool,
  resolveIncludeTerms,
  scopeLabel,
  studentCodeLabel,
  studentDisplayName,
  summaryFromReport,
  type ReportRowStatus,
  type ReportScopeMode,
  type ReportStudentSummary,
  type ReportTypeId,
} from '@/components/reports/report-cards-utils';

const NAVY = '#000435';
const AMBER = '#FCB038';

type SmStudent = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  studentCode?: string | null;
  studentUid?: string | null;
  admissionNumber?: string | null;
  classId?: string;
};

type SmClass = { id: string; name: string; stream?: string | null };

type PubRow = {
  studentId: string;
  publishedAt: string | Date;
};

function fmtShortDate(iso: string | Date | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatusChip({ status }: { status: ReportRowStatus }) {
  const m = STATUS_META[status];
  return (
    <Chip
      size="small"
      label={m.label}
      sx={{
        height: 24,
        fontWeight: 700,
        fontSize: '0.6875rem',
        bgcolor: m.bg,
        color: m.color,
        border: 'none',
        '& .MuiChip-label': { px: 1 },
      }}
      icon={
        <Box
          component="span"
          sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: m.dot, ml: '6px !important' }}
        />
      }
    />
  );
}

export default function ReportCardsWorkspace() {
  const { settings, ready: settingsReady } = useAcademicSettings();
  const docRef = useRef<HTMLDivElement>(null);

  const [classes, setClasses] = useState<SmClass[]>([]);
  const [classNameKey, setClassNameKey] = useState('');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [students, setStudents] = useState<SmStudent[]>([]);
  const [studentId, setStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [reportScope, setReportScope] = useState<ReportScopeMode>('term');
  const [reportType, setReportType] = useState<ReportTypeId>('standard');
  const [periodSeeded, setPeriodSeeded] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [pubFilter, setPubFilter] = useState<string>('all');

  const [publications, setPublications] = useState<PubRow[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ReportStudentSummary>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);

  const [report, setReport] = useState<ReportCardDataV2 | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const [panelMoreAnchor, setPanelMoreAnchor] = useState<null | HTMLElement>(null);

  const classNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.name));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [classes]);

  const streamsForClass = useMemo(() => {
    if (!classNameKey) return [];
    const streams = classes
      .filter((c) => c.name === classNameKey && c.stream)
      .map((c) => c.stream as string);
    return [...new Set(streams)].sort();
  }, [classes, classNameKey]);

  const activeClassIds = useMemo(() => {
    if (!classNameKey) return [];
    const group = classes.filter((c) => c.name === classNameKey);
    if (streamFilter === 'all') return group.map((c) => c.id);
    return group.filter((c) => (c.stream || '') === streamFilter).map((c) => c.id);
  }, [classes, classNameKey, streamFilter]);

  const primaryClassId = activeClassIds[0] ?? '';

  const classIdByStudent = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      if (s.classId) map.set(s.id, s.classId);
    }
    return map;
  }, [students]);

  const publishedSet = useMemo(() => new Set(publications.map((p) => p.studentId)), [publications]);

  const pubDateByStudent = useMemo(() => {
    const m = new Map<string, string | Date>();
    publications.forEach((p) => m.set(p.studentId, p.publishedAt));
    return m;
  }, [publications]);

  useEffect(() => {
    if (!settingsReady || !settings || periodSeeded) return;
    setAcademicYear(settings.currentAcademicYear || settings.academicYears?.[0] || '');
    setTerm(settings.currentTerm || settings.terms?.[0] || '');
    setPeriodSeeded(true);
  }, [settingsReady, settings, periodSeeded]);

  useEffect(() => {
    smListClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classNameKey || !activeClassIds.length) {
      setStudents([]);
      setStudentId('');
      return;
    }
    setLoadingStudents(true);
    Promise.all(
      activeClassIds.map((classId) =>
        smListStudents({ classId, academicYear: academicYear || undefined, status: 'ACTIVE' }).then(
          (list) => ({ classId, list: list as SmStudent[] })
        )
      )
    )
      .then((lists) => {
        const merged: SmStudent[] = [];
        const seen = new Set<string>();
        lists.forEach(({ classId, list }) => {
          list.forEach((s) => {
            if (seen.has(s.id)) return;
            seen.add(s.id);
            merged.push({ ...s, classId });
          });
        });
        merged.sort((a, b) => studentDisplayName(a).localeCompare(studentDisplayName(b)));
        setStudents(merged);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [classNameKey, activeClassIds.join(','), academicYear]);

  const loadPublications = useCallback(async () => {
    if (!academicYear || !term) return;
    if (!students.length) {
      setPublications([]);
      return;
    }
    try {
      const data = await listReportCardPublications({ academicYear, term });
      const allowed = new Set(students.map((s) => s.id));
      setPublications(
        (data as Array<{ studentId: string; publishedAt: string }>)
          .filter((r) => allowed.has(r.studentId))
          .map((r) => ({
            studentId: r.studentId,
            publishedAt: r.publishedAt,
          }))
      );
    } catch {
      setPublications([]);
    }
  }, [academicYear, term, students]);

  useEffect(() => {
    void loadPublications();
  }, [loadPublications]);

  const loadClassSummaries = useCallback(async () => {
    if (!students.length || !academicYear || !term || !primaryClassId) {
      setSummaries({});
      return;
    }
    const includeTerms = resolveIncludeTerms(reportScope, settings?.terms ?? [], term);
    setLoadingSummaries(true);
    setSummaryProgress(0);
    const total = students.length;
    let done = 0;
    try {
      const useBulkSummaries = !includeTerms || includeTerms.length <= 1;
      const next: Record<string, ReportStudentSummary> = {};

      if (useBulkSummaries && primaryClassId) {
        setSummaryProgress(15);
        const bulk = await getClassReportSummaries(primaryClassId, academicYear, term);
        for (const row of bulk.summaries) {
          next[row.studentId] = {
            studentId: row.studentId,
            average: row.average,
            position: row.position,
            classSize: row.classSize,
            result: row.result,
            generatedAt: row.generatedAt ?? bulk.generatedAt,
            hasMarks: row.hasMarks,
          };
        }
        setSummaryProgress(100);
      } else {
        const pairs = await mapPool(students, 5, async (s) => {
          const cid = classIdByStudent.get(s.id) || primaryClassId;
          try {
            const data = await getReportCardV2(s.id, cid, academicYear, term, includeTerms);
            done += 1;
            setSummaryProgress(Math.round((done / total) * 100));
            return { id: s.id, summary: summaryFromReport(data) };
          } catch {
            done += 1;
            setSummaryProgress(Math.round((done / total) * 100));
            return { id: s.id, summary: null };
          }
        });
        pairs.forEach(({ id, summary }) => {
          if (summary) next[id] = summary;
        });
      }

      setSummaries(next);
    } finally {
      setLoadingSummaries(false);
    }
  }, [students, academicYear, term, primaryClassId, reportScope, settings?.terms, classIdByStudent]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (classNameKey && term && academicYear) void loadClassSummaries();
    }, 400);
    return () => clearTimeout(t);
  }, [classNameKey, term, academicYear, reportScope, students.length, loadClassSummaries]);

  function rowStatus(id: string): ReportRowStatus {
    if (publishedSet.has(id)) return 'published';
    const sum = summaries[id];
    if (!sum) return 'not_generated';
    if (sum.hasMarks) return 'generated';
    return 'not_generated';
  }

  const overview = useMemo(() => {
    const total = students.length;
    let published = 0;
    let generated = 0;
    let notGenerated = 0;
    students.forEach((s) => {
      const st = rowStatus(s.id);
      if (st === 'published') published += 1;
      else if (st === 'generated') generated += 1;
      else notGenerated += 1;
    });
    const withReport = published + generated;
    return { total, published, generated, draft: 0, notGenerated, withReport };
  }, [students, summaries, publishedSet]);

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .map((s, index) => {
        const sum = summaries[s.id];
        const st = rowStatus(s.id);
        const cid = classIdByStudent.get(s.id) || primaryClassId;
        const cls = classes.find((c) => c.id === cid);
        return {
          index: index + 1,
          student: s,
          classLabel: cls ? classDisplayName(cls) : classNameKey,
          average: sum?.average ?? null,
          position: sum?.position,
          classSize: sum?.classSize,
          result: sum?.result ?? '—',
          status: st,
          generated: pubDateByStudent.get(s.id) || sum?.generatedAt,
          classId: cid,
        };
      })
      .filter((row) => {
        if (q) {
          const name = studentDisplayName(row.student).toLowerCase();
          const code = studentCodeLabel(row.student).toLowerCase();
          if (!name.includes(q) && !code.includes(q)) return false;
        }
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        if (resultFilter !== 'all' && row.result !== resultFilter) return false;
        if (pubFilter === 'published' && row.status !== 'published') return false;
        if (pubFilter === 'unpublished' && row.status === 'published') return false;
        return true;
      });
  }, [
    students,
    summaries,
    search,
    statusFilter,
    resultFilter,
    pubFilter,
    classes,
    classIdByStudent,
    primaryClassId,
    classNameKey,
    publishedSet,
  ]);

  async function openReportForStudent(id: string, cid: string) {
    if (!academicYear || !term) return;
    if (reportType !== 'standard') {
      toast.info('This report type uses the standard layout for now.');
    }
    setLoadingReport(true);
    setStudentId(id);
    try {
      const includeTerms = resolveIncludeTerms(reportScope, settings?.terms ?? [], term);
      const data = await getReportCardV2(id, cid, academicYear, term, includeTerms);
      setReport(data);
      setSummaries((prev) => ({ ...prev, [id]: summaryFromReport(data) }));
      setViewerOpen(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not load report';
      toast.error(msg);
    } finally {
      setLoadingReport(false);
    }
  }

  const handleViewReport = () => {
    if (!studentId || !primaryClassId) {
      toast.error('Select class and student');
      return;
    }
    const cid = classIdByStudent.get(studentId) || primaryClassId;
    void openReportForStudent(studentId, cid);
  };

  const handlePublishCurrent = async () => {
    if (!report?.student?.id || !report.class?.id || !academicYear || !term) return;
    setPublishing(true);
    try {
      await publishReportCard({
        studentId: report.student.id,
        classId: report.class.id,
        academicYear,
        term,
      });
      toast.success('Report published');
      await loadPublications();
    } catch {
      toast.error('Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishClass = async () => {
    if (!primaryClassId || !academicYear || !term) return;
    setPublishing(true);
    try {
      const result = await publishReportCardsForClass({ classId: primaryClassId, academicYear, term });
      toast.success(`Published ${result.published} of ${result.total}`);
      await loadPublications();
    } catch {
      toast.error('Bulk publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!docRef.current || !report) return;
    const name = studentDisplayName(report.student || {}).replace(/\s+/g, '_');
    try {
      await downloadReportPdf(docRef.current, `report-${name}-${report.academicYear}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF failed');
    }
  };

  const handlePrint = async () => {
    if (!docRef.current) return;
    try {
      await printReportPdf(docRef.current);
    } catch {
      toast.error('Print failed');
    }
  };

  const handleExportExcel = () => {
    exportTableCsv(
      tableRows.map((r) => ({
        Student: studentDisplayName(r.student),
        Code: studentCodeLabel(r.student),
        Class: r.classLabel,
        Average: r.average != null ? `${r.average.toFixed(1)}%` : '',
        Position: r.position && r.classSize ? `${r.position}/${r.classSize}` : '',
        Result: r.result,
        Status: STATUS_META[r.status].label,
        Generated: fmtShortDate(r.generated as string),
      })),
      `reports-${classNameKey}-${term}.csv`
    );
    toast.success('Exported spreadsheet');
  };

  const viewerTitle = report
    ? `${scopeLabel(reportScope, term, settings?.terms ?? [])} · ${studentDisplayName(report.student || {})}`
    : 'Report card';

  const progressPct = overview.total ? Math.round((overview.withReport / overview.total) * 100) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          bgcolor: '#fff',
        }}
      >
        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: NAVY }}>Generate report card</Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5, mb: 2 }}>
          Choose class, student, and period. Scope controls single term, combined terms, or the full year.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>Class</InputLabel>
            <Select
              label="Class"
              value={classNameKey}
              onChange={(e) => {
                setClassNameKey(e.target.value);
                setStreamFilter('all');
                setStudentId('');
              }}
            >
              {classNames.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={!classNameKey || streamsForClass.length === 0}>
            <InputLabel>Stream</InputLabel>
            <Select label="Stream" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
              <MenuItem value="all">All streams</MenuItem>
              {streamsForClass.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={!classNameKey || loadingStudents}>
            <InputLabel>Student</InputLabel>
            <Select label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {studentDisplayName(s)} ({studentCodeLabel(s)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={!periodSeeded}>
            <InputLabel>Academic year</InputLabel>
            <Select label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {(settings?.academicYears ?? []).map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={!periodSeeded}>
            <InputLabel>Term</InputLabel>
            <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
              {(settings?.terms ?? []).map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={!term}>
            <InputLabel>Report scope</InputLabel>
            <Select
              label="Report scope"
              value={reportScope}
              onChange={(e) => setReportScope(e.target.value as ReportScopeMode)}
            >
              <MenuItem value="term">This term only</MenuItem>
              <MenuItem value="combined">
                Combined terms through {term || 'selected term'}
              </MenuItem>
              <MenuItem value="year">Full academic year</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth sx={{ gridColumn: { lg: 'span 2' } }}>
            <InputLabel>Report type</InputLabel>
            <Select
              label="Report type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportTypeId)}
            >
              {REPORT_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2.5, alignItems: 'center' }}>
          <Button
            variant="contained"
            disabled={loadingReport || !studentId}
            onClick={handleViewReport}
            sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#e5a032' } }}
          >
            {loadingReport ? 'Loading…' : 'View report'}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!report} onClick={() => void handleDownloadPdf()} sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}>
            Download PDF
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!report} onClick={() => void handlePrint()} sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}>
            Print
          </Button>
          <Button variant="outlined" startIcon={<PublishIcon />} disabled={!report || publishing} onClick={() => void handlePublishCurrent()} sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}>
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
          <IconButton onClick={(e) => setPanelMoreAnchor(e.currentTarget)} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Menu anchorEl={panelMoreAnchor} open={Boolean(panelMoreAnchor)} onClose={() => setPanelMoreAnchor(null)}>
          <MenuItem onClick={() => { setPanelMoreAnchor(null); toast.info('Parent app delivery is configured in Parent MIS.'); }}>Send to parent</MenuItem>
          <MenuItem onClick={() => { setPanelMoreAnchor(null); toast.info('Email delivery coming soon.'); }}>Send by email</MenuItem>
          <MenuItem onClick={() => { setPanelMoreAnchor(null); toast.info('SMS delivery coming soon.'); }}>Send by SMS</MenuItem>
          <Divider />
          <MenuItem onClick={() => { setPanelMoreAnchor(null); void handlePublishClass(); }}>Publish entire class</MenuItem>
          <MenuItem onClick={() => { setPanelMoreAnchor(null); void loadClassSummaries(); }}>Regenerate class summaries</MenuItem>
          <MenuItem onClick={() => { setPanelMoreAnchor(null); toast.info('Report history is stored with each publication.'); }}>View history</MenuItem>
        </Menu>
      </Paper>

      {classNameKey && term ? (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.0625rem' }}>
                {classNameKey}
                {streamFilter !== 'all' ? ` ${streamFilter}` : ''} — {term}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>{overview.total} students</Typography>
            </Box>
            {loadingSummaries ? (
              <Box sx={{ minWidth: 200 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 0.5 }}>Loading report data… {summaryProgress}%</Typography>
                <LinearProgress variant="determinate" value={summaryProgress} sx={{ borderRadius: 1, height: 6 }} />
              </Box>
            ) : (
              <Button size="small" startIcon={<RefreshIcon />} onClick={() => void loadClassSummaries()} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Refresh stats
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {[
              { label: 'Reports generated', value: overview.withReport },
              { label: 'Published', value: overview.published },
              { label: 'Generated (not published)', value: overview.generated },
              { label: 'Not generated', value: overview.notGenerated },
            ].map((item) => (
              <Box key={item.label} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</Typography>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: NAVY }}>{item.value}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 0.75 }}>
              Progress: {overview.withReport} of {overview.total} reports ready
            </Typography>
            <LinearProgress variant="determinate" value={progressPct} sx={{ borderRadius: 1, height: 8, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: AMBER } }} />
          </Box>
        </Paper>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1.5 }}>Reports</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search student"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: { xs: '100%', sm: 220 } }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Result</InputLabel>
              <Select label="Result" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="PASS">Pass</MenuItem>
                <MenuItem value="FAIL">Fail</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Publication</InputLabel>
              <Select label="Publication" value={pubFilter} onChange={(e) => setPubFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="unpublished">Unpublished</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Button size="small" startIcon={<TableViewIcon />} onClick={handleExportExcel} disabled={!tableRows.length} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Export Excel
            </Button>
            <Button size="small" startIcon={<DownloadIcon />} disabled={!report} onClick={() => void handleDownloadPdf()} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Export PDF
            </Button>
          </Box>
        </Box>

        {!classNameKey ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>Select a class to see students and report status.</Typography>
          </Box>
        ) : loadingStudents ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Student', 'Student code', 'Class', 'Average', 'Position', 'Result', 'Status', 'Generated', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, color: NAVY, bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={row.student.id} hover>
                    <TableCell>{row.index}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: NAVY, minWidth: 160 }}>{studentDisplayName(row.student)}</TableCell>
                    <TableCell>{studentCodeLabel(row.student)}</TableCell>
                    <TableCell>{row.classLabel}</TableCell>
                    <TableCell>{row.average != null ? `${row.average.toFixed(1)}%` : '—'}</TableCell>
                    <TableCell>
                      {row.position && row.classSize ? `${row.position}/${row.classSize}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.result}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.6875rem',
                          bgcolor: row.result === 'PASS' ? '#ecfdf5' : row.result === 'FAIL' ? '#fef2f2' : '#f1f5f9',
                          color: row.result === 'PASS' ? '#166534' : row.result === 'FAIL' ? '#b91c1c' : '#64748b',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={row.status} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtShortDate(row.generated as string)}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => void openReportForStudent(row.student.id, row.classId)}
                        sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0 }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!tableRows.length ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>
                      No students match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ReportCardViewerModal
        open={viewerOpen}
        report={report}
        documentRef={docRef}
        onClose={() => setViewerOpen(false)}
        title={viewerTitle}
        onBack={() => setViewerOpen(false)}
        onDownload={() => void handleDownloadPdf()}
        onPrint={() => void handlePrint()}
        onPublish={() => void handlePublishCurrent()}
        publishing={publishing}
        isPublished={report?.student?.id ? publishedSet.has(report.student.id) : false}
        onMore={(el) => setMoreAnchor(el)}
      />

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={() => { setMoreAnchor(null); toast.info('Share link uses the QR code on the report.'); }}>Share</MenuItem>
        <MenuItem onClick={() => { setMoreAnchor(null); void handleDownloadPdf(); }}>Download PDF</MenuItem>
        <MenuItem onClick={() => { setMoreAnchor(null); void handlePrint(); }}>Print</MenuItem>
        <MenuItem onClick={() => { setMoreAnchor(null); setViewerOpen(false); handleViewReport(); }}>Preview refresh</MenuItem>
        <MenuItem onClick={() => { setMoreAnchor(null); toast.info('Unpublish is not enabled yet.'); }}>Unpublish</MenuItem>
      </Menu>
    </Box>
  );
}
