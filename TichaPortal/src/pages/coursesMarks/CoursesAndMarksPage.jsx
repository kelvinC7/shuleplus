import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LayoutList, Loader2, Plus, Search } from 'lucide-react';
import useTpAcademic from '../../hooks/useTpAcademic';
import { fetchCoursesMarksDashboard } from '../../services/coursesMarksApi.js';
import { tpApiError } from '../../services/teacherPortalApi';
import RecordMarksWizard from '../StudentsMarksPages/components/RecordMarksWizard.jsx';
import RequestEditModal from './RequestEditModal.jsx';
import { UI_STATUS, formatCourseProgress } from './statusUtils.js';

function StatusBadge({ status }) {
  const cfg = UI_STATUS[status] || UI_STATUS.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatPill({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[9.5rem] shrink-0 snap-start flex-col rounded-xl border px-4 py-3 text-left transition sm:min-w-0 ${
        active
          ? 'border-[#FCB038] bg-[#FCB038]/10 shadow-sm'
          : 'border-slate-200/80 bg-white hover:border-slate-300'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="mt-1 text-2xl font-bold tabular-nums text-[#000435]">{value}</span>
    </button>
  );
}

function progressPercent(prog) {
  if (!prog?.total) return 0;
  return Math.round((prog.submitted / prog.total) * 100);
}

function marksActionLabel(a) {
  if (a.is_locked) return 'View';
  const entered = Number(a.marks_entered) > 0;
  return entered ? 'Edit marks' : 'Enter marks';
}

export default function CoursesAndMarksPage() {
  const { term, academicYear, setTerm, setAcademicYear, ready, settings } = useTpAcademic();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('cards');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPreset, setWizardPreset] = useState(null);
  const [editModal, setEditModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCoursesMarksDashboard({
        academic_year: academicYear,
        term,
        status_filter: statusFilter || undefined,
      });
      if (!res?.success) throw new Error(res?.message || 'Failed to load');
      setData(res.data);
    } catch (err) {
      setError(tpApiError(err, 'Could not load courses & marks'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, statusFilter]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const courses = useMemo(() => {
    const list = data?.courses || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.subject_name?.toLowerCase().includes(q) || c.class_name?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const assessments = data?.assessments || [];
  const summary = data?.summary || {};
  const yearOptions = data?.filters?.academic_years || settings?.academicYears || [];
  const termOptions = data?.filters?.terms || settings?.terms || ['Term 1', 'Term 2', 'Term 3'];

  const statFilters = [
    { key: '', label: 'Courses', value: summary.assigned_courses ?? 0 },
    { key: 'draft', label: 'Draft', value: summary.draft ?? 0 },
    { key: 'pending', label: 'Pending', value: summary.pending ?? 0 },
    { key: 'approved', label: 'Approved', value: summary.approved ?? 0 },
    { key: 'locked', label: 'Locked', value: summary.locked ?? 0 },
  ];

  return (
    <div className="tp-page space-y-5 pb-12 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-[#000435] sm:text-2xl">Courses & Marks</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Your assigned courses, mark entry, and submission status for {academicYear} · {term}.
            </p>
          </div>
          <div className="flex flex-col gap-2 xs:flex-row xs:flex-wrap sm:justify-end">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="tp-input h-10 text-sm"
                aria-label="Academic year"
              >
                {(yearOptions.length ? yearOptions : [academicYear]).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="tp-input h-10 text-sm"
                aria-label="Term"
              >
                {termOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setWizardPreset(null);
                setWizardOpen(true);
              }}
              className="tp-btn-primary inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Enter marks
            </button>
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {statFilters.map((s) => (
            <StatPill
              key={s.key || 'all'}
              label={s.label}
              value={s.value}
              active={statusFilter === s.key}
              onClick={() => setStatusFilter(s.key)}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course or class…"
            className="tp-input h-10 w-full pl-10 text-sm"
          />
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs text-slate-400 sm:hidden">
            {courses.length} course{courses.length === 1 ? '' : 's'}
          </span>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setView('cards')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === 'cards' ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === 'table' ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#c87800]" />
          Loading courses…
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.length === 0 ? (
            <div className="tp-card col-span-full px-6 py-14 text-center">
              <p className="text-sm font-medium text-[#000435]">No courses for this term</p>
              <p className="mt-1 text-xs text-slate-500">Confirm your timetable assignments and academic year.</p>
              <Link to="/assessments/schedule" className="tp-btn-secondary mt-4 inline-flex">
                Go to assessments
              </Link>
            </div>
          ) : null}
          {courses.map((course) => {
            const prog = course.progress || formatCourseProgress(course.assessments);
            const pct = progressPercent(prog);
            const firstAssessment = course.assessments?.[0];
            return (
              <article
                key={course.id}
                className="tp-card flex flex-col overflow-hidden transition hover:shadow-md hover:ring-1 hover:ring-[#FCB038]/30"
              >
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-[#000435]">{course.subject_name}</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {course.class_name}
                        <span className="text-slate-300"> · </span>
                        {course.term}
                      </p>
                    </div>
                    <StatusBadge status={course.ui_status || 'draft'} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-5">
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Students</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-[#000435]">{course.student_count ?? '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assessments</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-[#000435]">
                      {course.assessments?.length ?? 0}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 sm:px-5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{prog.label}</span>
                    {prog.total > 0 ? <span className="font-semibold tabular-nums text-[#000435]">{pct}%</span> : null}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#FCB038] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:px-5">
                  <button
                    type="button"
                    onClick={() => {
                      setWizardPreset({ className: course.class_name, subjectName: course.subject_name });
                      setWizardOpen(true);
                    }}
                    className="tp-btn-primary inline-flex h-10 flex-1 items-center justify-center text-sm"
                  >
                    Enter marks
                  </button>
                  {firstAssessment ? (
                    <Link
                      to={`/assessments/${firstAssessment.id}/marks`}
                      className="tp-btn-secondary inline-flex h-10 flex-1 items-center justify-center text-sm"
                    >
                      View latest
                    </Link>
                  ) : (
                    <Link
                      to="/assessments/schedule"
                      className="tp-btn-secondary inline-flex h-10 flex-1 items-center justify-center text-sm"
                    >
                      Schedule
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <>
          <div className="tp-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {['Course', 'Class', 'Assessment', 'Max', 'Progress', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assessments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        No assessments match this filter.
                      </td>
                    </tr>
                  ) : (
                    assessments.map((a) => (
                      <tr key={a.id} className="hover:bg-[#FCB038]/[0.04]">
                        <td className="px-4 py-3 font-semibold text-[#000435]">{a.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{a.class_name}</td>
                        <td className="px-4 py-3">{a.title}</td>
                        <td className="px-4 py-3 tabular-nums">{a.max_mark}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {a.marks_entered}/{a.marks_total || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={a.correction_request?.status === 'PENDING' ? 'edit_pending' : a.ui_status}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Link
                              to={`/assessments/${a.id}/marks`}
                              className="inline-flex rounded-lg bg-[#000435] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#000435]/90"
                            >
                              {marksActionLabel(a)}
                            </Link>
                            {a.is_locked ? (
                              <button
                                type="button"
                                onClick={() => setEditModal(a)}
                                className="inline-flex rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                              >
                                Request edit
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {assessments.length === 0 ? (
              <div className="tp-card px-4 py-10 text-center text-sm text-slate-500">No assessments match this filter.</div>
            ) : (
              assessments.map((a) => (
                <div key={a.id} className="tp-card overflow-hidden">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#000435]">{a.title}</p>
                      <p className="text-xs text-slate-500">
                        {a.subject} · {a.class_name}
                      </p>
                    </div>
                    <StatusBadge
                      status={a.correction_request?.status === 'PENDING' ? 'edit_pending' : a.ui_status}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                    <div>
                      <p className="text-slate-400">Max mark</p>
                      <p className="font-semibold text-[#000435]">{a.max_mark}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Entered</p>
                      <p className="font-semibold tabular-nums text-[#000435]">
                        {a.marks_entered}/{a.marks_total || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                    <Link
                      to={`/assessments/${a.id}/marks`}
                      className="tp-btn-primary inline-flex h-9 flex-1 items-center justify-center text-xs"
                    >
                      {marksActionLabel(a)}
                    </Link>
                    {a.is_locked ? (
                      <button
                        type="button"
                        onClick={() => setEditModal(a)}
                        className="tp-btn-secondary inline-flex h-9 flex-1 items-center justify-center text-xs"
                      >
                        Request edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <RecordMarksWizard
        open={wizardOpen}
        preset={wizardPreset}
        onClose={() => {
          setWizardOpen(false);
          setWizardPreset(null);
          load();
        }}
        onPublished={load}
      />
      <RequestEditModal open={!!editModal} assessment={editModal} onClose={() => setEditModal(null)} onSuccess={load} />
    </div>
  );
}
