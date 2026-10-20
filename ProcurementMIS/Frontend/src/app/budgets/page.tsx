'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { procurementApi } from '@/services/procurement-api';
import type { Budget, BudgetSummary } from '@/types';
import { Plus, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import {
  DataTable,
  DataTableCard,
  DataTableEmpty,
  DataTableHead,
  DataTableTh,
  PageLoading,
} from '@/components/list-ui';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear().toString(), totalBudget: '', period: 'YEARLY' });

  const load = async () => {
    try {
      const [b, s] = await Promise.all([procurementApi.budgets.list(), procurementApi.budgets.summary()]);
      setBudgets(b); setSummary(s);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procurementApi.budgets.create({ ...form, totalBudget: Number(form.totalBudget) });
      toast.success('Budget created'); setDialogOpen(false); setForm({ name: '', year: new Date().getFullYear().toString(), totalBudget: '', period: 'YEARLY' }); load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading budgets…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Monitor and manage procurement budgets and utilization."
        actions={
          <button type="button" onClick={() => setDialogOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Budget
          </button>
        }
        kpis={
          summary
            ? [
                {
                  label: 'Total Budget',
                  value: `$${summary.totalBudget.toLocaleString()}`,
                  icon: <DollarSign size={20} strokeWidth={1.75} />,
                },
                {
                  label: 'Spent',
                  value: `$${summary.totalSpent.toLocaleString()}`,
                  icon: <TrendingUp size={20} strokeWidth={1.75} />,
                  valueClassName: 'text-amber-600',
                },
                {
                  label: 'Remaining',
                  value: `$${summary.remaining.toLocaleString()}`,
                  icon: <DollarSign size={20} strokeWidth={1.75} />,
                  valueClassName: 'text-emerald-600',
                },
                {
                  label: 'Utilization',
                  value: `${summary.utilization}%`,
                  icon: <TrendingUp size={20} strokeWidth={1.75} />,
                  valueClassName:
                    summary.utilization >= 90
                      ? 'text-red-600'
                      : summary.utilization >= 70
                        ? 'text-amber-600'
                        : 'text-emerald-600',
                },
              ]
            : undefined
        }
      >
        {summary && summary.alerts.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-soft">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-navy">Budget Alerts</span>
            </div>
            {summary.alerts.map((a) => (
              <div key={a.budgetId} className="flex items-center justify-between py-1.5 text-sm">
                <span>{a.name}</span>
                <span
                  className={`font-medium ${a.status === 'EXCEEDED' ? 'text-red-600' : 'text-amber-600'}`}
                >
                  {a.utilization}% {a.status === 'EXCEEDED' ? '— EXCEEDED' : '— Warning'}
                </span>
              </div>
            ))}
          </div>
        )}

        <DataTableCard>
          <DataTable minWidth="880px">
            <DataTableHead>
              <DataTableTh>Name</DataTableTh>
              <DataTableTh className="text-center">Year</DataTableTh>
              <DataTableTh className="text-center">Period</DataTableTh>
              <DataTableTh className="text-right">Budget</DataTableTh>
              <DataTableTh className="text-right">Spent</DataTableTh>
              <DataTableTh className="text-right">Remaining</DataTableTh>
              <DataTableTh className="text-center">Utilization</DataTableTh>
            </DataTableHead>
            <tbody>
              {budgets.map((b) => {
                const pct =
                  Number(b.totalBudget) > 0
                    ? Math.round((Number(b.spent) / Number(b.totalBudget)) * 100)
                    : 0;
                const remaining = Number(b.totalBudget) - Number(b.spent);
                return (
                  <tr key={b.id} className="border-b border-border/70 transition hover:bg-[#f8fafc]">
                    <td className="px-4 py-3 font-semibold text-navy">{b.name}</td>
                    <td className="px-4 py-3 text-center">{b.year}</td>
                    <td className="px-4 py-3 text-center">{b.period}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${Number(b.totalBudget).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${Number(b.spent).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${remaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-200">
                          <div
                            className={`h-2 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold tabular-nums">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {budgets.length === 0 ? (
                <DataTableEmpty colSpan={7} message="No budgets yet" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PlatformPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Budget</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Operations Budget 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Year *</label><input type="number" min="2020" value={form.year} onChange={e => setForm({...form, year: e.target.value})} required className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Period</label>
                <select value={form.period} onChange={e => setForm({...form, period: e.target.value})} className="w-full rounded-lg border px-3 py-2 text-sm bg-white">
                  <option value="YEARLY">Yearly</option><option value="QUARTERLY">Quarterly</option><option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Total Budget *</label><input type="number" min="0" value={form.totalBudget} onChange={e => setForm({...form, totalBudget: e.target.value})} required className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
            <DialogFooter>
              <DialogClose render={<button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>}>Cancel</DialogClose>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
