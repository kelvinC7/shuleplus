'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import type { Category } from '@/types';

interface Props {
  planId?: string;
}

const OTHER_VALUE = '__other__';

export function PlanFormView({ planId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!planId);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
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
  const isOther = form.categoryId === OTHER_VALUE;

  useEffect(() => {
    apApi.listCategories().then(({ data }) => setCategories(data.data)).catch(console.error);
    if (planId) {
      apApi.getPlan(planId)
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
    }
  }, [planId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let categoryId = form.categoryId || undefined;
      if (form.categoryId === OTHER_VALUE) {
        const name = form.otherCategory.trim();
        if (!name) return;
        const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          categoryId = existing.id;
        } else {
          const { data } = await apApi.createCategory({ name, color: '#fcb038' });
          categoryId = data.data.id;
        }
      }
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        categoryId,
        department: form.department || undefined,
        priority: form.priority,
        responsiblePerson: form.responsiblePerson || undefined,
        startDate: form.startDate,
        dueDate: form.dueDate,
        budget: Number(form.budget),
        expectedOutcome: form.expectedOutcome || undefined,
        periodYear: form.periodYear || undefined,
      };
      if (form.periodType) payload.periodType = form.periodType;
      if (form.periodQuarter) payload.periodQuarter = Number(form.periodQuarter);
      if (form.periodMonth) payload.periodMonth = Number(form.periodMonth);
      if (planId) {
        await apApi.updatePlan(planId, payload);
      } else {
        await apApi.createPlan(payload);
      }
      router.push('/plans');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 animate-spin" size={16} />
        Loading…
      </div>
    );
  }

  return (
    <ApPageLayout
      title={planId ? 'Edit Action Plan' : 'New Action Plan'}
      subtitle={planId ? 'Update plan details' : 'Create a new action plan'}
      backHref="/plans"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-navy">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
                placeholder="Enter plan title"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-navy">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input min-h-[80px] resize-y"
                placeholder="Describe the plan"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, otherCategory: '' })}
                className="input"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value={OTHER_VALUE}>Others</option>
              </select>
            </div>
            {isOther ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Other category *</label>
                <input
                  required
                  value={form.otherCategory}
                  onChange={(e) => setForm({ ...form, otherCategory: e.target.value })}
                  className="input"
                  placeholder="Enter category name"
                />
              </div>
            ) : null}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="input"
                placeholder="e.g. Academic, Finance"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Priority</label>
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
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Responsible Person</label>
              <input
                value={form.responsiblePerson}
                onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })}
                className="input"
                placeholder="Name or email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Start Date *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Due Date *</label>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Budget</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Period Type</label>
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
            </div>
            {form.periodType === 'QUARTERLY' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Quarter</label>
                <select
                  value={form.periodQuarter}
                  onChange={(e) => setForm({ ...form, periodQuarter: e.target.value })}
                  className="input"
                >
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </div>
            )}
            {form.periodType === 'MONTHLY' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Month</label>
                <select
                  value={form.periodMonth}
                  onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
                  className="input"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-navy">Expected Outcome</label>
            <textarea
              value={form.expectedOutcome}
              onChange={(e) => setForm({ ...form, expectedOutcome: e.target.value })}
              className="input min-h-[60px] resize-y"
              placeholder="What success looks like"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            <ArrowLeft size={14} />
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.title} className="btn-primary">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {planId ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      </form>
    </ApPageLayout>
  );
}
