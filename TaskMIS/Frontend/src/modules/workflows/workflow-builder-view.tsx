'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { Plus, Trash2, GripVertical, Play, Save, ArrowDown } from 'lucide-react';
import type { WorkflowTemplate, Workflow } from '@/types';

const STEP_TYPES = ['APPROVAL', 'REVIEW', 'EXECUTION', 'NOTIFICATION', 'CONDITION'];

interface Step {
  name: string;
  type: string;
  assigneeRole?: string;
}

export function WorkflowBuilderView() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [steps, setSteps] = useState<Step[]>([
    { name: 'Review', type: 'REVIEW' },
    { name: 'Approval', type: 'APPROVAL' },
    { name: 'Execution', type: 'EXECUTION' },
  ]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await taskApi.workflowTemplates();
      setTemplates(data.data);
    } catch {}
    setLoading(false);
  }, []);

  const loadWorkflow = useCallback(async (id: string) => {
    try {
      const { data } = await taskApi.getWorkflow(id);
      const wf: Workflow = data.data;
      setName(wf.name);
      setDescription(wf.description ?? '');
      setSteps(wf.steps.map((s) => ({ name: s.name, type: s.type })));
    } catch {}
  }, []);

  useEffect(() => {
    loadTemplates();
    if (editId) loadWorkflow(editId);
  }, [loadTemplates, editId, loadWorkflow]);

  const addStep = () => {
    setSteps([...steps, { name: '', type: 'APPROVAL' }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: keyof Step, value: string) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], [field]: value };
    setSteps(updated);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const updated = [...steps];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setSteps(updated);
  };

  const handleSave = async () => {
    if (!name.trim() || steps.length === 0) return;
    setSaving(true);
    try {
      const payload = { name, description, steps };
      if (editId) {
        await taskApi.updateWorkflow(editId, payload);
      } else {
        await taskApi.createWorkflow(payload);
      }
      window.location.href = '/workflows';
    } catch {}
    setSaving(false);
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    setName(template.name);
    setDescription(template.description ?? '');
    setSteps(template.steps.map((s) => ({ name: s.name, type: s.type })));
  };

  return (
    <TaskPageLayout
      title={editId ? 'Edit Workflow' : 'Workflow Builder'}
      subtitle="Design your workflow visually"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Builder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <input className="input text-lg font-semibold" placeholder="Workflow name *" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="input mt-3 min-h-[60px]" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy">Steps ({steps.length})</h3>
              <button onClick={addStep} className="btn-secondary text-xs"><Plus size={14} /> Add Step</button>
            </div>
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="text-muted hover:text-navy disabled:opacity-30"><GripVertical size={14} /></button>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-navy">
                      {idx + 1}
                    </span>
                    <input
                      className="input flex-1"
                      placeholder="Step name"
                      value={step.name}
                      onChange={(e) => updateStep(idx, 'name', e.target.value)}
                    />
                    <select className="input w-40" value={step.type} onChange={(e) => updateStep(idx, 'type', e.target.value)}>
                      {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex justify-center py-1"><ArrowDown size={16} className="text-muted" /></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <a href="/workflows" className="btn-secondary">Cancel</a>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>

        {/* Templates Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-navy">Templates</h3>
            <p className="mt-1 text-xs text-muted">Click a template to load it into the builder</p>
            <div className="mt-3 space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleUseTemplate(t)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-left transition hover:border-ochre/40"
                >
                  <p className="text-sm font-medium text-navy">{t.name}</p>
                  <p className="text-[10px] text-muted">{t.steps.length} steps &middot; {t.category}</p>
                </button>
              ))}
              {!loading && templates.length === 0 && (
                <p className="text-sm text-muted">No templates available</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-navy">Preview</h3>
            <div className="mt-3 space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy/10 text-[10px] font-bold text-navy">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-navy">{step.name || 'Untitled'}</span>
                  <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[9px] text-navy/50">{step.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TaskPageLayout>
  );
}
