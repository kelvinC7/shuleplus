import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Loader2, Pencil, PenLine, Plus, Search, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import useTpAcademic from '../hooks/useTpAcademic';
import {
  createAssessment,
  deleteAssessment,
  fetchAssessments,
  fetchAssessmentTemplates,
  fetchMyClasses,
  fetchMyCourses,
  previewAssessmentCode,
  tpApiError,
  updateAssessment,
} from '../services/teacherPortalApi';
import { useTpToast } from '../components/TpToast.jsx';
import {
  activeTemplateComponents,
  templateMatchesClass,
} from '../utils/assessmentTemplateMatch.js';
import { classLabelsMatch } from '../utils/classMatch.js';

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function classLabel(c) {
  return c?.label || [c?.name, c?.stream].filter(Boolean).join(' ') || c?.name || '';
}

function assessmentClassLabel(a) {
  if (a?.class) return classLabel(a.class);
  return '';
}

const PAGE_SIZES = [8, 12, 20];

function ActionBtn({ to, onClick, variant = 'ghost', children, disabled, className = '' }) {
  const base =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap transition';
  const styles = {
    ghost: 'border border-slate-200 bg-white text-[#000435] hover:border-[#FCB038]/60 hover:bg-slate-50',
    primary: 'bg-[#000435] text-white hover:bg-[#000435]/90 shadow-sm',
    danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  };
  const cls = `${base} ${styles[variant] || styles.ghost} ${className} disabled:opacity-50`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

function teacherStatusLabel(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'OPEN' || s === 'MARK_ENTRY') return { text: 'Scheduled · Approved', tone: 'bg-emerald-50 text-emerald-800' };
  if (s === 'DRAFT') return { text: 'Draft', tone: 'bg-amber-50 text-amber-900' };
  if (s === 'SUBMITTED' || s === 'REVIEWED') return { text: 'Submitted', tone: 'bg-orange-50 text-orange-900' };
  if (s === 'APPROVED' || s === 'LOCKED') return { text: 'Approved', tone: 'bg-slate-100 text-slate-700' };
  return { text: status || '-', tone: 'bg-slate-100 text-slate-600' };
}

function hasSavedMarks(a) {
  if ((a?.marksScoredCount ?? 0) > 0) return true;
  return ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(String(a?.status || '').toUpperCase());
}

