'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Loader2,
  Paperclip,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { apApi, uploadFileUrl } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import {
  ApFilterBar,
  ApFilterSelect,
} from '@/components/ap-filter-bar';
import { useApPermissions } from '@/hooks/use-ap-permissions';
import type { ActionPlan, ActionPlanAttachment } from '@/types';

type EvidenceRow = ActionPlanAttachment & {
  planId: string;
  planTitle: string;
  taskTitle?: string;
};

const UPLOAD_CATEGORIES = ['photo', 'document', 'report', 'attendance', 'receipt', 'other'];

export function EvidenceView() {
  const { can } = useApPermissions();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('');
  const [uploadPlanId, setUploadPlanId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('document');
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploading, setUploading] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const { data } = await apApi.listPlans({ limit: 100 });
      setPlans(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  const uploadPlan = plans.find((p) => p.id === uploadPlanId);

  const rows = useMemo(() => {
    const list: EvidenceRow[] = [];
    for (const plan of plans) {
      if (planFilter && plan.id !== planFilter) continue;
      for (const att of plan.attachments ?? []) {
        const task = plan.tasks?.find((t) => t.id === att.taskId);
        list.push({
          ...att,
          planId: plan.id,
          planTitle: plan.title,
          taskTitle: task?.title,
        });
      }
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [plans, planFilter]);

  async function handleUpload(file: File) {
    if (!uploadPlanId) {
      alert('Select an action plan first.');
      return;
    }
    setUploading(true);
    try {
      await apApi.uploadAttachment(uploadPlanId, file, {
        category: uploadCategory,
        taskId: uploadTaskId || undefined,
      });
      await loadPlans();
    } catch (err) {
      console.error(err);
      alert('Upload failed. Check file type (image, PDF, Word) and size (max 12MB).');
    } finally {
      setUploading(false);
    }
  }

  async function handleVerify(id: string) {
    try {
      await apApi.verifyAttachment(id);
      await loadPlans();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this evidence file?')) return;
    try {
      await apApi.deleteAttachment(id);
      await loadPlans();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <ApPageLayout
      title="Evidence"
      subtitle="Upload and verify implementation evidence across all action plans"
      kpis={[
        { label: 'Total files', value: rows.length },
        { label: 'Plans with evidence', value: plans.filter((p) => (p.attachments?.length ?? 0) > 0).length },
        {
          label: 'Verified',
          value: rows.filter((r) => Boolean(r.verifiedBy)).length,
        },
        {
          label: 'Pending',
          value: rows.filter((r) => !r.verifiedBy).length,
        },
      ]}
    >
      {can('evidence.upload') ? (
        <div className="card mb-6">
          <h3 className="mb-4 text-sm font-semibold text-navy">Upload Evidence</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="mb-1 block text-xs font-semibold text-navy">Action plan *</span>
              <select
                className="ap-input w-full"
                value={uploadPlanId}
                onChange={(e) => {
                  setUploadPlanId(e.target.value);
                  setUploadTaskId('');
                }}
              >
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-navy">Category</span>
              <select className="ap-input w-full" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                {UPLOAD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-navy">Linked activity</span>
              <select
                className="ap-input w-full"
                value={uploadTaskId}
                onChange={(e) => setUploadTaskId(e.target.value)}
                disabled={!uploadPlan}
              >
                <option value="">Plan level</option>
                {uploadPlan?.tasks?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col justify-end">
              <span className="mb-1 block text-xs font-semibold text-navy">File</span>
              <label className="btn-secondary cursor-pointer justify-center">
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                {uploading ? 'Uploading…' : 'Choose file'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </label>
          </div>
          <p className="mt-2 text-[11px] text-muted">Images, PDF, Word, or text — max 12 MB</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-navy/[0.06] bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <ApFilterBar>
            <ApFilterSelect
              label="Action plan"
              value={planFilter}
              onChange={setPlanFilter}
              options={[
                { value: '', label: 'All plans' },
                ...plans.map((p) => ({ value: p.id, label: p.title })),
              ]}
              className="min-w-[220px] flex-1"
            />
          </ApFilterBar>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted">
            <Loader2 className="mr-2 animate-spin" size={16} />
            Loading evidence…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Paperclip size={28} className="mb-3 text-muted" />
            <p className="text-sm font-semibold text-navy">No evidence uploaded yet</p>
            <p className="mt-1 text-xs text-muted">Upload files from a plan above or from a plan detail page</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Paperclip size={16} className="mt-0.5 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{row.originalName ?? row.filename}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      <Link href={`/plans/${row.planId}?tab=evidence`} className="font-medium text-sky-700 hover:underline">
                        {row.planTitle}
                      </Link>
                      {row.taskTitle ? ` · ${row.taskTitle}` : ''}
                      {row.category ? ` · ${row.category}` : ''}
                      {row.uploadedBy ? ` · ${row.uploadedBy}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {row.verifiedBy ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <ShieldCheck size={14} /> Verified
                    </span>
                  ) : can('evidence.verify') ? (
                    <button type="button" onClick={() => void handleVerify(row.id)} className="btn-secondary text-xs !py-1.5">
                      <ShieldCheck size={12} /> Verify
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600">Pending</span>
                  )}
                  <a href={uploadFileUrl(row.filePath)} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs !py-1.5">
                    <ExternalLink size={12} /> Open
                  </a>
                  {can('evidence.upload') ? (
                    <button type="button" onClick={() => void handleDelete(row.id)} className="btn-danger text-xs !py-1.5">
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ApPageLayout>
  );
}
