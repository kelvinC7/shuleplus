import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { requestMarkEdit } from '../../services/marksApi.js';
import { fetchAssessment, fetchAssessmentMarks, fetchClassStudents } from '../../services/teacherPortalApi';
import { useTpToast } from '../../components/TpToast.jsx';

const REASONS = [
  'Wrong score entered',
  'Student score missing',
  'Calculation error',
  'Incorrect student record',
  'Other',
];

function newRow() {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, studentId: '', currentScore: '', requestedScore: '' };
}

export default function RequestEditModal({ open, onClose, assessment, onSuccess }) {
  const toast = useTpToast();
  const [reasonType, setReasonType] = useState(REASONS[0]);
  const [explanation, setExplanation] = useState('');
  const [rows, setRows] = useState([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [students, setStudents] = useState([]);
  const [marksByStudent, setMarksByStudent] = useState({});
  const [maxMark, setMaxMark] = useState(100);

  const resetForm = useCallback(() => {
    setReasonType(REASONS[0]);
    setExplanation('');
    setRows([newRow()]);
  }, []);

  useEffect(() => {
    if (!open || !assessment?.id) return;
    resetForm();
    let cancelled = false;
    setLoadingRoster(true);
    (async () => {
      try {
        let classId = assessment.class_id || assessment.classId;
        let className = assessment.class_name || assessment.className;
        let academicYear = assessment.academic_year || assessment.academicYear;
        let max = Number(assessment.max_mark ?? assessment.maxMark ?? 100);

        try {
          const detail = await fetchAssessment(assessment.id);
          classId = classId || detail?.classId || detail?.class?.id;
          className = className || (detail?.class ? [detail.class.name, detail.class.stream].filter(Boolean).join(' ') : '');
          academicYear = academicYear || detail?.academicYear;
          max = Number(detail?.maxMark ?? max);
        } catch {
          /* use props */
        }

        const marksPayload = await fetchAssessmentMarks(assessment.id).catch(() => null);
        const marksList = Array.isArray(marksPayload?.marks)
          ? marksPayload.marks
          : Array.isArray(marksPayload)
            ? marksPayload
            : [];
        const scoreMap = {};
        for (const m of marksList) {
          if (m.studentId != null && m.score != null) scoreMap[m.studentId] = Number(m.score);
        }

        let roster = [];
        if (classId || className) {
          try {
            roster = await fetchClassStudents(classId || className, className, academicYear);
          } catch {
            roster = [];
          }
        }

        if (!roster.length && marksList.length) {
          roster = marksList
            .filter((m) => m.student)
            .map((m) => ({
              id: m.studentId,
              fullName: `${m.student.firstName || ''} ${m.student.lastName || ''}`.trim(),
              studentCode: m.student.studentUid,
            }));
        }

        if (!cancelled) {
          setStudents(Array.isArray(roster) ? roster : []);
          setMarksByStudent(scoreMap);
          setMaxMark(max);
        }
      } finally {
        if (!cancelled) setLoadingRoster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, assessment, resetForm]);

  const usedStudentIds = useMemo(() => new Set(rows.map((r) => r.studentId).filter(Boolean)), [rows]);

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        label: [s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(), s.studentCode].filter(Boolean).join(' · '),
      })),
    [students],
  );

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onSelectStudent(key, studentId) {
    const current = marksByStudent[studentId];
    updateRow(key, {
      studentId,
      currentScore: current != null ? String(current) : '',
      requestedScore: '',
    });
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  async function handleSubmit() {
    const reason =
      reasonType === 'Other' && explanation.trim()
        ? explanation.trim()
        : `${reasonType}${explanation.trim() ? ` - ${explanation.trim()}` : ''}`;

    const payloadRows = rows.filter((r) => r.studentId);
    if (!payloadRows.length) {
      toast.error('Add at least one student.');
      return;
    }
    for (const r of payloadRows) {
      if (r.requestedScore === '' || r.requestedScore == null) {
        toast.error('Enter the new score for each selected student.');
        return;
      }
      const req = Number(r.requestedScore);
      if (Number.isNaN(req) || req < 0 || req > maxMark) {
        toast.error(`New scores must be between 0 and ${maxMark}.`);
        return;
      }
    }

    setSubmitting(true);
    let ok = 0;
    const errors = [];
    try {
      for (const r of payloadRows) {
        try {
          const res = await requestMarkEdit({
            assessment_id: assessment.id,
            student_id: r.studentId,
            current_score: Number(r.currentScore || marksByStudent[r.studentId] || 0),
            requested_score: Number(r.requestedScore),
            reason,
          });
          if (res?.success === false) errors.push(res?.message || 'Request failed');
          else ok += 1;
        } catch (err) {
          errors.push(err?.response?.data?.message || err?.message || 'Request failed');
        }
      }
      if (ok > 0) {
        toast.success(ok === 1 ? 'Edit request sent' : `${ok} edit requests sent`);
        onSuccess?.();
        onClose();
      }
      if (errors.length) toast.error(errors[0]);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !assessment) return null;

  const titleLine = [assessment.title, assessment.subject || assessment.subject_name, assessment.class_name]
    .filter(Boolean)
    .join(' · ');

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#000435]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[min(92dvh,720px)] w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#000435] to-[#0a116b] px-5 py-4 text-white">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Request marks edit</h3>
            {titleLine ? <p className="mt-0.5 truncate text-xs text-white/70">{titleLine}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 hover:bg-white/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#000435]/55">Reason</label>
              <select
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
                className="tp-input h-10 w-full text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#000435]/55">Notes</label>
              <input
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Optional details"
                className="tp-input h-10 w-full text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#000435]/45">Students</p>
              <button
                type="button"
                onClick={addRow}
                disabled={loadingRoster}
                className="inline-flex items-center gap-1 rounded-lg bg-[#000435]/5 px-2.5 py-1.5 text-xs font-semibold text-[#000435] hover:bg-[#000435]/10 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add student
              </button>
            </div>

            {loadingRoster ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading class roster…
              </div>
            ) : students.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                No students found for this class. Open marks entry first or check class linkage.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 sm:grid-cols-[1fr_88px_88px_36px] sm:items-end"
                  >
                    <div>
                      {index === 0 ? (
                        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Student</span>
                      ) : null}
                      <select
                        value={row.studentId}
                        onChange={(e) => onSelectStudent(row.key, e.target.value)}
                        className="tp-input h-10 w-full text-sm"
                      >
                        <option value="">Select student</option>
                        {studentOptions.map((opt) => (
                          <option key={opt.id} value={opt.id} disabled={usedStudentIds.has(opt.id) && opt.id !== row.studentId}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {index === 0 ? (
                        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Current</span>
                      ) : null}
                      <input
                        type="number"
                        min={0}
                        max={maxMark}
                        readOnly
                        value={row.currentScore}
                        className="tp-input h-10 w-full bg-white text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      {index === 0 ? (
                        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">New</span>
                      ) : null}
                      <input
                        type="number"
                        min={0}
                        max={maxMark}
                        value={row.requestedScore}
                        onChange={(e) => updateRow(row.key, { requestedScore: e.target.value })}
                        placeholder="0"
                        className="tp-input h-10 w-full text-sm tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length <= 1}
                      className="flex h-10 w-full items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 sm:w-9"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingRoster}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff8c00] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Send request{rows.filter((r) => r.studentId).length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
