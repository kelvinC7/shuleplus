'use client';

import { Stethoscope, Pill, CheckCircle2, ShieldAlert, AlertCircle, HeartPulse } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface HealthRecord {
  id: string;
  date: string;
  type: string;
  description: string;
  treatment: string | null;
  status: string;
}

function typeMeta(type: string) {
  switch (type) {
    case 'MEDICATION':
      return { icon: <Pill className="size-5" />, label: 'Medication', cls: 'bg-sky-100 text-sky-700' };
    case 'CHECKUP':
      return { icon: <Stethoscope className="size-5" />, label: 'Checkup', cls: 'bg-emerald-100 text-emerald-700' };
    case 'INJURY':
      return { icon: <ShieldAlert className="size-5" />, label: 'Injury', cls: 'bg-red-100 text-red-700' };
    case 'ILLNESS':
      return { icon: <HeartPulse className="size-5" />, label: 'Illness', cls: 'bg-amber-100 text-amber-700' };
    default:
      return { icon: <Stethoscope className="size-5" />, label: type.replace(/_/g, ' '), cls: 'bg-slate-100 text-slate-600' };
  }
}

export default function HealthPage() {
  const { data, loading, error } = useStudentFetch<HealthRecord[]>('/health-records');
  const records = data ?? [];
  const resolved = records.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Health Center"
        title="School Health Records"
        action={
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            <CheckCircle2 className="size-4 text-emerald-400" />
            {resolved}/{records.length} resolved
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load health records" description={error} />
      ) : records.length === 0 ? (
        <EmptyState title="No health records" description="Records from the school clinic will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {records.map((r) => {
            const meta = typeMeta(r.type);
            return (
              <div key={r.id} className="hr-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft-lg">
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-navy text-primary shadow-md shadow-navy/10">
                    {meta.icon}
                  </div>
                  <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold', meta.cls)}>{meta.label}</span>
                </div>
                <p className="mt-4 text-sm text-slate-500">{r.description}</p>
                {r.treatment ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-navy">
                    <Pill className="size-3.5 text-primary" />
                    Treatment: {r.treatment}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">{formatDate(r.date)}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold',
                      r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
