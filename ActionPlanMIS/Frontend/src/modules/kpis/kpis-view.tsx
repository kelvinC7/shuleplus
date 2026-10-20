'use client';

import { useEffect, useState } from 'react';
import { Target, Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { RagBadge } from '@/components/rag-badge';
import { ragFromKpi } from '@/lib/rag-status';
import type { ActionPlan } from '@/types';

export function KpisView() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi
      .listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allKpis = plans.flatMap((p) =>
    (p.kpis ?? []).map((k) => ({ ...k, planTitle: p.title, planId: p.id }))
  );

  const onTrack = allKpis.filter((k) => ragFromKpi(Number(k.currentValue), Number(k.target)).status === 'on_track' || ragFromKpi(Number(k.currentValue), Number(k.target)).status === 'completed').length;

  return (
    <ApPageLayout
      title="Smart KPI Tracking"
      subtitle="Baseline, target, progress % and RAG status across all action plans"
      kpis={[
        { label: 'Total KPIs', value: allKpis.length },
        { label: 'On Track', value: onTrack },
        {
          label: 'Needs Attention',
          value: allKpis.filter((k) => ragFromKpi(Number(k.currentValue), Number(k.target)).status === 'needs_attention').length,
        },
        {
          label: 'Critical',
          value: allKpis.filter((k) => ragFromKpi(Number(k.currentValue), Number(k.target)).status === 'critical').length,
        },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : allKpis.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted">No KPIs defined — create an action plan with indicators</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">KPI / Plan</th>
                <th className="px-4 py-3">Baseline</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">RAG</th>
              </tr>
            </thead>
            <tbody>
              {allKpis.map((kpi) => {
                const current = Number(kpi.currentValue);
                const target = Number(kpi.target);
                const rag = ragFromKpi(current, target);
                const baselineMatch = kpi.description?.match(/Baseline:\s*([\d.]+)/);
                const baseline = baselineMatch ? baselineMatch[1] : '—';
                return (
                  <tr key={kpi.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-primary" />
                        <div>
                          <p className="font-semibold text-navy">{kpi.name}</p>
                          <p className="text-xs text-muted">{kpi.planTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{baseline}</td>
                    <td className="px-4 py-3">{target} {kpi.unit}</td>
                    <td className="px-4 py-3 font-medium">{current} {kpi.unit}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${rag.status === 'critical' ? 'bg-rose-500' : rag.status === 'needs_attention' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(rag.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{rag.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RagBadge rag={rag} showProgress={false} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ApPageLayout>
  );
}
