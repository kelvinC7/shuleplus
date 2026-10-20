'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsModal } from '@/components/assets-modal';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi, type OpeningPreviewRow } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf } from '@/utils/format';
import { isLandCategory } from '@/lib/register-math';
import type { Category, FinancialYear } from '@/types';

interface BalanceDraft {
  category: string;
  categoryId?: string | null;
  openingBalance: number;
  accumulatedDepreciation: number;
  depreciationRate: number;
  selected: boolean;
  readOnly?: boolean;
}

export function YearSetupView() {
  const toast = useToast();
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Active'>('Active');
  const [balances, setBalances] = useState<BalanceDraft[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [yRes, cRes] = await Promise.all([
        assetsApi.financialYears(),
        assetsApi.categories(),
      ]);
      setYears(yRes.data.data ?? []);
      setCategories(cRes.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load years'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const isFirstOrgSetup = years.length === 0;

  function buildBalancesFromPreview(preview: OpeningPreviewRow[], carryForward: boolean) {
    if (preview.length > 0) {
      return preview.map((p) => ({
        category: p.category,
        categoryId: p.categoryId,
        openingBalance: p.openingBalance ?? 0,
        accumulatedDepreciation: p.accumulatedDepreciation ?? 0,
        depreciationRate: p.depreciationRate ?? 0,
        selected: true,
        readOnly: carryForward,
      }));
    }
    return categories.map((c) => ({
      category: c.name,
      categoryId: c.id,
      openingBalance: 0,
      accumulatedDepreciation: 0,
      depreciationRate: c.depreciationRate ?? 0,
      selected: true,
      readOnly: false,
    }));
  }

  async function openCreateWizard() {
    setWizardMode('create');
    setEditId(null);
    setStep(1);
    setYear(currentYear);
    setStartDate(`${currentYear}-01-01`);
    setEndDate(`${currentYear}-12-31`);
    setDescription('');
    setStatus('Active');
    setWizardOpen(true);

    let preview: OpeningPreviewRow[] = [];
    try {
      const { data } = await assetsApi.openingPreview(currentYear);
      preview = data.data ?? [];
    } catch {
      preview = [];
    }
    setBalances(buildBalancesFromPreview(preview, !isFirstOrgSetup));
  }

  function openEditWizard(fy: FinancialYear) {
    setWizardMode('edit');
    setEditId(fy.id);
    setStep(2);
    setYear(fy.year);
    setStartDate(String(fy.startDate).slice(0, 10));
    setEndDate(String(fy.endDate).slice(0, 10));
    setDescription(fy.description ?? '');
    setStatus(fy.status === 'Draft' ? 'Draft' : 'Active');
    setBalances(
      (fy.categoryBalances ?? []).map((b) => ({
        category: b.categoryName,
        categoryId: b.categoryId,
        openingBalance: b.openingBalance,
        accumulatedDepreciation: b.accumulatedDepreciationStart,
        depreciationRate: b.depreciationRate,
        selected: true,
        readOnly: fy.status === 'Closed',
      }))
    );
    setWizardOpen(true);
  }

  async function loadPreviewForYear(y: number) {
    const existing = years.find((fy) => fy.year === y);
    if (existing) {
      toast.error(`Year ${y} already exists. Use Edit to update its setup.`, 'Year exists');
      openEditWizard(existing);
      return;
    }

    setStartDate(`${y}-01-01`);
    setEndDate(`${y}-12-31`);

    try {
      const { data } = await assetsApi.openingPreview(y);
      setBalances(buildBalancesFromPreview(data.data ?? [], years.length > 0));
    } catch {
      setBalances(buildBalancesFromPreview([], false));
    }
  }

  const selectedBalances = useMemo(
    () => balances.filter((b) => b.selected),
    [balances]
  );

  async function saveYear() {
    if (!selectedBalances.length) {
      toast.error('Select at least one category with opening balances');
      return;
    }

    if (wizardMode === 'create' && years.some((y) => y.year === year)) {
      toast.error(`Year ${year} already exists. Edit the existing setup instead.`);
      return;
    }

    setSaving(true);
    try {
      const payload = selectedBalances.map((b) => ({
        category: b.category,
        openingBalance: Number(b.openingBalance) || 0,
        accumulatedDepreciation: Number(b.accumulatedDepreciation) || 0,
        depreciationRate: Number(b.depreciationRate) || 0,
      }));

      if (wizardMode === 'edit' && editId) {
        await assetsApi.updateFinancialYear(editId, {
          description: description.trim() || undefined,
          status,
          categoryBalances: payload,
        });
        toast.success(`Financial year ${year} updated.`, 'Updated');
      } else {
        await assetsApi.createFinancialYear({
          year,
          startDate,
          endDate,
          description: description.trim() || undefined,
          status,
          depMethod: 'Diminishing',
          autoCarryForward: !isFirstOrgSetup,
          lockPreviousYear: true,
          categoryBalances: payload,
        });
        toast.success(`Financial year ${year} created.`, 'Created');
      }
      setWizardOpen(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save year'), 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function closeYear(id: string) {
    try {
      await assetsApi.closeFinancialYear(id);
      toast.success('Year closed.', 'Closed');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to close year'), 'Error');
    }
  }

  async function reopenYear(id: string) {
    try {
      await assetsApi.reopenFinancialYear(id);
      toast.success('Year reopened.', 'Reopened');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to reopen year'), 'Error');
    }
  }

  async function removeYear(id: string) {
    if (!confirm('Delete this financial year?')) return;
    try {
      await assetsApi.deleteFinancialYear(id);
      toast.success('Year deleted.', 'Deleted');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete year'), 'Error');
    }
  }

  return (
    <AssetsPageLayout
      title="Year Setup"
      subtitle="Configure financial years and category opening balances"
      actions={
        <button type="button" onClick={() => void openCreateWizard()} className="btn-primary">
          <Plus size={16} /> New financial year
        </button>
      }
      kpis={[
        { label: 'Years', value: years.length },
        { label: 'Active', value: years.find((y) => y.status === 'Active')?.year ?? '—' },
      ]}
    >
      <div className="hr-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/90">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Year
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Status
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Opening
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Purchases
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Closing
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-50/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : years.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-muted">
                    No financial years yet. Create your first year setup.
                  </td>
                </tr>
              ) : (
                years.map((y) => (
                  <tr key={y.id} className="group">
                    <td colSpan={6} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-white px-4 py-3.5 shadow-sm transition group-hover:border-primary/30 group-hover:shadow-md sm:px-5">
                        <div className="min-w-[72px] font-bold text-navy">{y.year}</div>
                        <div className="min-w-[100px]">
                          <StatusBadge status={y.status} />
                        </div>
                        <div className="min-w-[120px] font-semibold tabular-nums text-navy">
                          {formatRwf(y.totalOpening)}
                        </div>
                        <div className="min-w-[120px] tabular-nums text-muted">
                          {formatRwf(y.totalPurchases)}
                        </div>
                        <div className="min-w-[120px] font-semibold tabular-nums text-navy">
                          {formatRwf(y.totalClosing)}
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditWizard(y)}
                            className="rounded-lg p-2 text-navy hover:bg-slate-100"
                            title="Edit year setup"
                          >
                            <Pencil size={16} />
                          </button>
                          {y.status !== 'Closed' ? (
                            <button
                              type="button"
                              onClick={() => void closeYear(y.id)}
                              className="rounded-lg p-2 text-muted hover:bg-slate-100"
                              title="Close year"
                            >
                              <Lock size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void reopenYear(y.id)}
                              className="rounded-lg p-2 text-muted hover:bg-slate-100"
                              title="Reopen year"
                            >
                              <Unlock size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeYear(y.id)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssetsModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={wizardMode === 'edit' ? `Edit Year ${year}` : 'New Financial Year'}
        subtitle={`Step ${step} of 2`}
        icon={<CalendarRange size={18} />}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (step === 1) setWizardOpen(false);
                else setStep(1);
              }}
            >
              <ChevronLeft size={16} />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step === 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (wizardMode === 'edit') setStep(2);
                  else void loadPreviewForYear(year).then(() => setStep(2));
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void saveYear()}
              >
                {saving ? 'Saving…' : wizardMode === 'edit' ? 'Save changes' : 'Create year'}
              </button>
            )}
          </>
        }
      >
        {step === 1 ? (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Year</span>
              <input
                className="input"
                type="number"
                value={year}
                disabled={wizardMode === 'edit'}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYear(y);
                  setStartDate(`${y}-01-01`);
                  setEndDate(`${y}-12-31`);
                }}
              />
            </label>
            {wizardMode === 'create' && years.some((y) => y.year === year) ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Year {year} is already set up. Close this wizard and use <strong>Edit</strong> on
                the table row instead.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted">
                  Start date
                </span>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  disabled={wizardMode === 'edit'}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted">
                  End date
                </span>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  disabled={wizardMode === 'edit'}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Status</span>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Draft' | 'Active')}
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">
                Description
              </span>
              <textarea
                className="input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {isFirstOrgSetup && wizardMode === 'create'
                ? 'Select categories and set opening balances for your first asset year.'
                : wizardMode === 'edit'
                  ? 'Update opening and accumulated depreciation per category.'
                  : 'Opening balances are carried forward from the previous year. Review before saving.'}
            </p>
            {balances.length === 0 ? (
              <p className="rounded-xl border border-border bg-slate-50 p-4 text-sm text-muted">
                No categories found. Create categories first.
              </p>
            ) : (
              balances.map((b, idx) => {
                const isLand = isLandCategory(b.category);
                return (
                <div
                  key={b.category}
                  className={`rounded-xl border p-4 ${
                    b.selected ? 'border-border bg-white' : 'border-dashed border-border/70 bg-slate-50/50 opacity-70'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    {wizardMode === 'create' && isFirstOrgSetup ? (
                      <input
                        type="checkbox"
                        checked={b.selected}
                        onChange={(e) => {
                          const next = [...balances];
                          next[idx] = { ...b, selected: e.target.checked };
                          setBalances(next);
                        }}
                      />
                    ) : null}
                    <p className="font-semibold text-navy">{b.category}</p>
                    {b.readOnly ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                        Carried forward
                      </span>
                    ) : null}
                  </div>
                  {isLand ? (
                    <p className="mb-3 text-xs text-muted">
                      Land opening applies to the first parcel in each year. Later years carry
                      forward automatically from the last land total balance. No depreciation.
                    </p>
                  ) : null}
                  <div className={`grid gap-3 ${isLand ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
                    <label className="text-sm">
                      <span className="text-xs text-muted">
                        {isLand ? 'Land opening (RWF)' : 'Opening'}
                      </span>
                      <input
                        className="input mt-1"
                        type="number"
                        disabled={b.readOnly}
                        value={b.openingBalance}
                        onChange={(e) => {
                          const next = [...balances];
                          next[idx] = { ...b, openingBalance: Number(e.target.value) };
                          setBalances(next);
                        }}
                      />
                    </label>
                    {!isLand ? (
                      <>
                        <label className="text-sm">
                          <span className="text-xs text-muted">Accumulated dep.</span>
                          <input
                            className="input mt-1"
                            type="number"
                            disabled={b.readOnly}
                            value={b.accumulatedDepreciation}
                            onChange={(e) => {
                              const next = [...balances];
                              next[idx] = {
                                ...b,
                                accumulatedDepreciation: Number(e.target.value),
                              };
                              setBalances(next);
                            }}
                          />
                        </label>
                        <label className="text-sm">
                          <span className="text-xs text-muted">Rate %</span>
                          <input
                            className="input mt-1"
                            type="number"
                            disabled={b.readOnly}
                            value={b.depreciationRate}
                            onChange={(e) => {
                              const next = [...balances];
                              next[idx] = { ...b, depreciationRate: Number(e.target.value) };
                              setBalances(next);
                            }}
                          />
                        </label>
                      </>
                    ) : (
                      <p className="text-xs text-muted">
                        Depreciation does not apply to land — only opening and purchases matter.
                      </p>
                    )}
                  </div>
                </div>
              );
              })
            )}
          </div>
        )}
      </AssetsModal>
    </AssetsPageLayout>
  );
}
