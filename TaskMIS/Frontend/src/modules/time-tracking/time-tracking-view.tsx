'use client';

import { useState, useCallback, useEffect } from 'react';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { Clock, Play, Square, Plus } from 'lucide-react';
import type { RunningTimer, TimeEntry } from '@/types';

export function TimeTrackingView() {
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState({ totalHours: 0, billableHours: 0, nonBillableHours: 0, totalEntries: 0 });
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [taskId, setTaskId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [runningRes, summaryRes] = await Promise.all([
        taskApi.runningTimer(),
        taskApi.timeSummary(),
      ]);
      setRunning(runningRes.data.data);
      setSummary(summaryRes.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(running.startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!taskId.trim()) return;
    try {
      await taskApi.startTimer(taskId);
      load();
      setTaskId('');
    } catch {}
  };

  const handleStop = async () => {
    if (!running) return;
    try {
      await taskApi.stopTimer(running.id);
      setRunning(null);
      setElapsed(0);
      load();
    } catch {}
  };

  return (
    <TaskPageLayout title="Time Tracking" subtitle="Track time spent on tasks">
      {/* Timer Card */}
      <div className="rounded-2xl border border-navy/[0.06] bg-white p-8 shadow-sm text-center">
        {running ? (
          <>
            <p className="text-sm text-muted">Currently tracking:</p>
            <p className="mt-1 text-lg font-bold text-navy">{running.taskTitle}</p>
            <div className="mt-4 text-5xl font-mono font-bold text-ochre">
              {formatTime(elapsed)}
            </div>
            <button onClick={handleStop} className="btn-primary mt-6 bg-red-500 hover:bg-red-600 text-white">
              <Square size={16} /> Stop Timer
            </button>
          </>
        ) : (
          <>
            <Clock size={48} className="mx-auto text-muted" />
            <p className="mt-3 text-sm text-muted">No active timer</p>
            <div className="mt-4 flex justify-center gap-2">
              <input
                className="input w-64"
                placeholder="Enter Task ID to track"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              />
              <button onClick={handleStart} disabled={!taskId.trim()} className="btn-primary">
                <Play size={16} /> Start
              </button>
            </div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Total Hours</p>
          <p className="mt-2 text-3xl font-bold text-navy">{summary.totalHours}</p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Billable</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{summary.billableHours}</p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Non-Billable</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{summary.nonBillableHours}</p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Total Entries</p>
          <p className="mt-2 text-3xl font-bold text-navy">{summary.totalEntries}</p>
        </div>
      </div>
    </TaskPageLayout>
  );
}
