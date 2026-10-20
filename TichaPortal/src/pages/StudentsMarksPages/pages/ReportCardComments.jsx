import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import useTpAcademic from '../../../hooks/useTpAcademic';
import {
  fetchClassStudents,
  fetchMyClasses,
  fetchReportCardComments,
  fetchReportCardSettings,
  saveReportCardComments,
  tpApiError,
} from '../../../services/teacherPortalApi';
import { useTpToast } from '../../../components/TpToast.jsx';

export default function ReportCardComments() {
  const { academicYear, term, ready, settings } = useTpAcademic();
  const toast = useTpToast();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [comment, setComment] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const year = academicYear || settings?.currentAcademicYear || '';
  const trm = term || settings?.currentTerm || '';

  useEffect(() => {
    if (!ready) return;
    fetchReportCardSettings()
      .then((s) => {
        setEnabled(s?.enableClassTeacherComments !== false);
        setHint(s?.classTeacherCommentHint || '');
      })
      .catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready || !year || !trm) return;
    fetchMyClasses({ academicYear: year, term: trm })
      .then((r) => setClasses(r?.classes ?? []))
      .catch(() => setClasses([]));
  }, [ready, year, trm]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId('');
      return;
    }
    fetchClassStudents(classId, undefined, year)
      .then((list) => setStudents(Array.isArray(list) ? list : list?.rows ?? []))
      .catch(() => setStudents([]));
  }, [classId, year]);

  const loadComment = useCallback(async () => {
    if (!studentId || !classId || !year) return;
    setLoading(true);
    try {
      const row = await fetchReportCardComments({
        studentId,
        classId,
        academicYear: year,
        term: trm || 'All',
      });
      setComment(row?.classTeacherComment || '');
    } catch {
      setComment('');
    } finally {
      setLoading(false);
    }
  }, [studentId, classId, year, trm]);

  useEffect(() => {
    void loadComment();
  }, [loadComment]);

  async function handleSave(e) {
    e.preventDefault();
    if (!enabled) {
      toast.error('Class teacher comments are disabled in school settings');
      return;
    }
    setSaving(true);
    try {
      await saveReportCardComments({
        studentId,
        classId,
        academicYear: year,
        term: trm || 'All',
        classTeacherComment: comment,
        role: 'class',
      });
      toast.success('Comment saved on report card');
    } catch (err) {
      toast.error(tpApiError(err, 'Could not save comment'));
    } finally {
      setSaving(false);
    }
  }

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        label: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.studentCode,
      })),
    [students]
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-[#000435]">Report card comments</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {year} · {trm}
        </p>
      </div>

      {!enabled && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Class teacher comments are turned off. Ask your organization admin to enable them under Academic settings.
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Class</span>
          <select className="tp-input mt-1 w-full text-sm" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Student</span>
          <select
            className="tp-input mt-1 w-full text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={!classId}
          >
            <option value="">Select student</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Comment</span>
          {hint ? <p className="text-xs text-slate-500 mt-0.5">{hint}</p> : null}
          <textarea
            className="tp-input mt-1 min-h-[120px] w-full text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!studentId || loading}
            placeholder="Write a short comment for this student’s report card"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !studentId || !enabled}
          className="tp-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save comment
        </button>
      </form>
    </div>
  );
}
