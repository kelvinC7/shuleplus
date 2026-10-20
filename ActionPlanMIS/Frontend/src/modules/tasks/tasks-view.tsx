'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Circle,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ListTodo,
} from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { ApDrawer } from '@/components/ap-drawer';
import {
  ApActiveFilters,
  ApFilterBar,
  ApFilterDate,
  ApFilterSelect,
} from '@/components/ap-filter-bar';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/contexts/auth-context';
import type { ActionPlanTask, ActionPlan } from '@/types';

const emptyTaskForm = () => ({
  actionPlanId: '',
  title: '',
  description: '',
  owner: '',
  startDate: '',
  dueDate: '',
  estimatedHours: '',
});

export function TasksView({ mode }: { mode?: string | null }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateMode, setDateMode] = useState<'any' | 'on' | 'range'>('any');
  const [onDate, setOnDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tasks, setTasks] = useState<ActionPlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ActionPlanTask | null>(null);
  const [form, setForm] = useState(emptyTaskForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apApi
      .listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [selectedPlanId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data } = await apApi.listTasks(selectedPlanId || undefined);
      setTasks(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingTask(null);
    setError(null);
    setForm({ ...emptyTaskForm(), actionPlanId: selectedPlanId });
    setDrawerOpen(true);
  }

  function openEdit(task: ActionPlanTask) {
    setEditingTask(task);
    setError(null);
    setForm({
      actionPlanId: task.actionPlanId,
      title: task.title,
      description: task.description ?? '',
      owner: task.owner ?? '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours?.toString() ?? '',
    });
    setDrawerOpen(true);
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!form.actionPlanId) {
      setError('Select an action plan for this task');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description || undefined,
        owner: form.owner || undefined,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      };
      if (editingTask) {
        await apApi.updateTask(editingTask.id, payload);
      } else {
        await apApi.createTask(form.actionPlanId, payload);
      }
      setDrawerOpen(false);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save task');
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(task: ActionPlanTask, status: string) {
    try {
      await apApi.updateTask(task.id, {
        status,
        progress: status === 'COMPLETED' ? 100 : status === 'TODO' ? 0 : task.progress,
      });
      await loadTasks();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTask(task: ActionPlanTask) {
    if (!confirm(`Delete “${task.title}”?`)) return;
    setDeletingId(task.id);
    try {
      await apApi.deleteTask(task.id);
      await loadTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  const visible = (() => {
    let list = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;
    if (mode === 'progress') {
      list = list.filter((t) => t.status === 'IN_PROGRESS' || (t.progress > 0 && t.status !== 'COMPLETED'));
    }
    if (mode === 'mine' && user?.email) {
      const local = user.email.split('@')[0]?.toLowerCase() ?? '';
      list = list.filter(
        (t) =>
          t.owner?.toLowerCase().includes(local) ||
          t.owner?.toLowerCase() === user.email.toLowerCase()
      );
    }
    if (dateMode === 'on' && onDate) {
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate).toISOString().slice(0, 10) === onDate;
      });
    } else if (dateMode === 'range' && (dateFrom || dateTo)) {
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate).toISOString().slice(0, 10);
        if (dateFrom && due < dateFrom) return false;
        if (dateTo && due > dateTo) return false;
        return true;
      });
    }
    return list;
  })();
  const planTitle = (id: string) => plans.find((p) => p.id === id)?.title ?? '—';

  const pageTitle =
    mode === 'mine' ? 'My Activities' : mode === 'progress' ? 'Progress Updates' : 'Objectives & Activities';
  const pageSubtitle =
    mode === 'mine'
      ? 'Activities assigned to you across all plans'
      : mode === 'progress'
        ? 'Track in-progress activities and partial completion'
        : 'Objectives, activities and tasks linked to action plans';

  return (
    <>
      <ApPageLayout
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            Add task
          </button>
        }
      >
        <div className="overflow-hidden rounded-3xl border border-navy/[0.06] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <ApFilterBar>
              <ApFilterSelect
                label="Action plan"
                value={selectedPlanId}
                onChange={setSelectedPlanId}
                options={[
                  { value: '', label: 'All plans' },
                  ...plans.map((p) => ({ value: p.id, label: p.title })),
                ]}
                className="min-w-[220px] flex-1"
              />
              <ApFilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'TODO', label: 'To Do' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'REVIEW', label: 'Review' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
              <ApFilterSelect
                label="Due date"
                value={dateMode}
                onChange={(value) => {
                  setDateMode(value as 'any' | 'on' | 'range');
                  if (value === 'any') {
                    setOnDate('');
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
                options={[
                  { value: 'any', label: 'Any date' },
                  { value: 'on', label: 'Specific date' },
                  { value: 'range', label: 'Date range' },
                ]}
              />
              {dateMode === 'on' ? <ApFilterDate label="Due on" value={onDate} onChange={setOnDate} /> : null}
              {dateMode === 'range' ? (
                <>
                  <ApFilterDate label="Due from" value={dateFrom} onChange={setDateFrom} />
                  <ApFilterDate label="Due to" value={dateTo} onChange={setDateTo} />
                </>
              ) : null}
              <p className="self-end pb-2 text-xs font-medium text-muted lg:ml-auto">
                {visible.length} task{visible.length === 1 ? '' : 's'}
              </p>
            </ApFilterBar>
            <ApActiveFilters
              items={[
                statusFilter ? { key: 'status', label: `Status: ${statusFilter.replace(/_/g, ' ')}`, onClear: () => setStatusFilter('') } : null,
                dateMode === 'on' && onDate ? { key: 'on', label: `Due on ${onDate}`, onClear: () => { setDateMode('any'); setOnDate(''); } } : null,
                dateMode === 'range' && (dateFrom || dateTo)
                  ? { key: 'range', label: `Due ${dateFrom || '…'} – ${dateTo || '…'}`, onClear: () => { setDateMode('any'); setDateFrom(''); setDateTo(''); } }
                  : null,
              ].filter(Boolean) as { key: string; label: string; onClear: () => void }[]}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted">
              <Loader2 className="mr-2 animate-spin" size={16} />
              Loading tasks…
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5">
                <ListTodo size={28} className="text-muted" />
              </div>
              <p className="text-sm font-semibold text-navy">No tasks yet</p>
              <p className="mt-1 text-xs text-muted">Add a task from the drawer on the right</p>
              <button type="button" onClick={openCreate} className="btn-primary mt-4">
                <Plus size={16} />
                Add task
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-navy/50">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-3 py-3">Task</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((task) => (
                    <tr key={task.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            void updateTaskStatus(task, task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED')
                          }
                          className="text-muted hover:text-navy"
                          title="Toggle complete"
                        >
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle size={18} className="text-emerald-500" />
                          ) : (
                            <Circle size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3.5">
                        <p
                          className={`font-semibold ${
                            task.status === 'COMPLETED' ? 'text-muted line-through' : 'text-navy'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          Progress {task.progress}%
                          {task.subtasks?.length ? ` · ${task.subtasks.length} subtasks` : ''}
                        </p>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3.5 text-xs text-muted">
                        {planTitle(task.actionPlanId)}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-muted">{task.owner || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-3.5">
                        <select
                          value={task.status}
                          onChange={(e) => void updateTaskStatus(task, e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-navy"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <StatusBadge status={task.status} />
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            className="rounded-xl p-2 text-muted transition hover:bg-amber-50 hover:text-amber-700"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteTask(task)}
                            disabled={deletingId === task.id}
                            className="rounded-xl p-2 text-muted transition hover:bg-rose-50 hover:text-rose-700"
                            title="Delete"
                          >
                            {deletingId === task.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ApPageLayout>

      <ApDrawer
        open={drawerOpen}
        eyebrow="Tasks"
        title={editingTask ? 'Edit task' : 'Add task'}
        onClose={() => setDrawerOpen(false)}
      >
        <form onSubmit={(e) => void saveTask(e)} className="flex min-h-full flex-col">
          {error ? (
            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                Action plan *
              </span>
              <select
                required
                value={form.actionPlanId}
                onChange={(e) => setForm({ ...form, actionPlanId: e.target.value })}
                className="input"
                disabled={Boolean(editingTask)}
              >
                <option value="">Select a plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                Title *
              </span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
                placeholder="What needs to be done"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input min-h-[88px] resize-y"
                placeholder="Notes or acceptance criteria"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                Owner
              </span>
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="input"
                placeholder="Responsible person"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                  Start date
                </span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                  Due date
                </span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="input"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-navy/70">
                Estimated hours
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                className="input"
                placeholder="0"
              />
            </label>
          </div>
          <div className="mt-auto flex gap-2 border-t border-border pt-5">
            <button type="button" onClick={() => setDrawerOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary flex-1">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              {editingTask ? 'Save task' : 'Add task'}
            </button>
          </div>
        </form>
      </ApDrawer>
    </>
  );
}
