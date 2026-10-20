'use client';

import { useState, useCallback, useEffect } from 'react';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { Bell, Check, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  TASK_ASSIGNED: 'bg-blue-100 text-blue-800',
  TASK_COMPLETED: 'bg-green-100 text-green-800',
  TASK_OVERDUE: 'bg-red-100 text-red-800',
  DEADLINE_APPROACHING: 'bg-amber-100 text-amber-800',
  WORKFLOW_APPROVAL_REQUIRED: 'bg-purple-100 text-purple-800',
  WORKFLOW_APPROVED: 'bg-green-100 text-green-800',
  WORKFLOW_REJECTED: 'bg-red-100 text-red-800',
  COMMENT_ADDED: 'bg-blue-100 text-blue-800',
  MENTION: 'bg-purple-100 text-purple-800',
  ESCALATION: 'bg-red-100 text-red-800',
  STATUS_CHANGE: 'bg-slate-100 text-slate-700',
  GENERAL: 'bg-slate-100 text-slate-700',
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (filter === 'unread') params.isRead = 'false';
      const [notifRes, countRes] = await Promise.all([
        taskApi.notifications(params),
        taskApi.unreadCount(),
      ]);
      setNotifications(notifRes.data.data);
      setUnreadCount(countRes.data.data.count);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    try {
      await taskApi.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await taskApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <TaskPageLayout
      title="Notifications"
      subtitle="Stay updated on tasks and workflows"
      kpis={[
        { label: 'Unread', value: unreadCount },
        { label: 'Total', value: notifications.length },
      ]}
      actions={
        unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary">
            <CheckCheck size={16} /> Mark All Read
          </button>
        )
      }
    >
      <div className="mb-4 flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === f ? 'bg-primary text-navy' : 'bg-white border border-border text-muted hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted shadow-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <Bell size={40} className="mx-auto text-muted/30" />
            <p className="mt-3 text-sm text-muted">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                n.isRead ? 'border-navy/[0.06]' : 'border-ochre/30 bg-primary/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${TYPE_COLORS[n.type] ?? 'bg-slate-100 text-slate-700'}`}>
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-ochre" />}
                  </div>
                  <p className="mt-1 font-medium text-navy">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted">{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.isRead && (
                    <button onClick={() => handleMarkRead(n.id)} className="text-xs text-ochre hover:underline">
                      <Check size={12} className="inline" /> Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </TaskPageLayout>
  );
}
