import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, Download, Loader2, Lock,
  Save, Search, Send, Clock,
} from 'lucide-react';
import {
  enterAssessmentMarks,
  fetchAssessment,
  fetchAssessmentMarks,
  fetchClassStudents,
  fetchGradingScale,
  fetchSchoolProfile,
  fetchCourseDefaultMarks,
  tpApiError,
} from '../services/teacherPortalApi';
import { exportAssessmentMarksPdf } from '../utils/exportAssessmentMarksPdf.js';
import { submitAssessmentMarks, fetchAssessmentActivity, fetchMyCorrectionRequests } from '../services/coursesMarksApi.js';
import RequestEditModal from './coursesMarks/RequestEditModal.jsx';
import { useTpToast } from '../components/TpToast.jsx';
import {
  UI_STATUS,
  assessmentMaxMark,
  canEditMarks,
  gradeFromScale,
  inferAcademicLevel,
  isLockedStatus,
  markScoreValidationError,
  parseMarkScore,
} from './coursesMarks/statusUtils.js';
import { buildPerformanceStats, collectScoredRows } from '../utils/assessmentPerformance.js';
import AssessmentPerformancePanel from './AssessmentPerformancePanel.jsx';

function StatusBanner({ status, correction }) {
  const ui = correction?.status === 'PENDING' ? 'edit_pending' : correction?.status === 'REJECTED' ? 'locked' : null;
  const key = ui || (String(status || 'DRAFT').toUpperCase() === 'SUBMITTED' ? 'submitted' : isLockedStatus(status) ? 'locked' : 'draft');
  const cfg = UI_STATUS[key] || UI_STATUS.draft;

  if (key === 'draft') return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${cfg.color}`}>
      <Lock size={18} className="shrink-0 mt-0.5" />
      <div className="text-sm">
        {correction?.status === 'PENDING' && (
          <>
            <p className="font-semibold">Edit request pending</p>
            <p className="text-xs mt-0.5 opacity-80">Your request is waiting for Academic review.</p>
          </>
        )}
        {correction?.status === 'REJECTED' && (
          <>
            <p className="font-semibold">Edit request rejected</p>
            <p className="text-xs mt-0.5 opacity-80">{correction.reviewNotes || 'Contact your marks administrator.'}</p>
          </>
        )}
        {!correction && isLockedStatus(status) && (
          <>
            <p className="font-semibold">These marks have been submitted</p>
            <p className="text-xs mt-0.5 opacity-80">Direct editing is blocked. Use Request Edit if a correction is needed.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AssessmentMarks() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadMenuRef = useRef(null);
  const [pdfScoreMode, setPdfScoreMode] = useState('entered');
  const [courseDefaultTotal, setCourseDefaultTotal] = useState(null);
  const [gradingScale, setGradingScale] = useState([]);
  const toast = useTpToast();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('marks');
  const [activity, setActivity] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const inputRefs = useRef([]);
  const saveTimer = useRef(null);

  const maxMark = assessmentMaxMark(assessment);
  const locked = isLockedStatus(assessment?.status);
  const editable = canEditMarks(assessment?.status, assessment?.correction_request);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, marksPayload, actRes, corrRes] = await Promise.all([
        fetchAssessment(id),
        fetchAssessmentMarks(id).catch(() => null),
        fetchAssessmentActivity(id).catch(() => ({ data: { events: [] } })),
        fetchMyCorrectionRequests().catch(() => ({ data: { rows: [] } })),
      ]);
      const correction = (corrRes?.data?.rows || []).find((c) => c.assessmentId === id) || null;
      setAssessment({ ...a, correction_request: correction });
      setActivity(actRes?.data?.events || actRes?.events || []);

      const level = inferAcademicLevel(a);
      try {
        setGradingScale(await fetchGradingScale(level));
      } catch {
        setGradingScale([]);
      }

      const existingList = Array.isArray(marksPayload?.marks)
        ? marksPayload.marks
        : Array.isArray(marksPayload)
          ? marksPayload
          : [];

      let studentList = [];
      const className = a.class ? [a.class.name, a.class.stream].filter(Boolean).join(' ') : undefined;
      const classId = a.classId || a.class?.id;
      if (classId || className) {
        try {
          studentList = await fetchClassStudents(classId || className, className, a.academicYear);
          if (!studentList.length && className && classId && classId !== className) {
            studentList = await fetchClassStudents(className, className, a.academicYear);
          }
        } catch {
          studentList = [];
        }
      }
      setStudents(Array.isArray(studentList) ? studentList : []);

      const next = {};
      for (const m of existingList) {
        next[m.studentId] = {
          studentId: m.studentId,
          score: m.score != null ? String(m.score) : '',
          markStatus: m.markStatus || 'PRESENT',
        };
      }
      for (const s of studentList) {
        if (!next[s.id]) next[s.id] = { studentId: s.id, score: '', markStatus: 'PRESENT' };
      }
      setEntries(next);

      const subj = a.subject?.name || a.subjectName;
      const cn = className;
      if (subj && a.academicYear && a.term) {
        try {
          const dcm = await fetchCourseDefaultMarks({
            class_name: cn,
            class_id: classId || a.classId,
            subject_name: subj,
            academic_year: a.academicYear,
            term: a.term,
          });
          setCourseDefaultTotal(dcm?.defaultCourseMarks ?? null);
        } catch {
          setCourseDefaultTotal(null);
        }
      } else {
        setCourseDefaultTotal(null);
      }
    } catch (err) {
      toast.error(tpApiError(err, 'Could not load assessment'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!downloadOpen) return undefined;
    function onPointerDown(e) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setDownloadOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setDownloadOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [downloadOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.fullName?.toLowerCase().includes(q) || s.studentCode?.toLowerCase().includes(q));
  }, [students, search]);

  const markIssues = useMemo(() => {
    const invalid = [];
    for (const s of students) {
      const e = entries[s.id];
      if (e?.markStatus !== 'PRESENT') continue;
      const score = parseMarkScore(e?.score);
      if (score == null) {
        if (e?.score !== '' && e?.score != null) {
          invalid.push({ studentId: s.id, studentName: s.fullName, message: 'Enter a valid number.' });
        }
        continue;
      }
      const message = markScoreValidationError(score, maxMark);
      if (message) invalid.push({ studentId: s.id, studentName: s.fullName, message });
    }
    return invalid;
  }, [students, entries, maxMark]);

  const stats = useMemo(() => {
    let entered = 0;
    let missing = 0;
    let total = 0;
    const invalidIds = new Set(markIssues.map((i) => i.studentId));
    for (const s of students) {
      const e = entries[s.id];
      if (e?.markStatus !== 'PRESENT') continue;
      const score = parseMarkScore(e?.score);
      if (score != null && !invalidIds.has(s.id)) {
        entered += 1;
        total += score;
      } else if (e?.score === '' || e?.score == null) {
        missing += 1;
      }
    }
    return {
      totalStudents: students.length,
      entered,
      missing,
      invalid: markIssues.length,
      average: entered > 0 ? Math.round((total / entered) * 10) / 10 : null,
    };
  }, [students, entries, markIssues]);

  const performance = useMemo(() => {
    const invalidIds = new Set(markIssues.map((i) => i.studentId));
    const scored = collectScoredRows(students, entries, maxMark, invalidIds);
    return buildPerformanceStats(scored, gradingScale);
  }, [students, entries, maxMark, markIssues, gradingScale]);

  function assertMarksValid() {
    if (!markIssues.length) return true;
    const first = markIssues[0];
    const extra =
      markIssues.length > 1 ? ` (${markIssues.length} students have scores to fix)` : '';
    toast.error(`${first.studentName}: ${first.message}${extra}`);
    return false;
  }

  function updateEntry(studentId, patch) {
    if (!editable) return;
    setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], studentId, ...patch } }));
  }

  const buildMarksPayload = () =>
    students.map((s) => {
      const e = entries[s.id] || {};
      return {
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        score: e.score === '' || e.score == null ? undefined : Number(e.score),
        markStatus: e.markStatus || 'PRESENT',
      };
    });

  async function handleSaveDraft() {
    if (!assertMarksValid()) return;
    setSaving(true);
    try {
      await enterAssessmentMarks(id, buildMarksPayload());
      toast.success('Draft saved');
      setLastSaved(new Date());
    } catch (err) {
      toast.error(tpApiError(err, 'Could not save marks'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf(mode = pdfScoreMode) {
    if (!students.length) {
      toast.error('No students to export.');
      return;
    }
    if (mode === 'converted' && !courseDefaultTotal) {
      toast.error('No course total set in Academic → Courses for this class and subject.');
      return;
    }
    setDownloading(true);
    try {
      let school = null;
      try {
        school = await fetchSchoolProfile();
      } catch {
        school = { schoolName: 'School' };
      }
      await exportAssessmentMarksPdf({
        school,
        assessment,
        students,
        entries,
        gradingScale,
        scoreMode: mode,
        courseDefaultMax: courseDefaultTotal,
      });
      toast.success('Marks sheet downloaded');
      setDownloadOpen(false);
    } catch (err) {
      toast.error(tpApiError(err, 'Could not generate PDF'));
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmit() {
    if (!assertMarksValid()) return;
    setSubmitting(true);
    try {
      await enterAssessmentMarks(id, buildMarksPayload());
      const res = await submitAssessmentMarks(id);
      if (!res?.success && res?.submitted !== true) throw new Error(res?.message || 'Submit failed');
      toast.success('Marks submitted for review');
      await load();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not submit marks'));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!editable || loading || markIssues.length) return undefined;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      enterAssessmentMarks(id, buildMarksPayload()).then(() => setLastSaved(new Date())).catch(() => {});
    }, 8000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [entries, editable, id, loading, students, markIssues.length]);

  function focusRow(idx) {
    inputRefs.current[idx]?.focus();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#000435]/50">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading marks workspace…
      </div>
    );
  }

  const classLabel = assessment?.class ? [assessment.class.name, assessment.class.stream].filter(Boolean).join(' ') : '';
  const componentLabel = assessment?.component?.name || assessment?.title || 'Assessment';

  const statusTone =
    String(assessment?.status || '').toUpperCase() === 'OPEN' || String(assessment?.status || '').toUpperCase() === 'MARK_ENTRY'
      ? 'Scheduled · Approved'
      : assessment?.status;

  return (
    <div className="tp-page space-y-5 pb-12">
      <div className="relative z-10 overflow-visible rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#000435] via-[#000435] to-[#1a1f5c] text-white shadow-lg">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <Link
              to="/assessments/schedule"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={14} /> Back to assessments
            </Link>
            <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
              {assessment?.subject?.name || 'Course'}
              <span className="text-white/60"> · </span>
              {classLabel || 'Class'}
            </h1>
            <p className="mt-1 text-sm text-white/65">
              {componentLabel} · Max {maxMark} marks
              {assessment?.assessmentCode ? (
                <span className="ml-2 font-mono text-xs text-[#FCB038]">{assessment.assessmentCode}</span>
              ) : null}
            </p>
            <span className="mt-3 inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90">
              {statusTone}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {editable && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDraft()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/15"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={submitting || stats.entered === 0}
                  onClick={() => void handleSubmit()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2 text-xs font-bold text-[#000435] hover:bg-[#ffd080]"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Submit marks
                </button>
              </>
            )}
            <div className="relative" ref={downloadMenuRef}>
              <div className="inline-flex overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-white/40">
                <button
                  type="button"
                  disabled={!students.length || downloading}
                  onClick={() => void handleDownloadPdf(pdfScoreMode)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#000435] hover:bg-[#FCB038] disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download PDF
                </button>
                <button
                  type="button"
                  disabled={!students.length}
                  aria-expanded={downloadOpen}
                  aria-haspopup="listbox"
                  onClick={() => setDownloadOpen((o) => !o)}
                  className="inline-flex items-center border-l border-slate-200/80 px-2.5 py-2 text-[#000435] hover:bg-[#FCB038] disabled:opacity-50"
                >
                  <ChevronDown size={16} className={`transition-transform ${downloadOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {downloadOpen && (
                <div
                  role="dialog"
                  aria-label="PDF score format"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(calc(100vw-2rem),18rem)] origin-top-right rounded-xl border border-slate-200 bg-white p-3 text-[#000435] shadow-2xl ring-1 ring-black/5"
                >
                  <label htmlFor="pdf-score-format" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Score format
                  </label>
                  <select
                    id="pdf-score-format"
                    value={pdfScoreMode}
                    onChange={(e) => setPdfScoreMode(e.target.value)}
                    className="mt-1.5 w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-[#000435] shadow-inner focus:border-[#FCB038] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/35"
                  >
                    <option value="entered">As entered (out of {maxMark})</option>
                    <option value="converted" disabled={!courseDefaultTotal}>
                      {courseDefaultTotal
                        ? `Converted (out of ${courseDefaultTotal})`
                        : 'Converted (set total in Academic Courses)'}
                    </option>
                  </select>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    {pdfScoreMode === 'entered'
                      ? `PDF lists students highest to lowest with score / ${maxMark}, %, and grade.`
                      : courseDefaultTotal
                        ? `PDF lists students highest to lowest with course score / ${courseDefaultTotal} (quiz marks shown under each row).`
                        : 'Ask Academic to set the course total under Courses → Course catalog.'}
                  </p>
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void handleDownloadPdf(pdfScoreMode)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#000435] py-2 text-xs font-bold text-white hover:bg-[#000435]/90 disabled:opacity-50"
                  >
                    {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Download now
                  </button>
                </div>
              )}
            </div>
            {locked && (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-2 text-xs font-semibold text-amber-100"
                >
                  Request edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <StatusBanner status={assessment?.status} correction={assessment?.correction_request} />

      {markIssues.length > 0 && editable && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">Some scores are outside the allowed range</p>
          <p className="mt-1 text-xs leading-relaxed text-red-800/90">
            This assessment is marked out of <strong>{maxMark}</strong>. Adjust highlighted scores before saving or submitting.
            {markIssues.length === 1
              ? ` ${markIssues[0].studentName}: ${markIssues[0].message}`
              : ` ${markIssues.length} students need corrections.`}
          </p>
        </div>
      )}

      {lastSaved && editable && (
        <p className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={12} /> Auto-saved {lastSaved.toLocaleTimeString()}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Students', value: stats.totalStudents },
          { label: 'Entered', value: stats.entered },
          { label: 'Missing', value: stats.missing, warn: stats.missing > 0 },
          { label: 'Average', value: stats.average != null ? `${stats.average}/${maxMark}` : '-' },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border px-4 py-3 ${s.warn ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white shadow-sm'}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-[#000435]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="tp-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { id: 'marks', label: 'Marks' },
              { id: 'performance', label: 'Performance' },
              { id: 'activity', label: 'Activity' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  tab === t.id ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'marks' ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student…"
                className="tp-input h-10 w-full pl-10 text-sm"
              />
            </div>
          ) : null}
        </div>

        {tab === 'performance' ? (
          <AssessmentPerformancePanel performance={performance} maxMark={maxMark} />
        ) : tab === 'marks' ? (
          students.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-[#000435]">No students loaded for this class</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                Check that Student Management has active students in {classLabel || 'this class'} for {assessment?.academicYear || 'this year'}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {['#', 'Student', 'Score', 'Grade', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s, idx) => {
                    const e = entries[s.id] || {};
                    const scoreNum = parseMarkScore(e.score);
                    const scoreError =
                      scoreNum != null ? markScoreValidationError(scoreNum, maxMark) : null;
                    const invalid = Boolean(scoreError);
                    const grade = invalid ? null : gradeFromScale(scoreNum, maxMark, gradingScale);
                    const missing =
                      e.markStatus === 'PRESENT' && (e.score === '' || e.score == null) && !invalid;
                    return (
                      <tr key={s.id} className="transition hover:bg-[#FCB038]/[0.06]">
                        <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[#000435]">{s.fullName}</p>
                          <p className="text-[10px] text-slate-400">{s.studentCode}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          {editable ? (
                            <div>
                              <input
                                ref={(el) => {
                                  inputRefs.current[idx] = el;
                                }}
                                type="number"
                                min={0}
                                max={maxMark}
                                step="any"
                                value={e.score ?? ''}
                                onChange={(ev) => updateEntry(s.id, { score: ev.target.value })}
                                aria-invalid={invalid}
                                aria-describedby={invalid ? `score-error-${s.id}` : undefined}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'ArrowDown') {
                                    ev.preventDefault();
                                    focusRow(idx + 1);
                                  }
                                  if (ev.key === 'ArrowUp') {
                                    ev.preventDefault();
                                    focusRow(idx - 1);
                                  }
                                  if (ev.key === 'Enter') {
                                    ev.preventDefault();
                                    focusRow(idx + 1);
                                  }
                                }}
                                className={`h-10 w-24 rounded-xl border text-center font-semibold tabular-nums ${
                                  invalid
                                    ? 'border-red-400 bg-red-50 ring-2 ring-red-200/80'
                                    : 'border-slate-200 focus:border-[#FCB038] focus:outline-none focus:ring-2 focus:ring-[#FCB038]/25'
                                }`}
                              />
                              {invalid && scoreError ? (
                                <p
                                  id={`score-error-${s.id}`}
                                  className="mt-1 max-w-[11rem] text-[10px] font-medium leading-snug text-red-700"
                                >
                                  {scoreError}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="font-bold tabular-nums text-[#000435]">
                              {scoreNum ?? '-'} / {maxMark}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex min-w-[2rem] justify-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-[#000435]">
                            {grade || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {invalid ? (
                            <span className="text-xs font-medium text-red-700">Fix score</span>
                          ) : missing ? (
                            <span className="text-xs font-medium text-amber-700">Missing</span>
                          ) : scoreNum != null ? (
                            <span className="text-xs font-medium text-emerald-700">Done</span>
                          ) : (
                            <span className="text-xs text-slate-400">{e.markStatus}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="space-y-3 p-5">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              activity.map((ev, i) => (
                <div key={i} className="flex gap-3 border-b border-slate-100 pb-3 text-sm last:border-0">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FCB038]" />
                  <div>
                    <p className="font-semibold text-[#000435]">{ev.label}</p>
                    {ev.detail && <p className="mt-0.5 text-xs text-slate-500">{ev.detail}</p>}
                    <p className="mt-1 text-[10px] text-slate-400">{ev.at ? new Date(ev.at).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <RequestEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        assessment={{
          id,
          title: assessment?.title,
          subject: assessment?.subject?.name,
          class_name: classLabel,
          class_id: assessment?.classId || assessment?.class?.id,
          academic_year: assessment?.academicYear,
          max_mark: maxMark,
        }}
        onSuccess={load}
      />
    </div>
  );
}
