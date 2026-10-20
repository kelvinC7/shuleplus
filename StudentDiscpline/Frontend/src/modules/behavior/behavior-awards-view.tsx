'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Plus, Printer, Search } from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { DisciplineModal, FormField } from '@/components/discipline-modal';
import { StatusBadge } from '@/components/status-badge';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DisciplineCase, DisciplineMark, SmStudent } from '@/types/discipline';
import { toast } from 'sonner';

export function BehaviorAwardsView() {
  const [rows, setRows] = useState<DisciplineCase[]>([]);
  const [marks, setMarks] = useState<DisciplineMark[]>([]);
  const [students, setStudents] = useState<SmStudent[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    markId: '',
    description: '',
    incidentDate: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    try {
      const [casesRes, marksRes, studentsRes] = await Promise.all([
        disciplineApi.cases(),
        disciplineApi.marks({ type: 'REWARD' }),
        disciplineApi.students(),
      ]);
      const rewardMarks = (marksRes.data.data ?? []).filter((m) => m.type === 'REWARD');
      const rewardIds = new Set(rewardMarks.map((m) => m.id));
      const all = casesRes.data.data ?? [];
      setRows(
        all.filter(
          (c) =>
            (c.markId && rewardIds.has(c.markId)) ||
            c.category === 'Reward' ||
            (c.appliedPoints ?? 0) > 0
        )
      );
      setMarks(rewardMarks);
      setStudents(studentsRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load awards'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.caseNumber.toLowerCase().includes(q) ||
        (r.markName ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const uniqueStudents = new Set(filtered.map((r) => r.studentId || r.studentName)).size;

  async function issueAward() {
    const student = students.find((s) => s.id === form.studentId);
    const mark = marks.find((m) => m.id === form.markId);
    if (!student || !mark) {
      toast.error('Select a student and a merit award');
      return;
    }
    setSaving(true);
    try {
      await disciplineApi.createCase({
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.studentCode,
        className: student.className ?? '—',
        classId: student.classId ?? undefined,
        markId: mark.id,
        category: 'Reward',
        severity: 'Low',
        status: 'Closed',
        incidentDate: form.incidentDate,
        description: form.description || mark.description || mark.name,
        appliedPoints: mark.points,
        notifyParent: false,
      });
      toast.success('Merit award issued');
      setOpen(false);
      setForm({ studentId: '', markId: '', description: '', incidentDate: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not issue award'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DisciplinePageLayout
      title="Positive Behavior"
      subtitle="Issue merit awards, list recognitions, and print certificates"
      kpis={[
        { label: 'Awards this term', value: filtered.length },
        { label: 'Students recognized', value: uniqueStudents },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="discipline-input pl-9"
            placeholder="Search student or award…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print certificates
        </button>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Issue award
        </button>
      </div>

      <div className="hr-card overflow-hidden print:border-0 print:shadow-none">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Award</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No merit awards yet. Issue the first recognition.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{new Date(r.incidentDate).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 font-semibold text-[#000435]">{r.studentName}</td>
                  <td className="px-4 py-3">{r.className}</td>
                  <td className="px-4 py-3">{r.markName ?? r.customCaseName ?? r.category}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">+{r.appliedPoints ?? 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DisciplineModal
        open={open}
        onClose={() => setOpen(false)}
        title="Issue merit award"
        subtitle="Positive points are added to the student score"
        icon={<Award size={18} />}
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void issueAward()}>
              {saving ? 'Saving…' : 'Issue award'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <FormField label="Student">
            <select
              className="discipline-input"
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} · {s.className ?? ''}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Merit award">
            <select
              className="discipline-input"
              value={form.markId}
              onChange={(e) => setForm((f) => ({ ...f, markId: e.target.value }))}
            >
              <option value="">Select award</option>
              {marks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (+{m.points})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Date">
            <input
              type="date"
              className="discipline-input"
              value={form.incidentDate}
              onChange={(e) => setForm((f) => ({ ...f, incidentDate: e.target.value }))}
            />
          </FormField>
          <FormField label="Citation">
            <textarea
              className="discipline-input min-h-[80px]"
              placeholder="Why this student is recognized"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
        </div>
      </DisciplineModal>

      <div className="hidden print:block">
        {filtered.map((r) => (
          <div key={`cert-${r.id}`} className="mb-8 break-after-page border-4 border-[#000435] p-10 text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-[#000435]">CERTIFICATE OF MERIT</p>
            <p className="mt-6 text-2xl font-extrabold text-[#000435]">{r.studentName}</p>
            <p className="mt-2 text-sm text-slate-600">{r.className}</p>
            <p className="mt-6 text-base">is recognized for <strong>{r.markName ?? r.customCaseName ?? r.category}</strong></p>
            {r.description ? <p className="mt-3 text-sm text-slate-600">{r.description}</p> : null}
            <p className="mt-8 font-mono text-xs">{new Date(r.incidentDate).toLocaleDateString('en-GB')} · +{r.appliedPoints ?? 0} points</p>
          </div>
        ))}
      </div>
    </DisciplinePageLayout>
  );
}
