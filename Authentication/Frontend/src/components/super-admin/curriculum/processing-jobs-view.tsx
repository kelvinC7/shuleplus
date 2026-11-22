'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { curriculumAdminApi, type ProcessingJobRow } from '@/lib/curriculum-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { CurriculumPageShell } from './curriculum-page-shell';

const STAGE_LABEL: Record<string, string> = {
  secure_upload: '1. Secure upload',
  pdf_analysis: '2. PDF analysis',
  ai_structuring: '3. AI curriculum structuring',
  validation: '4. Validation',
  ready_review: '5. Ready for review',
};

export function ProcessingJobsView() {
  const toast = useToast();
  const [jobs, setJobs] = useState<ProcessingJobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setJobs(await curriculumAdminApi.listJobs());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);

  const cancel = async (id: string) => {
    try {
      await curriculumAdminApi.cancelJob(id);
      toast.success('Job cancelled');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  const retry = async (id: string) => {
    try {
      await curriculumAdminApi.retryJob(id);
      toast.success('Retry queued');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Retry failed');
    }
  };

  return (
    <CurriculumPageShell title="AI Processing Jobs" subtitle="Monitor extraction progress, errors, retries and pipeline stages.">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#000435]" size={32} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Level / class</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 font-medium text-[#000435]">{job.book?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{job.book?.grade} · {job.book?.subject}</td>
                  <td className="px-4 py-3 text-xs">{STAGE_LABEL[job.pipelineStage ?? ''] ?? job.pipelineStage ?? '—'}</td>
                  <td className="px-4 py-3">
                    {job.pagesTotal ? `${job.pagesProcessed ?? 0}/${job.pagesTotal} pages · ` : ''}
                    {job.progress}%
                  </td>
                  <td className="px-4 py-3">{job.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {job.book?.id ? (
                        <Link href={`/super-admin/curriculum/review/${job.book.id}`} className="text-xs font-semibold text-[#000435] hover:underline">
                          Review
                        </Link>
                      ) : null}
                      {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                        <button type="button" onClick={() => void cancel(job.id)} className="inline-flex items-center gap-1 text-xs text-red-600">
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                      {(job.status === 'FAILED' || job.status === 'CANCELLED' || job.status === 'SUCCEEDED') && (
                        <button type="button" onClick={() => void retry(job.id)} className="inline-flex items-center gap-1 text-xs text-[#000435]">
                          <RotateCcw size={12} /> Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CurriculumPageShell>
  );
}
