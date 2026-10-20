'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '@/types';

export function CalendarView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await taskApi.tasks({ limit: '100' });
      setTasks(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter((t) => t.dueDate && t.dueDate.startsWith(dateStr));
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <TaskPageLayout title="Calendar" subtitle="Task scheduling & deadlines">
      <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-bold text-navy">{monthName}</h2>
          <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-slate-100"><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayTasks = getTasksForDay(day);
            return (
              <div
                key={day}
                className={`min-h-[80px] rounded-lg border p-1.5 ${
                  isToday(day) ? 'border-ochre bg-primary/5' : 'border-border'
                }`}
              >
                <span className={`text-xs font-medium ${isToday(day) ? 'text-ochre font-bold' : 'text-navy'}`}>
                  {day}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className={`block truncate rounded px-1 py-0.5 text-[9px] font-medium text-white ${
                        t.status === 'DONE' ? 'bg-green-500' :
                        t.priority === 'CRITICAL' ? 'bg-red-500' :
                        t.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                    >
                      {t.title}
                    </Link>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="block text-[8px] text-muted text-center">+{dayTasks.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="mt-6 rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-navy">Upcoming Tasks</h3>
        <div className="mt-3 space-y-2">
          {tasks
            .filter((t) => t.dueDate && new Date(t.dueDate) >= today && t.status !== 'DONE')
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 10)
            .map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition hover:border-ochre/40"
              >
                <div>
                  <p className="text-sm font-medium text-navy">{t.title}</p>
                  <p className="text-xs text-muted">{t.assignedToName ?? 'Unassigned'}</p>
                </div>
                <span className="text-xs text-muted">{new Date(t.dueDate!).toLocaleDateString()}</span>
              </Link>
            ))}
        </div>
      </div>
    </TaskPageLayout>
  );
}
