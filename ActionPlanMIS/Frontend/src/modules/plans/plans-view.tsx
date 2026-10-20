'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Filter,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import {
  ApActiveFilters,
  ApFilterActions,
  ApFilterBar,
  ApFilterDate,
  ApFilterSearch,
  ApFilterSelect,
} from '@/components/ap-filter-bar';
import { StatusBadge } from '@/components/status-badge';
import { CreatePlanChoiceModal } from '@/modules/plans/create-plan-choice-modal';
import { useAuth } from '@/contexts/auth-context';
import { exportPlansExcel, exportPlansPdf } from '@/lib/export-plans';
import { schoolBrandingFromProfile } from '@/lib/school-branding';
import type { ActionPlan, Category } from '@/types';

const STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

function progressTone(progress: number) {
  if (progress >= 75) return 'bg-emerald-500';
  if (progress >= 50) return 'bg-amber-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-rose-500';
}

function fmtDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PlansView() {
  const { summary, user, orgProfile } = useAuth();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateMode, setDateMode] = useState<'any' | 'on' | 'range'>('any');
  const [onDate, setOnDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void apApi
      .listCategories()
      .then(({ data }) => setCategories(data.data ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [statusFilter, priorityFilter, categoryFilter, dateMode, onDate, dateFrom, dateTo]);

  async function loadPlans() {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        categoryId: categoryFilter || undefined,
        search: search || undefined,
        limit: 100,
      };
      if (dateMode === 'on' && onDate) params.onDate = onDate;
      if (dateMode === 'range') {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
      }
      const { data } = await apApi.listPlans(params);
      setPlans(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const schoolName = summary?.organizationName || 'School';

  function clearAllFilters() {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setDateMode('any');
    setOnDate('');
    setDateFrom('');
    setDateTo('');
  }

  const activeFilters = [
    search ? { key: 'search', label: `Search: ${search}`, onClear: () => setSearch('') } : null,
    statusFilter ? { key: 'status', label: `Status: ${statusFilter.replace(/_/g, ' ')}`, onClear: () => setStatusFilter('') } : null,
    priorityFilter ? { key: 'priority', label: `Priority: ${priorityFilter}`, onClear: () => setPriorityFilter('') } : null,
    categoryFilter
      ? {
          key: 'category',
          label: `Category: ${categories.find((c) => c.id === categoryFilter)?.name ?? categoryFilter}`,
          onClear: () => setCategoryFilter(''),
        }
      : null,
    dateMode === 'on' && onDate
      ? { key: 'onDate', label: `Due on ${fmtDate(onDate)}`, onClear: () => { setDateMode('any'); setOnDate(''); } }
      : null,
    dateMode === 'range' && (dateFrom || dateTo)
      ? {
          key: 'range',
          label: `Due ${dateFrom ? fmtDate(dateFrom) : '…'} – ${dateTo ? fmtDate(dateTo) : '…'}`,
          onClear: () => { setDateMode('any'); setDateFrom(''); setDateTo(''); },
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; onClear: () => void }[];

  async function handleDelete(plan: ActionPlan) {
    if (!confirm(`Delete “${plan.title}”? This cannot be undone.`)) return;
    setDeletingId(plan.id);
    try {
      await apApi.deletePlan(plan.id);
      await loadPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <ApPageLayout
        actions={
          <button type="button" onClick={() => setShowChoiceModal(true)} className="btn-primary">
            <Plus size={16} />
            New Plan
          </button>
        }
      >
        <div className="overflow-hidden rounded-3xl border border-navy/[0.06] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <ApFilterBar>
              <ApFilterSearch
                value={search}
                onChange={setSearch}
                onSubmit={() => void loadPlans()}
                placeholder="Search plans by title, owner or department…"
              />
              <ApFilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]}
              />
              <ApFilterSelect
                label="Priority"
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: '', label: 'All priorities' },
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
              />
              <ApFilterSelect
                label="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: '', label: 'All categories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <ApFilterSelect
                label="Due date"
                value={dateMode}
                onChange={(value) => {
                  setDateMode(value as 'any' | 'on' | 'range');
                  if (value === 'any') {
                    setOnDate('');
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
                options={[
                  { value: 'any', label: 'Any date' },
                  { value: 'on', label: 'Specific date' },
                  { value: 'range', label: 'Date range' },
                ]}
              />
              {dateMode === 'on' ? (
                <ApFilterDate label="Due on" value={onDate} onChange={setOnDate} />
              ) : null}
              {dateMode === 'range' ? (
                <>
                  <ApFilterDate label="Due from" value={dateFrom} onChange={setDateFrom} />
                  <ApFilterDate label="Due to" value={dateTo} onChange={setDateTo} />
                </>
              ) : null}
              <ApFilterActions>
                <button type="button" onClick={() => void loadPlans()} className="btn-secondary h-10 py-2">
                  <Filter size={14} />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => exportPlansExcel(plans, schoolName)}
                  className="btn-secondary h-10 py-2"
                  disabled={plans.length === 0}
                >
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportPlansPdf(plans, schoolBrandingFromProfile(orgProfile, schoolName, user?.email))
                  }
                  className="h-10 rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-40"
                  disabled={plans.length === 0}
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText size={14} />
                    PDF
                  </span>
                </button>
              </ApFilterActions>
            </ApFilterBar>
            <ApActiveFilters items={activeFilters} onClearAll={activeFilters.length > 0 ? clearAllFilters : undefined} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted">
              <Loader2 className="mr-2 animate-spin" size={16} />
              Loading plans…
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5">
                <ClipboardList size={28} className="text-muted" />
              </div>
              <p className="text-sm font-semibold text-navy">No action plans found</p>
              <p className="mt-1 text-xs text-muted">Create a plan or adjust the filters</p>
              <button
                type="button"
                onClick={() => setShowChoiceModal(true)}
                className="btn-primary mt-4"
              >
                <Plus size={16} />
                Create plan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-navy/50">
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Progress</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-navy">{plan.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {[plan.department, plan.responsiblePerson].filter(Boolean).join(' · ') || 'No owner'}
                          {` · ${plan.tasks?.length ?? 0} tasks`}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        {plan.category?.name ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: plan.category.color }}
                            />
                            {plan.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={plan.status} />
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={plan.priority} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex min-w-[110px] items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                            <div
                              className={`h-1.5 rounded-full ${progressTone(plan.progress)}`}
                              style={{ width: `${Math.min(100, plan.progress || 0)}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs font-semibold text-navy">{plan.progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted">{fmtDate(plan.dueDate)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/plans/${plan.id}`}
                            className="rounded-xl p-2 text-muted transition hover:bg-sky-50 hover:text-sky-700"
                            title="View"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/plans/${plan.id}/edit`}
                            className="rounded-xl p-2 text-muted transition hover:bg-amber-50 hover:text-amber-700"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(plan)}
                            disabled={deletingId === plan.id}
                            className="rounded-xl p-2 text-muted transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                            title="Delete"
                          >
                            {deletingId === plan.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ApPageLayout>

      <CreatePlanChoiceModal open={showChoiceModal} onClose={() => setShowChoiceModal(false)} />
    </>
  );
}
