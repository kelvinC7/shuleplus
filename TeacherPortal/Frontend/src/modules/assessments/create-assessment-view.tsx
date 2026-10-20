'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  assessmentApiError,
  createAssessment,
  fetchAssessmentTemplates,
} from '@/services/assessment-api';
import { fetchMyCourses, type MyCourseAssignment } from '@/services/my-courses-api';
import { fetchMyClasses, type MyClassItem } from '@/services/my-classes-api';
import type { AssessmentTemplate } from '@/types/assessment';

function normalize(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function assignmentKey(a: MyCourseAssignment) {
  return `${a.subjectName}::${a.classLabel || a.className}`;
}

export function CreateAssessmentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { term, academicYear, settings } = useAcademicSettings();
  const [courses, setCourses] = useState<MyCourseAssignment[]>([]);
  const [classes, setClasses] = useState<MyClassItem[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    courseKey: '',
    templateId: '',
    componentId: '',
    maxMark: '20',
    assessmentDate: new Date().toISOString().split('T')[0],
    duration: '',
    description: '',
    academicYear: academicYear || '',
    term: term || '',
  });

  useEffect(() => {
    if (settings?.currentAcademicYear) setForm((p) => ({ ...p, academicYear: settings.currentAcademicYear! }));
    if (settings?.currentTerm) setForm((p) => ({ ...p, term: settings.currentTerm! }));
  }, [settings]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courseResp, classResp, tmpl] = await Promise.all([
        fetchMyCourses({
          academicYear: form.academicYear || undefined,
          term: form.term || undefined,
        }).catch(() => null),
        fetchMyClasses({
          academicYear: form.academicYear || undefined,
          term: form.term || undefined,
        }).catch(() => null),
        fetchAssessmentTemplates({
          academicYear: form.academicYear || undefined,
          term: form.term || undefined,
        }).catch(() => []),
      ]);
      const assignments = courseResp?.assignments ?? [];
      setCourses(assignments);
      setClasses(classResp?.classes ?? []);
      setTemplates(tmpl);

      const qSubject = searchParams.get('subject') || '';
      const qClassId = searchParams.get('classId') || '';
      const qClassName = searchParams.get('className') || '';
      const match = assignments.find((a) => {
        if (qClassId && a.classId === qClassId && (!qSubject || normalize(a.subjectName) === normalize(qSubject))) {
          return true;
        }
        if (qSubject && qClassName) {
          return (
            normalize(a.subjectName) === normalize(qSubject) &&
            (normalize(a.classLabel || a.className) === normalize(qClassName) ||
              normalize(a.className) === normalize(qClassName))
          );
        }
        return false;
      });
      if (match) {
        setForm((p) => ({ ...p, courseKey: p.courseKey || assignmentKey(match) }));
      }
    } catch {
      // ignore partial failures
    }
    setLoading(false);
  }, [form.academicYear, form.term, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCourse = useMemo(
    () => courses.find((c) => assignmentKey(c) === form.courseKey) ?? null,
    [courses, form.courseKey],
  );

  const resolvedClass = useMemo(() => {
    if (!selectedCourse) return null;
    if (selectedCourse.classId) {
      const byId = classes.find((c) => c.id === selectedCourse.classId);
      if (byId) return byId;
    }
    const wanted = normalize(selectedCourse.classLabel || selectedCourse.className);
    return classes.find((c) => normalize(c.label) === wanted || normalize(c.name) === wanted) ?? null;
  }, [selectedCourse, classes]);

  const selectedTemplate = templates.find((t) => t.id === form.templateId);

  function updateField(field: string, value: string) {
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
      router.push(`/assessments/${result.id}/marks`);
    } catch (err) {
      setError(assessmentApiError(err, 'Failed to create assessment'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-navy">Create Assessment</h1>
          <p className="text-sm text-muted">Choose a timetable course, then enter marks for that class</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {courses.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No timetable courses were found for this period. Ask Timetable admin to assign you a subject and class.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
              Assigned course *
            </label>
            <select
              value={form.courseKey}
              onChange={(e) => updateField('courseKey', e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Select subject and class…</option>
              {courses.map((c) => (
                <option key={assignmentKey(c)} value={assignmentKey(c)}>
                  {c.subjectName} · {c.classLabel || c.className}
                </option>
              ))}
            </select>
            {selectedCourse && (
              <p className="mt-1.5 text-xs text-slate-500">
                Class roster comes from Student Management
                {resolvedClass?.studentCount != null ? ` · ${resolvedClass.studentCount} students` : ''}
                {!resolvedClass && selectedCourse.classId == null
                  ? ' · this class name is not matched in Student Management yet'
                  : ''}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={
                selectedCourse
                  ? `e.g. Mid-term ${selectedCourse.subjectName}`
                  : 'e.g. Mid-Term Exam Mathematics'
              }
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Template
              </label>
              <select
                value={form.templateId}
                onChange={(e) => updateField('templateId', e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedTemplate && selectedTemplate.components.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                  Component
                </label>
                <select
                  value={form.componentId}
                  onChange={(e) => updateField('componentId', e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">None</option>
                  {selectedTemplate.components.map((c) => (
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
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Max Mark
              </label>
              <input
                type="number"
                value={form.maxMark}
                onChange={(e) => updateField('maxMark', e.target.value)}
                min={1}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Date
              </label>
              <input
                type="date"
                value={form.assessmentDate}
                onChange={(e) => updateField('assessmentDate', e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Duration
              </label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="e.g. 60 min"
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Academic Year
              </label>
              <input
                type="text"
                value={form.academicYear}
                onChange={(e) => updateField('academicYear', e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                Term
              </label>
              <select
                value={form.term}
                onChange={(e) => updateField('term', e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Select term...</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Optional description..."
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving || !form.title || !form.courseKey}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Create Assessment
        </button>
      </div>
    </div>
  );
}
