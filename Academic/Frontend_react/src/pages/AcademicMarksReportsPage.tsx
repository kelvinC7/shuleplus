import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { listAssessments, listTimetableClassConfig, smListClasses } from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type { ApiAssessment, ApiClass, TimetableClassCatalog } from '@/types';
import { NAVY, classLabel, isPublishedRecord, isTeacherScheduledAssessment, marksScoredCount } from '@/lib/assessment-records';

type CompletionStatus = 'COMPLETED' | 'PARTIAL' | 'NOT_ENTERED';

function classOptionLabel(c: { name: string; stream?: string | null }) { return c.stream ? `${c.name} ${c.stream}` : c.name; }
function assessmentCompletion(a: ApiAssessment): CompletionStatus {
  const n = marksScoredCount(a);
  if (n <= 0) return 'NOT_ENTERED';
  if (isPublishedRecord(a)) return 'COMPLETED';
  return 'PARTIAL';
}
function courseKey(a: ApiAssessment) {
  return [a.classId || classLabel(a) || 'na', a.subjectId || a.subject?.name || a.title || 'na', a.createdByName || a.createdBy || 'na'].join('::');
}
function escapeHtml(v: string) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function downloadHtmlReport(filename: string, title: string, subtitle: string, filterSummary: string, bodyHtml: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title>
  <style>@page{margin:14mm}body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0f172a;margin:0;padding:24px}
  .hero{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:16px}.hero-top{background:linear-gradient(135deg,#000435,#102a7a);color:#fff;padding:18px 20px}
  .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FCB038;margin-bottom:6px}
  h1{margin:0;font-size:22px}.sub{margin:6px 0 0;color:rgba(255,255,255,.82);font-size:13px}.meta{padding:12px 20px;background:#f8fafc;color:#475569;font-size:12px}
  .card{border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e2e8f0;padding:9px 10px;text-align:left;vertical-align:top}
  th{background:#000435;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.04em}tr:nth-child(even) td{background:#f8fafc}
  .ok{color:#166534;font-weight:700}.warn{color:#92400e;font-weight:700}.bad{color:#991b1b;font-weight:700}
  .footer{margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}</style></head><body>
  <div class="hero"><div class="hero-top"><div class="badge">Academic Check-In</div><h1>${escapeHtml(title)}</h1><p class="sub">${escapeHtml(subtitle)}</p></div><div class="meta"><strong>Filters:</strong> ${escapeHtml(filterSummary)}<br/><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</div></div>
  ${bodyHtml}<div class="footer"><span>Prepared by: ____________________</span><span>Authorized signature: ____________________</span><span>Shule+ Reports</span></div><script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close();
}

export default function AcademicMarksReportsPage() {
  const { settings } = useAcademicSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiAssessment[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [ttConfig, setTtConfig] = useState<TimetableClassCatalog[]>([]);

  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [status, setStatus] = useState<'ALL' | CompletionStatus>('ALL');
  const [assessmentType, setAssessmentType] = useState('');

  useEffect(() => {
    if (settings?.currentAcademicYear && !filterYear) setFilterYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !filterTerm) setFilterTerm(settings.currentTerm);
  }, [settings, filterYear, filterTerm]);

  useEffect(() => { smListClasses().then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => setClasses([])); }, []);
  useEffect(() => {
    listTimetableClassConfig({ term: filterTerm || undefined, academicYear: filterYear || undefined })
      .then((d) => setTtConfig(Array.isArray(d) ? d : [])).catch(() => setTtConfig([]));
  }, [filterTerm, filterYear]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const assessments = await listAssessments({ academicYear: filterYear || undefined, term: filterTerm || undefined, classId: classId || undefined });
      setRows((assessments ?? []).filter(isTeacherScheduledAssessment));
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || 'Could not load reports data');
      setRows([]);
    } finally { setLoading(false); }
  }, [filterYear, filterTerm, classId]);

  useEffect(() => { void load(); }, [load]);

  const yearOptions = useMemo(() => {
    const base = settings?.academicYears?.length ? [...settings.academicYears] : [];
    if (settings?.currentAcademicYear && !base.includes(settings.currentAcademicYear)) base.unshift(settings.currentAcademicYear);
    if (filterYear && !base.includes(filterYear)) base.unshift(filterYear);
    return [...new Set(base.length ? base : [new Date().getFullYear().toString()])];
  }, [settings, filterYear]);
  const termOptions = useMemo(() => {
    const base = settings?.terms?.length ? [...settings.terms] : ['Term 1', 'Term 2', 'Term 3'];
    if (settings?.currentTerm && !base.includes(settings.currentTerm)) base.unshift(settings.currentTerm);
    if (filterTerm && !base.includes(filterTerm)) base.unshift(filterTerm);
    return [...new Set(base)];
  }, [settings, filterTerm]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) || null, [classes, classId]);
  const selectedTtClass = useMemo(() => ttConfig.find((c) => c.classId === classId) || ttConfig.find((c) => selectedClass && c.className === classOptionLabel(selectedClass)) || null, [ttConfig, classId, selectedClass]);

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

  const filtered = useMemo(() => {
    let list = rows;
    if (classId) list = list.filter((a) => a.classId === classId);
    if (courseName) list = list.filter((a) => (a.subject?.name || '').toLowerCase() === courseName.toLowerCase() || (a.subject?.name || '').toLowerCase().includes(courseName.toLowerCase()));
    if (teacherName) list = list.filter((a) => (a.createdByName || '').toLowerCase() === teacherName.toLowerCase() || (a.createdByName || '').toLowerCase().includes(teacherName.toLowerCase()));
    if (assessmentType.trim()) list = list.filter((a) => [a.component?.name, a.template?.name, a.title].filter(Boolean).join(' ').toLowerCase().includes(assessmentType.toLowerCase()));
    if (status !== 'ALL') list = list.filter((a) => assessmentCompletion(a) === status);
    return list;
  }, [rows, classId, courseName, teacherName, assessmentType, status]);

  const courseGroups = useMemo(() => {
    const map = new Map<string, { key: string; className: string; subject: string; teacher: string; assessments: ApiAssessment[] }>();
    for (const a of filtered) {
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
  }, [filtered, selectedTtClass]);
  const pendingAssessments = useMemo(() => filtered.filter((a) => assessmentCompletion(a) !== 'COMPLETED'), [filtered]);
  const teacherGroups = useMemo(() => {
    const map = new Map<string, { teacher: string; assessments: ApiAssessment[] }>();
    for (const a of filtered) { const t = a.createdByName || 'Unassigned'; if (!map.has(t)) map.set(t, { teacher: t, assessments: [] }); map.get(t)!.assessments.push(a); }
    return [...map.values()].map((g) => { const completed = g.assessments.filter((a) => assessmentCompletion(a) === 'COMPLETED').length; const pending = g.assessments.length - completed; return { ...g, completed, pending, progress: g.assessments.length ? Math.round((completed / g.assessments.length) * 100) : 0 }; }).sort((a, b) => a.progress - b.progress || b.pending - a.pending);
  }, [filtered]);
  const summary = useMemo(() => {
    const total = filtered.length; const completed = filtered.filter((a) => assessmentCompletion(a) === 'COMPLETED').length; const pending = total - completed; const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, pct, teachersPending: new Set(filtered.filter((a) => assessmentCompletion(a) !== 'COMPLETED').map((a) => a.createdByName || 'Unassigned')).size };
  }, [filtered]);

  const filterSummary = () => [`Year: ${filterYear || 'All'}`, `Term: ${filterTerm || 'All'}`, `Class: ${selectedClass ? classOptionLabel(selectedClass) : selectedTtClass?.className || 'All'}`, `Course: ${courseName || 'All'}`, `Teacher: ${teacherName || 'All'}`, `Status: ${status}`, assessmentType ? `Assessment type: ${assessmentType}` : null].filter(Boolean).join(' · ');

  function exportReport(kind: 'overview' | 'courses' | 'pending' | 'teachers') {
    const period = [filterTerm, filterYear].filter(Boolean).join(' · ') || 'Selected period'; const fs = filterSummary();
    if (kind === 'overview' || kind === 'courses') {
      const rowsHtml = courseGroups.map((g, i) => { const cls = g.overall === 'COMPLETED' ? 'ok' : g.overall === 'PARTIAL' ? 'warn' : 'bad'; const label = g.overall === 'COMPLETED' ? 'Completed' : g.overall === 'PARTIAL' ? 'Partially entered' : 'Not entered'; return `<tr><td>${i + 1}</td><td>${escapeHtml(g.subject)}</td><td>${escapeHtml(g.className)}</td><td>${escapeHtml(g.teacher)}</td><td>${g.completed}/${g.assessments.length}</td><td>${g.partial}</td><td>${g.none}</td><td class="${cls}">${label}</td></tr>`; }).join('');
      downloadHtmlReport(kind === 'overview' ? 'marks-overview-report.pdf' : 'course-marks-report.pdf', kind === 'overview' ? 'Marks Submission Overview' : 'Course Marks Submission Report', period, fs, `<div class="card"><strong>Summary:</strong> ${summary.total} assessments · ${summary.completed} completed · ${summary.pending} pending · ${summary.pct}% completion · ${summary.teachersPending} teachers pending</div><table><thead><tr><th>#</th><th>Course</th><th>Class</th><th>Teacher</th><th>Completed</th><th>Partial</th><th>Not entered</th><th>Status</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="8">No records</td></tr>'}</tbody></table>`);
      return;
    }
    if (kind === 'pending') {
      const rowsHtml = pendingAssessments.map((a, i) => { const st = assessmentCompletion(a); const cls = st === 'PARTIAL' ? 'warn' : 'bad'; return `<tr><td>${i + 1}</td><td>${escapeHtml(classLabel(a) || '—')}</td><td>${escapeHtml(a.subject?.name || a.title)}</td><td>${escapeHtml(a.createdByName || '—')}</td><td>${escapeHtml(a.component?.name || a.title)}</td><td class="${cls}">${st === 'PARTIAL' ? 'Partially entered' : 'Not entered'}</td></tr>`; }).join('');
      downloadHtmlReport('pending-marks-report.pdf', 'Pending Marks Report', period, fs, `<div class="card"><strong>Pending assessments:</strong> ${pendingAssessments.length}</div><table><thead><tr><th>#</th><th>Class</th><th>Course</th><th>Teacher</th><th>Assessment</th><th>Status</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="6">No pending marks</td></tr>'}</tbody></table>`);
      return;
    }
    const rowsHtml = teacherGroups.map((t, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(t.teacher)}</td><td>${t.assessments.length}</td><td class="ok">${t.completed}</td><td class="${t.pending ? 'bad' : 'ok'}">${t.pending}</td><td>${t.progress}%</td></tr>`).join('');
    downloadHtmlReport('teacher-marks-tracking.pdf', 'Teacher Marks Tracking Report', period, fs, `<div class="card"><strong>Teachers:</strong> ${teacherGroups.length} · <strong>Pending follow-up:</strong> ${summary.teachersPending}</div><table><thead><tr><th>#</th><th>Teacher</th><th>Assigned/Recorded</th><th>Completed</th><th>Pending</th><th>Progress</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="6">No records</td></tr>'}</tbody></table>`);
  }

  const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } } as const;

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, border: '1px solid #e6ebf2', bgcolor: '#fff', boxShadow: '0 6px 18px rgba(0,4,53,0.05)' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', gap: 1.25, alignItems: { lg: 'center' }, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#FCB038', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Academic Check-In</Typography>
            <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.55rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>Marks Reports</Typography>
            <Typography sx={{ fontSize: '0.84rem', color: '#64748b', mt: 0.35 }}>Generate modern PDF reports for marks submission, pending work, and teacher progress.</Typography>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, alignSelf: { xs: 'flex-start', lg: 'center' } }}>Refresh</Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }, gap: 1.1 }}>
          <TextField select size="small" label="Academic year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} sx={inputSx}>{yearOptions.map((y) => <MenuItem key={y} value={y}>{y}{y === settings?.currentAcademicYear ? ' (active)' : ''}</MenuItem>)}</TextField>
          <TextField select size="small" label="Term" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} sx={inputSx}>{termOptions.map((t) => <MenuItem key={t} value={t}>{t}{t === settings?.currentTerm ? ' (active)' : ''}</MenuItem>)}</TextField>
          <TextField select size="small" label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setCourseName(''); setTeacherName(''); }} sx={inputSx}><MenuItem value="">All classes</MenuItem>{classes.map((c) => <MenuItem key={c.id} value={c.id}>{classOptionLabel(c)}</MenuItem>)}</TextField>
          <TextField select size="small" label="Course (timetable)" value={courseName} onChange={(e) => setCourseName(e.target.value)} sx={inputSx}><MenuItem value="">All courses</MenuItem>{courseOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
          <TextField select size="small" label="Teacher (timetable)" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} sx={inputSx}><MenuItem value="">All teachers</MenuItem>{teacherOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
          <TextField select size="small" label="Marks status" value={status} onChange={(e) => setStatus(e.target.value as any)} sx={inputSx}><MenuItem value="ALL">All statuses</MenuItem><MenuItem value="COMPLETED">Entered / Completed</MenuItem><MenuItem value="PARTIAL">Partially entered</MenuItem><MenuItem value="NOT_ENTERED">Not entered</MenuItem></TextField>
          <TextField size="small" label="Assessment type" value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} placeholder="CAT, Exam, Quiz..." sx={inputSx} />
        </Box>
      </Box>

      {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3 }}><CircularProgress size={24} sx={{ color: NAVY }} /><Typography sx={{ color: '#64748b' }}>Loading report data…</Typography></Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.1 }}>
            {[['Assessments', summary.total], ['Completed', summary.completed], ['Pending', summary.pending], ['Completion', `${summary.pct}%`]].map(([l, v]) => (
              <Box key={String(l)} sx={{ p: 1.5, borderRadius: 3, border: '1px solid #e6ebf2', bgcolor: '#fff' }}>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{l}</Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: NAVY, mt: 0.25 }}>{v}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' }, gap: 1.25 }}>
            {[
              { title: 'Overall marks submission', desc: 'School-wide completion summary for the selected period and filters.', kind: 'overview' as const },
              { title: 'Course marks submission', desc: 'Completion by course/class and assigned teacher with status breakdown.', kind: 'courses' as const },
              { title: 'Pending marks report', desc: 'Assessments and courses not completed or not entered, ready for follow-up.', kind: 'pending' as const },
              { title: 'Teacher marks tracking', desc: 'Teacher progress, completed submissions, and pending assessments.', kind: 'teachers' as const },
            ].map((r) => (
              <Box key={r.title} sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#fff', border: '1px solid #e6ebf2', borderRadius: 3, boxShadow: '0 4px 14px rgba(0,4,53,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1rem' }}>{r.title}</Typography>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'rgba(0,4,53,0.05)', color: NAVY }}><PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} /></Box>
                </Box>
                <Typography sx={{ fontSize: '0.84rem', color: '#64748b', mt: 0.5, mb: 1.25 }}>{r.desc}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#475569', mb: 1.5, p: 1, bgcolor: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 2 }}>{filterSummary()}</Typography>
                <Button variant="contained" startIcon={<DownloadOutlinedIcon />} onClick={() => exportReport(r.kind)} sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#09145e' } }}>Download / Print PDF</Button>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>Reports use saved assessment records and current filters. Completion is best-effort from recorded marks/status.</Typography>
        </>
      )}
    </Box>
  );
}
