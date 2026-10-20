'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { StatusBadge } from '@/components/status-badge';
import type { ActionPlanTask, ActionPlan } from '@/types';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'];

const COLUMN_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const COLUMN_COLORS: Record<string, string> = {
  TODO: 'border-slate-300',
  IN_PROGRESS: 'border-blue-400',
  REVIEW: 'border-purple-400',
  COMPLETED: 'border-green-400',
  CANCELLED: 'border-red-300',
};

export function KanbanView() {
  const [tasks, setTasks] = useState<ActionPlanTask[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error);
    loadTasks();
  }, []);

  useEffect(() => { loadTasks(); }, [selectedPlanId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data } = await apApi.listTasks(selectedPlanId || undefined);
      setTasks(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function moveTask(taskId: string, newStatus: string) {
    try {
      await apApi.updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err) { console.error(err); }
  }

  const grouped = COLUMNS.map((col) => ({
    status: col,
    label: COLUMN_LABELS[col],
    tasks: tasks.filter((t) => t.status === col),
    color: COLUMN_COLORS[col],
  }));

  return (
    <ApPageLayout
      title="Kanban Board"
      subtitle="Drag and drop tasks to update status"
    >
      <select
        value={selectedPlanId}
        onChange={(e) => setSelectedPlanId(e.target.value)}
        className="input w-auto min-w-[200px]"
      >
        <option value="">All Plans</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading board…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {grouped.map((col) => (
            <div key={col.status} className="space-y-3">
              <div className={`rounded-xl border-l-4 ${col.color} bg-white px-4 py-2 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-navy">{col.label}</h3>
                  <span className="badge bg-slate-100 text-slate-700">{col.tasks.length}</span>
                </div>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                    className="cursor-grab rounded-xl border border-border bg-white p-3 shadow-sm transition hover:shadow-md"
                  >
                    <p className="text-xs font-medium text-navy">{task.title}</p>
                    {task.owner && <p className="mt-1 text-[10px] text-muted">{task.owner}</p>}
                    {task.dueDate && (
                      <p className="mt-1 text-[10px] text-muted">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-1 rounded-full bg-primary"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted">{task.progress}%</span>
                    </div>
                  </div>
                ))}
                {/* Drop zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('taskId');
                    if (taskId) moveTask(taskId, col.status);
                  }}
                  className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-6 text-xs text-muted transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <Plus size={14} className="mr-1" />
                  Drop here
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ApPageLayout>
  );
}
