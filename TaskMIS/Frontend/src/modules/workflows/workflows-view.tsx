'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { Plus, Play, Trash2 } from 'lucide-react';
import type { Workflow } from '@/types';

export function WorkflowsView() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await taskApi.workflows();
      setWorkflows(data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await taskApi.createWorkflow({
        name: form.name,
        description: form.description,
        steps: [
          { name: 'Review', type: 'APPROVAL' },
          { name: 'Approval', type: 'APPROVAL' },
          { name: 'Execution', type: 'EXECUTION' },
        ],
      });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      load();
    } catch {}
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await taskApi.deleteWorkflow(id);
      load();
    } catch {}
  };

  return (
    <TaskPageLayout
      title="Workflows"
      subtitle="Create and manage approval workflows"
      actions={
        <div className="flex gap-2">
          <Link href="/workflow-builder" className="btn-secondary">
            Visual Builder
          </Link>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New Workflow
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="text-center text-sm text-muted py-8">Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-muted">No workflows yet</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus size={16} /> Create First Workflow
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div key={wf.id} className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy">{wf.name}</h3>
                    <StatusBadge status={wf.isActive ? 'ACTIVE' : 'CANCELLED'} />
                  </div>
                  {wf.description && <p className="mt-1 text-sm text-muted">{wf.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Steps: {wf.steps.length}</span>
                    <span>Instances: {wf.instanceCount}</span>
                    <span>Trigger: {wf.triggerType.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/workflow-builder?edit=${wf.id}`} className="btn-secondary text-xs">
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(wf.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {wf.steps.length > 0 && (
                <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                  {wf.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-xs">
                        <span className="font-medium text-navy">{step.name}</span>
                        <span className="ml-1 text-muted">({step.type})</span>
                      </div>
                      {i < wf.steps.length - 1 && <span className="text-muted">&rarr;</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Create Workflow</h2>
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Workflow name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea className="input min-h-[60px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !form.name.trim()} className="btn-primary">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TaskPageLayout>
  );
}
