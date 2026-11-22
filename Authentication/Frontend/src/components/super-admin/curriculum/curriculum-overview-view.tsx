'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Cpu, Loader2, ShieldCheck } from 'lucide-react';
import { curriculumAdminApi } from '@/lib/curriculum-admin-api';
import { CurriculumPageShell } from './curriculum-page-shell';

type Overview = {
  books: Record<string, number>;
  jobs: Record<string, number>;
  reviewTasks: number;
  recentJobs: Array<{
    id: string;
    status: string;
    progress: number;
    pipelineStage?: string | null;
    book?: { title: string; grade: string; subject: string };
  }>;
};

export function CurriculumOverviewView() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await curriculumAdminApi.getOverview());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#000435]" size={36} />
      </div>
    );
  }

  const b = data?.books ?? {};

  return (
    <CurriculumPageShell
      title="Curriculum Intelligence Center"
      subtitle="Manage official books, AI extraction, curriculum review and publication."
      actions={
        <Link
          href="/super-admin/curriculum/add"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-[#000435]"
          style={{ background: '#FCB038' }}
        >
          Add curriculum book
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total books" value={b.total ?? 0} icon={BookOpen} />
        <StatCard label="Needs review" value={b.needsReview ?? 0} icon={ShieldCheck} highlight />
        <StatCard label="Published" value={b.published ?? 0} icon={BookOpen} />
        <StatCard label="Processing jobs" value={(data?.jobs?.queued ?? 0) + (data?.jobs?.running ?? 0)} icon={Cpu} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#000435]">Pipeline status</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ['Uploaded', b.uploaded],
              ['Extracting', b.extracting],
              ['Needs review', b.needsReview],
              ['Published', b.published],
              ['Failed', b.failed],
              ['Archived', b.archived],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="text-lg font-bold text-[#000435]">{v ?? 0}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#000435]">Review tasks</h2>
          <p className="mt-2 text-3xl font-black text-[#FCB038]">{data?.reviewTasks ?? 0}</p>
          <Link href="/super-admin/curriculum/library?status=NEEDS_REVIEW" className="mt-3 inline-block text-sm font-semibold text-[#000435] hover:underline">
            Open library →
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#000435]">Recent processing jobs</h2>
          <Link href="/super-admin/curriculum/jobs" className="text-sm font-semibold text-[#000435] hover:underline">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {(data?.recentJobs ?? []).map((job) => (
            <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium text-[#000435]">{job.book?.title ?? 'Book'}</p>
                <p className="text-xs text-slate-500">
                  {job.book?.subject} · {job.book?.grade} · {job.pipelineStage ?? '—'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                {job.status} · {job.progress}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CurriculumPageShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof BookOpen;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-[#FCB038]/50 bg-[#FCB038]/10' : 'border-slate-200 bg-white'}`}>
      <Icon size={20} className="text-[#FCB038]" />
      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-black text-[#000435]">{value}</p>
    </div>
  );
}
