'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { FeesPageTitle } from '@/components/fees-page-title';
import { StatusBadge } from '@/components/status-badge';

interface AuditRow {
  id: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
}

interface Approval {
  id: string;
  entityType: string;
  action: string;
  requestedBy: string;
  status: string;
  createdAt: string;
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([api.get('/audit-logs'), api.get('/approvals')]).then(([a, p]) => {
      setLogs(a.data.data ?? []);
      setApprovals(p.data.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <FeesPageTitle className="text-lg font-bold text-navy">Audit & Security</FeesPageTitle>
        <p className="text-sm text-muted">Role permissions, approval workflows & activity trails</p>
      </div>
      {loading ? <p className="text-sm text-muted">Loading…</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="hr-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Activity Logs</h3>
          </div>
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm">
                <p className="font-semibold text-navy">{l.action} · {l.entityType}</p>
                <p className="text-xs text-muted">
                  {l.actorEmail ?? 'system'} · {new Date(l.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
            {!logs.length ? <li className="px-5 py-8 text-center text-muted">No audit events</li> : null}
          </ul>
        </div>
        <div className="hr-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Approval Workflow</h3>
          </div>
          <ul className="divide-y divide-border">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{a.action} · {a.entityType}</p>
                  <p className="text-xs text-muted">{a.requestedBy}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
            {!approvals.length ? (
              <li className="px-5 py-8 text-center text-muted">No pending approvals</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
