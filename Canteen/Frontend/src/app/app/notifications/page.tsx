'use client';

import { toast } from 'sonner';
import { CheckCheck } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/loading';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import type { CanteenNotification } from '@/types';

export default function NotificationsPage() {
  const { data, loading, error, reload } = useApi<CanteenNotification[]>('/notifications');

  async function markAll() {
    try {
      await api.post('/notifications/read-all');
      toast.success('All notifications marked as read');
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed');
    }
  }

  async function markOne(id: string) {
    try {
      await api.post(`/notifications/${id}/read`);
      reload();
    } catch {
      /* noop */
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates for your canteen."
        actions={
          <Button variant="outline" onClick={markAll}>
            <CheckCheck /> Mark all read
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No notifications" description="You are all caught up." />
      ) : (
        <div className="space-y-3">
          {data?.map((n) => (
            <button
              key={n.id}
              onClick={() => markOne(n.id)}
              className={`w-full rounded-xl border border-border bg-white p-4 text-left shadow-sm transition-colors hover:bg-muted/5 ${
                n.isRead ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-navy">{n.title}</p>
                    {!n.isRead ? <Badge variant="info">new</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(n.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
