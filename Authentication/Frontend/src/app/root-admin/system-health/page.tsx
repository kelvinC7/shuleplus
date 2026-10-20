'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';

export default function SystemHealthPage() {
  const [health, setHealth] = useState<{
    database: string;
    activeSessions: number;
    loginsLast24h: number;
    uptime: number;
  } | null>(null);

  useEffect(() => {
    api.get('/root-admin/system-health').then((res) => setHealth(res.data.data));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackButton href="/root-admin" />
        <h1 className="font-montserrat text-2xl font-bold text-navy">System Health</h1>
      </div>
      {health && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Database', health.database === 'healthy' ? '🟢 Healthy' : '🔴 Down'],
            ['Active Sessions', String(health.activeSessions)],
            ['Logins (24h)', String(health.loginsLast24h)],
            ['Uptime', `${Math.floor(health.uptime / 60)} min`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-white/90 p-6">
              <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
              <p className="mt-2 font-poppins-semibold text-navy text-lg">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
