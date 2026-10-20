'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeWizardDescription } from '@/lib/plan-wizard-types';
import {
  ArrowLeft, Edit2, Trash2, Send, CheckCircle, XCircle, RotateCcw,
  Plus, Loader2, Calendar, DollarSign, AlertTriangle, Target,
  MessageSquare, Paperclip, Users, BarChart3, Upload, ShieldCheck, ExternalLink,
  FileStack, MoreVertical, Share2, ChevronDown, FileDown, Circle,
} from 'lucide-react';
import { apApi, uploadFileUrl } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { ExportPlanModal } from '@/modules/plans/export-plan-modal';
import { useAuth } from '@/contexts/auth-context';
import { StatusBadge } from '@/components/status-badge';
import { useApPermissions } from '@/hooks/use-ap-permissions';
import { formatRwf } from '@/lib/format-rwf';
import { FUNDING_SOURCES } from '@/lib/strategic-pillars';
import { RagBadge } from '@/components/rag-badge';
import { ragFromKpi } from '@/lib/rag-status';
import type { ActionPlan, BudgetLine, Expense } from '@/types';

interface Props {
  planId: string;
  initialTab?: string;
}

export function PlanDetailView({ planId, initialTab }: Props) {
  const router = useRouter();
  const { can } = useApPermissions();
  const { summary, user, orgProfile } = useAuth();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab ?? 'overview');
  const [comment, setComment] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('photo');
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'supplies',
    expenseDate: new Date().toISOString().slice(0, 10),
    fundingSource: FUNDING_SOURCES[0] as string,
    budgetLineId: '',
    receiptNumber: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    categoryId: 'academic',
    ownership: 'school' as 'school' | 'personal',
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  async function reloadPlan() {
    const { data } = await apApi.getPlan(planId);
    setPlan(data.data);
  }

  useEffect(() => {
    apApi.getPlan(planId)
      .then(({ data }) => setPlan(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [planId]);

  useEffect(() => {
    if (activeTab !== 'budget') return;
    apApi.listExpenses(planId).then(({ data }) => setExpenses(data.data ?? [])).catch(() => setExpenses([]));
    apApi.budgetLines().then(({ data }) => setBudgetLines(data.data ?? [])).catch(() => setBudgetLines([]));
  }, [activeTab, planId]);

  async function handleSubmit() {
    if (!confirm('Submit this plan for approval?')) return;
    try {
      await apApi.submitForApproval(planId);
      const { data } = await apApi.getPlan(planId);
      setPlan(data.data);
    } catch (err) { console.error(err); }
  }

  async function handleApprove(level: number, status: 'APPROVED' | 'REJECTED' | 'RETURNED') {
    try {
      await apApi.approve(planId, level, { status });
      const { data } = await apApi.getPlan(planId);
      setPlan(data.data);
    } catch (err) { console.error(err); }
  }

  async function handleToggleTaskComplete(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await apApi.updateTask(taskId, {
        status: nextStatus,
        progress: nextStatus === 'COMPLETED' ? 100 : 0,
      });
      await reloadPlan();
    } catch (err) {
      console.error(err);
      alert('Could not update activity status.');
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this action plan permanently?')) return;
    try {
      await apApi.deletePlan(planId);
      router.push('/plans');
    } catch (err) { console.error(err); }
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    try {
      await apApi.addComment(planId, { content: comment });
      setComment('');
      await reloadPlan();
    } catch (err) { console.error(err); }
  }

  async function handleUploadEvidence(file: File) {
    setUploading(true);
    try {
      await apApi.uploadAttachment(planId, file, {
        category: uploadCategory,
        taskId: uploadTaskId || undefined,
      });
      await reloadPlan();
    } catch (err) {
      console.error(err);
      alert('Upload failed. Check file type (image, PDF, Word) and size (max 12MB).');
    } finally {
      setUploading(false);
    }
  }

  async function handleVerifyAttachment(id: string) {
    try {
      await apApi.verifyAttachment(id);
      await reloadPlan();
    } catch (err) { console.error(err); }
  }

  async function handleDeleteAttachment(id: string) {
    if (!confirm('Delete this evidence file?')) return;
    try {
      await apApi.deleteAttachment(id);
      await reloadPlan();
    } catch (err) { console.error(err); }
  }

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateForm.name.trim()) return;
    setSavingTemplate(true);
    try {
      await apApi.createTemplateFromPlan(planId, {
        name: templateForm.name,
        description: templateForm.description,
        categoryId: templateForm.categoryId,
        ownership: templateForm.ownership,
      });
      setShowSaveTemplate(false);
      alert('Template saved successfully. Find it under Templates → My Templates or School.');
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;
    setSavingExpense(true);
    try {
      const selectedLine = budgetLines.find((l) => l.id === expenseForm.budgetLineId);
      await apApi.createExpense(planId, {
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        expenseDate: expenseForm.expenseDate,
        fundingSource: expenseForm.fundingSource,
        budgetLineId: expenseForm.budgetLineId || undefined,
        budgetLineLabel: selectedLine?.label,
        receiptNumber: expenseForm.receiptNumber || undefined,
      });
      const { data } = await apApi.listExpenses(planId);
      setExpenses(data.data ?? []);
      await reloadPlan();
      setExpenseForm((f) => ({ ...f, description: '', amount: '', receiptNumber: '' }));
    } catch (err) {
      console.error(err);
      alert('Could not record expense.');
    } finally {
      setSavingExpense(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 animate-spin" size={16} />
        Loading plan…
      </div>
    );
  }

  if (!plan) {
    return <div className="py-20 text-center text-sm text-muted">Plan not found</div>;
  }

  const { text: planDescription, meta: wizardMeta } = decodeWizardDescription(plan.description);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Goals & Activities (${plan.tasks?.length ?? 0})` },
    { id: 'kpis', label: `KPIs (${plan.kpis?.length ?? 0})` },
    { id: 'budget', label: 'Budget' },
    { id: 'team', label: 'Team' },
    { id: 'evidence', label: `Evidence (${plan.attachments?.length ?? 0})` },
    { id: 'risks', label: `Risks (${plan.risks?.length ?? 0})` },
    { id: 'comments', label: `Comments (${plan.comments?.length ?? 0})` },
    { id: 'approvals', label: 'Approvals' },
  ];

  const canSubmit = plan.status === 'DRAFT';
  const needsApproval = plan.status === 'SUBMITTED' || plan.status === 'PENDING_APPROVAL';

  return (
    <ApPageLayout
      title={plan.title}
      subtitle={`${plan.department ?? 'No department'} · ${plan.priority} Priority`}
      backHref="/plans"
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title: plan.title, url: window.location.href }).catch(() => undefined);
              } else {
                void navigator.clipboard.writeText(window.location.href);
                alert('Plan link copied to clipboard.');
              }
            }}
            className="btn-secondary"
          >
            <Share2 size={14} />
            Share
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-primary inline-flex items-center gap-1"
            >
              <FileDown size={14} />
              Export PDF
              <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-border bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setShowExportMenu(false); setShowExportModal(true); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-slate-50"
                  >
                    <FileDown size={14} />
                    Export PDF…
                  </button>
                </div>
              </>
            )}
          </div>
          {canSubmit && can('plan.edit') && (
            <button onClick={handleSubmit} className="btn-primary">
              <Send size={14} />
              Submit for Approval
            </button>
          )}
          {can('plan.edit') && (
            <button onClick={() => router.push(`/plans/${planId}/edit`)} className="btn-secondary">
              <Edit2 size={14} />
              Edit
            </button>
          )}
          {can('plan.edit') && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="btn-secondary"
              >
                <MoreVertical size={14} />
              </button>
              {showActionsMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        setTemplateForm({
                          name: `${plan.title} Template`,
                          description: `Saved from: ${plan.title}`,
                          categoryId: 'academic',
                          ownership: 'school',
                        });
                        setShowSaveTemplate(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-slate-50"
                    >
                      <FileStack size={14} />
                      Save as Template
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {can('plan.delete') && (
            <button onClick={handleDelete} className="btn-danger">
              <Trash2 size={14} />
            </button>
          )}
        </>
      }
      kpis={[
        { label: 'Status', value: plan.status.replace(/_/g, ' ') },
        { label: 'Progress', value: `${plan.progress}%` },
        { label: 'Budget', value: new Intl.NumberFormat().format(Number(plan.budget)) },
        { label: 'Tasks', value: plan.tasks?.length ?? 0 },
      ]}
    >
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-xs whitespace-nowrap font-medium transition ${
                activeTab === tab.id ? 'bg-navy text-white' : 'text-muted hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Link
          href={`/calendar?planId=${planId}`}
          className="shrink-0 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-navy hover:bg-slate-50"
        >
          Open Calendar
        </Link>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-navy">Description</h3>
                <p className="text-sm text-muted">{planDescription || 'No description provided'}</p>
              </div>
              {wizardMeta?.goals?.length ? (
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold text-navy">Goals</h3>
                  <ul className="space-y-2">
                    {wizardMeta.goals.map((g) => (
                      <li key={g.id} className="rounded-lg border border-border px-3 py-2">
                        <p className="text-sm font-medium text-navy">{g.title}</p>
                        {g.objectives.length > 0 && (
                          <ul className="mt-1 space-y-0.5 pl-3">
                            {g.objectives.map((o) => (
                              <li key={o.id} className="text-xs text-muted">{o.title}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-navy">Expected Outcome</h3>
                <p className="text-sm text-muted">{plan.expectedOutcome ?? 'Not specified'}</p>
              </div>
              {/* Progress bar */}
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-navy">Progress</h3>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-primary transition-all"
                    style={{ width: `${plan.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-muted">{plan.progress}%</p>
              </div>
              {/* Tasks Summary */}
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-navy">Tasks Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'].map((status) => {
                    const count = plan.tasks?.filter((t) => t.status === status).length ?? 0;
                    return (
                      <div key={status} className="rounded-xl border border-border p-3 text-center">
                        <p className="text-lg font-bold text-navy">{count}</p>
                        <p className="text-[10px] text-muted uppercase">{status.replace(/_/g, ' ')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="card space-y-3">
                <h3 className="text-sm font-semibold text-navy">Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Status</span>
                    <StatusBadge status={plan.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Priority</span>
                    <StatusBadge status={plan.priority} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Category</span>
                    <span className="font-medium text-navy">
                      {plan.category ? (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: plan.category.color }} />
                          {plan.category.name}
                        </span>
                      ) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Department</span>
                    <span className="font-medium text-navy">{plan.department ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Responsible</span>
                    <span className="font-medium text-navy">{plan.responsiblePerson ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Start Date</span>
                    <span className="font-medium text-navy">{new Date(plan.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Due Date</span>
                    <span className="font-medium text-navy">{new Date(plan.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Version</span>
                    <span className="font-medium text-navy">v{plan.version}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-navy">Goals & Activities</h3>
                <p className="text-xs text-muted">Click the circle to mark an activity as done — plan progress updates automatically.</p>
              </div>
              <Link href={`/tasks?planId=${planId}`} className="btn-secondary text-xs !py-1.5">
                <BarChart3 size={12} /> Manage in Activities
              </Link>
            </div>
            <div className="space-y-2">
              {plan.tasks?.length === 0 ? (
                <p className="text-sm text-muted">No activities yet. Add activities in the plan wizard or Tasks page.</p>
              ) : (
                plan.tasks?.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <button
                      type="button"
                      onClick={() => void handleToggleTaskComplete(task.id, task.status)}
                      className="shrink-0 text-muted hover:text-emerald-600"
                      title={task.status === 'COMPLETED' ? 'Mark as not done' : 'Mark as done'}
                    >
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle size={22} className="text-emerald-500" />
                      ) : (
                        <Circle size={22} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'text-muted line-through' : 'text-navy'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted">
                        {task.owner && <span>{task.owner} · </span>}
                        {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()} · </span>}
                        Progress {task.progress}%
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Milestones</h3>
            <div className="space-y-4">
              {plan.milestones?.length === 0 ? (
                <p className="text-sm text-muted">No milestones defined</p>
              ) : (
                plan.milestones?.map((ms, idx) => (
                  <div key={ms.id} className="relative flex gap-4">
                    {idx < (plan.milestones?.length ?? 0) - 1 && (
                      <div className="absolute left-[11px] top-8 h-full w-0.5 bg-border" />
                    )}
                    <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      ms.isCompleted ? 'bg-green-100 text-green-600' : 'bg-navy/[0.06] text-navy'
                    }`}>
                      {ms.isCompleted ? <CheckCircle size={12} /> : <div className="h-2 w-2 rounded-full bg-current" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <p className="text-sm font-medium text-navy">{ms.title}</p>
                      <p className="text-xs text-muted">
                        Target: {new Date(ms.targetDate).toLocaleDateString()}
                        {ms.responsiblePerson && ` · ${ms.responsiblePerson}`}
                        {ms.isCompleted && ms.completedDate && ` · Completed: ${new Date(ms.completedDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card">
                <h3 className="mb-4 text-sm font-semibold text-navy">Budget Overview</h3>
                <div className="space-y-3">
                  {plan.budgets?.length === 0 ? (
                    <p className="text-sm text-muted">No budget entries</p>
                  ) : (
                    plan.budgets?.map((b) => (
                      <div key={b.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-navy">{b.category}</span>
                          <span className="text-muted">{formatRwf(Number(b.spent))} / {formatRwf(Number(b.allocated))}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Number(b.allocated) > 0 ? (Number(b.spent) / Number(b.allocated)) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="card">
                <h3 className="mb-4 text-sm font-semibold text-navy">Allocation Summary</h3>
                <p className="text-sm text-muted">Total Budget: <strong className="text-navy">{formatRwf(Number(plan.budget))}</strong></p>
                <p className="text-sm text-muted">Actual Cost: <strong className="text-navy">{formatRwf(Number(plan.actualCost))}</strong></p>
                <p className="text-sm text-muted">Remaining: <strong className={Number(plan.budget) - Number(plan.actualCost) < 0 ? 'text-danger' : 'text-green-600'}>
                  {formatRwf(Number(plan.budget) - Number(plan.actualCost))}
                </strong></p>
              </div>
            </div>

            {can('expense.record') && (
              <div className="card">
                <h3 className="mb-4 text-sm font-semibold text-navy">Record Expense</h3>
                <form onSubmit={handleCreateExpense} className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-navy">Description</span>
                    <input className="ap-input w-full" required value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-navy">Amount (RWF)</span>
                    <input className="ap-input w-full" type="number" min="1" required value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-navy">Date</span>
                    <input className="ap-input w-full" type="date" value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-navy">Funding Source</span>
                    <select className="ap-input w-full" value={expenseForm.fundingSource}
                      onChange={(e) => setExpenseForm({ ...expenseForm, fundingSource: e.target.value })}>
                      {FUNDING_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  {can('budget.manage') && budgetLines.length > 0 && (
                    <label>
                      <span className="mb-1 block text-xs font-semibold text-navy">Budget Line (School Budget)</span>
                      <select className="ap-input w-full" value={expenseForm.budgetLineId}
                        onChange={(e) => setExpenseForm({ ...expenseForm, budgetLineId: e.target.value })}>
                        <option value="">— None —</option>
                        {budgetLines.map((l) => (
                          <option key={l.id} value={l.id}>{l.label}{l.category ? ` (${l.category})` : ''}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-navy">Receipt #</span>
                    <input className="ap-input w-full" value={expenseForm.receiptNumber}
                      onChange={(e) => setExpenseForm({ ...expenseForm, receiptNumber: e.target.value })} />
                  </label>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" disabled={savingExpense} className="btn-primary">
                      {savingExpense ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                      Record Expense
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-navy">Expense History</h3>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted">No expenses recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase text-muted">
                      <tr>
                        <th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3">Description</th>
                        <th className="pb-2 pr-3">Amount</th>
                        <th className="pb-2 pr-3">Funding</th>
                        <th className="pb-2">Budget Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((ex) => (
                        <tr key={ex.id} className="border-t border-slate-50">
                          <td className="py-2 pr-3 text-muted">{new Date(ex.expenseDate).toLocaleDateString()}</td>
                          <td className="py-2 pr-3 font-medium text-navy">{ex.description ?? ex.category}</td>
                          <td className="py-2 pr-3">{formatRwf(Number(ex.amount))}</td>
                          <td className="py-2 pr-3 text-muted">{ex.fundingSource ?? '—'}</td>
                          <td className="py-2 text-muted">{ex.budgetLineLabel ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Team Assignments</h3>
            <p className="mb-4 text-xs text-muted">
              Plan owner: <strong className="text-navy">{plan.responsiblePerson ?? wizardMeta?.planOwner ?? 'Not assigned'}</strong>
            </p>
            {plan.tasks?.length ? (
              <div className="space-y-3">
                {plan.tasks.map((t) => (
                  <div key={t.id} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-sm font-medium text-navy">{t.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      Responsible: {t.owner ?? 'Unassigned'}
                      {t.description?.includes('Support:') && (
                        <span> · Team: {t.description.match(/Support: ([^\n]+)/)?.[1]}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No activities assigned yet.</p>
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            {can('evidence.upload') && (
              <div className="card">
                <h3 className="mb-4 text-sm font-semibold text-navy">Upload Evidence</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-navy">Category</span>
                    <select className="ap-input w-full" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                      {['photo', 'document', 'report', 'attendance', 'receipt', 'other'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-navy">Linked Task (optional)</span>
                    <select className="ap-input w-full" value={uploadTaskId} onChange={(e) => setUploadTaskId(e.target.value)}>
                      <option value="">— Plan level —</option>
                      {plan.tasks?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
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
                          if (file) void handleUploadEvidence(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </label>
                </div>
                <p className="mt-2 text-[11px] text-muted">Images, PDF, Word, or text — max 12 MB</p>
              </div>
            )}

            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-navy">Evidence Files</h3>
              {plan.attachments?.length === 0 ? (
                <p className="text-sm text-muted">No evidence uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {plan.attachments?.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Paperclip size={16} className="shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy">{att.originalName ?? att.filename}</p>
                        <p className="text-xs text-muted">
                          {att.category ?? 'other'}
                          {att.uploadedBy && ` · ${att.uploadedBy}`}
                          {att.verifiedAt && ` · Verified ${new Date(att.verifiedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      {att.verifiedBy ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <ShieldCheck size={14} /> Verified
                        </span>
                      ) : can('evidence.verify') ? (
                        <button type="button" onClick={() => void handleVerifyAttachment(att.id)} className="btn-secondary text-xs !py-1.5">
                          <ShieldCheck size={12} /> Verify
                        </button>
                      ) : (
                        <span className="text-xs text-amber-600">Pending verification</span>
                      )}
                      <a href={uploadFileUrl(att.filePath)} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs !py-1.5">
                        <ExternalLink size={12} />
                      </a>
                      {can('evidence.upload') && (
                        <button type="button" onClick={() => void handleDeleteAttachment(att.id)} className="btn-danger text-xs !py-1.5">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Risk Register</h3>
            <div className="space-y-2">
              {plan.risks?.length === 0 ? (
                <p className="text-sm text-muted">No risks identified</p>
              ) : (
                plan.risks?.map((risk) => (
                  <div key={risk.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy">{risk.title}</p>
                      <p className="text-xs text-muted">
                        {risk.category && `${risk.category} · `}
                        Impact: {risk.impact} · Probability: {risk.probability}
                        {risk.owner && ` · Owner: ${risk.owner}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={risk.impact} />
                      <StatusBadge status={risk.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'kpis' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Key Performance Indicators</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {plan.kpis?.length === 0 ? (
                <p className="text-sm text-muted sm:col-span-2">No KPIs defined</p>
              ) : (
                plan.kpis?.map((kpi) => {
                  const achievement = kpi.target > 0 ? (Number(kpi.currentValue) / Number(kpi.target)) * 100 : 0;
                  const rag = ragFromKpi(Number(kpi.currentValue), Number(kpi.target));
                  return (
                    <div key={kpi.id} className="rounded-xl border border-border p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-navy">{kpi.name}</p>
                        <RagBadge rag={rag} showProgress={false} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-navy">{Number(kpi.currentValue)}</span>
                        <span className="text-xs text-muted">/ {Number(kpi.target)} {kpi.unit}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${Math.min(achievement, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted">{Math.round(achievement)}% achieved</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Discussion</h3>
            <div className="mb-4 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="input flex-1"
                placeholder="Write a comment…"
              />
              <button onClick={handleAddComment} disabled={!comment.trim()} className="btn-primary">
                <MessageSquare size={14} />
                Send
              </button>
            </div>
            <div className="space-y-3">
              {plan.comments?.length === 0 ? (
                <p className="text-sm text-muted">No comments yet</p>
              ) : (
                plan.comments?.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-navy">{c.author ?? 'Anonymous'}</span>
                      <span className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted">{c.content}</p>
                    {c.replies?.length > 0 && (
                      <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
                        {c.replies.map((r) => (
                          <div key={r.id}>
                            <span className="text-xs font-medium text-navy">{r.author ?? 'Anonymous'}</span>
                            <p className="text-xs text-muted">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Approval Workflow</h3>
            <div className="space-y-4">
              {plan.approvals?.length === 0 ? (
                <p className="text-sm text-muted">No approval chain configured. Submit the plan to start the approval process.</p>
              ) : (
                plan.approvals?.map((approval) => (
                  <div key={approval.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      approval.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                      approval.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                      approval.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {approval.status === 'APPROVED' ? <CheckCircle size={18} /> :
                       approval.status === 'REJECTED' ? <XCircle size={18} /> :
                       <Clock size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy">Level {approval.level}: {approval.role}</p>
                      <p className="text-xs text-muted">
                        {approval.approverName ? `Approved by ${approval.approverName}` : 'Pending'}
                        {approval.signedAt && ` · ${new Date(approval.signedAt).toLocaleString()}`}
                      </p>
                      {approval.comments && (
                        <p className="mt-1 text-xs italic text-muted">"{approval.comments}"</p>
                      )}
                    </div>
                    <StatusBadge status={approval.status} />
                    {needsApproval && approval.status === 'PENDING' && can('plan.approve') && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(approval.level, 'APPROVED')} className="btn-primary text-xs !py-1.5 !px-2">
                          <CheckCircle size={12} />
                          Approve
                        </button>
                        <button onClick={() => handleApprove(approval.level, 'REJECTED')} className="btn-danger text-xs !py-1.5 !px-2">
                          <XCircle size={12} />
                          Reject
                        </button>
                        <button onClick={() => handleApprove(approval.level, 'RETURNED')} className="btn-secondary text-xs !py-1.5 !px-2">
                          <RotateCcw size={12} />
                          Return
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Activity Timeline</h3>
            <div className="space-y-3">
              {plan.statusHistory?.length === 0 ? (
                <p className="text-sm text-muted">No activity recorded</p>
              ) : (
                plan.statusHistory?.map((h) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy/[0.06]">
                      <div className="h-2 w-2 rounded-full bg-navy" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy">
                        Status changed from <span className="text-muted">{h.fromStatus ?? 'N/A'}</span> to{' '}
                        <StatusBadge status={h.toStatus} />
                      </p>
                      <p className="text-[11px] text-muted">
                        {h.changedBy && `${h.changedBy} · `}
                        {new Date(h.createdAt).toLocaleString()}
                      </p>
                      {h.reason && <p className="text-xs italic text-muted">"{h.reason}"</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setShowSaveTemplate(false)} />
          <form
            onSubmit={handleSaveAsTemplate}
            className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-base font-semibold text-navy">Save as Template</h2>
            <p className="mb-4 text-xs text-muted">
              Save this plan structure as a reusable template for next year or other departments.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Template Name *</label>
                <input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="input min-h-[60px]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Category</label>
                <select
                  value={templateForm.categoryId}
                  onChange={(e) => setTemplateForm({ ...templateForm, categoryId: e.target.value })}
                  className="input"
                >
                  <option value="academic">Academic & Learning</option>
                  <option value="attendance">Attendance & Retention</option>
                  <option value="teacher">Teacher Development</option>
                  <option value="ict">ICT & Digital</option>
                  <option value="governance">Governance</option>
                  <option value="finance">Finance & Resources</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-navy">Ownership</label>
                <select
                  value={templateForm.ownership}
                  onChange={(e) => setTemplateForm({ ...templateForm, ownership: e.target.value as 'school' | 'personal' })}
                  className="input"
                >
                  <option value="school">School Template</option>
                  <option value="personal">My Template</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSaveTemplate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={savingTemplate || !templateForm.name.trim()} className="btn-primary">
                {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <FileStack size={14} />}
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      {showExportModal && plan && (
        <ExportPlanModal
          open={showExportModal}
          plan={plan}
          schoolName={summary?.organizationName ?? 'School'}
          orgProfile={orgProfile}
          generatedBy={user?.email}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </ApPageLayout>
  );
}

function Clock({ size }: { size?: number }) {
  return <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
