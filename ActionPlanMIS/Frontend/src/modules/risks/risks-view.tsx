'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { ApModal } from '@/components/ap-modal';
import { StatusBadge } from '@/components/status-badge';
import { useApPermissions } from '@/hooks/use-ap-permissions';
import type { ActionPlan } from '@/types';

const IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export function RisksView() {
  const { can } = useApPermissions();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    actionPlanId: '',
    title: '',
    description: '',
    category: '',
    impact: 'MEDIUM' as typeof IMPACT_LEVELS[number],
    probability: 'MEDIUM' as typeof IMPACT_LEVELS[number],
    mitigation: '',
    owner: '',
  });

  async function loadPlans() {
    setLoading(true);
    try {
      const { data } = await apApi.listPlans({ limit: 100 });
      setPlans(data.data ?? []);
      if (!form.actionPlanId && data.data?.[0]) {
        setForm((f) => ({ ...f, actionPlanId: data.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  const allRisks = plans.flatMap((p) =>
    (p.risks ?? []).map((r) => ({ ...r, planTitle: p.title, planId: p.id }))
  );

  const heatMap = { low: 0, medium: 0, high: 0, critical: 0 };
  allRisks.forEach((r) => {
    const key = r.probability.toLowerCase() as keyof typeof heatMap;
    if (key in heatMap) heatMap[key]++;
  });

  async function handleCreateRisk(e: React.FormEvent) {
    e.preventDefault();
    if (!form.actionPlanId || !form.title.trim()) return;
    setSaving(true);
    try {
      await apApi.createRisk(form.actionPlanId, {
        title: form.title,
        description: form.description || undefined,
        category: form.category || undefined,
        impact: form.impact,
        probability: form.probability,
        mitigation: form.mitigation || undefined,
        owner: form.owner || undefined,
      });
      setModalOpen(false);
      setForm((f) => ({ ...f, title: '', description: '', category: '', mitigation: '', owner: '' }));
      await loadPlans();
    } catch (err) {
      console.error(err);
      alert('Could not create risk.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ApPageLayout
      title="Risk Management"
      subtitle="Risk register and heat map across all plans"
      actions={
        can('risk.manage') ? (
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={14} />
            Add Risk
          </button>
        ) : undefined
      }
      kpis={[
        { label: 'Total Risks', value: allRisks.length },
        { label: 'Critical', value: heatMap.critical, hint: 'Immediate attention' },
        { label: 'High', value: heatMap.high },
        { label: 'Open', value: allRisks.filter((r) => r.status === 'OPEN').length },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Risk Heat Map</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Critical', count: heatMap.critical, color: 'bg-red-500', text: 'text-red-800', bg: 'bg-red-50' },
                { label: 'High', count: heatMap.high, color: 'bg-orange-500', text: 'text-orange-800', bg: 'bg-orange-50' },
                { label: 'Medium', count: heatMap.medium, color: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50' },
                { label: 'Low', count: heatMap.low, color: 'bg-green-500', text: 'text-green-800', bg: 'bg-green-50' },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border ${item.bg} p-4 text-center`}>
                  <div className={`mx-auto mb-2 h-8 w-8 rounded-full ${item.color}`} />
                  <p className="text-2xl font-bold text-navy">{item.count}</p>
                  <p className={`text-xs font-medium ${item.text}`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Risk Register</h3>
            {allRisks.length === 0 ? (
              <p className="text-sm text-muted">No risks identified</p>
            ) : (
              <div className="space-y-2">
                {allRisks.map((risk) => (
                  <div key={risk.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <AlertTriangle size={16} className={`shrink-0 ${
                      risk.impact === 'CRITICAL' ? 'text-red-500' :
                      risk.impact === 'HIGH' ? 'text-orange-500' :
                      'text-amber-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy">{risk.title}</p>
                        <StatusBadge status={risk.impact} />
                        <StatusBadge status={risk.probability} />
                      </div>
                      <p className="text-xs text-muted">
                        {risk.planTitle}
                        {risk.category && ` · ${risk.category}`}
                        {risk.owner && ` · Owner: ${risk.owner}`}
                      </p>
                      {risk.mitigation && (
                        <p className="mt-1 text-[11px] italic text-muted">Mitigation: {risk.mitigation}</p>
                      )}
                    </div>
                    <StatusBadge status={risk.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ApModal open={modalOpen} onClose={() => setModalOpen(false)} title="Register Risk" eyebrow="Risk Management">
        <form onSubmit={handleCreateRisk} className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-navy">Action Plan</span>
            <select className="ap-input w-full" required value={form.actionPlanId}
              onChange={(e) => setForm({ ...form, actionPlanId: e.target.value })}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-navy">Risk Title</span>
            <input className="ap-input w-full" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-navy">Description</span>
            <textarea className="ap-input min-h-[72px] w-full" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-navy">Impact</span>
            <select className="ap-input w-full" value={form.impact}
              onChange={(e) => setForm({ ...form, impact: e.target.value as typeof form.impact })}>
              {IMPACT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-navy">Probability</span>
            <select className="ap-input w-full" value={form.probability}
              onChange={(e) => setForm({ ...form, probability: e.target.value as typeof form.probability })}>
              {IMPACT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-navy">Category</span>
            <input className="ap-input w-full" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-navy">Owner</span>
            <input className="ap-input w-full" value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-navy">Mitigation</span>
            <textarea className="ap-input min-h-[72px] w-full" value={form.mitigation}
              onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Create Risk'}
            </button>
          </div>
        </form>
      </ApModal>
    </ApPageLayout>
  );
}
