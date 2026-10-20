'use client';

import { ShieldAlert, ThumbsUp, AlertTriangle, Award, AlertCircle } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DisciplineRecord {
  id: string;
  date: string;
  type: string;
  description: string;
  points: number;
  status: string;
}

interface DisciplineResponse {
  score: number;
  totalPoints: number;
  records: DisciplineRecord[];
}

export default function DisciplinePage() {
  const { data, loading, error } = useStudentFetch<DisciplineResponse>('/discipline');
  const records = data?.records ?? [];
  const merits = records.filter((r) => r.points > 0);
  const demerits = records.filter((r) => r.points < 0);
  const score = data?.score ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Discipline & Conduct"
        title="Behaviour Record"
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load discipline records" description={error} />
      ) : (
        <>
          {/* Score gauge */}
          <div className="hr-card p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
              <div className="relative flex size-36 shrink-0 items-center justify-center">
                <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" className="stroke-slate-100" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 327} 327`}
                    className={cn(
                      'transition-all duration-700',
                      score >= 80 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-primary' : 'stroke-red-500'
                    )}
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-3xl font-bold text-navy">{score}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">/ 100</p>
                </div>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <StatCard
                  title="Conduct Score"
                  value={`${score}/100`}
                  icon={<Award />}
                  description="Overall behaviour"
                />
                <StatCard
                  title="Merits"
                  value={merits.length}
                  icon={<ThumbsUp />}
                  description={`+${merits.reduce((s, r) => s + r.points, 0)} points earned`}
                />
                <StatCard
                  title="Demerits"
                  value={demerits.length}
                  icon={<AlertTriangle />}
                  description={`${Math.abs(demerits.reduce((s, r) => s + r.points, 0))} points deducted`}
                />
              </div>
            </div>
          </div>

          {/* Records */}
          <div className="hr-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-bold text-navy">Discipline Records</h2>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {records.length} records
              </span>
            </div>
            {records.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<ShieldAlert />}
                  title="No discipline records"
                  description="Merit and conduct records will appear here as they are recorded by the school."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {records.map((r) => (
                  <div key={r.id} className="flex items-start gap-4 px-6 py-4">
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        r.points > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                      )}
                    >
                      {r.points > 0 ? <ThumbsUp className="size-5" /> : <AlertTriangle className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-navy">
                          {r.type === 'MERIT' ? 'Merit' : 'Conduct Note'}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                            r.points > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', r.points > 0 ? 'bg-emerald-500' : 'bg-red-500')} />
                          {r.points > 0 ? '+' : ''}{r.points} pts
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{r.description}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(r.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
