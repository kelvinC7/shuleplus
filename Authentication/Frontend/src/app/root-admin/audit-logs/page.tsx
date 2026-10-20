'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Array<{
    id: string;
    action: string;
    createdAt: string;
    user?: { firstName: string; lastName: string; email: string };
    organization?: { name: string };
  }>>([]);

  useEffect(() => {
    api.get('/root-admin/audit-logs').then((res) => setLogs(res.data.data));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackButton href="/root-admin" />
        <h1 className="font-montserrat text-2xl font-bold text-navy">Audit Logs</h1>
      </div>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-border bg-white/90 px-4 py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-poppins-semibold text-navy">{log.action}</span>
              <span className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            {log.user && (
              <p className="text-xs text-muted mt-1">
                {log.user.firstName} {log.user.lastName} ({log.user.email})
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
