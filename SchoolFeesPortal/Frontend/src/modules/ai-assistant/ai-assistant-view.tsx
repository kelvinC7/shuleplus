'use client';

import { useAuth } from '@/contexts/auth-context';
import { FeesPageTitle } from '@/components/fees-page-title';

export function AiAssistantView() {
  const { summary } = useAuth();
  const insights = summary?.aiInsights ?? [];
  const kpis = summary?.kpis;

  const cards = [
    {
      title: 'Outstanding risk',
      body: `${kpis?.studentsWithOutstanding ?? 0} students carry unpaid balances. Prioritize S3/S4 follow-ups.`,
    },
    {
      title: 'Revenue prediction',
      body: `Collections are on track for ${kpis?.collectionPerformance ?? 0}% of expected Term II revenue.`,
    },
    {
      title: 'Installment recommendation',
      body: `${kpis?.activeInstallments ?? 0} plans are active. Offer weekly plans to late payers to lift recovery.`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="hr-card overflow-hidden">
        <div className="bg-gradient-to-r from-navy to-navy-light px-6 py-8 text-white">
          <FeesPageTitle className="text-xl font-bold text-white">AI Financial Assistant</FeesPageTitle>
          <p className="mt-1 text-sm text-white/70">Babyeyi insights for collections, risk & forecasting</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-slate-50/80 p-4">
              <h3 className="text-sm font-bold text-navy">{c.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="hr-card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Live Insights</h3>
        <ul className="mt-4 space-y-3">
          {insights.map((t, i) => (
            <li key={i} className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-navy">{t}</p>
            </li>
          ))}
          {!insights.length ? <li className="text-sm text-muted">Open the dashboard to generate insights.</li> : null}
        </ul>
      </div>
    </div>
  );
}
