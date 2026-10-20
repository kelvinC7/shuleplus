'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ensureAccessToken } from '@/lib/api';
import { getStoredUser, hasActiveSession } from '@/lib/auth';
import { MountedOnly } from '@/components/ui/mounted-only';
import type { InAppNotificationItem } from '../types';

interface NotificationCenterContextValue {
  items: InAppNotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: (userId: string) => Promise<void>;
  markRead: (id: string, userId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  archive: (id: string, userId: string) => Promise<void>;
  setOverlayItems: (items: InAppNotificationItem[]) => void;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) throw new Error('useNotificationCenter must be used within NotificationProvider');
  return ctx;
}

function mapItem(raw: Record<string, unknown>): InAppNotificationItem {
  return {
    id: String(raw.id),
    title: String(raw.title),
    body: String(raw.body),
    priority: (raw.priority as InAppNotificationItem['priority']) ?? 'normal',
    isRead: Boolean(raw.isRead),
    isArchived: Boolean(raw.isArchived),
    actionUrl: raw.actionUrl ? String(raw.actionUrl) : undefined,
    createdAt: String(raw.createdAt),
  };
}

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InAppNotificationItem[]>([]);
  const [overlayItems, setOverlayItems] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const mergedItems = [...overlayItems, ...items.filter((i) => !overlayItems.some((o) => o.id === i.id))];
  const mergedUnread =
    overlayItems.filter((n) => !n.isRead && !n.isArchived).length + unreadCount;

  const refresh = useCallback(async (userId: string) => {
    if (!userId || !hasActiveSession()) return;
    const token = await ensureAccessToken();
    if (!token) return;

    const sessionUserId = getStoredUser()?.id;
    const effectiveUserId = sessionUserId && sessionUserId === userId ? userId : sessionUserId ?? userId;

    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications/in-app', { params: { userId: effectiveUserId } }),
        api.get('/notifications/in-app/unread-count', { params: { userId: effectiveUserId } }),
      ]);
      setItems((listRes.data.data ?? []).map(mapItem));
      setUnreadCount(countRes.data.data?.count ?? 0);
    } catch {
      const demo: InAppNotificationItem[] = JSON.parse(
        localStorage.getItem('shuleplus_demo_notifications') ?? '[]'
      );
      setItems(demo);
      setUnreadCount(demo.filter((n) => !n.isRead).length);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string, userId: string) => {
    if (id.startsWith('module-status-')) {
      setOverlayItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/in-app/${id}/read`, { userId });
    } catch { /* local update only */ }
  }, []);

  const markAllRead = useCallback(async (userId: string) => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/in-app/read-all', { userId });
    } catch { /* local update only */ }
  }, []);

  const archive = useCallback(async (id: string, userId: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.patch(`/notifications/in-app/${id}/archive`, { userId });
    } catch { /* local update only */ }
  }, []);

  return (
    <NotificationCenterContext.Provider
      value={{
        items: mergedItems,
        unreadCount: mergedUnread,
        loading,
        refresh,
        markRead,
        markAllRead,
        archive,
        setOverlayItems,
      }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function NotificationBell({ userId }: { userId?: string }) {
  const { items, unreadCount, refresh, markRead, markAllRead, archive } = useNotificationCenter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      await refresh(userId);
    })();
  }, [userId, refresh]);

  const unread = items.filter((n) => !n.isRead && !n.isArchived);

  return (
    <MountedOnly
      fallback={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-navy/10 bg-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-navy/40">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
      }
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-navy/10 bg-white text-navy/70 transition hover:border-primary hover:text-primary"
          title="Notifications"
        >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-poppins-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl sm:w-96">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-poppins-semibold text-sm text-navy">Notifications</p>
              {unread.length > 0 && userId && (
                <button
                  type="button"
                  onClick={() => markAllRead(userId)}
                  className="text-xs font-poppins-semibold text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">No notifications yet</p>
              ) : (
                items.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-border/60 px-4 py-3 transition hover:bg-navy/[0.02] ${!n.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-poppins-semibold text-xs text-navy">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.body}</p>
                      </div>
                      {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {!n.isRead && userId && !n.id.startsWith('module-status-') && (
                        <button type="button" onClick={() => markRead(n.id, userId)} className="text-[10px] font-poppins-semibold text-navy hover:underline">
                          Mark read
                        </button>
                      )}
                      {userId && (
                        <button type="button" onClick={() => archive(n.id, userId)} className="text-[10px] font-poppins-semibold text-muted hover:underline">
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </MountedOnly>
  );
}
