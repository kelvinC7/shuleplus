import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { toast } from '@/lib/toast';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  getAcademicDashboard,
  listAssessments,
  listReportCardPublications,
  publishReportCardsForClass,
  smListClasses,
  smListStudents,
  updateAssessmentStatus,
} from '@/services/api';

const NAVY = '#000435';
const AMBER = '#FCB038';
const PAGE_BG = '#F5F7FA';

type SmClass = { id: string; name: string; stream?: string | null; academicYear?: string | null };
type SmStudent = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  studentCode?: string | null;
  studentUid?: string | null;
  classId?: string;
  className?: string;
  stream?: string | null;
};
type AssessmentRow = {
  id: string;
  title: string;
  status: string;
  subjectName?: string;
  subject?: { name?: string };
  subjectId?: string;
  className?: string;
  class?: { name?: string };
  assessmentDate?: string | null;
  _count?: { marks?: number };
};
type PublicationRow = {
  id: string;
  studentId: string;
  studentName?: string | null;
  studentCode?: string | null;
  classId: string;
  className?: string | null;
  academicYear: string;
  term: string;
  reportKind?: string;
  publishedAt?: string;
  publishedByName?: string | null;
  accessPolicy?: string | null;
};

const REPORT_TYPES = [
  { value: 'beginning', label: 'Beginning Term Report' },
  { value: 'midterm', label: 'Mid-Term Report' },
  { value: 'standard', label: 'Termly Report' },
  { value: 'annual', label: 'Annual Report' },
  { value: 'exam', label: 'Examination Results' },
  { value: 'custom', label: 'Custom Academic Report' },
] as const;

function studentLabel(s: SmStudent) {
  const name = s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || 'Student';
  const code = s.studentCode || s.studentUid || '';
  return { name, code };
}

function assessmentCourseName(a: AssessmentRow) {
  return (a.subjectName || a.subject?.name || 'General').trim() || 'General';
}

function statusChip(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    DRAFT: { label: 'Draft', bg: '#f1f5f9', color: '#475569' },
    MARK_ENTRY: { label: 'Mark Entry', bg: '#dbeafe', color: '#1d4ed8' },
    SUBMITTED: { label: 'Submitted', bg: '#fef3c7', color: '#92400e' },
    REVIEWED: { label: 'Under Review', bg: '#e0e7ff', color: '#3730a3' },
    APPROVED: { label: 'Approved', bg: '#dcfce7', color: '#166534' },
    LOCKED: { label: 'Locked', bg: '#ecfeff', color: '#155e75' },
    OPEN: { label: 'Open', bg: '#e0f2fe', color: '#075985' },
    RETURNED: { label: 'Returned', bg: '#fee2e2', color: '#991b1b' },
  };
  const m = map[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', bg: '#f1f5f9', color: '#475569' };
  return <Chip size="small" label={m.label} sx={{ bgcolor: m.bg, color: m.color, fontWeight: 700, fontSize: '0.7rem' }} />;
}