function canEditSchedule(a) {
  return ['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(String(a?.status || '').toUpperCase());
}

const emptyForm = () => ({
  classId: '',
  courseKey: '',
  templateId: '',
  componentId: '',
  assessmentDate: new Date().toISOString().slice(0, 10),
  assessmentTime: '08:00',
  maxMark: '20',
  duration: '60 min',
  description: '',
  title: '',
  assessmentCode: '',
});

export default function TeacherAssessmentsSchedule() {
  const { term, academicYear, ready, settings } = useTpAcademic();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useTpToast();
  const [form, setForm] = useState(emptyForm());
  const [scheduleYear, setScheduleYear] = useState('');
  const [scheduleTerm, setScheduleTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [selected, setSelected] = useState(() => new Set());

  const yearOptions = useMemo(() => {
    const fromSettings = settings?.academicYears;
    if (Array.isArray(fromSettings) && fromSettings.length) return fromSettings;
    return academicYear ? [academicYear] : [];
  }, [settings, academicYear]);

  const termOptions = useMemo(() => {
    const fromSettings = settings?.terms;
    if (Array.isArray(fromSettings) && fromSettings.length) return fromSettings;
    return term ? [term] : [];
  }, [settings, term]);

  const activeYear = settings?.currentAcademicYear || academicYear;
  const activeTerm = settings?.currentTerm || term;

  useEffect(() => {
    if (!ready) return;
    if (activeYear && !filterYear) setFilterYear(activeYear);
    if (activeTerm && !filterTerm) setFilterTerm(activeTerm);
  }, [ready, activeYear, activeTerm, filterYear, filterTerm]);

  const load = useCallback(async () => {
    if (!ready || !filterYear || !filterTerm) return;
    setLoading(true);
    try {
      const list = await fetchAssessments({ academicYear: filterYear, term: filterTerm }).catch(() => []);
      setAssessments(Array.isArray(list) ? list : list?.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [ready, filterYear, filterTerm]);

  const loadModalData = useCallback(async (year, trm) => {
    if (!year || !trm) return;
    setModalLoading(true);
    try {
      const [classResp, courseResp, tmpl] = await Promise.all([
        fetchMyClasses({ academicYear: year, term: trm }).catch(() => null),
        fetchMyCourses({ academicYear: year, term: trm }).catch(() => null),
        fetchAssessmentTemplates({ academicYear: year, term: trm, status: 'ACTIVE' }).catch(() => []),
      ]);
      setClasses(classResp?.classes ?? []);
      setCourses(courseResp?.assignments ?? []);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
    } finally {
      setModalLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || !ready) return;
    const y = scheduleYear || activeYear;
    const t = scheduleTerm || activeTerm;
    void loadModalData(y, t);
  }, [modalOpen, ready, scheduleYear, scheduleTerm, activeYear, activeTerm, loadModalData]);

  function openModal() {
    setEditingId(null);
    setForm(emptyForm());
    setScheduleYear(activeYear || yearOptions[0] || '');
    setScheduleTerm(activeTerm || termOptions[0] || '');
    setModalOpen(true);
  }

  function openEditModal(a) {
    const clsName = assessmentClassLabel(a);
    const courseKey = a.subject?.name ? `${a.subject.name}::${clsName}` : '';
    const d = a.assessmentDate ? new Date(a.assessmentDate) : null;
    setEditingId(a.id);
    setScheduleYear(a.academicYear || activeYear || '');
    setScheduleTerm(a.term || activeTerm || '');
    setForm({
      classId: a.classId || a.class?.id || '',
      courseKey,
      templateId: a.templateId || '',
      componentId: a.componentId || '',
      assessmentDate: d ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      assessmentTime: d ? d.toISOString().slice(11, 16) : '08:00',
      maxMark: String(a.maxMark ?? 20),
      duration: a.duration || '60 min',
      description: a.description || '',
      title: a.title || '',
      assessmentCode: a.assessmentCode || '',
    });
    setModalOpen(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteAssessment(id);
      toast.success('Assessment deleted');
      await load();
    } catch (err) {
      toast.error(tpApiError(err, 'Could not delete assessment'));
    } finally {
      setDeletingId(null);
    }
  }

  const classCourses = useMemo(() => {
    if (!form.classId) return courses;
    const cls = classes.find((c) => c.id === form.classId);
    const wantedLabel = cls ? classLabel(cls) : '';
    return courses.filter((c) => {
      if (c.classId && c.classId === form.classId) return true;
      const courseLabel = c.classLabel || c.className || '';
      if (wantedLabel && classLabelsMatch(courseLabel, wantedLabel)) return true;
      if (cls?.name && classLabelsMatch(courseLabel, cls.name)) return true;
      return false;
    });
  }, [courses, form.classId, classes]);

  const selectedCourse = useMemo(
    () => classCourses.find((c) => `${c.subjectName}::${c.classLabel || c.className}` === form.courseKey) ?? null,
    [classCourses, form.courseKey],
  );

  useEffect(() => {
    if (editingId || !selectedCourse || !scheduleYear || !scheduleTerm) return;
    const classId = selectedCourse.classId || form.classId;
    previewAssessmentCode({
      subjectName: selectedCourse.subjectName,
      classId,
      className: selectedCourse.classLabel || selectedCourse.className,
      academicYear: scheduleYear,
      term: scheduleTerm,
    })
      .then((meta) => {
        setForm((p) => ({
          ...p,
          title: meta.title || p.title,
          assessmentCode: meta.assessmentCode || p.assessmentCode,
        }));
      })
      .catch(() => {});
  }, [editingId, selectedCourse, scheduleYear, scheduleTerm, form.classId]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === form.classId) ?? null,
    [classes, form.classId],
  );

  const classTemplates = useMemo(() => {
    const trm = scheduleTerm || activeTerm;
    return templates.filter((t) => templateMatchesClass(t, selectedClass, trm));
  }, [templates, selectedClass, scheduleTerm, activeTerm]);

  useEffect(() => {
    if (!form.templateId) return;
    if (!classTemplates.some((t) => t.id === form.templateId)) {
      setForm((p) => ({ ...p, templateId: '', componentId: '' }));
    }
  }, [classTemplates, form.templateId]);

  const selectedTemplate = classTemplates.find((t) => t.id === form.templateId);
  const selectedTemplateComponents = useMemo(
    () => activeTemplateComponents(selectedTemplate),
    [selectedTemplate],
  );

  function matchesStatusFilter(a, statusKey) {
    const s = String(a.status || '').toUpperCase();
    if (!statusKey || statusKey === 'ALL') return true;
    if (statusKey === 'DRAFT') return s === 'DRAFT';
    if (statusKey === 'SCHEDULED') return s === 'OPEN' || s === 'MARK_ENTRY';
    if (statusKey === 'SUBMITTED') return ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(s);
    if (statusKey === 'WITH_MARKS') return hasSavedMarks(a);
    return true;
  }

  const classFilterOptions = useMemo(() => {
    const map = new Map();
    for (const a of assessments) {
      const id = a.classId || a.class?.id || assessmentClassLabel(a);
      const label = assessmentClassLabel(a) || 'Class';
      if (id) map.set(String(id), label);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [assessments]);

  const listAfterFilters = useMemo(() => {
    return assessments.filter((a) => {
      if (filterClassId) {
        const id = String(a.classId || a.class?.id || assessmentClassLabel(a));
        if (id !== filterClassId) return false;
      }
      return matchesStatusFilter(a, filterStatus);
    });
  }, [assessments, filterClassId, filterStatus]);

  const stats = useMemo(() => {
    const list = listAfterFilters;
    return {
      total: list.length,
      draft: list.filter((a) => String(a.status || '').toUpperCase() === 'DRAFT').length,
      submitted: list.filter((a) => ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(String(a.status || '').toUpperCase())).length,
      withMarks: list.filter((a) => (a.marksScoredCount ?? 0) > 0).length,
    };
  }, [listAfterFilters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listAfterFilters;
    return listAfterFilters.filter((a) => {
      const code = (a.assessmentCode ?? '').toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        code.includes(q) ||
        a.subject?.name?.toLowerCase().includes(q) ||
        assessmentClassLabel(a).toLowerCase().includes(q)
      );
    });
  }, [listAfterFilters, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id)) && !allPageSelected;

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [search, filterYear, filterTerm, filterClassId, filterStatus, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!editingId && selectedTemplate?.components?.length && !form.componentId) {
        toast.error('Select a standard component (e.g. QUIZ) so marks count on report cards.');
        setSaving(false);
        return;
      }
      if (editingId) {
        await updateAssessment(editingId, {
          title: form.title,
          maxMark: parseFloat(form.maxMark) || 20,
          assessmentDate: form.assessmentDate,
          assessmentTime: form.assessmentTime,
          duration: form.duration,
          description: form.description || undefined,
        });
      } else {
        if (!selectedCourse) {
          toast.error('Select a timetable course for this class');
          setSaving(false);
          return;
        }
        const classId = selectedCourse.classId || form.classId;
        await createAssessment({
          title: form.title,
          assessmentCode: form.assessmentCode,
          subjectName: selectedCourse.subjectName,
          classId: classId || selectedCourse.classLabel || selectedCourse.className,
          className: selectedCourse.classLabel || selectedCourse.className,
          templateId: form.templateId || undefined,
          componentId: form.componentId || undefined,
          maxMark: parseFloat(form.maxMark) || 20,
          assessmentDate: form.assessmentDate,
          assessmentTime: form.assessmentTime,
          duration: form.duration,
          description: form.description || undefined,
          academicYear: scheduleYear,
          term: scheduleTerm,
        });
      }
      setModalOpen(false);
      setEditingId(null);
      toast.success(editingId ? 'Assessment updated' : 'Assessment scheduled');
      await load();
    } catch (err) {
      toast.error(tpApiError(err, editingId ? 'Could not update assessment' : 'Could not schedule assessment'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="tp-page flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#c87800]" />
      </div>
    );
  }

  const modal = modalOpen ? (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#000435]/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => setModalOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[min(100dvh,640px)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_40px_rgba(0,4,53,0.18)] sm:max-h-[min(92dvh,680px)] sm:max-w-md sm:rounded-2xl sm:shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-bold text-[#000435] sm:text-lg">
              {editingId ? 'Edit assessment' : 'Schedule assessment'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="modal-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:space-y-3.5 sm:px-5 sm:py-4">

            {modalLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#c87800]" /> Loading classes…
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Field label="Academic year">
                <select
                  className="tp-input text-sm"
                  value={scheduleYear}
                  onChange={(e) => {
                    setScheduleYear(e.target.value);
                    setForm((p) => ({ ...p, classId: '', courseKey: '' }));
                  }}
                  required
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                      {y === activeYear ? ' (active)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Term">
                <select
                  className="tp-input text-sm"
                  value={scheduleTerm}
                  onChange={(e) => {
                    setScheduleTerm(e.target.value);
                    setForm((p) => ({ ...p, classId: '', courseKey: '' }));
                  }}
                  required
                >
                  {termOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                      {t === activeTerm ? ' (active)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Class" required>
              <select
                className="tp-input text-sm"
                value={form.classId}
                onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value, courseKey: '' }))}
                required
                disabled={modalLoading || !!editingId}
              >
                <option value="">Select class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classLabel(c)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Course (timetable)" required={!editingId}>
              <select
                className="tp-input text-sm"
                value={form.courseKey}
                onChange={(e) => setForm((p) => ({ ...p, courseKey: e.target.value }))}
                required={!editingId}
                disabled={!form.classId || modalLoading || !!editingId}
              >
                <option value="">Select course…</option>
                {classCourses.map((c) => {
                  const key = `${c.subjectName}::${c.classLabel || c.className}`;
                  return (
                    <option key={key} value={key}>
                      {c.subjectName}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Assessment code">
                <input
                  className="tp-input bg-slate-50 font-mono text-xs sm:text-sm"
                  readOnly
                  value={form.assessmentCode}
                  placeholder="Auto-generated"
                />
              </Field>
              <Field label="Title">
                <input
                  className="tp-input text-sm"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Template">
                <select
                  className="tp-input text-sm"
                  value={form.templateId}
                  onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value, componentId: '' }))}
                  disabled={!form.classId || modalLoading}
                >
                  <option value="">
                    {!form.classId ? 'Select class first…' : classTemplates.length ? 'Choose template…' : 'No template for this class / level'}
                  </option>
                  {classTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.academicLevel ? ` · ${t.academicLevel}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedTemplateComponents.length ? (
                <Field label="Component" required={!editingId}>
                  <select
                    className="tp-input text-sm"
                    value={form.componentId}
                    onChange={(e) => setForm((p) => ({ ...p, componentId: e.target.value }))}
                    required={!editingId}
                  >
                    <option value="">Select component…</option>
                    {selectedTemplateComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.weightPercentage ?? 0}%)
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Date">
                <input
                  type="date"
                  className="tp-input text-sm"
                  value={form.assessmentDate}
                  onChange={(e) => setForm((p) => ({ ...p, assessmentDate: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  className="tp-input text-sm"
                  value={form.assessmentTime}
                  onChange={(e) => setForm((p) => ({ ...p, assessmentTime: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Max mark" className="col-span-2 sm:col-span-1">
                <input
                  type="number"
                  min={1}
                  className="tp-input text-sm"
                  value={form.maxMark}
                  onChange={(e) => setForm((p) => ({ ...p, maxMark: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                className="tp-input min-h-[64px] text-sm sm:min-h-[72px]"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional instructions for students"
              />
            </Field>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:py-4">
            <button type="button" className="tp-btn-secondary order-2 w-full sm:order-1 sm:w-auto" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || modalLoading}
              className="tp-btn-primary order-1 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60 sm:order-2 sm:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Save changes' : 'Create & schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <div className="tp-page space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#000435]">Assessments</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {filterYear || activeYear} · {filterTerm || activeTerm}
          </p>
        </div>
        <button type="button" onClick={openModal} className="tp-btn-primary inline-flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" />
          Schedule assessment
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Academic year</span>
          <select
            className="tp-input text-sm"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[120px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Term</span>
          <select
            className="tp-input text-sm"
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
          >
            {termOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Class</span>
          <select
            className="tp-input text-sm"
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
          >
            <option value="">All classes</option>
            {classFilterOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Status</span>
          <select
            className="tp-input text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="WITH_MARKS">With marks</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'With marks', value: stats.withMarks, accent: 'text-blue-600' },
          { label: 'Submitted', value: stats.submitted, accent: 'text-orange-600' },
          { label: 'Draft', value: stats.draft, accent: 'text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-0.5 text-2xl font-bold tabular-nums text-[#000435] ${s.accent || ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="tp-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessments"
              className="tp-input h-10 w-full pl-10 text-sm"
            />
          </div>
          {selected.size > 0 ? (
            <p className="text-xs font-semibold text-[#000435]">{selected.size} selected</p>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No assessments scheduled yet.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageSelected;
                        }}
                        onChange={togglePageAll}
                        aria-label="Select page"
                      />
                    </th>
                    <th className="w-10 px-2 py-3">#</th>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Assessment</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="min-w-[280px] px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((a, idx) => {
                    const st = teacherStatusLabel(a.status);
                    const marksLabel = hasSavedMarks(a) ? 'Edit marks' : 'Enter marks';
                    const rowNum = safePage * pageSize + idx + 1;
                    return (
                      <tr key={a.id} className="hover:bg-[#FCB038]/[0.05]">
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} aria-label="Select row" />
                        </td>
                        <td className="px-2 py-3 text-xs tabular-nums text-slate-400">{rowNum}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[#c87800]">{a.assessmentCode || ''}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[#000435]">{a.title}</p>
                          <p className="text-xs text-slate-500">
                            {[a.subject?.name, a.component?.name].filter(Boolean).join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{assessmentClassLabel(a)}</td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {a.assessmentDate
                              ? new Date(a.assessmentDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                              : 'Not set'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${st.tone}`}>
                            {st.text}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-nowrap items-center justify-end gap-1.5">
                            <ActionBtn to={`/assessments/${a.id}/marks`} variant="ghost">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </ActionBtn>
                            <ActionBtn to={`/assessments/${a.id}/marks`} variant="primary">
                              <PenLine className="h-3.5 w-3.5" />
                              {marksLabel}
                            </ActionBtn>
                            {canEditSchedule(a) ? (
                              <ActionBtn onClick={() => openEditModal(a)} variant="ghost">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </ActionBtn>
                            ) : null}
                            {canEditSchedule(a) && !hasSavedMarks(a) ? (
                              <ActionBtn variant="danger" disabled={deletingId === a.id} onClick={() => void handleDelete(a.id)}>
                                {deletingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Delete
                              </ActionBtn>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageRows.map((a, idx) => {
                const st = teacherStatusLabel(a.status);
                const marksLabel = hasSavedMarks(a) ? 'Edit marks' : 'Enter marks';
                return (
                  <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-[#000435]">{a.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${st.tone}`}>{st.text}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          #{safePage * pageSize + idx + 1} · {a.assessmentCode || 'No code'} · {assessmentClassLabel(a)}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <ActionBtn to={`/assessments/${a.id}/marks`} variant="ghost" className="w-full">
                            View
                          </ActionBtn>
                          <ActionBtn to={`/assessments/${a.id}/marks`} variant="primary" className="w-full">
                            {marksLabel}
                          </ActionBtn>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-slate-500 sm:text-left">
                {filtered.length === 0 ? (
                  '0 assessments'
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-[#000435]">{safePage * pageSize + 1}-{Math.min(filtered.length, (safePage + 1) * pageSize)}</span>{' '}
                    of <span className="font-semibold text-[#000435]">{filtered.length}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-[#000435]"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage(safePage - 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold tabular-nums text-[#000435]">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {typeof document !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}

function Field({ label, required, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
