'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import type { Notification } from '@/types';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  const unread = items.filter((n) => !n.isRead).length;

  async function load() {
    setLoading(true);
    try {
      const { data } = await apApi.listNotifications();
      setItems(data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await apApi.markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative rounded-lg p-2 text-muted hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-navy">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8 text-muted">
                <Loader2 className="animate-spin" size={16} />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">No notifications</p>
            ) : (
              items.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.isRead && void markRead(n.id)}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                    n.isRead ? 'opacity-60' : ''
                  }`}
                >
                  <p className="text-xs font-semibold text-navy">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted line-clamp-2">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