export default function PublishingPage() {
  const { settings, ready: settingsReady } = useAcademicSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [reportType, setReportType] = useState<'beginning' | 'midterm' | 'standard' | 'annual' | 'exam' | 'custom'>('standard');
  const [classId, setClassId] = useState('');
  const [stream, setStream] = useState('all');
  const [search, setSearch] = useState('');

  const [classes, setClasses] = useState<SmClass[]>([]);
  const [students, setStudents] = useState<SmStudent[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [publications, setPublications] = useState<PublicationRow[]>([]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [selectedCourseNames, setSelectedCourseNames] = useState<string[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!settingsReady || !settings) return;
    setAcademicYear((v) => v || settings.currentAcademicYear || settings.academicYears?.[0] || '');
    setTerm((v) => v || settings.currentTerm || settings.terms?.[0] || '');
  }, [settingsReady, settings]);

  useEffect(() => {
    smListClasses().then((rows) => setClasses(Array.isArray(rows) ? rows : [])).catch(() => setClasses([]));
  }, []);

  const classOptions = useMemo(() => {
    return [...classes].sort((a, b) => `${a.name}${a.stream || ''}`.localeCompare(`${b.name}${b.stream || ''}`));
  }, [classes]);

  const selectedClass = useMemo(() => classOptions.find((c) => c.id === classId) || null, [classOptions, classId]);

  const streamOptions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (!classId || c.id === classId) {
        if (c.stream) set.add(c.stream);
      }
    });
    return [...set].sort();
  }, [classes, classId]);

  const loadStudents = useCallback(async () => {
    if (!classId) {
      setStudents([]);
      return;
    }
    try {
      const rows = await smListStudents({ classId, academicYear: academicYear || undefined, status: 'ACTIVE' });
      setStudents(Array.isArray(rows) ? rows : []);
    } catch {
      setStudents([]);
    }
  }, [classId, academicYear]);

  const loadAssessments = useCallback(async () => {
    try {
      const rows = await listAssessments({
        academicYear: academicYear || undefined,
        term: term || undefined,
        classId: classId || undefined,
      });
      setAssessments(Array.isArray(rows) ? rows : (rows as any)?.items || []);
    } catch {
      setAssessments([]);
    }
  }, [academicYear, term, classId]);

  const loadPublications = useCallback(async () => {
    try {
      const rows = await listReportCardPublications({
        academicYear: academicYear || undefined,
        term: term || undefined,
        classId: classId || undefined,
      });
      setPublications(Array.isArray(rows) ? rows : []);
    } catch {
      setPublications([]);
    }
  }, [academicYear, term, classId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStudents(), loadAssessments(), loadPublications(), getAcademicDashboard(academicYear || '—', term || undefined).catch(() => null)]);
    setLoading(false);
  }, [loadStudents, loadAssessments, loadPublications, academicYear, term]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [classId, academicYear, term, reportType]);

  const publishedByStudent = useMemo(() => {
    const map = new Map<string, PublicationRow>();
    publications.forEach((p) => map.set(p.studentId, p));
    return map;
  }, [publications]);

  const classCourses = useMemo(() => {
    const by = new Map<string, { name: string; count: number; statuses: Set<string>; assessmentIds: string[] }>();
    assessments.forEach((a) => {
      const name = assessmentCourseName(a);
      if (!name) return;
      const key = name.toLowerCase();
      const row = by.get(key) || { name, count: 0, statuses: new Set<string>(), assessmentIds: [] };
      row.count += 1;
      if (a.status) row.statuses.add(a.status);
      row.assessmentIds.push(a.id);
      by.set(key, row);
    });
    return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [assessments]);

  const assessmentsByCourse = useMemo(() => {
    const map = new Map<string, AssessmentRow[]>();
    assessments.forEach((a) => {
      const key = assessmentCourseName(a);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      map.set(k, list);
    }
    return map;
  }, [assessments]);

  const visibleAssessments = useMemo(() => {
    const q = assessmentSearch.trim().toLowerCase();
    const courseSet = new Set(selectedCourseNames);
    return assessments.filter((a) => {
      const course = assessmentCourseName(a);
      if (courseSet.size && !courseSet.has(course)) return false;
      if (!q) return true;
      return `${course} ${a.title} ${a.status}`.toLowerCase().includes(q);
    });
  }, [assessments, assessmentSearch, selectedCourseNames]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (stream !== 'all' && s.stream && s.stream !== stream) return false;
      if (!q) return true;
      const { name, code } = studentLabel(s);
      return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
    });
  }, [students, search, stream]);

  const selectedSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);
  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedSet.has(s.id));
  const someVisibleSelected = filteredStudents.some((s) => selectedSet.has(s.id));

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const set = new Set(prev);
      filteredStudents.forEach((s) => (checked ? set.add(s.id) : set.delete(s.id)));
      return [...set];
    });
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCourseSelection = (courseName: string) => {
    setSelectedCourseNames((prev) => {
      const next = prev.includes(courseName) ? prev.filter((c) => c !== courseName) : [...prev, courseName];
      return next;
    });
  };

  const selectAllCourses = () => setSelectedCourseNames(classCourses.map((c) => c.name));
  const clearCourses = () => {
    setSelectedCourseNames([]);
    setSelectedAssessmentIds([]);
  };

  useEffect(() => {
    // Keep assessment selection aligned with selected courses (if any selected)
    if (!selectedCourseNames.length) return;
    const allowed = new Set<string>();
    selectedCourseNames.forEach((name) => (assessmentsByCourse.get(name) || []).forEach((a) => allowed.add(a.id)));
    setSelectedAssessmentIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [selectedCourseNames, assessmentsByCourse]);

  const toggleAssessment = (id: string) => {
    setSelectedAssessmentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisibleAssessments = () => {
    const ids = visibleAssessments.map((a) => a.id);
    setSelectedAssessmentIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearVisibleAssessments = () => {
    const visible = new Set(visibleAssessments.map((a) => a.id));
    setSelectedAssessmentIds((prev) => prev.filter((id) => !visible.has(id)));
  };

  const openPublishFlow = () => {
    if (!classId || !academicYear || !term) {
      toast.error('Missing filters', 'Select class, academic year and term.');
      return;
    }
    if (!students.length) {
      toast.error('No students', 'No active students found for this class.');
      return;
    }
    setPublishStep(0);
    setAssessmentSearch('');
    setSelectedCourseNames(classCourses.map((c) => c.name));
    setSelectedAssessmentIds(assessments.map((a) => a.id));
    setPublishOpen(true);
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => updateAssessmentStatus(id, status)));
      toast.success(`Updated ${ids.length} assessment(s)`, status.replace(/_/g, ' '));
      await loadAssessments();
    } catch (e: any) {
      toast.error('Update failed', e?.response?.data?.message || e?.message);
    }
  };

  const submittedCount = assessments.filter((a) => a.status === 'SUBMITTED').length;
  const approvedCount = assessments.filter((a) => a.status === 'APPROVED' || a.status === 'LOCKED').length;
  const marksSubmitted = assessments.filter((a) => ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(a.status)).length;
  const grantedCount = selectedStudentIds.filter((id) => filteredStudents.some((s) => s.id === id) || students.some((s) => s.id === id)).length;
  const totalClassForPublish = students.length;
  const payToViewCount = Math.max(0, totalClassForPublish - grantedCount);
  const selectedCoursesEffective = selectedCourseNames.length ? selectedCourseNames : classCourses.map((c) => c.name);
  const selectedAssessmentsEffective = useMemo(() => {
    const ids = new Set(selectedAssessmentIds);
    return assessments.filter((a) => ids.has(a.id));
  }, [assessments, selectedAssessmentIds]);

  const handleConfirmPublish = async () => {
    if (!classId || !academicYear || !term) {
      toast.error('Missing filters', 'Select class, academic year and term.');
      return;
    }
    if (!students.length) {
      toast.error('No students', 'No active students found for this class.');
      return;
    }

    const reportKind = reportType === 'beginning' ? 'beginning' : reportType === 'midterm' ? 'midterm' : 'standard';
    setPublishing(true);
    try {
      const res = await publishReportCardsForClass({
        classId,
        academicYear,
        term,
        reportKind,
        selectedStudentIds,
        notifyInApp,
        notifyPush,
        includeReportLink: includeLink,
      });

      const granted = res?.granted ?? selectedStudentIds.length;
      const restricted = res?.payToView ?? Math.max(0, (res?.total ?? students.length) - granted);
      toast.success(
        `Published ${res?.published ?? 0} student report(s)`,
        `${granted} parent(s) receive marks now. ${restricted} published as Pay to view.`
      );
      if (res?.skipped) toast.info(`${res.skipped} item(s) could not be published`, (res.errors || []).join(' • ') || 'Check report readiness.');
      setPublishOpen(false);
      await refreshAll();
    } catch (e: any) {
      toast.error('Publish failed', e?.response?.data?.message || e?.message);
    } finally {
      setPublishing(false);
    }
  };

  const historyRows = useMemo(() => {
    const groups = new Map<string, PublicationRow[]>();
    publications.forEach((p) => {
      const key = `${p.className || p.classId}|${p.term}|${p.academicYear}|${p.reportKind || 'standard'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return [...groups.entries()].map(([key, rows]) => {
      const [classLabel, t, y, kind] = key.split('|');
      const last = rows.map((r) => r.publishedAt).filter(Boolean).sort().slice(-1)[0];
      return {
        key,
        classLabel,
        term: t,
        academicYear: y,
        reportKind: kind,
        count: rows.length,
        granted: rows.filter((r) => String(r.accessPolicy || '').toUpperCase() === 'ALL_PARENTS').length,
        by: rows.find((r) => r.publishedByName)?.publishedByName || 'System',
        publishedAt: last,
      };
    }).sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  }, [publications]);

  const steps = ['Select students', 'Select courses', 'Select assessments', 'Review & publish'];
  const canGoNext =
    (publishStep === 0 && students.length > 0) ||
    (publishStep === 1 && selectedCoursesEffective.length > 0) ||
    (publishStep === 2) ||
    publishStep === 3;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: PAGE_BG, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 2.5 }, pb: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 800, color: NAVY }}>Publishing</Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.5, maxWidth: 980 }}>
          Filter by academic year/term, select a class, then publish with a guided flow: choose students, courses, and assessments. Selected students receive marks now; others are published as <strong>Pay to view</strong>.
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 1.25, sm: 2, md: 3 }, py: { xs: 1.5, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mb: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TuneOutlinedIcon sx={{ color: AMBER }} fontSize="small" />
              <Typography sx={{ fontWeight: 800, color: NAVY }}>Filters</Typography>
            </Box>
            <Button variant="outlined" onClick={() => void refreshAll()} sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1', color: NAVY, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>Refresh</Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 1.25 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Academic Year</InputLabel>
              <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {(settings?.academicYears || []).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Term</InputLabel>
              <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
                {(settings?.terms || []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value as any)}>
                {REPORT_TYPES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Class</InputLabel>
              <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <MenuItem value="">Select class</MenuItem>
                {classOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}{c.stream ? ` ${c.stream}` : ''}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Stream</InputLabel>
              <Select label="Stream" value={stream} onChange={(e) => setStream(e.target.value)}>
                <MenuItem value="all">All streams</MenuItem>
                {streamOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Search student" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
          </Box>
          <Typography sx={{ mt: 1.25, fontSize: '0.8rem', color: '#64748b' }}>
            {selectedClass ? `Selected: ${selectedClass.name}${selectedClass.stream ? ` ${selectedClass.stream}` : ''} · ${term || 'Term'} ${academicYear || ''}` : 'Choose Academic Year, Term and Class to begin.'}
          </Typography>
        </Paper>

        {loading ? <LinearProgress sx={{ borderRadius: 1 }} /> : null}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.25 }}>
          {[
            { label: 'Courses', value: classCourses.length, sub: classId ? 'Assigned in selected term' : 'Select class', icon: <MenuBookOutlinedIcon /> },
            { label: 'Students', value: students.length, sub: 'Active in class', icon: <GroupsOutlinedIcon /> },
            { label: 'Receive now', value: grantedCount, sub: 'Selected students', icon: <CheckCircleIcon /> },
            { label: 'Pay to view', value: classId ? payToViewCount : 0, sub: 'Published, restricted', icon: <PaymentsOutlinedIcon /> },
          ].map((c) => (
            <Paper key={c.label} elevation={0} sx={{ p: 1.75, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{c.label}</Typography>
                <Box sx={{ color: AMBER, display: 'flex' }}>{c.icon}</Box>
              </Box>
              <Typography sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{c.value}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{c.sub}</Typography>
            </Paper>
          ))}
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff', overflow: 'hidden' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 1, borderBottom: '1px solid #e2e8f0', '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 48 }, '& .Mui-selected': { color: `${NAVY} !important` }, '& .MuiTabs-indicator': { bgcolor: AMBER } }}>
            <Tab label="Publish Marks" />
            <Tab label="Marks Review" />
            <Tab label="History" icon={<HistoryOutlinedIcon fontSize="small" />} iconPosition="start" />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
              {!classId ? (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#fffbeb', borderColor: '#fde68a', textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, color: '#92400e', mb: 0.5 }}>Select a class to continue</Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#92400e' }}>
                    Choose Academic Year, Term and Class above to view courses and start the guided publish flow.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, borderColor: '#e2e8f0' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <AssignmentTurnedInOutlinedIcon fontSize="small" sx={{ color: AMBER }} /> Guided publish flow
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                          1) Select students  2) Select courses  3) Select assessments  4) Review & publish
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<PublishOutlinedIcon />}
                        onClick={openPublishFlow}
                        disabled={!classId || !academicYear || !term || !students.length}
                        sx={{ textTransform: 'none', fontWeight: 800, bgcolor: AMBER, color: NAVY, '&:hover': { bgcolor: '#e5a032' }, alignSelf: { xs: 'stretch', sm: 'auto' } }}
                      >
                        Start publish
                      </Button>
                    </Stack>
                    <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, bgcolor: '#f8fafc' }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Students</Typography>
                        <Typography sx={{ fontWeight: 700, color: NAVY }}>{students.length} active</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{grantedCount} selected to receive now, {payToViewCount} will be pay-to-view</Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, bgcolor: '#f8fafc' }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Courses & assessments</Typography>
                        <Typography sx={{ fontWeight: 700, color: NAVY }}>{classCourses.length} courses · {assessments.length} assessments</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>Select multiple courses and assessments in the publish modal</Typography>
                      </Paper>
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, borderColor: '#e2e8f0' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <MenuBookOutlinedIcon fontSize="small" sx={{ color: AMBER }} /> Courses in this class
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{term || 'Term'} {academicYear} · All courses with assessment records</Typography>
                      </Box>
                    </Stack>
                    {classCourses.length ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {classCourses.map((c) => (
                          <Chip key={c.name} label={`${c.name} (${c.count})`} sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', fontWeight: 600, color: NAVY }} />
                        ))}
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                        No course assessments found for the selected class and term yet.
                      </Typography>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, borderColor: '#e2e8f0' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mb: 1.25 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: NAVY }}>Quick student selection</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Select who receives marks now (others will be published as pay-to-view).</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button size="small" variant="outlined" onClick={() => setSelectedStudentIds(filteredStudents.map((s) => s.id))} disabled={!filteredStudents.length} sx={{ textTransform: 'none', fontWeight: 700 }}>Select all</Button>
                        <Button size="small" variant="outlined" onClick={() => setSelectedStudentIds([])} disabled={!selectedStudentIds.length} sx={{ textTransform: 'none', fontWeight: 700 }}>Deselect all</Button>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap' }}>
                      <FormControlLabel
                        control={<Checkbox indeterminate={someVisibleSelected && !allVisibleSelected} checked={allVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} />}
                        label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: NAVY }}>Select all visible ({filteredStudents.length})</Typography>}
                      />
                      <Chip size="small" label={`${grantedCount} receive marks`} sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />
                      <Chip size="small" label={`${payToViewCount} pay to view`} sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }} />
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                      {filteredStudents.slice(0, 12).map((s) => {
                        const { name, code } = studentLabel(s);
                        const checked = selectedSet.has(s.id);
                        const pub = publishedByStudent.get(s.id);
                        const pubPolicy = String(pub?.accessPolicy || '').toUpperCase();
                        return (
                          <Paper key={s.id} variant="outlined" onClick={() => toggleStudent(s.id)} sx={{ p: 1.25, borderRadius: 2, cursor: 'pointer', borderColor: checked ? '#86efac' : '#e2e8f0', bgcolor: checked ? '#f0fdf4' : '#fff' }}>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <Checkbox checked={checked} onChange={() => toggleStudent(s.id)} onClick={(e) => e.stopPropagation()} sx={{ mt: -0.5 }} />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9rem', lineHeight: 1.2 }}>{name}</Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{code || 'No code'}</Typography>
                                  </Box>
                                  <Chip size="small" label={checked ? 'Receive marks' : 'Pay to view'} sx={{ bgcolor: checked ? '#dcfce7' : '#fff7ed', color: checked ? '#166534' : '#9a3412', fontWeight: 800, fontSize: '0.68rem' }} />
                                </Stack>
                                {pub ? <Chip size="small" label={pubPolicy === 'ALL_PARENTS' ? 'Published · Access granted' : 'Published · Pay to view'} sx={{ mt: 0.75, bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600 }} /> : null}
                              </Box>
                            </Stack>
                          </Paper>
                        );
                      })}
                      {filteredStudents.length > 12 && (
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, gridColumn: '1 / -1', bgcolor: '#f8fafc' }}>
                          <Typography sx={{ fontSize: '0.8rem', color: '#475569' }}>
                            Showing 12 of {filteredStudents.length} filtered students here. Use <strong>Start publish</strong> for the full guided selection flow.
                          </Typography>
                        </Paper>
                      )}
                      {!filteredStudents.length && (
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center', gridColumn: '1 / -1' }}>
                          <Typography sx={{ color: '#64748b' }}>No students found for the selected filters.</Typography>
                        </Paper>
                      )}
                    </Box>
                  </Paper>
                </Stack>
              )}
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>Marks Submission Workflow</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>
                Review, return, approve and lock assessments. Publishing to parents happens from the guided publish flow.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip size="small" label={`${marksSubmitted} submitted/reviewed`} />
                <Chip size="small" label={`${approvedCount} approved/locked`} />
                <Chip size="small" label={`${submittedCount} awaiting review`} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'grid', gap: 1 }}>
                {assessments.slice(0, 80).map((a) => (
                  <Paper key={a.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: '#e2e8f0' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: NAVY }}>{a.title || a.id}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {assessmentCourseName(a)} · {a.className || a.class?.name || 'Class'} · {a._count?.marks ?? 0} marks
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        {statusChip(a.status)}
                        {a.status === 'SUBMITTED' && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => void handleBulkStatus([a.id], 'MARK_ENTRY')} sx={{ textTransform: 'none' }}>Return</Button>
                            <Button size="small" variant="contained" onClick={() => void handleBulkStatus([a.id], 'APPROVED')} sx={{ textTransform: 'none', bgcolor: NAVY }}>Approve</Button>
                          </>
                        )}
                        {a.status === 'APPROVED' && (
                          <Button size="small" variant="outlined" onClick={() => void handleBulkStatus([a.id], 'LOCKED')} sx={{ textTransform: 'none' }}>Lock</Button>
                        )}
                        {a.status === 'MARK_ENTRY' && (
                          <Button size="small" variant="outlined" onClick={() => void handleBulkStatus([a.id], 'SUBMITTED')} sx={{ textTransform: 'none' }}>Mark Submitted</Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                {!assessments.length && (
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#64748b' }}>No assessments found for the selected filters.</Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>Publication History</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>Published report groups by class, term and report type.</Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {historyRows.map((r) => (
                  <Paper key={r.key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: NAVY }}>
                          {r.reportKind === 'beginning' ? 'Beginning Term' : r.reportKind === 'midterm' ? 'Mid-Term' : r.reportKind === 'standard' ? 'Termly' : r.reportKind} &middot; {r.term} {r.academicYear}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{r.classLabel || 'Class'} · {r.count} student(s) · {r.granted} with access</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {r.publishedAt ? new Date(r.publishedAt).toLocaleString() : 'Not available'} · {r.by}
                        </Typography>
                      </Box>
                      <Chip size="small" label="Published" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, alignSelf: 'flex-start' }} />
                    </Stack>
                  </Paper>
                ))}
                {!historyRows.length && (
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#64748b' }}>No publication history for the selected filters.</Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog open={publishOpen} onClose={() => !publishing && setPublishOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY, pb: 1 }}>
          Publish marks (guided)
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, mt: 0.25 }}>
            {selectedClass?.name || 'Class'} · {term} {academicYear}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stepper activeStep={publishStep} alternativeLabel={!isMobile} orientation={isMobile ? 'vertical' : 'horizontal'} sx={{ mb: 2 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {publishStep === 0 && (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700, color: NAVY }}>Select students to receive marks now</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={() => setSelectedStudentIds(filteredStudents.map((s) => s.id))} sx={{ textTransform: 'none' }}>Select all</Button>
                  <Button size="small" variant="outlined" onClick={() => setSelectedStudentIds([])} sx={{ textTransform: 'none' }}>Deselect all</Button>
                </Stack>
              </Stack>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1.25 }}>
                Selected students get access and notifications now. Unselected students are published as <strong>Pay to view</strong>.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1, maxHeight: { md: 420 }, overflowY: 'auto', pr: { md: 0.5 } }}>
                {filteredStudents.map((s) => {
                  const { name, code } = studentLabel(s);
                  const checked = selectedSet.has(s.id);
                  return (
                    <Paper key={s.id} variant="outlined" onClick={() => toggleStudent(s.id)} sx={{ p: 1.1, borderRadius: 2, cursor: 'pointer', borderColor: checked ? '#86efac' : '#e2e8f0', bgcolor: checked ? '#f0fdf4' : '#fff' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Checkbox checked={checked} onChange={() => toggleStudent(s.id)} onClick={(e) => e.stopPropagation()} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.88rem' }}>{name}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{code || 'No code'}</Typography>
                        </Box>
                        <Chip size="small" label={checked ? 'Receive' : 'Pay to view'} sx={{ bgcolor: checked ? '#dcfce7' : '#fff7ed', color: checked ? '#166534' : '#9a3412', fontWeight: 700 }} />
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                <Chip label={`${grantedCount} receive marks now`} sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />
                <Chip label={`${payToViewCount} published as pay to view`} sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }} />
              </Stack>
            </Box>
          )}

          {publishStep === 1 && (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700, color: NAVY }}>Select courses for this class</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={selectAllCourses} sx={{ textTransform: 'none' }}>Select all courses</Button>
                  <Button size="small" variant="outlined" onClick={clearCourses} sx={{ textTransform: 'none' }}>Clear</Button>
                </Stack>
              </Stack>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1.25 }}>Choose one or multiple courses assigned to the selected class/term.</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                {classCourses.map((c) => {
                  const checked = selectedCourseNames.includes(c.name);
                  return (
                    <Paper key={c.name} variant="outlined" onClick={() => toggleCourseSelection(c.name)} sx={{ p: 1.25, borderRadius: 2, cursor: 'pointer', borderColor: checked ? '#93c5fd' : '#e2e8f0', bgcolor: checked ? '#eff6ff' : '#fff' }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Checkbox checked={checked} onChange={() => toggleCourseSelection(c.name)} onClick={(e) => e.stopPropagation()} />
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: NAVY }}>{c.name}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{c.count} assessment(s)</Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
                {!classCourses.length && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, gridColumn: '1 / -1', textAlign: 'center' }}>
                    <Typography sx={{ color: '#64748b' }}>No courses/assessments found for this class and term.</Typography>
                  </Paper>
                )}
              </Box>
              <Typography sx={{ mt: 1.25, fontSize: '0.78rem', color: '#475569' }}>
                Selected courses: <strong>{selectedCoursesEffective.length}</strong>
              </Typography>
            </Box>
          )}

          {publishStep === 2 && (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700, color: NAVY }}>Select assessments</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={selectAllVisibleAssessments} sx={{ textTransform: 'none' }}>Select visible</Button>
                  <Button size="small" variant="outlined" onClick={clearVisibleAssessments} sx={{ textTransform: 'none' }}>Clear visible</Button>
                </Stack>
              </Stack>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1 }}>Select multiple assessments per course (or across selected courses).</Typography>
              <TextField size="small" fullWidth label="Search assessment" value={assessmentSearch} onChange={(e) => setAssessmentSearch(e.target.value)} sx={{ mb: 1.25 }} />
              <Box sx={{ display: 'grid', gap: 1, maxHeight: { md: 420 }, overflowY: 'auto', pr: { md: 0.5 } }}>
                {visibleAssessments.map((a) => {
                  const checked = selectedAssessmentIds.includes(a.id);
                  return (
                    <Paper key={a.id} variant="outlined" onClick={() => toggleAssessment(a.id)} sx={{ p: 1.1, borderRadius: 2, cursor: 'pointer', borderColor: checked ? '#c4b5fd' : '#e2e8f0', bgcolor: checked ? '#f5f3ff' : '#fff' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Checkbox checked={checked} onChange={() => toggleAssessment(a.id)} onClick={(e) => e.stopPropagation()} />
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.88rem' }}>{a.title || a.id}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{assessmentCourseName(a)} · {a._count?.marks ?? 0} marks</Typography>
                          </Box>
                        </Stack>
                        {statusChip(a.status)}
                      </Stack>
                    </Paper>
                  );
                })}
                {!visibleAssessments.length && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#64748b' }}>No assessments match the current selection/search.</Typography>
                  </Paper>
                )}
              </Box>
              <Typography sx={{ mt: 1.25, fontSize: '0.78rem', color: '#475569' }}>
                Selected assessments: <strong>{selectedAssessmentIds.length}</strong>
              </Typography>
            </Box>
          )}

          {publishStep === 3 && (
            <Box>
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1.25 }}>Review and publish</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Report</Typography>
                  <Typography sx={{ fontWeight: 700, color: NAVY }}>{REPORT_TYPES.find((r) => r.value === reportType)?.label}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{term} {academicYear}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Class</Typography>
                  <Typography sx={{ fontWeight: 700, color: NAVY }}>{selectedClass?.name || 'Class'}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{students.length} student(s)</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}>
                  <Typography sx={{ fontWeight: 800, color: '#166534' }}>Receive marks now</Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: '#166534' }}>{grantedCount} selected student(s)</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: '#fed7aa', bgcolor: '#fff7ed' }}>
                  <Typography sx={{ fontWeight: 800, color: '#9a3412' }}>Published as Pay to view</Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: '#9a3412' }}>{payToViewCount} student(s)</Typography>
                </Paper>
              </Box>

              <Paper variant="outlined" sx={{ mt: 1.25, p: 1.25, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Typography sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}>Selected courses ({selectedCoursesEffective.length})</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {selectedCoursesEffective.slice(0, 20).map((c) => <Chip key={c} size="small" label={c} />)}
                  {selectedCoursesEffective.length > 20 ? <Chip size="small" label={`+${selectedCoursesEffective.length - 20} more`} /> : null}
                </Box>
                <Typography sx={{ mt: 1, fontWeight: 700, color: NAVY, mb: 0.5 }}>Selected assessments ({selectedAssessmentsEffective.length})</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {selectedAssessmentsEffective.slice(0, 12).map((a) => <Chip key={a.id} size="small" label={`${assessmentCourseName(a)}: ${a.title || a.id}`} />)}
                  {selectedAssessmentsEffective.length > 12 ? <Chip size="small" label={`+${selectedAssessmentsEffective.length - 12} more`} /> : null}
                  {!selectedAssessmentsEffective.length ? <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>No specific assessments selected (class/report publish will proceed).</Typography> : null}
                </Box>
              </Paper>

              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}><CampaignOutlinedIcon fontSize="small" /> Notifications (for selected students)</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <FormControlLabel control={<Switch checked={notifyInApp} onChange={(e) => setNotifyInApp(e.target.checked)} />} label="Send Parent Portal notifications" />
                <FormControlLabel control={<Switch checked={notifyPush} onChange={(e) => setNotifyPush(e.target.checked)} />} label="Send push notifications (when available)" />
                <FormControlLabel control={<Switch checked={includeLink} onChange={(e) => setIncludeLink(e.target.checked)} />} label="Include secure report link" />
              </Box>
              <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', gap: 1 }}>
                <LockOutlinedIcon sx={{ color: '#1d4ed8', mt: 0.2 }} fontSize="small" />
                <Typography sx={{ fontSize: '0.78rem', color: '#1e3a8a' }}>
                  All students in the class are published for this period. Selected students receive access and notifications now; unselected students are published as <strong>Pay to view</strong>. Course/assessment selections in this flow organize what is reviewed and included in the publish scope shown here.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
          <Button onClick={() => setPublishOpen(false)} disabled={publishing} fullWidth={isMobile} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="outlined"
              onClick={() => setPublishStep((s) => Math.max(0, s - 1))}
              disabled={publishing || publishStep === 0}
              fullWidth={isMobile}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Back
            </Button>
            {publishStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setPublishStep((s) => Math.min(steps.length - 1, s + 1))}
                disabled={!canGoNext}
                fullWidth={isMobile}
                sx={{ textTransform: 'none', fontWeight: 800, bgcolor: NAVY, '&:hover': { bgcolor: '#0b184f' } }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => void handleConfirmPublish()}
                disabled={publishing || !classId}
                fullWidth={isMobile}
                sx={{ bgcolor: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#0b184f' } }}
              >
                {publishing ? <CircularProgress size={18} color="inherit" /> : 'Approve & Publish Marks'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}