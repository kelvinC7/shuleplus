'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { Notification } from '@/types';
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Package,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { EntityCard, PageLoading } from '@/components/list-ui';

const TYPE_ICONS: Record<string, typeof Bell> = {
  PR_SUBMITTED: FileText,
  PR_APPROVED: Check,
  PO_CREATED: ShoppingCart,
  DELIVERY: Truck,
  CONTRACT_EXPIRING: AlertTriangle,
  BUDGET_LIMIT: DollarSign,
  ITEMS_RECEIVED: Package,
  DEFAULT: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  PR_SUBMITTED: 'bg-sky-50 text-sky-700',
  PR_APPROVED: 'bg-emerald-50 text-emerald-700',
  PO_CREATED: 'bg-violet-50 text-violet-700',
  DELIVERY: 'bg-orange-50 text-orange-700',
  CONTRACT_EXPIRING: 'bg-red-50 text-red-700',
  BUDGET_LIMIT: 'bg-amber-50 text-amber-700',
  ITEMS_RECEIVED: 'bg-teal-50 text-teal-700',
  DEFAULT: 'bg-slate-50 text-slate-600',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await procurementApi.notifications.list();
      setNotifications(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await procurementApi.notifications.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      /* empty */
    }
  };

  const markAllAsRead = async () => {
    try {
      await procurementApi.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      /* empty */
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading notifications…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        actions={
          unreadCount > 0 ? (
            <button type="button" onClick={markAllAsRead} className="btn-secondary">
              <CheckCheck className="h-4 w-4" /> Mark All Read
            </button>
          ) : undefined
        }
        kpis={[
          {
            label: 'Total',
            value: notifications.length,
            icon: <Bell size={20} strokeWidth={1.75} />,
          },
          {
            label: 'Unread',
            value: unreadCount,
            icon: <Bell size={20} strokeWidth={1.75} />,
            valueClassName: unreadCount > 0 ? 'text-sky-700' : undefined,
          },
        ]}
      >
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || TYPE_ICONS.DEFAULT;
            const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.DEFAULT;
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => !n.isRead && markAsRead(n.id)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !n.isRead) markAsRead(n.id);
                }}
              >
                <EntityCard
                  className={`cursor-pointer !p-4 ${!n.isRead ? 'border-sky-200 bg-sky-50/40' : ''}`}
                >
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 rounded-xl p-2.5 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm ${!n.isRead ? 'font-semibold text-navy' : 'font-medium text-navy/90'}`}
                      >
                        {n.title}
                      </h3>
                      {!n.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                    <p className="mt-1 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
                </EntityCard>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-muted">
              <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </PlatformPageLayout>
    </MainLayout>
  );
}
