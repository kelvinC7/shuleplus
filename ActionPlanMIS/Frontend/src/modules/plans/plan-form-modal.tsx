'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Save, FolderPlus } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApModal } from '@/components/ap-modal';
import type { Category } from '@/types';

interface PlanFormModalProps {
  open: boolean;
  planId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const OTHER_VALUE = '__other__';

const emptyForm = () => ({
  title: '',
  description: '',
  categoryId: '',
  otherCategory: '',
  department: '',
  priority: 'MEDIUM',
  responsiblePerson: '',
  startDate: '',
  dueDate: '',
  budget: 0,
  expectedOutcome: '',
  periodType: '',
  periodYear: new Date().getFullYear(),
  periodQuarter: '',
  periodMonth: '',
});

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-navy/70">
        {label}
        {required ? <span className="text-danger">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function PlanFormModal({ open, planId, onClose, onSaved }: PlanFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm());
  const isOther = form.categoryId === OTHER_VALUE;

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError(null);
    void apApi
      .listCategories()
      .then(({ data }) => setCategories(data.data ?? []))
      .catch(console.error);
    if (!planId) return;

    setLoading(true);
    apApi
      .getPlan(planId)
      .then(({ data }) => {
        const p = data.data;
        setForm({
          title: p.title,
          description: p.description ?? '',
          categoryId: p.categoryId ?? '',
          otherCategory: '',
          department: p.department ?? '',
          priority: p.priority,
          responsiblePerson: p.responsiblePerson ?? '',
          startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
          dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '',
          budget: Number(p.budget),
          expectedOutcome: p.expectedOutcome ?? '',
          periodType: p.periodType ?? '',
          periodYear: p.periodYear ?? new Date().getFullYear(),
          periodQuarter: p.periodQuarter?.toString() ?? '',
          periodMonth: p.periodMonth?.toString() ?? '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, planId]);

  async function resolveCategoryId() {
    if (!isOther) return form.categoryId || undefined;
    const name = form.otherCategory.trim();
    if (!name) throw new Error('Enter a category name');
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const { data } = await apApi.createCategory({ name, color: '#fcb038' });
    return data.data.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const categoryId = await resolveCategoryId();
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description || undefined,
        categoryId,
        department: form.department || undefined,
        priority: form.priority,
        responsiblePerson: form.responsiblePerson || undefined,
        startDate: form.startDate,
        dueDate: form.dueDate,
        budget: Number(form.budget) || 0,
        expectedOutcome: form.expectedOutcome || undefined,
        periodYear: form.periodYear || undefined,
      };
      if (form.periodType) payload.periodType = form.periodType;
      if (form.periodQuarter) payload.periodQuarter = Number(form.periodQuarter);
      if (form.periodMonth) payload.periodMonth = Number(form.periodMonth);

      if (planId) await apApi.updatePlan(planId, payload);
      else await apApi.createPlan(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ApModal
      open={open}
      eyebrow="Planning"
      title={planId ? 'Edit action plan' : 'Create action plan'}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading plan…
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <section className="rounded-2xl border border-border bg-slate-50/70 p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy/50">Overview</h3>
            <div className="space-y-4">
              <Field label="Plan title" required>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder="e.g. Improve P6 science results"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[88px] resize-y"
                  placeholder="What this plan will achieve"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy/50">Classification</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" hint={isOther ? 'Type the category name to create it' : undefined}>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value, otherCategory: '' })}
                  className="input"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value={OTHER_VALUE}>Others</option>
                </select>
              </Field>
              {isOther ? (
                <Field label="Other category" required>
                  <div className="relative">
                    <FolderPlus size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      required
                      value={form.otherCategory}
                      onChange={(e) => setForm({ ...form, otherCategory: e.target.value })}
                      className="input pl-9"
                      placeholder="Enter category name"
                    />
                  </div>
                </Field>
              ) : (
                <Field label="Department">
                  <input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="input"
                    placeholder="e.g. Academic, Finance"
                  />
                </Field>
              )}
              {isOther ? (
                <Field label="Department">
                  <input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="input"
                    placeholder="e.g. Academic, Finance"
                  />
                </Field>
              ) : null}
              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="input"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy/50">Schedule & owner</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Responsible person">
                <input
                  value={form.responsiblePerson}
                  onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })}
                  className="input"
                  placeholder="Name or email"
                />
              </Field>
              <Field label="Budget (RWF)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                  className="input"
                />
              </Field>
              <Field label="Start date" required>
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Due date" required>
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Period type">
                <select
                  value={form.periodType}
                  onChange={(e) => setForm({ ...form, periodType: e.target.value })}
                  className="input"
                >
                  <option value="">None</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </Field>
              <Field label="Expected outcome">
                <textarea
                  value={form.expectedOutcome}
                  onChange={(e) => setForm({ ...form, expectedOutcome: e.target.value })}
                  className="input min-h-[72px] resize-y"
                  placeholder="What success looks like"
                />
              </Field>
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.title} className="btn-primary">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {planId ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </form>
      )}
    </ApModal>
  );
}
