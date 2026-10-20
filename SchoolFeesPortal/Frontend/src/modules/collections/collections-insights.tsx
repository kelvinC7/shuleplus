'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '@/services/api';

type Insights = {
  thisMonth: {
    expected: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
  };
  paymentMethods: Array<{ method: string; amount: number; pct: number }>;
  topOutstandingClasses: Array<{ className: string; amount: number }>;
};

function fmtM(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function CollectionsInsights() {
  const [data, setData] = useState<Insights | null>(null);

  useEffect(() => {
    void api.get('/collections/insights').then(({ data: res }) => setData(res.data ?? null));
  }, []);

  if (!data) return null;

  const maxClass = Math.max(...data.topOutstandingClasses.map((c) => c.amount), 1);
  const maxMethod = Math.max(...data.paymentMethods.map((m) => m.pct), 1);

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 size={18} className="text-primary" />
        <h3 className="text-sm font-bold text-navy">Collections Insights</h3>
        <span className="text-xs text-muted">This month</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl bg-slate-50/80 p-4">
          <Row label="Expected" value={`${fmtM(data.thisMonth.expected)} RWF`} />
          <Row label="Collected" value={`${fmtM(data.thisMonth.collected)} RWF`} accent="emerald" />
          <Row label="Outstanding" value={`${fmtM(data.thisMonth.outstanding)} RWF`} accent="red" />
          <div className="pt-2">
            <div className="flex justify-between text-xs font-semibold text-muted">
              <span>Collection rate</span>
              <span>{data.thisMonth.collectionRate}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, data.thisMonth.collectionRate)}%` }}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Payment methods</p>
          <ul className="space-y-2">
            {data.paymentMethods.map((m) => (
              <li key={m.method}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-navy">{m.method.replace(/_/g, ' ')}</span>
                  <span className="text-muted">{m.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-navy/70"
                    style={{ width: `${(m.pct / maxMethod) * 100}%` }}
                  />
                </div>
              </li>
            ))}
            {!data.paymentMethods.length ? <li className="text-sm text-muted">No payments yet</li> : null}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Most outstanding classes</p>
          <ul className="space-y-2">
            {data.topOutstandingClasses.map((c) => (
              <li key={c.className}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-navy">{c.className}</span>
                  <span className="font-bold tabular-nums">{fmtM(c.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${(c.amount / maxClass) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={`font-bold tabular-nums ${
          accent === 'emerald' ? 'text-emerald-700' : accent === 'red' ? 'text-red-700' : 'text-navy'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
