import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import useTpAcademic from '../hooks/useTpAcademic';
import {
  createAssessment,
  fetchAssessmentTemplates,
  fetchMyClasses,
  fetchMyCourses,
  tpApiError,
} from '../services/teacherPortalApi';
import { activeTemplateComponents, templateMatchesClass } from '../utils/assessmentTemplateMatch.js';

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function assignmentKey(a) {
  return `${a.subjectName}::${a.classLabel || a.className}`;
}

export default function CreateAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { term, academicYear, ready } = useTpAcademic();
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    courseKey: '',
    templateId: '',
    componentId: '',
    maxMark: '20',
    assessmentDate: new Date().toISOString().split('T')[0],
    duration: '',
    description: '',
    academicYear: '',
    term: '',
  });

  useEffect(() => {
    if (academicYear) setForm((p) => ({ ...p, academicYear: p.academicYear || academicYear }));
    if (term) setForm((p) => ({ ...p, term: p.term || term }));
  }, [academicYear, term]);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const [courseResp, classResp, tmpl] = await Promise.all([
        fetchMyCourses({ academicYear: form.academicYear || academicYear || undefined, term: form.term || term || undefined }).catch(() => null),
        fetchMyClasses({ academicYear: form.academicYear || academicYear || undefined, term: form.term || term || undefined }).catch(() => null),
        fetchAssessmentTemplates({ academicYear: form.academicYear || academicYear || undefined, term: form.term || term || undefined }).catch(() => []),
      ]);
      const assignments = courseResp?.assignments ?? [];
      setCourses(assignments);
      setClasses(classResp?.classes ?? []);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);

      const qSubject = searchParams.get('subject') || '';
      const qClassId = searchParams.get('classId') || '';
      const qClassName = searchParams.get('className') || '';
      const match = assignments.find((a) => {
        if (qClassId && a.classId === qClassId && (!qSubject || normalize(a.subjectName) === normalize(qSubject))) return true;
        if (qSubject && qClassName) {
          return (
            normalize(a.subjectName) === normalize(qSubject) &&
            (normalize(a.classLabel || a.className) === normalize(qClassName) || normalize(a.className) === normalize(qClassName))
          );
        }
        return false;
      });
      if (match) setForm((p) => ({ ...p, courseKey: p.courseKey || assignmentKey(match) }));
    } finally {
      setLoading(false);
    }
  }, [ready, form.academicYear, form.term, academicYear, term, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCourse = useMemo(() => courses.find((c) => assignmentKey(c) === form.courseKey) ?? null, [courses, form.courseKey]);
  const resolvedClass = useMemo(() => {
    if (!selectedCourse) return null;
    if (selectedCourse.classId) {
      const byId = classes.find((c) => c.id === selectedCourse.classId);
      if (byId) return byId;
    }
    const wanted = normalize(selectedCourse.classLabel || selectedCourse.className);
    return classes.find((c) => normalize(c.label) === wanted || normalize(c.name) === wanted) ?? null;
  }, [selectedCourse, classes]);
  const classTemplates = useMemo(
    () => templates.filter((t) => templateMatchesClass(t, resolvedClass, form.term)),
    [templates, resolvedClass, form.term],
  );
  const selectedTemplate = classTemplates.find((t) => t.id === form.templateId);
  const selectedComponents = useMemo(() => activeTemplateComponents(selectedTemplate), [selectedTemplate]);

  function updateField(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!selectedCourse) {
      setError('Select an assigned course from your timetable');
      return;
    }
    const classId = selectedCourse.classId || resolvedClass?.id;
    const className = resolvedClass?.label || selectedCourse.classLabel || selectedCourse.className;
    if (!classId && !className) {
      setError('This course is not linked to a Student Management class yet');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createAssessment({
        title: form.title.trim(),
        subjectName: selectedCourse.subjectName,
        classId: classId || className,
        className,
        templateId: form.templateId || undefined,
        componentId: form.componentId || undefined,
        maxMark: parseFloat(form.maxMark) || 20,
        assessmentDate: form.assessmentDate || undefined,
        duration: form.duration || undefined,
        description: form.description || undefined,
        academicYear: form.academicYear,
        term: form.term,
      });
      navigate('/assessments/schedule');
    } catch (err) {
      setError(tpApiError(err, 'Failed to create assessment'));
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

  return (
    <div className="tp-page space-y-6">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#000435]" type="button">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-medium text-[#000435]">Create Assessment</h1>
          <p className="text-sm text-slate-500">Choose a timetable course, then enter marks for that class</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {courses.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No timetable courses were found for this period. Ask Timetable admin to assign you a subject and class.
        </div>
      )}

      <div className="tp-card p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Assigned course *</label>
            <select value={form.courseKey} onChange={(e) => updateField('courseKey', e.target.value)} className="tp-input">
              <option value="">Select subject and class…</option>
              {courses.map((c) => (
                <option key={assignmentKey(c)} value={assignmentKey(c)}>
                  {c.subjectName} · {c.classLabel || c.className}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={selectedCourse ? `e.g. Mid-term ${selectedCourse.subjectName}` : 'e.g. Mid-Term Exam Mathematics'}
              className="tp-input"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Template</label>
              <select
                value={form.templateId}
                onChange={(e) => {
                  updateField('templateId', e.target.value);
                  updateField('componentId', '');
                }}
                className="tp-input"
                disabled={!resolvedClass}
              >
                <option value="">
                  {!resolvedClass ? 'Select course / class first…' : classTemplates.length ? 'None' : 'No template for this class'}
                </option>
                {classTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedComponents.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Component</label>
                <select value={form.componentId} onChange={(e) => updateField('componentId', e.target.value)} className="tp-input">
                  <option value="">None</option>
                  {selectedComponents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Max mark</label>
              <input type="number" min={1} value={form.maxMark} onChange={(e) => updateField('maxMark', e.target.value)} className="tp-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Date</label>
              <input type="date" value={form.assessmentDate} onChange={(e) => updateField('assessmentDate', e.target.value)} className="tp-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Duration</label>
              <input type="text" value={form.duration} onChange={(e) => updateField('duration', e.target.value)} placeholder="e.g. 60 min" className="tp-input" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Academic year</label>
              <input type="text" value={form.academicYear} onChange={(e) => updateField('academicYear', e.target.value)} className="tp-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Term</label>
              <select value={form.term} onChange={(e) => updateField('term', e.target.value)} className="tp-input">
                <option value="">Select term...</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Description</label>
            <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={3} className="tp-input" placeholder="Optional description..." />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button type="button" onClick={() => navigate(-1)} className="tp-btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !form.title || !form.courseKey}
          className="tp-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Create Assessment
        </button>
      </div>
    </div>
  );
}
