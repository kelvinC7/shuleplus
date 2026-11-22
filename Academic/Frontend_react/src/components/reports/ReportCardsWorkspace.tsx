import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
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
  Autocomplete,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PublishIcon from '@mui/icons-material/Publish';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableViewIcon from '@mui/icons-material/TableView';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ReportGenerateWizard from '@/components/reports/ReportGenerateWizard';
import UpdateAssessmentStatusModal from '@/components/reports/UpdateAssessmentStatusModal';
import ModernStudentReportCard from '@/components/ModernStudentReportCard';
import MidTermStudentReportCard from '@/components/reports/MidTermStudentReportCard';
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
import { downloadReportPdf, printReportPdf, downloadReportPdfBatch, printReportPdfBatch } from '@/lib/downloadReportPdf';
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
  formatReportAverage,
  formatReportPosition,
  reportTypeLabel,
  NOT_RECORDED,
  friendlyReportCardError,
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

type BatchItem = { id: string; report: ReportCardDataV2 };

function BatchReportItem({
  item,
  register,
}: {
  item: BatchItem;
  register: (id: string, el: HTMLDivElement | null) => void;
}) {
  return (
    <Box
      ref={(el: HTMLDivElement | null) => register(item.id, el)}
      sx={{ width: '794px', maxWidth: '794px', bgcolor: '#fff' }}
    >
      {item.report.reportKind === 'midterm' || item.report.reportKind === 'beginning' ? (
        <MidTermStudentReportCard report={item.report} />
      ) : (
        <ModernStudentReportCard report={item.report} />
      )}
    </Box>
  );
}

