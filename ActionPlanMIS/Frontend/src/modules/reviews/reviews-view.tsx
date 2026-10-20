'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { ApModal } from '@/components/ap-modal';
import { RagBadge } from '@/components/rag-badge';
import { ragFromProgress } from '@/lib/rag-status';
import { useApPermissions } from '@/hooks/use-ap-permissions';
import type { ActionPlan, PeriodReview } from '@/types';

type ReviewTab = 'monthly' | 'quarterly';

export function ReviewsView() {
  const { can } = useApPermissions();
  const [tab, setTab] = useState<ReviewTab>('monthly');
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [reviews, setReviews] = useState<PeriodReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    planned: '',
    completed: '',
    delayed: '',
    reason: '',
    corrective: '',
    newDeadline: '',
    responsible: '',
  });

  const reviewType = tab === 'monthly' ? 'MONTHLY' : 'QUARTERLY';
  const now = new Date();

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, reviewsRes] = await Promise.all([
        apApi.listPlans({ limit: 100 }),
        apApi.listReviews(reviewType),
      ]);
      setPlans(plansRes.data.data ?? []);
      setReviews(reviewsRes.data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [reviewType]);

  const kpiRows = plans.flatMap((p) =>
    (p.kpis ?? []).map((k) => {
      const target = Number(k.target);
      const achieved = Number(k.currentValue);
      const performance = target > 0 ? Math.round((achieved / target) * 100) : 0;
      return {
        objective: p.title,
        indicator: k.name,
        target: `${target} ${k.unit ?? ''}`,
        achieved: `${achieved} ${k.unit ?? ''}`,
        performance,
      };
    })
  );

  const delayedPlans = plans.filter((p) => {
    if (p.status === 'COMPLETED' || p.status === 'CANCELLED') return false;
    return new Date(p.dueDate) < new Date();
  });

  async function handleSaveReview() {
    setSaving(true);
    try {
      await apApi.createReview({
        reviewType,
        periodYear: now.getFullYear(),
        periodMonth: tab === 'monthly' ? now.getMonth() + 1 : undefined,
        periodQuarter: tab === 'quarterly' ? Math.ceil((now.getMonth() + 1) / 3) : undefined,
        planned: reviewForm.planned,
        completed: reviewForm.completed,
        delayed: reviewForm.delayed,
        reason: reviewForm.reason,
        corrective: reviewForm.corrective,
        newDeadline: reviewForm.newDeadline || undefined,
        responsible: reviewForm.responsible,
      });
      setModalOpen(false);
      setReviewForm({ planned: '', completed: '', delayed: '', reason: '', corrective: '', newDeadline: '', responsible: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Could not save review.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ApPageLayout title="Monitoring & Reviews" subtitle="Monthly and quarterly review of action plan implementation">
      <div className="mb-4 flex gap-2">
        {(['monthly', 'quarterly'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? 'bg-navy text-white' : 'bg-slate-100 text-muted'
            }`}
          >
            {t} Review
          </button>
        ))}
        {can('review.record') && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-navy"
          >
            Record {tab === 'monthly' ? 'Monthly' : 'Quarterly'} Review
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : tab === 'monthly' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h3 className="text-sm font-bold text-navy">What was planned this period</h3>
            <ul className="mt-3 space-y-2">
              {plans.slice(0, 8).map((p) => (
                <li key={p.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-navy">
                  {p.title}
                  <span className="ml-2 text-xs text-muted">{p.department ?? '—'}</span>
                </li>
              ))}
              {plans.length === 0 && <p className="text-sm text-muted">No action plans yet</p>}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h3 className="text-sm font-bold text-navy">Delayed — needs corrective action</h3>
            <ul className="mt-3 space-y-2">
              {delayedPlans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2">
                  <span className="text-sm font-medium text-navy">{p.title}</span>
                  <RagBadge rag={ragFromProgress(Number(p.progress))} showProgress={false} />
                </li>
              ))}
              {delayedPlans.length === 0 && <p className="text-sm text-muted">No delayed plans</p>}
            </ul>
          </section>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Objective</th>
                <th className="px-4 py-3">Indicator</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Achieved</th>
                <th className="px-4 py-3">Performance</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    Add KPIs to action plans to populate quarterly review
                  </td>
                </tr>
              ) : (
                kpiRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-4 py-3 font-medium text-navy">{row.objective}</td>
                    <td className="px-4 py-3 text-muted">{row.indicator}</td>
                    <td className="px-4 py-3">{row.target}</td>
                    <td className="px-4 py-3">{row.achieved}</td>
                    <td className="px-4 py-3">
                      <RagBadge rag={ragFromProgress(row.performance)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {reviews.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-navy">Saved {tab} reviews</h3>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-xs text-muted">
                  {r.periodYear}
                  {r.periodMonth ? ` · Month ${r.periodMonth}` : ''}
                  {r.periodQuarter ? ` · Q${r.periodQuarter}` : ''}
                  {' · '}{new Date(r.createdAt).toLocaleDateString()}
                </p>
                {r.completed && <p className="mt-2 text-sm text-navy"><strong>Completed:</strong> {r.completed}</p>}
                {r.delayed && <p className="mt-1 text-sm text-rose-700"><strong>Delayed:</strong> {r.delayed}</p>}
                {r.corrective && <p className="mt-1 text-sm text-muted"><strong>Corrective:</strong> {r.corrective}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <ApModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={tab === 'monthly' ? 'Monthly Review' : 'Quarterly Review'}
        eyebrow="M&E"
        maxWidthClass="max-w-3xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['planned', 'What was planned?'],
            ['completed', 'What was completed?'],
            ['delayed', 'What is delayed?'],
            ['reason', 'Why was it delayed?'],
            ['corrective', 'Corrective action'],
            ['newDeadline', 'New deadline'],
            ['responsible', 'Responsible person'],
          ].map(([key, label]) => (
            <label key={key} className={key === 'reason' || key === 'corrective' ? 'sm:col-span-2' : ''}>
              <span className="mb-1 block text-xs font-semibold text-navy">{label}</span>
              {key === 'newDeadline' ? (
                <input
                  type="date"
                  className="ap-input w-full"
                  value={reviewForm[key as keyof typeof reviewForm]}
                  onChange={(e) => setReviewForm({ ...reviewForm, [key]: e.target.value })}
                />
              ) : key === 'reason' || key === 'corrective' || key === 'planned' || key === 'completed' || key === 'delayed' ? (
                <textarea
                  className="ap-input min-h-[72px] w-full"
                  value={reviewForm[key as keyof typeof reviewForm]}
                  onChange={(e) => setReviewForm({ ...reviewForm, [key]: e.target.value })}
                />
              ) : (
                <input
                  className="ap-input w-full"
                  value={reviewForm[key as keyof typeof reviewForm]}
                  onChange={(e) => setReviewForm({ ...reviewForm, [key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveReview()}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Review'}
          </button>
        </div>
      </ApModal>
    </ApPageLayout>
  );
}
