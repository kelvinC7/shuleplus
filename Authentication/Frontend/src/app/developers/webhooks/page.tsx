'use client';

import { useEffect, useState } from 'react';
import { fetchWebhooks, type WebhookEntry } from '@/lib/developer-api';
import { PageHeader } from '@/components/developer/developer-page-ui';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);

  useEffect(() => {
    fetchWebhooks().then(setWebhooks).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Webhooks" description="Receive real-time event notifications from your applications" />

      {webhooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy/20 p-8 text-center">
          <p className="text-muted">No webhooks configured yet.</p>
          <p className="mt-2 text-sm text-muted">Subscribe to payment.success, payment.failed, and other events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-2xl border border-navy/10 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-navy">{wh.name}</h3>
                  <p className="mt-1 font-mono text-xs text-muted">{wh.url}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${wh.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>
                  {wh.isActive ? '● Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted">Events: {(wh.events as string[]).join(', ')}</p>
              <p className="mt-1 text-xs text-muted">Success rate: {wh.successRate}%</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
