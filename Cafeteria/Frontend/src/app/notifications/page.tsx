'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Bell, Check, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await cafeteriaApi.notifications.list();
      setNotifications(data);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    try {
      await cafeteriaApi.notifications.markRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await cafeteriaApi.notifications.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK': return <div className="rounded-lg bg-yellow-500 p-2 text-white"><Bell className="h-4 w-4" /></div>;
      case 'EXPIRED_FOOD': return <div className="rounded-lg bg-red-500 p-2 text-white"><Bell className="h-4 w-4" /></div>;
      case 'UPCOMING_MENU': return <div className="rounded-lg bg-primary p-2 text-white"><Bell className="h-4 w-4" /></div>;
      case 'LATE_DELIVERY': return <div className="rounded-lg bg-orange-500 p-2 text-white"><Bell className="h-4 w-4" /></div>;
      case 'MEAL_TIME': return <div className="rounded-lg bg-green-500 p-2 text-white"><Bell className="h-4 w-4" /></div>;
      case 'SUPPLIER_ARRIVAL': return <div className="rounded-lg bg-purple-500 p-2 text-white"><Bell className="h-4 w-4" /></div>;
      default: return <div className="rounded-lg bg-gray-500 p-2 text-white"><Bell className="h-4 w-4" /></div>;
    }
  };

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Low stock alerts, expired food, meal reminders, and delivery updates</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <CheckCheck className="h-4 w-4" /> Mark All Read ({unreadCount})
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 shadow-sm text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">Notifications will appear here when events are triggered</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif.id} className={`rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4 transition-all ${!notif.isRead ? 'border-l-4 border-l-primary' : ''}`}>
                {typeIcon(notif.type)}
                <div className="flex-1">
                  <h3 className={`font-medium ${!notif.isRead ? 'text-navy' : 'text-muted-foreground'}`}>{notif.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                </div>
                {!notif.isRead && (
                  <button onClick={() => handleMarkRead(notif.id)} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Mark as read">
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
