import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getAssessmentMarks, listAssessments, listTimetableClassConfig, smListClasses } from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { AssessmentReviewDrawer } from '@/components/assessment-review-drawer';
import type { ApiAssessment, ApiAssessmentMark, ApiClass, TimetableClassCatalog } from '@/types';
import { NAVY, classLabel, isPublishedRecord, isTeacherScheduledAssessment, marksScoredCount } from '@/lib/assessment-records';

type MonitorTab = 'courses' | 'pending' | 'teachers';
type CompletionStatus = 'COMPLETED' | 'PARTIAL' | 'NOT_ENTERED';

function classOptionLabel(c: { name: string; stream?: string | null }) {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

function statusChip(s: CompletionStatus) {
  if (s === 'COMPLETED') return { label: 'Completed', bg: '#dcfce7', color: '#166534', border: '#86efac' };
  if (s === 'PARTIAL') return { label: 'Partially entered', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' };
  return { label: 'Not entered', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
}

function assessmentCompletion(a: ApiAssessment): CompletionStatus {
  const n = marksScoredCount(a);
  if (n <= 0) return 'NOT_ENTERED';
  if (isPublishedRecord(a)) return 'COMPLETED';
  return 'PARTIAL';
}

function courseKey(a: ApiAssessment) {
  return [a.classId || classLabel(a) || 'na', a.subjectId || a.subject?.name || a.title || 'na', a.createdByName || a.createdBy || 'na'].join('::');
}

function escapeHtml(v: string) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadHtmlReport(filename: string, title: string, subtitle: string, filterSummary: string, bodyHtml: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title>
  <style>
    @page{margin:14mm}
    body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0f172a;margin:0;padding:24px;background:#fff}
    .hero{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:16px}
    .hero-top{background:linear-gradient(135deg,#000435,#102a7a);color:#fff;padding:18px 20px}
    .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FCB038;margin-bottom:6px}
    h1{margin:0;font-size:22px;line-height:1.2}.sub{margin:6px 0 0;color:rgba(255,255,255,.82);font-size:13px}
    .meta{padding:12px 20px;background:#f8fafc;color:#475569;font-size:12px;border-top:1px solid rgba(255,255,255,.12)}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #e2e8f0;padding:9px 10px;text-align:left;vertical-align:top}
    th{background:#000435;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    tr:nth-child(even) td{background:#f8fafc}
    .ok{color:#166534;font-weight:700}.warn{color:#92400e;font-weight:700}.bad{color:#991b1b;font-weight:700}
    .footer{margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
  </style></head><body>
  <div class="hero"><div class="hero-top"><div class="badge">Academic Check-In</div><h1>${escapeHtml(title)}</h1><p class="sub">${escapeHtml(subtitle)}</p></div><div class="meta"><strong>Filters:</strong> ${escapeHtml(filterSummary)}<br/><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</div></div>
  ${bodyHtml}
  <div class="footer"><span>Prepared by: ____________________</span><span>Authorized signature: ____________________</span><span>Shule+ Marks Monitoring</span></div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'navy' | 'green' | 'amber' | 'red' }) {
  const tones = {
    navy: { bg: '#fff', border: '#e2e8f0', value: NAVY },
    green: { bg: '#f0fdf4', border: '#bbf7d0', value: '#166534' },
    amber: { bg: '#fffbeb', border: '#fde68a', value: '#92400e' },
    red: { bg: '#fef2f2', border: '#fecaca', value: '#991b1b' },
  }[tone || 'navy'];
  return (
    <Box sx={{ p: { xs: 1.4, sm: 1.7 }, borderRadius: 3, border: `1px solid ${tones.border}`, bgcolor: tones.bg, height: '100%' }}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography sx={{ fontSize: { xs: '1.35rem', sm: '1.7rem' }, fontWeight: 800, color: tones.value, lineHeight: 1.1, mt: 0.35 }}>{value}</Typography>
      {sub ? <Typography sx={{ fontSize: '0.74rem', color: '#64748b', mt: 0.35 }}>{sub}</Typography> : null}
    </Box>
  );
}

export default function CourseMonitoringPage() {
  const { settings } = useAcademicSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiAssessment[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [ttConfig, setTtConfig] = useState<TimetableClassCatalog[]>([]);
  const [tab, setTab] = useState<MonitorTab>('courses');

  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [status, setStatus] = useState<'ALL' | CompletionStatus>('ALL');
  const [assessmentType, setAssessmentType] = useState('');
  const [search, setSearch] = useState('');

  const [courseModalKey, setCourseModalKey] = useState<string | null>(null);
  const [courseMarks, setCourseMarks] = useState<Record<string, ApiAssessmentMark[]>>({});
  const [courseMarksLoading, setCourseMarksLoading] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.currentAcademicYear && !filterYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !filterTerm) setFilterTerm(settings.currentTerm);
  }, [settings, filterYear, filterTerm]);

  useEffect(() => {
    smListClasses().then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    listTimetableClassConfig({ term: filterTerm || undefined, academicYear: filterYear || undefined })
      .then((d) => setTtConfig(Array.isArray(d) ? d : []))
      .catch(() => setTtConfig([]));
  }, [filterTerm, filterYear]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assessments = await listAssessments({ academicYear: filterYear || undefined, term: filterTerm || undefined, classId: classId || undefined });
      setRows((assessments ?? []).filter(isTeacherScheduledAssessment));
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || 'Could not load marks records';
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterTerm, classId]);

  useEffect(() => { void load(); }, [load]);

  const yearOptions = useMemo(() => {
    const base = settings?.academicYears?.length ? [...settings.academicYears] : [];
    if (settings?.currentAcademicYear && !base.includes(settings.currentAcademicYear)) base.unshift(settings.currentAcademicYear);
    if (filterYear && !base.includes(filterYear)) base.unshift(filterYear);
    return base.length ? [...new Set(base)] : [new Date().getFullYear().toString()];
  }, [settings, filterYear]);

  const termOptions = useMemo(() => {
    const base = settings?.terms?.length ? [...settings.terms] : ['Term 1', 'Term 2', 'Term 3'];
    if (settings?.currentTerm && !base.includes(settings.currentTerm)) base.unshift(settings.currentTerm);
    if (filterTerm && !base.includes(filterTerm)) base.unshift(filterTerm);
    return [...new Set(base)];
  }, [settings, filterTerm]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) || null, [classes, classId]);
  const selectedTtClass = useMemo(() => {
    if (!classId && !selectedClass) return null;
    return ttConfig.find((c) => c.classId === classId) || ttConfig.find((c) => selectedClass && c.className === classOptionLabel(selectedClass)) || null;
  }, [ttConfig, classId, selectedClass]);

  const courseOptions = useMemo(() => {
    const names = new Set<string>();
    if (selectedTtClass) selectedTtClass.courses.forEach((c) => c.subjectName && names.add(c.subjectName));
    else if (!classId) ttConfig.forEach((cl) => cl.courses.forEach((c) => c.subjectName && names.add(c.subjectName)));
    rows.forEach((a) => { if (a.subject?.name) names.add(a.subject.name); });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [selectedTtClass, ttConfig, rows, classId]);

  const teacherOptions = useMemo(() => {
    const names = new Set<string>();
    if (selectedTtClass) selectedTtClass.courses.forEach((c) => c.teacherName && names.add(c.teacherName));
    else if (!classId) ttConfig.forEach((cl) => cl.courses.forEach((c) => c.teacherName && names.add(c.teacherName)));
    rows.forEach((a) => { if (a.createdByName) names.add(a.createdByName); });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [selectedTtClass, ttConfig, rows, classId]);

  useEffect(() => { if (courseName && !courseOptions.includes(courseName)) setCourseName(''); }, [courseOptions, courseName]);
  useEffect(() => { if (teacherName && !teacherOptions.includes(teacherName)) setTeacherName(''); }, [teacherOptions, teacherName]);

  const filteredAssessments = useMemo(() => {
    let list = rows;
    if (classId) list = list.filter((a) => a.classId === classId);
    if (courseName) list = list.filter((a) => (a.subject?.name || '').toLowerCase() === courseName.toLowerCase() || (a.subject?.name || '').toLowerCase().includes(courseName.toLowerCase()));
    if (teacherName) list = list.filter((a) => (a.createdByName || '').toLowerCase() === teacherName.toLowerCase() || (a.createdByName || '').toLowerCase().includes(teacherName.toLowerCase()));
    if (assessmentType.trim()) list = list.filter((a) => [a.component?.name, a.template?.name, a.title].filter(Boolean).join(' ').toLowerCase().includes(assessmentType.toLowerCase()));
    if (status !== 'ALL') list = list.filter((a) => assessmentCompletion(a) === status);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((a) => [a.title, a.assessmentCode, a.subject?.name, classLabel(a), a.createdByName, a.component?.name].filter(Boolean).join(' ').toLowerCase().includes(q));
    return list;
  }, [rows, classId, courseName, teacherName, assessmentType, status, search]);

  const courseGroups = useMemo(() => {
    const map = new Map<string, { key: string; className: string; subject: string; teacher: string; assessments: ApiAssessment[] }>();
    for (const a of filteredAssessments) {
      const key = courseKey(a);
      if (!map.has(key)) map.set(key, { key, className: classLabel(a) || selectedTtClass?.className || '—', subject: a.subject?.name || a.title || 'Course', teacher: a.createdByName || 'Unassigned', assessments: [] });
      map.get(key)!.assessments.push(a);
    }
    return [...map.values()].map((g) => {
      const statuses = g.assessments.map(assessmentCompletion);
      const completed = statuses.filter((s) => s === 'COMPLETED').length;
      const partial = statuses.filter((s) => s === 'PARTIAL').length;
      const none = statuses.filter((s) => s === 'NOT_ENTERED').length;
      const overall: CompletionStatus = none === statuses.length ? 'NOT_ENTERED' : completed === statuses.length ? 'COMPLETED' : 'PARTIAL';
      return { ...g, completed, partial, none, overall };
    }).sort((a, b) => `${a.className} ${a.subject}`.localeCompare(`${b.className} ${b.subject}`));
  }, [filteredAssessments, selectedTtClass]);

  const pendingAssessments = useMemo(() => filteredAssessments.filter((a) => assessmentCompletion(a) !== 'COMPLETED'), [filteredAssessments]);
  const teacherGroups = useMemo(() => {
    const map = new Map<string, { teacher: string; assessments: ApiAssessment[] }>();
    for (const a of filteredAssessments) {
      const t = a.createdByName || 'Unassigned';
      if (!map.has(t)) map.set(t, { teacher: t, assessments: [] });
      map.get(t)!.assessments.push(a);
    }
    return [...map.values()].map((g) => {
      const completed = g.assessments.filter((a) => assessmentCompletion(a) === 'COMPLETED').length;
      const pending = g.assessments.length - completed;
      const progress = g.assessments.length ? Math.round((completed / g.assessments.length) * 100) : 0;
      return { ...g, completed, pending, progress };
    }).sort((a, b) => a.progress - b.progress || b.pending - a.pending);
  }, [filteredAssessments]);

  const summary = useMemo(() => {
    const total = filteredAssessments.length;
    const completed = filteredAssessments.filter((a) => assessmentCompletion(a) === 'COMPLETED').length;
    const pending = total - completed;
    const teachersPending = new Set(filteredAssessments.filter((a) => assessmentCompletion(a) !== 'COMPLETED').map((a) => a.createdByName || 'Unassigned')).size;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, teachersPending, pct };
  }, [filteredAssessments]);

  const openCourse = courseGroups.find((g) => g.key === courseModalKey) || null;

  async function openCourseModal(key: string) {
    setCourseModalKey(key);
    const g = courseGroups.find((x) => x.key === key);
    if (!g) return;
    const missing = g.assessments.filter((a) => !courseMarks[a.id]);
    if (!missing.length) return;
    setCourseMarksLoading(true);
    try {
      const pairs = await Promise.all(missing.map(async (a) => [a.id, await getAssessmentMarks(a.id).catch(() => [])] as const));
      setCourseMarks((prev) => {
        const next = { ...prev };
        for (const [id, marks] of pairs) next[id] = Array.isArray(marks) ? marks : [];
        return next;
      });
    } finally {
      setCourseMarksLoading(false);
    }
  }

  const filterSummary = () => [
    `Year: ${filterYear || 'All'}`,
    `Term: ${filterTerm || 'All'}`,
    `Class: ${selectedClass ? classOptionLabel(selectedClass) : selectedTtClass?.className || 'All'}`,
    `Course: ${courseName || 'All'}`,
    `Teacher: ${teacherName || 'All'}`,
    `Status: ${status}`,
    assessmentType ? `Assessment type: ${assessmentType}` : null,
    search ? `Search: ${search}` : null,
  ].filter(Boolean).join(' · ');

  function exportPdf(kind: MonitorTab) {
    const period = [filterTerm, filterYear].filter(Boolean).join(' · ') || 'Selected period';
    const fs = filterSummary();
    if (kind === 'courses') {
      const rowsHtml = courseGroups.map((g, i) => {
        const st = statusChip(g.overall);
        const cls = g.overall === 'COMPLETED' ? 'ok' : g.overall === 'PARTIAL' ? 'warn' : 'bad';
        return `<tr><td>${i + 1}</td><td>${escapeHtml(g.subject)}</td><td>${escapeHtml(g.className)}</td><td>${escapeHtml(g.teacher)}</td><td>${g.completed}/${g.assessments.length}</td><td>${g.partial}</td><td>${g.none}</td><td class="${cls}">${escapeHtml(st.label)}</td></tr>`;
      }).join('');
      downloadHtmlReport('course-marks-monitoring.pdf', 'Course Marks Monitoring', period, fs, `<div class="card"><strong>Summary:</strong> ${summary.total} assessments · ${summary.completed} completed · ${summary.pending} pending · ${summary.pct}% completion</div><table><thead><tr><th>#</th><th>Course</th><th>Class</th><th>Teacher</th><th>Completed</th><th>Partial</th><th>Not entered</th><th>Status</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="8">No records</td></tr>'}</tbody></table>`);
      return;
    }
    if (kind === 'pending') {
      const rowsHtml = pendingAssessments.map((a, i) => {
        const st = statusChip(assessmentCompletion(a));
        const cls = assessmentCompletion(a) === 'PARTIAL' ? 'warn' : 'bad';
        return `<tr><td>${i + 1}</td><td>${escapeHtml(classLabel(a) || '—')}</td><td>${escapeHtml(a.subject?.name || a.title)}</td><td>${escapeHtml(a.createdByName || '—')}</td><td>${escapeHtml(a.component?.name || a.title)}</td><td class="${cls}">${escapeHtml(st.label)}</td></tr>`;
      }).join('');
      downloadHtmlReport('pending-marks-report.pdf', 'Pending Marks Report', period, fs, `<div class="card"><strong>Pending assessments:</strong> ${pendingAssessments.length}</div><table><thead><tr><th>#</th><th>Class</th><th>Course</th><th>Teacher</th><th>Assessment</th><th>Status</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="6">No pending marks</td></tr>'}</tbody></table>`);
      return;
    }
    const rowsHtml = teacherGroups.map((t, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(t.teacher)}</td><td>${t.assessments.length}</td><td class="ok">${t.completed}</td><td class="${t.pending ? 'bad' : 'ok'}">${t.pending}</td><td>${t.progress}%</td></tr>`).join('');
    downloadHtmlReport('teacher-marks-tracking.pdf', 'Teacher Marks Tracking', period, fs, `<div class="card"><strong>Teachers:</strong> ${teacherGroups.length} · <strong>Pending follow-up:</strong> ${summary.teachersPending}</div><table><thead><tr><th>#</th><th>Teacher</th><th>Assigned/Recorded</th><th>Completed</th><th>Pending</th><th>Progress</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="6">No records</td></tr>'}</tbody></table>`);
  }

  const tabs: { id: MonitorTab; label: string; icon: typeof FactCheckOutlinedIcon }[] = [
    { id: 'courses', label: 'Course Monitoring', icon: FactCheckOutlinedIcon },
    { id: 'pending', label: 'Pending Marks', icon: PendingActionsOutlinedIcon },
    { id: 'teachers', label: 'Teacher Tracking', icon: GroupsOutlinedIcon },
  ];

  const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } } as const;

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid #e6ebf2', bgcolor: '#fff', boxShadow: '0 6px 18px rgba(0,4,53,0.05)' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', gap: 1.25, alignItems: { lg: 'center' }, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#FCB038', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Academic Check-In</Typography>
            <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.55rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>Course Monitoring</Typography>
            <Typography sx={{ fontSize: '0.84rem', color: '#64748b', mt: 0.35 }}>Monitor submitted, partial, and pending marks by class, course, and teacher.</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Refresh</Button>
            <Button variant="contained" startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => exportPdf(tab)} sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, bgcolor: NAVY, '&:hover': { bgcolor: '#09145e' } }}>Export PDF</Button>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }, gap: 1.1 }}>
          <TextField select size="small" label="Academic year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} sx={inputSx}>
            {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}{y === settings?.currentAcademicYear ? ' (active)' : ''}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Term" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} sx={inputSx}>
            {termOptions.map((t) => <MenuItem key={t} value={t}>{t}{t === settings?.currentTerm ? ' (active)' : ''}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setCourseName(''); setTeacherName(''); }} sx={inputSx}>
            <MenuItem value="">All classes</MenuItem>
            {classes.map((c) => <MenuItem key={c.id} value={c.id}>{classOptionLabel(c)}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Course (timetable)" value={courseName} onChange={(e) => setCourseName(e.target.value)} sx={inputSx} disabled={!!classId && courseOptions.length === 0}>
            <MenuItem value="">All courses</MenuItem>
            {courseOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Teacher (timetable)" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} sx={inputSx} disabled={!!classId && teacherOptions.length === 0}>
            <MenuItem value="">All teachers</MenuItem>
            {teacherOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Marks status" value={status} onChange={(e) => setStatus(e.target.value as any)} sx={inputSx}>
            <MenuItem value="ALL">All statuses</MenuItem>
            <MenuItem value="COMPLETED">Entered / Completed</MenuItem>
            <MenuItem value="PARTIAL">Partially entered</MenuItem>
            <MenuItem value="NOT_ENTERED">Not entered</MenuItem>
          </TextField>
          <TextField size="small" label="Assessment type" value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} placeholder="CAT, Exam, Quiz..." sx={inputSx} />
          <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Course, class, teacher, assessment..." sx={inputSx} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }} />
        </Box>
        {classId ? <Typography sx={{ mt: 1, fontSize: '0.75rem', color: '#64748b' }}>Courses and teachers are filtered from timetable configuration for the selected class{selectedTtClass ? ` (${selectedTtClass.className})` : ''}.</Typography> : null}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.1 }}>
        <MiniStat label="Assessments" value={summary.total} sub="Across selected filters" />
        <MiniStat label="Completed" value={summary.completed} sub={`${summary.pct}% completion`} tone="green" />
        <MiniStat label="Pending" value={summary.pending} sub="Not fully completed" tone="amber" />
        <MiniStat label="Teachers pending" value={summary.teachersPending} sub="Need follow-up" tone="red" />
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.25 }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Button key={t.id} onClick={() => setTab(t.id)} startIcon={<Icon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', borderRadius: 999, px: 1.5, py: 0.8, bgcolor: active ? NAVY : '#fff', color: active ? '#fff' : '#475569', border: '1px solid', borderColor: active ? NAVY : '#e2e8f0', '&:hover': { bgcolor: active ? '#09145e' : '#f8fafc' } }}>
              {t.label}
            </Button>
          );
        })}
      </Box>

      {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>
          <CircularProgress size={26} sx={{ color: NAVY }} />
          <Typography sx={{ color: '#64748b', fontWeight: 600 }}>Loading monitoring data…</Typography>
        </Box>
      ) : tab === 'courses' ? (
        <Box sx={{ display: 'grid', gap: 1.1 }}>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            {courseGroups.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: '#64748b', bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>No course records match your filters.</Box> : courseGroups.map((g) => {
              const st = statusChip(g.overall);
              return (
                <Box key={g.key} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}><Typography sx={{ fontWeight: 800, color: NAVY }}>{g.subject}</Typography><Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }} /></Box>
                  <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>{g.className} · {g.teacher}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.4 }}>{g.completed}/{g.assessments.length} completed · {g.partial} partial · {g.none} not entered</Typography>
                  <Button size="small" variant="outlined" onClick={() => void openCourseModal(g.key)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>View details</Button>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>{['Course', 'Class', 'Teacher', 'Assessments', 'Completed', 'Pending', 'Status', 'Action'].map((h) => <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.68rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {courseGroups.length === 0 ? <TableRow><TableCell colSpan={8} sx={{ py: 8, textAlign: 'center', color: '#94a3b8' }}>No course records match your filters.</TableCell></TableRow> : courseGroups.map((g) => {
                    const st = statusChip(g.overall);
                    return (
                      <TableRow key={g.key} hover>
                        <TableCell sx={{ fontWeight: 700, color: NAVY }}>{g.subject}</TableCell>
                        <TableCell>{g.className}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{g.teacher}</TableCell>
                        <TableCell>{g.assessments.length}</TableCell>
                        <TableCell sx={{ color: '#166534', fontWeight: 700 }}>{g.completed}</TableCell>
                        <TableCell sx={{ color: g.partial + g.none ? '#92400e' : '#64748b', fontWeight: 700 }}>{g.partial + g.none}</TableCell>
                        <TableCell><Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }} /></TableCell>
                        <TableCell><Button size="small" variant="outlined" onClick={() => void openCourseModal(g.key)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>View</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      ) : tab === 'pending' ? (
        <Box sx={{ display: 'grid', gap: 1.1 }}>
          <Box sx={{ p: 1.25, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY }}>Pending assessments: {pendingAssessments.length}</Typography>
            <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => exportPdf('pending')} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Export pending PDF</Button>
          </Box>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            {pendingAssessments.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: '#64748b', bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>No pending marks.</Box> : pendingAssessments.map((a) => {
              const st = statusChip(assessmentCompletion(a));
              return (
                <Box key={a.id} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography sx={{ fontWeight: 800, color: NAVY }}>{a.subject?.name || a.title}</Typography><Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }} /></Box>
                  <Typography sx={{ fontSize: '0.82rem', color: '#475569', mt: 0.25 }}>{classLabel(a) || '—'} · {a.createdByName || '—'}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.25 }}>{a.component?.name || a.title}</Typography>
                  <Button size="small" variant="outlined" onClick={() => setReviewId(a.id)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>View marks</Button>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small"><TableHead><TableRow>{['Class', 'Course', 'Teacher', 'Assessment', 'Status', 'Action'].map((h) => <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.68rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {pendingAssessments.length === 0 ? <TableRow><TableCell colSpan={6} sx={{ py: 8, textAlign: 'center', color: '#94a3b8' }}>No pending marks.</TableCell></TableRow> : pendingAssessments.map((a) => {
                    const st = statusChip(assessmentCompletion(a));
                    return (<TableRow key={a.id} hover><TableCell>{classLabel(a) || '—'}</TableCell><TableCell sx={{ fontWeight: 700, color: NAVY }}>{a.subject?.name || a.title}</TableCell><TableCell sx={{ color: '#64748b' }}>{a.createdByName || '—'}</TableCell><TableCell>{a.component?.name || a.title}</TableCell><TableCell><Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }} /></TableCell><TableCell><Button size="small" variant="outlined" onClick={() => setReviewId(a.id)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>View</Button></TableCell></TableRow>);
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.1 }}>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            {teacherGroups.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', color: '#64748b', bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>No teacher records.</Box> : teacherGroups.map((t) => (
              <Box key={t.teacher} sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography sx={{ fontWeight: 800, color: NAVY }}>{t.teacher}</Typography><Chip size="small" label={`${t.progress}%`} sx={{ fontWeight: 700, bgcolor: t.progress >= 80 ? '#dcfce7' : t.progress >= 50 ? '#fef3c7' : '#fee2e2', color: t.progress >= 80 ? '#166534' : t.progress >= 50 ? '#92400e' : '#991b1b' }} /></Box>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mt: 0.25 }}>{t.assessments.length} assessments · {t.completed} completed · {t.pending} pending</Typography>
                <Box sx={{ mt: 1, height: 8, borderRadius: 999, bgcolor: '#e9eef5', overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${t.progress}%`, bgcolor: t.progress >= 80 ? '#16a34a' : t.progress >= 50 ? '#f59e0b' : '#dc2626' }} /></Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small"><TableHead><TableRow>{['Teacher', 'Assigned/Recorded', 'Completed', 'Pending', 'Progress'].map((h) => <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.68rem', color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase' }}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {teacherGroups.length === 0 ? <TableRow><TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: '#94a3b8' }}>No teacher records.</TableCell></TableRow> : teacherGroups.map((t) => (
                    <TableRow key={t.teacher} hover>
                      <TableCell sx={{ fontWeight: 700, color: NAVY }}>{t.teacher}</TableCell>
                      <TableCell>{t.assessments.length}</TableCell>
                      <TableCell sx={{ color: '#166534', fontWeight: 700 }}>{t.completed}</TableCell>
                      <TableCell sx={{ color: t.pending ? '#991b1b' : '#64748b', fontWeight: 700 }}>{t.pending}</TableCell>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}><Box sx={{ flex: 1, height: 8, borderRadius: 999, bgcolor: '#e9eef5', overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${t.progress}%`, bgcolor: t.progress >= 80 ? '#16a34a' : t.progress >= 50 ? '#f59e0b' : '#dc2626' }} /></Box><Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{t.progress}%</Typography></Box></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      <Dialog open={Boolean(openCourse)} onClose={() => setCourseModalKey(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: NAVY, pr: 6 }}>{openCourse ? `${openCourse.subject} · ${openCourse.className}` : 'Course details'}<IconButton onClick={() => setCourseModalKey(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
        <DialogContent dividers>
          {openCourse ? (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 1, mb: 1.5 }}>
                {[['Teacher', openCourse.teacher], ['Class', openCourse.className], ['Academic year', filterYear || '—'], ['Term', filterTerm || '—']].map(([k, v]) => (
                  <Box key={k} sx={{ p: 1.1, border: '1px solid #eef2f7', borderRadius: 2, bgcolor: '#f8fafc' }}><Typography sx={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{k}</Typography><Typography sx={{ fontWeight: 700, color: NAVY }}>{v}</Typography></Box>
                ))}
              </Box>
              <Box sx={{ mb: 1.25 }}><Chip size="small" label={statusChip(openCourse.overall).label} sx={{ bgcolor: statusChip(openCourse.overall).bg, color: statusChip(openCourse.overall).color, border: `1px solid ${statusChip(openCourse.overall).border}`, fontWeight: 700 }} /></Box>
              {courseMarksLoading ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={22} /></Box> : null}
              <TableContainer sx={{ border: '1px solid #eef2f7', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead><TableRow>{['Assessment', 'Marks entered', 'Status', 'Action'].map((h) => <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.7rem', color: '#64748b', bgcolor: '#f8fafc' }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {openCourse.assessments.map((a) => {
                      const st = statusChip(assessmentCompletion(a));
                      const marks = courseMarks[a.id];
                      const entered = marks ? marks.filter((m) => m.score != null || m.markStatus === 'PRESENT').length : marksScoredCount(a);
                      const total = marks?.length;
                      return (
                        <TableRow key={a.id} hover>
                          <TableCell sx={{ fontWeight: 700, color: NAVY }}>{a.component?.name || a.title}</TableCell>
                          <TableCell>{entered}{total ? ` / ${total}` : ''}</TableCell>
                          <TableCell><Chip size="small" label={st.label} sx={{ bgcolor: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }} /></TableCell>
                          <TableCell><Button size="small" variant="outlined" onClick={() => setReviewId(a.id)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>View marks</Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      <AssessmentReviewDrawer open={Boolean(reviewId)} assessmentId={reviewId} onClose={() => setReviewId(null)} />
    </Box>
  );
}
