'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';
import type { Task } from '@/types';

const PRIORITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const CATEGORIES = ['', 'HR', 'Finance', 'Inventory', 'Procurement', 'Academics', 'Administration', 'IT', 'Marketing', 'Operations'];

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: '', dueDate: '' });
  const [creating, setCreating] = useState(false);

  const loadTasks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await taskApi.tasks({ search, status, priority, category, page: String(page), limit: '15' });
      setTasks(data.data);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  }, [search, status, priority, category]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      await taskApi.createTask(createForm);
      setShowCreate(false);
      setCreateForm({ title: '', description: '', priority: 'MEDIUM', category: '', dueDate: '' });
      loadTasks();
    } catch {}
    setCreating(false);
  };

  return (
    <TaskPageLayout
      title="Task Management"
      subtitle="Create, assign, and track all tasks"
      kpis={[
        { label: 'Total Tasks', value: pagination.total },
        { label: 'Current Page', value: `${pagination.page} / ${pagination.totalPages || 1}` },
      ]}
      actions={
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Task
        </button>
      }
    >
      {/* Search & Filters */}
      <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
            <Filter size={16} /> Filters <ChevronDown size={14} />
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All Priority</option>
              {PRIORITIES.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-12 text-center text-sm text-muted shadow-sm">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-muted">No tasks found</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus size={16} /> Create First Task
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="block rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm transition hover:border-ochre/40 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy">{task.title}</h3>
                    {task.category && (
                      <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium text-navy/60">
                        {task.category}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted">{task.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    {task.assignedToName && <span>Assigned: {task.assignedToName}</span>}
                    {task.dueDate && (
                      <span className={new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-600' : ''}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.subtaskCount > 0 && <span>Subtasks: {task.completedSubtasks}/{task.subtaskCount}</span>}
                    {task.commentCount > 0 && <span>Comments: {task.commentCount}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={task.status} />
                  <StatusBadge status={task.priority} />
                  {task.progress > 0 && task.progress < 100 && (
                    <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-ochre" style={{ width: `${task.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => loadTasks(p)}
              className={`rounded-lg px-3 py-1 text-sm ${
                p === pagination.page ? 'bg-primary text-navy font-semibold' : 'bg-white border border-border text-muted hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Create New Task</h2>
            <div className="mt-4 space-y-3">
              <input
                className="input"
                placeholder="Task title *"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
              <textarea
                className="input min-h-[80px]"
                placeholder="Description (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <select className="input" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
                  <option value="">Category</option>
                  {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input
                type="date"
                className="input"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !createForm.title.trim()} className="btn-primary">
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TaskPageLayout>
  );
}
