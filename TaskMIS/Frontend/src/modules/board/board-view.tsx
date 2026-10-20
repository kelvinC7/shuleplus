'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { StatusBadge } from '@/components/status-badge';
import type { Task } from '@/types';

const COLUMNS = [
  { key: 'TODO', label: 'To Do', color: 'bg-slate-100 border-slate-200' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { key: 'REVIEW', label: 'Review', color: 'bg-amber-50 border-amber-200' },
  { key: 'DONE', label: 'Done', color: 'bg-green-50 border-green-200' },
];

export function BoardView() {
  const [board, setBoard] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<{ id: string; from: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await taskApi.board();
      setBoard(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDragStart = (taskId: string, fromStatus: string) => {
    setDraggedTask({ id: taskId, from: fromStatus });
  };

  const handleDrop = async (toStatus: string) => {
    if (!draggedTask || draggedTask.from === toStatus) {
      setDraggedTask(null);
      return;
    }
    try {
      await taskApi.updateTaskStatus(draggedTask.id, toStatus);
      setBoard((prev) => {
        const task = prev[draggedTask.from]?.find((t) => t.id === draggedTask.id);
        if (!task) return prev;
        return {
          ...prev,
          [draggedTask.from]: prev[draggedTask.from].filter((t) => t.id !== draggedTask.id),
          [toStatus]: [{ ...task, status: toStatus }, ...prev[toStatus]],
        };
      });
    } catch {}
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <TaskPageLayout
      title="Kanban Board"
      subtitle="Drag and drop tasks between columns"
    >
      {loading ? (
        <div className="text-center text-sm text-muted py-8">Loading board...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`rounded-2xl border ${col.color} p-4 min-h-[300px]`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-navy text-sm">{col.label}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-navy shadow-sm">
                  {board[col.key]?.length ?? 0}
                </span>
              </div>
              <div className="space-y-2">
                {(board[col.key] ?? []).map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    draggable
                    onDragStart={() => handleDragStart(task.id, col.key)}
                    className="block rounded-xl border border-white bg-white p-3 shadow-sm transition hover:shadow-md cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-navy line-clamp-2">{task.title}</h4>
                      <StatusBadge status={task.priority} />
                    </div>
                    {task.category && (
                      <span className="mt-1 inline-block rounded-full bg-navy/5 px-2 py-0.5 text-[10px] text-navy/60">
                        {task.category}
                      </span>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                      <span>{task.assignedToName ?? 'Unassigned'}</span>
                      {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                    {task.progress > 0 && task.progress < 100 && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-ochre" style={{ width: `${task.progress}%` }} />
                      </div>
                    )}
                  </Link>
                ))}
                {(board[col.key] ?? []).length === 0 && (
                  <p className="text-center text-xs text-muted py-4">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </TaskPageLayout>
  );
}
