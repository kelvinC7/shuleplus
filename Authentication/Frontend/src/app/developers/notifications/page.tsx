'use client';

import { useEffect, useState } from 'react';
import { fetchDeveloperNotifications } from '@/lib/developer-api';
import { EmptyState, PageHeader } from '@/components/developer/developer-page-ui';

export default function NotificationsPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchDeveloperNotifications>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeveloperNotifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Notifications" description="Account activity, production access updates, and integration alerts" />

      {loading ? (
        <p className="text-sm text-muted">Loading notifications…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No notifications yet" description="Activity on your developer account will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.type === 'warning'
                  ? 'border-amber-200 bg-amber-50'
                  : n.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-sky-200 bg-sky-50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-navy">{n.title}</p>
                <span className="text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
