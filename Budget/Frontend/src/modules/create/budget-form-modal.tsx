'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { useToast } from '@/shared/notifications';
import { formatRwf } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { BudgetOptions, IncomeConfig, SchoolBudget } from '@/types';

export const OTHER_INCOME = 'Other Income';

export type IncomeRow = {
  key: string;
  incomeSourceKey: string;
  otherLabel?: string;
  calculationType: 'fixed' | 'per_student';
  expectedAmountRwf: string;
  quantity: string;
  unitAmount: string;
  deductions: { label: string; amount: string }[];
};

export function emptyIncomeRow(preset = ''): IncomeRow {
  return {
    key: Math.random().toString(36).slice(2),
    incomeSourceKey: preset,
    calculationType: 'fixed',
    expectedAmountRwf: '',
    quantity: '',
    unitAmount: '',
    deductions: [],
  };
}

export function netForRow(row: IncomeRow): number {
  const deductions = row.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  if (row.calculationType === 'per_student') {
    return Math.max(0, (Number(row.quantity) || 0) * (Number(row.unitAmount) || 0) - deductions);
  }
  return Math.max(0, (Number(row.expectedAmountRwf) || 0) - deductions);
}

interface BudgetFormModalProps {
  editId?: string | null;
  options: BudgetOptions | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function BudgetFormModal({ editId, options, onSaved, onCancel }: BudgetFormModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [budgetType, setBudgetType] = useState('Term Budget');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<IncomeRow[]>([emptyIncomeRow('Tuition Fees')]);

  useEffect(() => {
    if (!editId) {
      if (options) {
        setAcademicYear(options.currentAcademicYear ?? options.academicYears[0] ?? '');
        setTerm(options.currentTerm ?? options.terms[0] ?? 'Term 1');
        setBudgetType(options.budgetTypes[0] ?? 'Term Budget');
        setRows([emptyIncomeRow(options.incomePresets[0] ?? 'Tuition Fees')]);
      }
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const res = await budgetApi.budget(editId);
        const b = unwrap(res.data) as SchoolBudget;
        setTitle(b.title);
        setAcademicYear(b.academicYear);
        setTerm(b.term);
        setBudgetType(b.budgetType);
        setDescription(b.description ?? '');
        setStartDate(b.startDate ? b.startDate.slice(0, 10) : '');
        setEndDate(b.endDate ? b.endDate.slice(0, 10) : '');
        setRows(
          (b.incomeSources ?? []).map((s) => {
            const cfg = (s.configJson ?? {}) as IncomeConfig;
            const presets = options?.incomePresets ?? [];
            const isPreset = presets.includes(s.incomeSourceKey);
            const deductionRows = (cfg.deductions ?? []).map((d) => ({
              label: d.label ?? '',
              amount: String(d.amount ?? ''),
            }));
            const deductionTotal = deductionRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            const grossFixed = (Number(s.expectedAmountRwf) || 0) + deductionTotal;
            return {
              key: s.id ?? Math.random().toString(36).slice(2),
              incomeSourceKey: isPreset ? s.incomeSourceKey : OTHER_INCOME,
              otherLabel: isPreset ? '' : s.incomeSourceKey,
              calculationType: cfg.calculationType === 'per_student' ? 'per_student' : 'fixed',
              expectedAmountRwf: String(grossFixed || ''),
              quantity: String(cfg.quantity ?? ''),
              unitAmount: String(cfg.unitAmount ?? ''),
              deductions: deductionRows,
            };
          })
        );
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load budget'));
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, options, toast]);

  const total = useMemo(() => rows.reduce((s, r) => s + netForRow(r), 0), [rows]);

  function updateRow(key: string, patch: Partial<IncomeRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function save(submit: boolean) {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!academicYear) {
      toast.error('Academic year is required');
      return;
    }
    setSaving(true);
    try {
      const incomeSources = rows
        .filter((r) => r.incomeSourceKey.trim())
        .map((r) => {
          const sourceKey =
            r.incomeSourceKey === OTHER_INCOME
              ? r.otherLabel?.trim() || OTHER_INCOME
              : r.incomeSourceKey.trim();
          const deductions = r.deductions
            .filter((d) => d.label || d.amount)
            .map((d) => ({ label: d.label, amount: Number(d.amount) || 0 }));
          const configJson: IncomeConfig = {
            calculationType: r.calculationType,
            deductions,
            ...(r.calculationType === 'per_student'
              ? { quantity: Number(r.quantity) || 0, unitAmount: Number(r.unitAmount) || 0 }
              : {}),
          };
          return {
            incomeSourceKey: sourceKey,
            expectedAmountRwf: r.calculationType === 'fixed' ? Number(r.expectedAmountRwf) || 0 : 0,
            configJson,
          };
        });

      const payload = {
        title: title.trim(),
        academicYear,
        term,
        budgetType,
        description: description || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        submit,
        incomeSources,
      };

      if (editId) {
        await budgetApi.updateBudget(editId, payload);
        toast.success(submit ? 'Budget submitted for approval' : 'Budget updated');
      } else {
        await budgetApi.createBudget(payload);
        toast.success(submit ? 'Budget submitted for approval' : 'Draft budget saved');
      }
      onSaved();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save budget'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">Loading budget…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Title *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="e.g. Term 1 Operating Budget"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Academic Year *</span>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="input">
            {(options?.academicYears ?? []).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Term</span>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="input">
            {(options?.terms ?? ['Term 1', 'Term 2', 'Term 3']).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Budget Type</span>
          <select value={budgetType} onChange={(e) => setBudgetType(e.target.value)} className="input">
            {(options?.budgetTypes ?? ['Term Budget']).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Start Date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">End Date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" />
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-slate-50/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Income Sources</h3>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 text-xs"
            onClick={() => setRows((r) => [...r, emptyIncomeRow(options?.incomePresets[0] ?? '')])}
          >
            <Plus size={14} /> Add source
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="rounded-xl border border-border bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Source</span>
                  <select
                    value={row.incomeSourceKey}
                    onChange={(e) =>
                      updateRow(row.key, {
                        incomeSourceKey: e.target.value,
                        otherLabel: e.target.value === OTHER_INCOME ? row.otherLabel : '',
                      })
                    }
                    className="input py-2"
                  >
                    <option value="">Select…</option>
                    {(options?.incomePresets ?? []).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
                {row.incomeSourceKey === OTHER_INCOME ? (
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                      Specify source <span className="font-normal normal-case text-muted">(optional)</span>
                    </span>
                    <input
                      value={row.otherLabel ?? ''}
                      onChange={(e) => updateRow(row.key, { otherLabel: e.target.value })}
                      placeholder="e.g. Donation from alumni, PTA contribution…"
                      className="input py-2"
                    />
                  </label>
                ) : null}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Calculation</span>
                  <select
                    value={row.calculationType}
                    onChange={(e) =>
                      updateRow(row.key, { calculationType: e.target.value as 'fixed' | 'per_student' })
                    }
                    className="input py-2"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="per_student">Per student</option>
                  </select>
                </label>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-sm font-semibold text-navy">{formatRwf(netForRow(row))}</p>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    aria-label="Remove source"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {row.calculationType === 'fixed' ? (
                <label className="mt-3 block max-w-xs">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Expected amount (RWF)</span>
                  <input
                    type="number"
                    min={0}
                    value={row.expectedAmountRwf}
                    onChange={(e) => updateRow(row.key, { expectedAmountRwf: e.target.value })}
                    className="input py-2"
                  />
                </label>
              ) : (
                <div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Students</span>
                    <input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      className="input py-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">Unit amount (RWF)</span>
                    <input
                      type="number"
                      min={0}
                      value={row.unitAmount}
                      onChange={(e) => updateRow(row.key, { unitAmount: e.target.value })}
                      className="input py-2"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted">
          Total expected income: <span className="text-lg font-bold text-navy">{formatRwf(total)}</span>
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(false)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
        >
          Save draft
        </button>
        <button type="button" disabled={saving} onClick={() => void save(true)} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Submit for approval'}
        </button>
      </div>
    </div>
  );
}
