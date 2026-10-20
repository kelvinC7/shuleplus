'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Send, Plus, Check, Clock } from 'lucide-react';
import type { TaskDetail, TaskComment } from '@/types';

export function TaskDetailView({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtask, setShowSubtask] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await taskApi.getTask(taskId);
      setTask(data.data);
    } catch {}
    setLoading(false);
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const handleComment = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      await taskApi.addComment(taskId, comment);
      setComment('');
      load();
    } catch {}
    setSending(false);
  };

  const handleStatusChange = async (status: string) => {
    try {
      await taskApi.updateTaskStatus(taskId, status);
      load();
    } catch {}
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      await taskApi.createSubtask(taskId, { title: newSubtask });
      setNewSubtask('');
      setShowSubtask(false);
      load();
    } catch {}
  };

  const handleToggleChecklist = async (itemId: string, isCompleted: boolean) => {
    if (!task) return;
    const updated = task.checklistItems.map((i) =>
      i.id === itemId ? { ...i, isCompleted: !isCompleted } : i
    );
    try {
      await taskApi.updateTask(taskId, { checklist: updated });
      load();
    } catch {}
  };

  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;
  if (!task) return <div className="p-8 text-center text-muted">Task not found</div>;

  return (
    <TaskPageLayout
      title={task.title}
      subtitle={task.description ?? undefined}
      kpis={[
        { label: 'Status', value: task.status },
        { label: 'Priority', value: task.priority },
        { label: 'Progress', value: `${task.progress}%` },
        { label: 'Due Date', value: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None' },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status Actions */}
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    task.status === s
                      ? 'bg-primary text-navy font-semibold'
                      : 'bg-slate-100 text-muted hover:bg-slate-200'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy">Subtasks ({task.subtasks.length})</h3>
              <button onClick={() => setShowSubtask(!showSubtask)} className="text-xs text-ochre hover:underline">
                <Plus size={14} className="inline" /> Add
              </button>
            </div>
            {showSubtask && (
              <div className="mt-3 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Subtask title"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <button onClick={handleAddSubtask} className="btn-primary">Add</button>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {task.subtasks.map((st) => (
                <Link
                  key={st.id}
                  href={`/tasks/${st.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition hover:border-ochre/40"
                >
                  <span className="text-sm">{st.title}</span>
                  <StatusBadge status={st.status} />
                </Link>
              ))}
              {task.subtasks.length === 0 && <p className="text-sm text-muted">No subtasks</p>}
            </div>
          </div>

          {/* Checklist */}
          {task.checklistItems.length > 0 && (
            <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-navy">
                Checklist ({task.checklistItems.filter((i) => i.isCompleted).length}/{task.checklistItems.length})
              </h3>
              <div className="mt-3 space-y-2">
                {task.checklistItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50"
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${
                      item.isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-border'
                    }`}>
                      {item.isCompleted && <Check size={12} />}
                    </span>
                    <span className={`text-sm ${item.isCompleted ? 'text-muted line-through' : 'text-navy'}`}>
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Comments ({task.comments.length})</h3>
            <div className="mt-4 space-y-3">
              {task.comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy">{c.userName}</span>
                    <span className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{c.content}</p>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <input
                  className="input flex-1"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <button onClick={handleComment} disabled={sending} className="btn-primary">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-navy">Details</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Created by</span><span>{task.createdByName ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Assigned to</span><span>{task.assignedToName ?? 'Unassigned'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Category</span><span>{task.category ?? 'None'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Start Date</span><span>{task.startDate ? new Date(task.startDate).toLocaleDateString() : 'None'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Due Date</span><span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Est. Hours</span><span>{task.estimatedHours ?? 'None'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Actual Hours</span><span>{task.actualHours ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted">Approval</span><StatusBadge status={task.approvalStatus} /></div>
            </div>
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-navy">Tags</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {task.tags.map((t) => (
                  <span key={t} className="rounded-full bg-navy/5 px-2.5 py-0.5 text-xs text-navy/60">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {task.dependencies.length > 0 && (
            <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-navy">Depends On</h3>
              <div className="mt-2 space-y-1">
                {task.dependencies.map((d) => (
                  <Link key={d.id} href={`/tasks/${d.dependsOnId}`} className="block text-sm text-ochre hover:underline">
                    {d.dependsOnTitle}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Time Entries */}
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-navy">Time Entries</h3>
            <div className="mt-2 space-y-2">
              {task.timeEntries.slice(0, 5).map((te) => (
                <div key={te.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted">
                    <Clock size={12} /> {Math.round(te.duration / 60)}m
                  </span>
                  <span className="text-xs text-muted">{te.userName}</span>
                </div>
              ))}
              {task.timeEntries.length === 0 && <p className="text-sm text-muted">No time entries</p>}
            </div>
          </div>
        </div>
      </div>
    </TaskPageLayout>
  );
}
