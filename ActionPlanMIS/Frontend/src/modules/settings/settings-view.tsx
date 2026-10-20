'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';

export function SettingsView() {
  const [constants, setConstants] = useState<{ planStatuses: string[]; priorities: string[]; expenseCategories: string[]; resourceTypes: string[]; templateTypes: { id: string; name: string; description: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.constants()
      .then(({ data }) => setConstants(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ApPageLayout
      title="Settings"
      subtitle="Module configuration and constants"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Plan Statuses</h3>
            <div className="flex flex-wrap gap-2">
              {constants?.planStatuses.map((s) => (
                <span key={s} className="badge bg-slate-100 text-slate-700">{s.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Priorities</h3>
            <div className="flex flex-wrap gap-2">
              {constants?.priorities.map((p) => (
                <span key={p} className="badge bg-slate-100 text-slate-700">{p}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Expense Categories</h3>
            <div className="flex flex-wrap gap-2">
              {constants?.expenseCategories.map((c) => (
                <span key={c} className="badge bg-slate-100 text-slate-700">{c}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Resource Types</h3>
            <div className="flex flex-wrap gap-2">
              {constants?.resourceTypes.map((r) => (
                <span key={r} className="badge bg-slate-100 text-slate-700">{r}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Template Types</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {constants?.templateTypes.map((t) => (
                <div key={t.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-navy">{t.name}</p>
                  <p className="text-xs text-muted">{t.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">API Information</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">API Base URL</span>
                <span className="font-mono text-navy">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3007/api'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Module Version</span>
                <span className="font-mono text-navy">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Module Slug</span>
                <span className="font-mono text-navy">action-plan</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </ApPageLayout>
  );
}
