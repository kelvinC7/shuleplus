'use client';

import { useEffect, useState } from 'react';
import { fetchDeveloperDashboard, fetchEndpointStats } from '@/lib/developer-api';
import { EmptyState, PageHeader, StatCard } from '@/components/developer/developer-page-ui';

export default function UsagePage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDeveloperDashboard>>['stats'] | null>(null);
  const [endpoints, setEndpoints] = useState<Awaited<ReturnType<typeof fetchEndpointStats>>>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDeveloperDashboard(days), fetchEndpointStats(days)])
      .then(([dashboard, endpointStats]) => {
        setStats(dashboard.stats);
        setEndpoints(endpointStats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const remaining = (stats?.quotaLimit ?? 0) - (stats?.quotaUsed ?? 0);

  return (
    <div>
      <PageHeader
        title="API Usage & Analytics"
        description="Real quota and endpoint performance from your partner API traffic"
        action={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Requests today"
          value={loading ? '—' : `${stats?.quotaUsed.toLocaleString() ?? 0} / ${stats?.quotaLimit.toLocaleString() ?? 0}`}
          accent="amber"
        />
        <StatCard title="Success rate today" value={loading ? '—' : `${stats?.successRate ?? '100.00'}%`} accent="green" />
        <StatCard title="Remaining today" value={loading ? '—' : `${Math.max(remaining, 0).toLocaleString()} requests`} />
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-navy/10">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats?.quotaPercent ?? 0}%` }} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-navy/5 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Requests</th>
              <th className="px-4 py-3">Success</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={ep.path} className="border-b border-navy/5">
                <td className="px-4 py-3 font-mono text-xs">{ep.path}</td>
                <td className="px-4 py-3">{ep.requests.toLocaleString()}</td>
                <td className="px-4 py-3 text-emerald-600">{ep.successRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && endpoints.length === 0 && (
          <EmptyState title="No endpoint traffic yet" description="API calls will appear here after you use the explorer or sandbox." />
        )}
      </div>
    </div>
  );
}
