import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, CheckCircle, Activity, Users, Loader2, Minus, Plus, AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { resolveStudentPhotoUrl, studentInitials } from '../utils/studentDisplay';

function signedPoints(mark) {
  const pts = Math.abs(Number(mark.points) || 0);
  if (String(mark.type || '').toUpperCase() === 'REWARD') return pts;
  return -pts;
}

export default function ConductMarksModal({
  isOpen,
  onClose,
  initialStudent = null,
  students = [],
  className = '',
}) {
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState('');
  const [markSearch, setMarkSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [student, setStudent] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRows([]);
    setStudent(initialStudent || null);
    setNote('');
    setSuccess(null);
    setSubmitError('');
    setMarkSearch('');
    setStudentSearch('');
  }, [isOpen, initialStudent]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setCatalogueLoading(true);
      setCatalogueError('');
      try {
        const res = await api.get('/teacher-portal/discipline/marks', { params: { status: 'Active' } });
        const list = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
        if (!cancelled) setCatalogue(list);
        if (!list.length && res.data?.warning) setCatalogueError(res.data.warning);
      } catch {
        if (!cancelled) {
          setCatalogue([]);
          setCatalogueError('Discipline marks could not be loaded. Check Student Discipline service.');
        }
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredMarks = useMemo(() => {
    const q = markSearch.trim().toLowerCase();
    if (!q) return catalogue;
    return catalogue.filter(
      (m) =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.category || '').toLowerCase().includes(q)
    );
  }, [catalogue, markSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const addMark = useCallback((mark) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.id === mark.id);
      if (existing) {
        return prev.map((r) => (r.id === mark.id ? { ...r, qty: r.qty + 1 } : r));
      }
      return [...prev, { ...mark, qty: 1, impact: signedPoints(mark) }];
    });
    setMarkSearch('');
  }, []);

  const updateQty = (id, delta) => {
    setRows((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, qty: Math.max(1, r.qty + delta) } : r))
        .filter((r) => r.qty > 0)
    );
  };

  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));

  const totalPoints = rows.reduce((s, r) => s + r.impact * r.qty, 0);
  const canSubmit = Boolean(student && rows.length && className && !submitting);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post('/teacher-portal/discipline/conduct', {
        className,
        studentId: student.row_id || student.student_id,
        studentName: student.name,
        studentCode: student.student_code || student.id,
        note,
        notifyParent: true,
        notifyMethods: ['sms', 'email', 'inapp'],
        items: rows.map((r) => ({ markId: r.id, qty: r.qty })),
      });
      const cases = res.data?.data?.cases || [];
      const last = cases[cases.length - 1];
      setSuccess({
        count: res.data?.data?.count ?? cases.length,
        scoreAfter: last?.scoreAfter,
        scoreBefore: last?.scoreBefore,
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 'Could not record conduct. Try again or contact discipline office.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const content = success ? (
    <div className="p-8 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
      <h3 className="mt-4 text-lg font-bold text-[#000435]">Recorded</h3>
      <p className="mt-2 text-sm text-slate-600">
        {success.count} discipline case{success.count === 1 ? '' : 's'} saved for {student?.name}.
        Parents were notified in Kinyarwanda and English when contact details exist.
      </p>
      {success.scoreAfter != null && (
        <p className="mt-2 text-sm font-semibold text-[#000435]">
          Discipline score: {success.scoreBefore ?? '-'} → {success.scoreAfter} / 100
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-lg bg-[#000435] py-3 text-sm font-semibold text-white"
      >
        Close
      </button>
    </div>
  ) : (
    <>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Student
          </label>
          {!student ? (
            <>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student…"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FCB038]"
                />
              </div>
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <li key={s.row_id || s.id}>
                    <button
                      type="button"
                      onClick={() => setStudent(s)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <StudentThumb student={s} />
                      <span className="text-sm font-medium text-[#000435]">{s.name}</span>
                    </button>
                  </li>
                ))}
                {!filteredStudents.length && (
                  <li className="px-3 py-4 text-center text-xs text-slate-500">No students</li>
                )}
              </ul>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div className="flex items-center gap-3">
                <StudentThumb student={student} />
                <div>
                  <p className="text-sm font-semibold text-[#000435]">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.student_code || student.id}</p>
                </div>
              </div>
              {!initialStudent && (
                <button type="button" onClick={() => setStudent(null)} className="text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Discipline case / mark
          </label>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={markSearch}
              onChange={(e) => setMarkSearch(e.target.value)}
              placeholder="Search cases from Student Discipline…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FCB038]"
            />
          </div>
          {catalogueLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading marks…
            </div>
          ) : catalogueError ? (
            <p className="flex items-start gap-2 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {catalogueError}
            </p>
          ) : (
            <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {filteredMarks.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => addMark(m)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#000435]">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.category}</p>
                    </div>
                    <span
                      className={`text-xs font-bold ${signedPoints(m) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {signedPoints(m) > 0 ? '+' : ''}
                      {signedPoints(m)}
                    </span>
                  </button>
                </li>
              ))}
              {!filteredMarks.length && (
                <li className="px-3 py-4 text-center text-xs text-slate-500">No matching marks</li>
              )}
            </ul>
          )}
        </div>

        {rows.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Selected</p>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-[#000435]">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(r.id, -1)} className="rounded border border-slate-200 p-1">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-semibold">{r.qty}</span>
                    <button type="button" onClick={() => updateQty(r.id, 1)} className="rounded border border-slate-200 p-1">
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className={`w-10 text-right font-bold ${r.impact >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.impact * r.qty}
                    </span>
                    <button type="button" onClick={() => removeRow(r.id)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-slate-200 pt-2 text-sm font-semibold text-[#000435]">
              Net points:{' '}
              <span className={totalPoints >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {totalPoints > 0 ? '+' : ''}
                {totalPoints}
              </span>
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FCB038]"
            placeholder="Context for this case…"
          />
        </div>

        {submitError && (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FCB038] py-3 text-sm font-semibold text-[#000435] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          {submitting ? 'Saving…' : 'Record & notify parent (KR + EN)'}
        </button>
      </div>
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#000435]/40" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#FCB038]" />
            <div>
              <h2 className="text-base font-bold text-[#000435]">Conduct marks</h2>
              {className && <p className="text-xs text-slate-500">{className}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {content}
      </div>
    </div>,
    document.body
  );
}

function StudentThumb({ student }) {
  const [broken, setBroken] = useState(false);
  const src = resolveStudentPhotoUrl(student?.student_photo_url);
  useEffect(() => setBroken(false), [src]);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        className="h-9 w-9 rounded-full border border-slate-200 object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#000435]/10 text-xs font-semibold text-[#000435]">
      {studentInitials(student?.name)}
    </div>
  );
}