function fmtShortDate(iso: string | Date | null | undefined) {
  if (!iso) return NOT_RECORDED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_RECORDED;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function overviewCount(value: number | null | undefined, classSelected: boolean) {
  if (!classSelected) return NOT_RECORDED;
  return value ?? 0;
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

function stageFilePrefix(kind?: string | null) {
  if (kind === 'beginning') return 'beginning-term-report';
  if (kind === 'midterm') return 'mid-term-report';
  return 'report';
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
  const [managementTab, setManagementTab] = useState<string>('overview');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchBusy, setBatchBusy] = useState<null | 'pdf' | 'print'>(null);
  const [batchProgress, setBatchProgress] = useState('');
  const batchRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const isBeginningMode = managementTab === 'beginning';
  const isMidTermMode = managementTab === 'midterm';
  const isStageReportMode = isMidTermMode || isBeginningMode;
  const reportKindParam = isBeginningMode ? ('beginning' as const) : isMidTermMode ? ('midterm' as const) : undefined;

  const loadClassSummaries = useCallback(async () => {
    if (!students.length || !academicYear || !term || !primaryClassId) {
      setSummaries({});
      return;
    }
    const includeTerms =
      isStageReportMode ? undefined : resolveIncludeTerms(reportScope, settings?.terms ?? [], term);
    setLoadingSummaries(true);
    setSummaryProgress(0);
    const total = students.length;
    let done = 0;
    try {
      const useBulkSummaries = !includeTerms || includeTerms.length <= 1;
      const next: Record<string, ReportStudentSummary> = {};

      if (useBulkSummaries && activeClassIds.length) {
        const classIds = [...new Set(activeClassIds)];
        const bulks = await Promise.all(
          classIds.map((cid) => getClassReportSummaries(cid, academicYear, term, reportKindParam))
        );
        bulks.forEach((bulk) => {
          for (const row of bulk.summaries) {
            next[row.studentId] = {
              studentId: row.studentId,
              average: row.average,
              position: row.position,
              classSize: row.classSize,
              result: row.result === '—' ? 'Pending' : row.result,
              generatedAt: row.generatedAt ?? bulk.generatedAt,
              hasMarks: row.hasMarks,
            };
          }
        });
        setSummaryProgress(100);
      } else {
        const pairs = await mapPool(students, 5, async (s) => {
          const cid = classIdByStudent.get(s.id) || primaryClassId;
          try {
            const data = await getReportCardV2(s.id, cid, academicYear, term, includeTerms, reportKindParam);
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
  }, [students, academicYear, term, primaryClassId, activeClassIds, reportScope, settings?.terms, classIdByStudent, isStageReportMode, reportKindParam]);

  const summaryRequestKey = useMemo(
    () =>
      [
        classNameKey,
        term,
        academicYear,
        reportScope,
        (reportKindParam ?? 'standard'),
        [...activeClassIds].sort().join(','),
        students.length,
      ].join('|'),
    [classNameKey, term, academicYear, reportScope, isStageReportMode, activeClassIds, students.length]
  );

  useEffect(() => {
    if (!classNameKey || !term || !academicYear || !students.length) {
      setSummaries({});
      return;
    }
    const t = window.setTimeout(() => {
      void Promise.all([loadPublications(), loadClassSummaries()]);
    }, 280);
    return () => clearTimeout(t);
  }, [summaryRequestKey, classNameKey, term, academicYear, students.length, loadPublications, loadClassSummaries]);

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
          result: sum?.result ?? 'Pending',
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

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId]
  );

  const visibleStudentIds = useMemo(() => tableRows.map((r) => r.student.id), [tableRows]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedSet.has(id));

  function toggleStudent(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      const all = visibleStudentIds.every((id) => set.has(id));
      visibleStudentIds.forEach((id) => (all ? set.delete(id) : set.add(id)));
      return [...set];
    });
  }

  useEffect(() => {
    setSelectedIds([]);
  }, [classNameKey, streamFilter, academicYear, term]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => students.some((s) => s.id === id)));
  }, [students]);

  async function openReportForStudent(id: string, cid: string) {
    if (!academicYear || !term) return;
    if (reportType !== 'standard') {
      toast.info('This report type uses the standard layout for now.');
    }
    setLoadingReport(true);
    setStudentId(id);
    try {
      const includeTerms = isStageReportMode
        ? undefined
        : resolveIncludeTerms(reportScope, settings?.terms ?? [], term);
      const data = await getReportCardV2(id, cid, academicYear, term, includeTerms, reportKindParam);
      setReport(data);
      setSummaries((prev) => ({ ...prev, [id]: summaryFromReport(data) }));
      setViewerOpen(true);
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not load report';
      const { title, detail } = friendlyReportCardError(raw);
      toast.error(title, detail);
    } finally {
      setLoadingReport(false);
    }
  }

  const handleViewReport = () => {
    if (!studentId || !primaryClassId) {
      toast.error('Select a student', 'Choose class and stream first, then search by name or student code.');
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
        reportKind: (reportKindParam ?? 'standard'),
      });
      toast.success('Report published', 'Parents can open it in the Parent portal when published.');
      await loadPublications();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Publish failed';
      toast.error('Publish failed', msg);
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishClass = async () => {
    if (!primaryClassId || !academicYear || !term) {
      toast.error('Select class and term', 'Choose a class and academic period before publishing.');
      return;
    }
    const label = classNameKey || 'this class';
    if (
      !window.confirm(
        `Publish ${isBeginningMode ? 'beginning-term' : isMidTermMode ? 'mid-term' : 'term'} reports for all students in ${label} (${term}, ${academicYear})? Parents will see them in Parent portal.`
      )
    ) {
      return;
    }
    setPublishing(true);
    try {
      const result = await publishReportCardsForClass({
        classId: primaryClassId,
        academicYear,
        term,
        reportKind: (reportKindParam ?? 'standard'),
      });
      const detail =
        result.errors?.length ? result.errors.slice(0, 2).join(' · ') : undefined;
      toast.success(`Published ${result.published} of ${result.total}`, detail);
      await loadPublications();
      await loadClassSummaries();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Bulk publish failed';
      toast.error('Bulk publish failed', msg);
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!docRef.current || !report) return;
    const name = studentDisplayName(report.student || {}).replace(/\s+/g, '_');
    try {
      await downloadReportPdf(docRef.current, `${stageFilePrefix(report.reportKind)}-${name}-${report.academicYear}.pdf`);
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

  const handleBatchExport = async (kind: 'pdf' | 'print') => {
    if (!academicYear || !term) {
      toast.error('Select academic year and term', 'Choose the report period before exporting.');
      return;
    }
    if (!primaryClassId) {
      toast.error('Select a class', 'Choose a class before exporting reports.');
      return;
    }
    const ids = selectedIds.length ? selectedIds : students.map((s) => s.id);
    if (!ids.length) {
      toast.error('No students found', 'There are no students in this class.');
      return;
    }

    setBatchBusy(kind);
    setBatchProgress(`Loading ${ids.length} report${ids.length === 1 ? '' : 's'}…`);
    batchRefs.current.clear();

    try {
      const includeTerms = isStageReportMode
        ? undefined
        : resolveIncludeTerms(reportScope, settings?.terms ?? [], term);
      let done = 0;
      let failedCount = 0;
      const pairs = await mapPool(ids, 4, async (id) => {
        const cid = classIdByStudent.get(id) || primaryClassId;
        try {
          const data = await getReportCardV2(id, cid, academicYear, term, includeTerms, reportKindParam);
          return { id, report: data } as BatchItem;
        } catch (err) {
          failedCount += 1;
          return null;
        } finally {
          done += 1;
          setBatchProgress(`Loading reports… ${done}/${ids.length}`);
        }
      });
      const items = pairs.filter((p): p is BatchItem => Boolean(p));
      if (!items.length) {
        toast.error('No reports to export', 'The selected students have no report data yet.');
        return;
      }

      setBatchProgress(`Preparing ${items.length} report${items.length === 1 ? '' : 's'}…`);
      flushSync(() => setBatchItems(items));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const elements = items
        .map((item) => batchRefs.current.get(item.id))
        .filter((el): el is HTMLDivElement => Boolean(el));
      if (!elements.length) throw new Error('Report layout is not ready. Please try again.');

      setBatchProgress(kind === 'pdf' ? 'Building PDF…' : 'Preparing print…');
      if (kind === 'pdf') {
        const safeClass = (classNameKey || 'class').replace(/[^\w-]+/g, '-');
        const safeTerm = (term || 'term').replace(/[^\w-]+/g, '-');
        await downloadReportPdfBatch(
          elements,
          `${stageFilePrefix(reportKindParam ?? 'standard')}s-${safeClass}-${safeTerm}.pdf`,
          (completed, total) => setBatchProgress(`Building PDF… ${completed}/${total}`)
        );
        toast.success('PDF downloaded', `${items.length} report${items.length === 1 ? '' : 's'}`);
      } else {
        await printReportPdfBatch(elements, (completed, total) =>
          setBatchProgress(`Preparing print… ${completed}/${total}`)
        );
      }
      if (failedCount) {
        toast.warning(
          'Some reports were skipped',
          `${failedCount} report${failedCount === 1 ? '' : 's'} could not be loaded; ${items.length} exported.`
        );
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Export failed';
      toast.error(kind === 'pdf' ? 'PDF export failed' : 'Print failed', msg);
    } finally {
      setBatchItems([]);
      batchRefs.current.clear();
      setBatchBusy(null);
      setBatchProgress('');
    }
  };

  const viewerTitle = report
    ? `${scopeLabel(reportScope, term, settings?.terms ?? [])} · ${studentDisplayName(report.student || {})}`
    : 'Report card';

  const progressPct = overview.total ? Math.round((overview.withReport / overview.total) * 100) : 0;
  const pendingApproval = overview.generated;
  const completionPct = overview.total ? Math.round((overview.published / overview.total) * 1000) / 10 : 0;
  const periodTabValue =
    managementTab === 'overview' ||
    (managementTab === 'midterm' ||
      managementTab === 'beginning' ||
      managementTab === 'annual' ||
      managementTab === 'comparison' ||
      managementTab === 'approvals' ||
      managementTab.startsWith('period:'))
      ? managementTab
      : 'overview';
  const activeReportPeriodLabel =
    managementTab === 'midterm'
      ? 'Mid-Term'
      : managementTab === 'annual' || reportScope === 'year'
        ? 'Annual'
        : reportTypeLabel(reportScope, term);

  function handleManagementTabChange(_: unknown, value: string) {
    setManagementTab(value);
    if (value === 'annual') {
      setReportScope('year');
    } else if (value.startsWith('period:')) {
      setTerm(value.slice('period:'.length));
      setReportScope('term');
    } else if (value === 'midterm') {
      setReportScope('term');
    } else if (value === 'approvals') {
      setStatusFilter('generated');
      setPubFilter('unpublished');
    } else if (value === 'overview') {
      setStatusFilter('all');
      setPubFilter('all');
    }
  }

  function handleWizardGenerate(config: {
    reportType: ReportTypeId;
    academicYear: string;
    term: string;
    reportScope: ReportScopeMode;
    classNameKey: string;
    streamFilter: string;
    studentCount: number;
  }) {
    setAcademicYear(config.academicYear);
    setTerm(config.term);
    setReportScope(config.reportScope);
    setReportType(config.reportType);
    if (config.classNameKey) setClassNameKey(config.classNameKey);
    if (config.streamFilter && config.streamFilter !== 'all') setStreamFilter(config.streamFilter);
    toast.success(`Report run queued for ${config.studentCount} student(s).`, 'Summaries will refresh. Review missing marks before publishing.');
    window.setTimeout(() => void Promise.all([loadPublications(), loadClassSummaries()]), 300);
  }

  const termPeriodTabs = settings?.terms ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box>
            <Chip
              label={academicYear || 'Academic year'}
              size="small"
              sx={{ fontWeight: 700, bgcolor: `${NAVY}0d`, color: NAVY, mb: 1 }}
            />
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>Report overview · {activeReportPeriodLabel}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowOutlinedIcon />}
              onClick={() => setWizardOpen(true)}
              sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#e5a032' } }}
            >
              Generate reports
            </Button>
            <Button
              variant="outlined"
              onClick={() => setStatusModalOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}
            >
              Update Assessment Status
            </Button>
            <Button
              variant="outlined"
              startIcon={<SettingsOutlinedIcon />}
              onClick={() => toast.info('Template and grading settings are under Academic Settings → Report card.')}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}
            >
              Templates
            </Button>
            <Button
              variant="contained"
              startIcon={<PublishIcon />}
              disabled={!primaryClassId || !academicYear || !term || publishing}
              onClick={() => void handlePublishClass()}
              sx={{
                bgcolor: NAVY,
                color: '#fff',
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': { bgcolor: '#0a1454' },
              }}
            >
              {publishing ? 'Publishing…' : 'Publish to all parents'}
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {[
            { label: 'Total reports', value: overviewCount(overview.total, Boolean(classNameKey)), sub: 'Students in scope' },
            { label: 'Published', value: overviewCount(overview.published, Boolean(classNameKey)), sub: classNameKey ? `${completionPct}% completed` : 'Select a class' },
            { label: 'Pending approval', value: overviewCount(pendingApproval, Boolean(classNameKey)), sub: 'Generated, not published' },
            { label: 'Not generated', value: overviewCount(overview.notGenerated, Boolean(classNameKey)), sub: 'Missing marks or data' },
          ].map((item) => (
            <Box key={item.label} sx={{ p: 1.75, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>{item.value}</Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', mt: 0.25 }}>{item.sub}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff', overflow: 'hidden' }}>
        <Tabs
          value={periodTabValue}
          onChange={handleManagementTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.8125rem', minHeight: 48 },
            '& .Mui-selected': { color: `${NAVY} !important` },
            '& .MuiTabs-indicator': { bgcolor: AMBER, height: 3 },
          }}
        >
          <Tab value="overview" label="Overview" icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="beginning" label="Beginning Term" icon={<AutoGraphOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="midterm" label="Mid-Term" icon={<AutoGraphOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          {termPeriodTabs.map((t) => (
            <Tab key={t} value={`period:${t}`} label={t} iconPosition="start" />
          ))}
          <Tab value="annual" label="Annual" />
          <Tab value="comparison" label="Term comparison" icon={<AutoGraphOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="approvals" label="Approvals" icon={<FactCheckOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>

        {managementTab === 'overview' ? (
          <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {[
              { id: 'midterm', title: 'Stage reports', hint: 'Continuous assessment progress', count: classNameKey ? overview.withReport : null },
              ...termPeriodTabs.map((t) => ({
                id: `period:${t}`,
                title: `${t} reports`,
                hint: t === term ? 'Current period' : 'Switch to load',
                count: classNameKey && t === term ? overview.withReport : null,
              })),
              { id: 'annual', title: 'Annual reports', hint: 'End-of-year performance', count: reportScope === 'year' && classNameKey ? overview.withReport : null },
            ].map((card) => (
              <Box
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => handleManagementTabChange(null, card.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleManagementTabChange(null, card.id)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: AMBER, bgcolor: '#fffdf8' },
                }}
              >
                <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>{card.title}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5, mb: 1.5 }}>{card.hint}</Typography>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: AMBER }}>
                  {card.count != null ? card.count : NOT_RECORDED}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (managementTab === 'midterm' || managementTab === 'beginning') ? (
          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.0625rem' }}>Stage reports</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5, mb: 2 }}>
              Beginning Term: shows only assessments classified as Beginning Term. Mid-Term: shows only assessments classified as Mid-Term (or legacy continuous assessments when unclassified).
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              {[
                { label: 'Total students', value: overviewCount(overview.total, Boolean(classNameKey)) },
                { label: 'Generated', value: overviewCount(overview.withReport, Boolean(classNameKey)) },
                { label: 'Pending', value: overviewCount(overview.generated, Boolean(classNameKey)) },
                { label: 'Incomplete marks', value: overviewCount(overview.notGenerated, Boolean(classNameKey)) },
              ].map((item) => (
                <Box key={item.label} sx={{ p: 1.75, borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: NAVY }}>{item.value}</Typography>
                </Box>
              ))}
            </Box>
            <Button
              variant="contained"
              startIcon={<PlayArrowOutlinedIcon />}
              onClick={() => setWizardOpen(true)}
              sx={{ mt: 2, bgcolor: NAVY, color: '#fff', fontWeight: 800, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
            >
              Generate Stage reports
            </Button>
          </Box>
        ) : managementTab === 'comparison' ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem', maxWidth: 480, mx: 'auto' }}>
              Term comparison uses combined report scope. Select a class, choose a term, set scope to combined terms or open a student report preview.
            </Typography>
            <Button
              sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
              onClick={() => {
                setReportScope('combined');
                toast.info('Report scope set to combined terms for comparison views.');
              }}
            >
              Enable combined scope
            </Button>
          </Box>
        ) : null}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          bgcolor: '#fff',
        }}
      >
        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: NAVY }}>
          {isStageReportMode ? 'Find & preview Stage reports' : 'Find & preview reports'}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5, mb: 2 }}>
          {isStageReportMode
            ? 'Search students, preview stage progress, then publish to parents.'
            : 'Choose class, student, and period. Scope controls single term, combined terms, or the full year.'}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
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

          <Autocomplete
            size="small"
            fullWidth
            disabled={!classNameKey || loadingStudents}
            options={students}
            value={selectedStudent}
            onChange={(_, val) => setStudentId(val?.id ?? '')}
            getOptionLabel={(s) => `${studentDisplayName(s)} · ${studentCodeLabel(s)}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(options, state) => {
              const q = state.inputValue.trim().toLowerCase();
              if (!q) return options;
              return options.filter((s) => {
                const name = studentDisplayName(s).toLowerCase();
                const code = studentCodeLabel(s).toLowerCase();
                return name.includes(q) || code.includes(q);
              });
            }}
            noOptionsText={loadingStudents ? 'Loading students…' : 'No match. Try another name or code.'}
            renderInput={(params) => (
              <TextField {...params} label="Student" placeholder="Search by name or code" />
            )}
            renderOption={(props, s) => (
              <Box component="li" {...props} sx={{ py: 1.25, px: 2, display: 'block' }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
                  {studentDisplayName(s)}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{studentCodeLabel(s)}</Typography>
              </Box>
            )}
            slotProps={{
              paper: { sx: { borderRadius: 2, boxShadow: '0 12px 40px rgba(0,4,53,0.12)' } },
              listbox: { sx: { maxHeight: 280 } },
            }}
            sx={{ gridColumn: { xs: '1 / -1', lg: 'auto' } }}
          />

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

          {!isStageReportMode ? (
            <>
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
            </>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            mt: 2.5,
            alignItems: 'center',
            '& > .MuiButton-root': { flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' }, minWidth: { xs: 0, sm: 'auto' } },
          }}
        >
          <Button
            variant="contained"
            disabled={loadingReport || !studentId}
            onClick={handleViewReport}
            sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#e5a032' } }}
          >
            {loadingReport ? 'Loading…' : isStageReportMode ? 'Preview stage report' : 'View report'}
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
          <IconButton onClick={(e) => setPanelMoreAnchor(e.currentTarget)} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, ml: { sm: 'auto' } }}>
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
                {streamFilter !== 'all' ? ` ${streamFilter}` : ''} · {term}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>{overview.total} students</Typography>
            </Box>
            {loadingSummaries ? (
              <Box sx={{ minWidth: 200 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 0.5 }}>Loading report data… {summaryProgress}%</Typography>
                <LinearProgress variant="determinate" value={summaryProgress} sx={{ borderRadius: 1, height: 6 }} />
              </Box>
            ) : (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => void Promise.all([loadPublications(), loadClassSummaries()])}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontWeight: 800, color: NAVY }}>Student reports</Typography>
              {classNameKey ? (
                <>
                  <Checkbox
                    size="small"
                    checked={allVisibleSelected}
                    indeterminate={!allVisibleSelected && selectedIds.length > 0}
                    onChange={toggleSelectAllVisible}
                    disabled={!tableRows.length}
                    slotProps={{ input: { 'aria-label': 'Select all students in this view' } }}
                  />
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedIds.length ? `${selectedIds.length} selected` : 'Select all'}
                  </Typography>
                </>
              ) : null}
            </Box>
            {classNameKey ? (
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                Showing {tableRows.length} of {students.length} · {activeReportPeriodLabel}
              </Typography>
            ) : null}
          </Box>
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
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 130 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
              <InputLabel>Result</InputLabel>
              <Select label="Result" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="PASS">Pass</MenuItem>
                <MenuItem value="FAIL">Fail</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
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
            <Tooltip title={selectedIds.length ? `Download ${selectedIds.length} selected report(s) as one PDF` : 'Download every student in this class as one PDF'}>
              <span>
                <Button
                  size="small"
                  startIcon={batchBusy === 'pdf' ? <CircularProgress size={16} /> : <DownloadIcon />}
                  disabled={!students.length || Boolean(batchBusy)}
                  onClick={() => void handleBatchExport('pdf')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {selectedIds.length ? `Download selected (${selectedIds.length})` : 'Download class PDF'}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={selectedIds.length ? `Print ${selectedIds.length} selected report(s)` : 'Print every student in this class'}>
              <span>
                <Button
                  size="small"
                  startIcon={batchBusy === 'print' ? <CircularProgress size={16} /> : <PrintIcon />}
                  disabled={!students.length || Boolean(batchBusy)}
                  onClick={() => void handleBatchExport('print')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {selectedIds.length ? `Print selected (${selectedIds.length})` : 'Print class'}
                </Button>
              </span>
            </Tooltip>
            {selectedIds.length ? (
              <Button size="small" onClick={() => setSelectedIds([])} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Clear
              </Button>
            ) : null}
          </Box>
          {batchBusy ? (
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 0.5 }}>{batchProgress}</Typography>
              <LinearProgress sx={{ borderRadius: 1, height: 6, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: AMBER } }} />
            </Box>
          ) : null}
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
          <>
          <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2, pt: 0 }}>
            {tableRows.map((row) => {
              const st = row.status;
              const midLabel =
                isStageReportMode && st === 'not_generated'
                  ? 'Incomplete marks'
                  : isStageReportMode && st === 'generated'
                    ? 'Pending'
                    : isStageReportMode && st === 'published'
                      ? 'Published'
                      : STATUS_META[st].label;
              return (
                <Paper
                  key={row.student.id}
                  elevation={0}
                  sx={{ p: 1.5, mb: 1.25, borderRadius: 2, border: '1px solid #e2e8f0' }}
                >
                  <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mb: 1 }}>
                    <Checkbox
                      size="small"
                      checked={selectedSet.has(row.student.id)}
                      onChange={() => toggleStudent(row.student.id)}
                      slotProps={{ input: { 'aria-label': `Select ${studentDisplayName(row.student)}` } }}
                      sx={{ p: 0.5, ml: -0.5 }}
                    />
                    <Avatar sx={{ width: 36, height: 36, bgcolor: NAVY, fontSize: '0.75rem', fontWeight: 700 }}>
                      {studentDisplayName(row.student).slice(0, 1)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.875rem' }} noWrap>
                        {studentDisplayName(row.student)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        {row.classLabel} · {formatReportAverage(row.average)}
                      </Typography>
                    </Box>
                    <Chip size="small" label={midLabel} sx={{ fontWeight: 700, fontSize: '0.625rem' }} />
                  </Box>
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    onClick={() => void openReportForStudent(row.student.id, row.classId)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY }}
                  >
                    Preview
                  </Button>
                </Paper>
              );
            })}
            {!tableRows.length ? (
              <Typography sx={{ py: 3, textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No students match your filters.
              </Typography>
            ) : null}
          </Box>
          <TableContainer sx={{ maxHeight: { xs: 420, md: 520 }, overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: { xs: 'none', md: 'block' } }}>
            <Table stickyHeader size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && selectedIds.length > 0}
                      onChange={toggleSelectAllVisible}
                      slotProps={{ input: { 'aria-label': 'Select all visible students' } }}
                    />
                  </TableCell>
                  {['#', 'Student', 'Class', 'Report', 'Average', 'Position', 'Status', 'Generated', 'Actions'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 800,
                        color: NAVY,
                        bgcolor: '#f8fafc',
                        whiteSpace: 'nowrap',
                        display: h === '#' ? { xs: 'none', sm: 'table-cell' } : 'table-cell',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={row.student.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedSet.has(row.student.id)}
                        onChange={() => toggleStudent(row.student.id)}
                        slotProps={{ input: { 'aria-label': `Select ${studentDisplayName(row.student)}` } }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.index}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: NAVY, fontWeight: 700 }}>
                          {studentDisplayName(row.student).slice(0, 1)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.8125rem', lineHeight: 1.3 }}>
                            {studentDisplayName(row.student)}
                          </Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{studentCodeLabel(row.student)}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{row.classLabel}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      {activeReportPeriodLabel}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatReportAverage(row.average)}</TableCell>
                    <TableCell>{formatReportPosition(row.position, row.classSize)}</TableCell>
                    <TableCell>
                      {isStageReportMode && row.status === 'not_generated' ? (
                        <Chip size="small" label="Incomplete marks" sx={{ fontWeight: 700, fontSize: '0.6875rem', bgcolor: '#fef2f2', color: '#b91c1c' }} />
                      ) : isStageReportMode && row.status === 'generated' ? (
                        <Chip size="small" label="Pending" sx={{ fontWeight: 700, fontSize: '0.6875rem', bgcolor: '#fffbeb', color: '#a16207' }} />
                      ) : isStageReportMode && row.status === 'published' ? (
                        <Chip size="small" label="Published" sx={{ fontWeight: 700, fontSize: '0.6875rem', bgcolor: '#ecfdf5', color: '#166534' }} />
                      ) : (
                        <StatusChip status={row.status} />
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {row.generated ? fmtShortDate(row.generated as string) : NOT_RECORDED}
                    </TableCell>
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
          </>
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

      <ReportGenerateWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        academicYears={settings?.academicYears ?? []}
        terms={settings?.terms ?? []}
        classNames={classNames}
        streamsForClass={streamsForClass}
        classNameKey={classNameKey}
        streamFilter={streamFilter}
        studentCount={students.length}
        initialYear={academicYear}
        initialTerm={term}
        initialScope={reportScope}
        onGenerate={handleWizardGenerate}
      />
      <UpdateAssessmentStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        academicYear={academicYear}
        term={term}
        classes={classes}
        onUpdated={async () => {
          await Promise.all([loadPublications(), loadClassSummaries()]);
        }}
      />

      {batchItems.length ? (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            left: '-10000px',
            top: 0,
            width: '794px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          {batchItems.map((item) => (
            <BatchReportItem
              key={item.id}
              item={item}
              register={(id, el) => {
                if (el) batchRefs.current.set(id, el);
                else batchRefs.current.delete(id);
              }}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
