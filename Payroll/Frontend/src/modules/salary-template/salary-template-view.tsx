'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Building2, Check, ChevronDown, Download, History, Layers, Pencil, Plus, RefreshCw, Save, Search, Trash2, X, Zap } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { PayrollRegisterTable } from '@/components/payroll-register-table';
import { PayrollTabs } from '@/components/payroll-tabs';
import {
  SalaryEmpty,
  SalaryField,
  SalaryMiniStat,
  SalaryModal,
  SalaryPanel,
  SalarySwitch,
  STATUTORY_LABELS,
} from '@/components/salary-ui';
import { formatRwf } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  DEFAULT_ALLOWANCE_RULES,
  DEFAULT_PAYE_BRACKETS,
  DEFAULT_REGISTER_ALLOWANCE_ROWS,
  DEFAULT_STATUTORY,
  calcRwandaPayroll,
  inferRegisterKey,
  normalizeTemplateAllowances,
  resolveLineItemAmount,
} from '@/utils/rwandaPayrollEngine';

type AllowanceRow = {
  name: string;
  category?: string;
  amount: number;
  amountType?: string;
  channel?: string;
  status?: string;
  registerKey?: 'others' | 'housing' | 'transport';
};
type DeductionRow = { name: string; category?: string; amount: number; amountType?: string; channel?: string; status?: string };
type PayeBracket = { upTo: number | null; rate: number };
type EmployeeDeduction = {
  id: string;
  staffId: string;
  staffName: string;
  employeeNumber: string;
  name: string;
  amount: number;
  channel: string;
};
type LineItemKind = 'allowance' | 'deduction';

const TABS = [
  { id: 'allowances', label: 'Allowances' },
  { id: 'deductions', label: 'Deductions' },
  { id: 'statutory', label: 'Statutory' },
  { id: 'employee-deductions', label: 'Staff Deductions' },
];

const CHANNELS = ['tax', 'bank', 'both'];
const AMOUNT_TYPES = [
  { value: 'fixed', label: 'Fixed (RWF)' },
  { value: 'percent_basic', label: '% of Basic' },
  { value: 'percent_gross', label: '% of Gross' },
];

const REGISTER_LABELS: Record<string, string> = {
  others: 'Others',
  housing: 'H/A',
  transport: 'T/A',
};

function AllowancesTable({
  rows,
  sampleBasic,
  editing,
  onChange,
  onRemove,
}: {
  rows: AllowanceRow[];
  sampleBasic: number;
  editing: boolean;
  onChange: (index: number, patch: Partial<AllowanceRow>) => void;
  onRemove: (index: number) => void;
}) {
  if (!rows.length) {
    return <SalaryEmpty message="No allowances — add register or school-wide rows" />;
  }

  const previewGross = sampleBasic > 0 ? Math.max(sampleBasic, sampleBasic / 0.7) : sampleBasic;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50/80 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Slot</th>
            <th className="px-4 py-3">Formula</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Preview</th>
            <th className="px-4 py-3">Channel</th>
            <th className="w-12 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const registerKey = inferRegisterKey(row.name, row.registerKey) ?? undefined;
            const preview = sampleBasic > 0 ? resolveLineItemAmount(row, sampleBasic, Math.round(previewGross)) : 0;

            const formulaLabel = AMOUNT_TYPES.find((t) => t.value === (row.amountType ?? 'fixed'))?.label ?? 'Fixed (RWF)';

            return (
              <tr key={`${row.name}-${i}`} className="group border-t border-slate-100 transition-colors hover:bg-[#FCB038]/[0.03]">
                <td className="px-3 py-2.5">
                  {editing ? (
                    <input
                      className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-medium text-navy transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                      value={row.name}
                      onChange={(e) => onChange(i, { name: e.target.value })}
                    />
                  ) : (
                    <span className="px-2.5 py-1.5 text-sm font-medium text-navy">{row.name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {registerKey ? (
                    <span className="inline-flex rounded-full bg-[#FCB038]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#000435]">
                      {REGISTER_LABELS[registerKey]}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Extra</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {editing ? (
                    <select
                      className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                      value={row.amountType ?? 'fixed'}
                      onChange={(e) => onChange(i, { amountType: e.target.value })}
                    >
                      {AMOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2.5 py-1.5 text-xs font-semibold text-slate-500">{formulaLabel}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {editing ? (
                    <input
                      type="number"
                      className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold text-navy transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                      value={row.amount}
                      onChange={(e) => onChange(i, { amount: Number(e.target.value) })}
                    />
                  ) : (
                    <span className="px-2.5 py-1.5 text-sm font-semibold text-navy">
                      {row.amountType === 'percent_basic' || row.amountType === 'percent_gross'
                        ? `${row.amount}%`
                        : formatRwf(row.amount)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs font-semibold text-muted">
                  {sampleBasic > 0 ? (
                    <span title={`At basic ${sampleBasic.toLocaleString()}`}>
                      {row.amountType === 'percent_basic' || row.amountType === 'percent_gross'
                        ? formatRwf(preview)
                        : formatRwf(row.amount)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {editing ? (
                    <select
                      className="rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                      value={row.channel ?? 'tax'}
                      onChange={(e) => onChange(i, { channel: e.target.value })}
                    >
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {row.channel ?? 'tax'}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {editing && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-300 transition-all hover:bg-red-50 hover:text-red-500"
                      onClick={() => onRemove(i)}
                      aria-label="Remove allowance"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-muted">
        Register rows (Others, H/A, T/A) map to payroll sheet columns. Use <strong>% of Gross</strong> for the default 10/10/10 school split.
      </p>
    </div>
  );
}

function LineItemsTable<T extends { name: string; amount: number; amountType?: string; channel?: string }>({
  rows,
  onChange,
  onRemove,
  emptyLabel,
}: {
  rows: T[];
  onChange: (index: number, patch: Partial<T>) => void;
  onRemove: (index: number) => void;
  emptyLabel: string;
}) {
  if (!rows.length) return <SalaryEmpty message={emptyLabel} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50/80 text-left text-[10px] font-bold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Channel</th>
            <th className="w-12 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="group border-t border-slate-100 transition-colors hover:bg-[#FCB038]/[0.03]">
              <td className="px-3 py-2.5">
                <input
                  className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-medium text-navy transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                  value={row.name}
                  onChange={(e) => onChange(i, { name: e.target.value } as Partial<T>)}
                />
              </td>
              <td className="px-3 py-2.5">
                <select
                  className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                  value={row.amountType ?? 'fixed'}
                  onChange={(e) => onChange(i, { amountType: e.target.value } as Partial<T>)}
                >
                  {AMOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold text-navy transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                  value={row.amount}
                  onChange={(e) => onChange(i, { amount: Number(e.target.value) } as Partial<T>)}
                />
              </td>
              <td className="px-3 py-2.5">
                <select
                  className="rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FCB038]/30"
                  value={row.channel ?? 'tax'}
                  onChange={(e) => onChange(i, { channel: e.target.value } as Partial<T>)}
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2.5 text-center">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
                  onClick={() => onRemove(i)}
                  aria-label="Remove row"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffSearchSelect({
  options,
  value,
  onChange,
}: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Building2 size={15} className="shrink-0 text-slate-400" />
          <span className={`truncate ${selected ? 'text-navy' : 'text-slate-400'}`}>
            {selected?.name || 'Search employee…'}
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_32px_-12px_rgba(0,4,53,0.25)]">
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee…"
              className="input h-9 pl-8 text-xs"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No matches.</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    value === opt.id ? 'bg-[#FCB038]/10 font-semibold text-navy' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.name}
                  {value === opt.id && <Check size={14} className="text-[#FCB038]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SalaryTemplateView() {
  const toast = useToast();
  const [tab, setTab] = useState('allowances');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState('Default Rwanda Template');
  const [allowances, setAllowances] = useState<AllowanceRow[]>(DEFAULT_REGISTER_ALLOWANCE_ROWS);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [statutory, setStatutory] = useState(DEFAULT_STATUTORY);
  const [payeRates, setPayeRates] = useState<PayeBracket[]>(DEFAULT_PAYE_BRACKETS);
  const [allowanceRules, setAllowanceRules] = useState(DEFAULT_ALLOWANCE_RULES);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [empDeductions, setEmpDeductions] = useState<EmployeeDeduction[]>([]);
  const [sampleBasic, setSampleBasic] = useState(500000);
  const [versionHistory, setVersionHistory] = useState<{ id: string; version: number; createdAt: string }[]>([]);

  const [dedModalOpen, setDedModalOpen] = useState(false);
  const [newDedStaffId, setNewDedStaffId] = useState('');
  const [newDedName, setNewDedName] = useState('');
  const [newDedAmount, setNewDedAmount] = useState('');

  const [lineItemModal, setLineItemModal] = useState<LineItemKind | null>(null);
  const [liName, setLiName] = useState('');
  const [liAmount, setLiAmount] = useState('');
  const [liAmountType, setLiAmountType] = useState('fixed');
  const [liChannel, setLiChannel] = useState('tax');
  const [editingAllowances, setEditingAllowances] = useState(false);
  const [allowancesSnapshot, setAllowancesSnapshot] = useState<AllowanceRow[]>([]);
  const [rulesSnapshot, setRulesSnapshot] = useState(DEFAULT_ALLOWANCE_RULES);

  const effectiveAllowances = useMemo(
    () => normalizeTemplateAllowances(allowances) as AllowanceRow[],
    [allowances]
  );

  function startEditAllowances() {
    setAllowancesSnapshot(allowances);
    setRulesSnapshot(allowanceRules);
    setEditingAllowances(true);
  }

  function cancelEditAllowances() {
    setAllowances(allowancesSnapshot);
    setAllowanceRules(rulesSnapshot);
    setEditingAllowances(false);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d, h] = await Promise.all([
        payrollApi.getTemplate(),
        payrollApi.listEmployeeDeductions(),
        payrollApi.templateHistory(),
      ]);
      const tpl = t.data.data as Record<string, unknown>;
      setIsActive(Boolean(tpl.isActive));
      setName(String(tpl.name ?? 'Default Rwanda Template'));
      setAllowances(normalizeTemplateAllowances((tpl.allowances as AllowanceRow[]) ?? []) as AllowanceRow[]);
      setDeductions((tpl.deductions as DeductionRow[]) ?? []);
      setStatutory({ ...DEFAULT_STATUTORY, ...(tpl.statutoryRates as object) });
      setPayeRates((tpl.payeRates as PayeBracket[]) ?? DEFAULT_PAYE_BRACKETS);
      setAllowanceRules({ ...DEFAULT_ALLOWANCE_RULES, ...(tpl.allowanceRules as object) });
      setEmpDeductions(d.data.data);
      setVersionHistory(h.data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load'), 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRegisterPreview = useCallback(async () => {
    try {
      const { data } = await payrollApi.previewTemplate(500);
      setPreviewRows(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load register preview'), 'Error');
    }
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; manual refresh via toolbar button
  }, []);

  useEffect(() => {
    if (tab === 'statutory') void loadRegisterPreview();
  }, [tab, loadRegisterPreview]);

  const payload = useMemo(
    () => ({
      name,
      statutoryRates: statutory,
      payeRates,
      allowanceRules,
      allowances: normalizeTemplateAllowances(allowances),
      deductions,
    }),
    [name, statutory, payeRates, allowanceRules, allowances, deductions]
  );

  async function persist(options?: { activate?: boolean; deactivate?: boolean }) {
    setSaving(true);
    try {
      if (options?.activate) {
        await toast.promise(
          (async () => {
            await payrollApi.saveTemplate(payload);
            await payrollApi.activateTemplate();
          })(),
          { loading: 'Activating template…', success: 'Template activated.', error: 'Activation failed.' }
        );
      } else if (options?.deactivate) {
        await toast.promise(payrollApi.deactivateTemplate(), {
          loading: 'Deactivating template…',
          success: 'Template deactivated.',
          error: 'Deactivation failed.',
        });
        setIsActive(false);
      } else {
        await toast.promise(payrollApi.saveTemplate(payload), {
          loading: 'Saving draft…',
          success: 'Draft saved.',
          error: 'Save failed.',
        });
      }
      if (options?.activate) setIsActive(true);
      setEditingAllowances(false);
    } catch (err) {
      if (!(err instanceof Error && ['Activation failed.', 'Deactivation failed.', 'Save failed.'].includes(err.message))) {
        toast.error(getApiErrorMessage(err, 'Save failed'), 'Error');
      }
    } finally {
      setSaving(false);
    }
  }

  const sampleCalc = useMemo(
    () =>
      calcRwandaPayroll({
        basicSalary: sampleBasic,
        autoAllowances: allowanceRules.enabled,
        allowanceRules,
        statutory,
        payeRates,
        templateAllowances: effectiveAllowances.map((a) => ({
          name: a.name,
          amount: a.amount,
          amountType: a.amountType,
          channel: a.channel,
          registerKey: a.registerKey ?? inferRegisterKey(a.name) ?? undefined,
        })),
        templateDeductions: deductions.map((d) => ({
          name: d.name,
          amount: d.amount,
          amountType: d.amountType,
          channel: d.channel,
        })),
      }),
    [sampleBasic, allowanceRules, statutory, payeRates, effectiveAllowances, deductions]
  );

  function openLineItemModal(kind: LineItemKind) {
    setLiName('');
    setLiAmount('');
    setLiAmountType('fixed');
    setLiChannel(kind === 'allowance' ? 'tax' : 'bank');
    setLineItemModal(kind);
  }

  function submitLineItem() {
    if (!liName.trim() || !liAmount) {
      toast.warning('Enter a name and amount.', 'Required');
      return;
    }
    const row: AllowanceRow = {
      name: liName.trim(),
      amount: Number(liAmount),
      amountType: liAmountType,
      channel: liChannel,
      registerKey: lineItemModal === 'allowance' ? inferRegisterKey(liName.trim()) ?? undefined : undefined,
    };
    if (lineItemModal === 'allowance') {
      setAllowances((prev) => [...prev, row]);
    } else if (lineItemModal === 'deduction') {
      setDeductions((prev) => [...prev, row]);
    }
    setLineItemModal(null);
  }

  async function addEmployeeDeduction() {
    if (!newDedStaffId || !newDedName || !newDedAmount) {
      toast.warning('Complete all fields.', 'Required');
      return;
    }
    try {
      await payrollApi.createEmployeeDeduction({
        staffId: newDedStaffId,
        name: newDedName,
        amount: Number(newDedAmount),
        channel: 'tax',
      });
      setNewDedName('');
      setNewDedAmount('');
      setNewDedStaffId('');
      setDedModalOpen(false);
      toast.success('Deduction added.', 'Added');
      const { data } = await payrollApi.listEmployeeDeductions();
      setEmpDeductions(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed'), 'Error');
    }
  }

  async function removeEmployeeDeduction(id: string) {
    if (!confirm('Remove this deduction?')) return;
    try {
      await payrollApi.deleteEmployeeDeduction(id);
      toast.success('Deduction removed.', 'Removed');
      setEmpDeductions((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'), 'Error');
    }
  }

  function exportPreviewCsv() {
    if (!previewRows.length) {
      toast.warning('No preview data to export.', 'Export');
      return;
    }
    const cols = Object.keys(previewRows[0]);
    const csv = [cols.join(','), ...previewRows.map((r) => cols.map((c) => r[c]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'payroll-register.csv';
    a.click();
    toast.success('Register preview exported.', 'Exported');
  }

  const staffOptions = useMemo(
    () => previewRows.map((r) => ({ id: String(r.staffId), name: String(r.employeeName) })),
    [previewRows]
  );

  return (
    <PayrollPageLayout
      title="Salary Template"
      subtitle="Organization-wide payroll rules"
      actions={
        <>
          <button
            type="button"
            className="btn-secondary !py-2.5 transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
            onClick={() => {
              void load();
              if (tab === 'statutory') void loadRegisterPreview();
            }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="btn-secondary !py-2.5 transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
            onClick={() => void persist()}
            disabled={saving}
          >
            <Save size={16} /> {saving ? '…' : 'Save'}
          </button>
          {isActive ? (
            <button
              type="button"
              className="btn-secondary !py-2.5 transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
              onClick={() => void persist({ deactivate: true })}
              disabled={saving}
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary !py-2.5 transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
              onClick={() => void persist({ activate: true })}
              disabled={saving}
            >
              <Zap size={16} /> Activate
            </button>
          )}
        </>
      }
      kpis={[
        { label: 'Status', value: isActive ? 'Active' : 'Draft' },
        { label: 'Allowances', value: allowances.length },
        { label: 'Deductions', value: deductions.length },
        { label: 'Staff', value: empDeductions.length },
      ]}
    >
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,4,53,0.04),0_8px_20px_-8px_rgba(0,4,53,0.10)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/[0.06] text-navy">
          <Layers size={17} />
        </span>
        <input
          className="input max-w-sm flex-1 !border-0 !bg-transparent !py-1 !text-base !font-bold !shadow-none focus:!ring-0"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
        />
        <span className={`badge ${isActive ? 'bg-[#FCB038]/15 text-[#000435]' : 'bg-slate-100 text-slate-600'}`}>
          {isActive ? 'Active' : 'Draft'}
        </span>
      </div>

      <PayrollTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'allowances' && (
        <div className="space-y-4">
          <div className={editingAllowances ? '' : 'pointer-events-none opacity-80'}>
            <SalarySwitch
              checked={allowanceRules.enabled}
              onChange={(enabled) => setAllowanceRules((r) => ({ ...r, enabled }))}
              label="Apply register formulas when staff has no manual O/H/T values"
            />
          </div>

          <SalaryPanel
            title="Allowances"
            action={
              <div className="flex gap-2">
                {!editingAllowances ? (
                  <button type="button" className="btn-secondary !py-2 !text-xs" onClick={startEditAllowances}>
                    <Pencil size={14} /> Edit
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn-secondary !py-2 !text-xs" onClick={cancelEditAllowances}>
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !py-2 !text-xs"
                      onClick={() => setAllowances(normalizeTemplateAllowances(allowances) as AllowanceRow[])}
                    >
                      Restore defaults
                    </button>
                    <button
                      type="button"
                      className="btn-primary !py-2 !text-xs"
                      onClick={() => openLineItemModal('allowance')}
                    >
                      <Plus size={14} /> Add Allowance
                    </button>
                  </>
                )}
              </div>
            }
          >
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <SalaryField label="Preview basic (RWF)">
                <input
                  type="number"
                  className="input max-w-[200px]"
                  value={sampleBasic}
                  onChange={(e) => setSampleBasic(Number(e.target.value))}
                />
              </SalaryField>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SalaryMiniStat label="Gross" value={formatRwf(sampleCalc.gross).replace(' RWF', '')} />
                <SalaryMiniStat label="Others" value={formatRwf(sampleCalc.others).replace(' RWF', '')} />
                <SalaryMiniStat label="H/A" value={formatRwf(sampleCalc.housing).replace(' RWF', '')} />
                <SalaryMiniStat label="T/A" value={formatRwf(sampleCalc.transport).replace(' RWF', '')} accent />
              </div>
            </div>
            <AllowancesTable
              rows={effectiveAllowances}
              sampleBasic={sampleBasic}
              editing={editingAllowances}
              onChange={(i, patch) => {
                const next = [...allowances];
                const merged = { ...effectiveAllowances[i], ...patch };
                merged.registerKey = inferRegisterKey(merged.name, merged.registerKey) ?? undefined;
                const key = inferRegisterKey(merged.name, merged.registerKey);
                const idx = key
                  ? next.findIndex((r) => inferRegisterKey(r.name, r.registerKey) === key)
                  : next.findIndex((r) => r.name === effectiveAllowances[i].name);
                if (idx >= 0) next[idx] = merged;
                else next.push(merged);
                setAllowances(next);
              }}
              onRemove={(i) => {
                const key = inferRegisterKey(effectiveAllowances[i].name, effectiveAllowances[i].registerKey);
                setAllowances(
                  allowances.filter((r) =>
                    key ? inferRegisterKey(r.name, r.registerKey) !== key : r.name !== effectiveAllowances[i].name
                  )
                );
              }}
            />
            {!editingAllowances && (
              <p className="mt-3 text-xs text-muted">Click <strong>Edit</strong> to change formulas or add allowances. Click <strong>Save</strong> at the top after editing.</p>
            )}
          </SalaryPanel>
        </div>
      )}

      {tab === 'deductions' && (
        <SalaryPanel
          title="Template Deductions"
          action={
            <button
              type="button"
              className="btn-secondary !py-2 !text-xs transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
              onClick={() => openLineItemModal('deduction')}
            >
              <Plus size={14} /> Add
            </button>
          }
        >
          <LineItemsTable
            rows={deductions}
            emptyLabel="No template deductions"
            onChange={(i, patch) => {
              const next = [...deductions];
              next[i] = { ...next[i], ...patch };
              setDeductions(next);
            }}
            onRemove={(i) => setDeductions(deductions.filter((_, j) => j !== i))}
          />
        </SalaryPanel>
      )}

      {tab === 'statutory' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SalaryPanel title="Statutory Rates (%)">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(statutory).map(([k, v]) => (
                  <SalaryField key={k} label={STATUTORY_LABELS[k] ?? k}>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={v}
                      onChange={(e) => setStatutory((s) => ({ ...s, [k]: Number(e.target.value) }))}
                    />
                  </SalaryField>
                ))}
              </div>
            </SalaryPanel>

            <SalaryPanel title="PAYE Brackets">
              <div className="space-y-2">
                {payeRates.map((band, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy/[0.08] text-[10px] font-bold text-navy">
                      {i + 1}
                    </span>
                    <input
                      type="number"
                      className="input !py-2 w-28"
                      placeholder="Up to"
                      value={band.upTo ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPayeRates((rates) => rates.map((b, j) => (j === i ? { ...b, upTo: v === '' ? null : Number(v) } : b)));
                      }}
                    />
                    <span className="text-xs text-slate-300">@</span>
                    <input
                      type="number"
                      step="0.01"
                      className="input !py-2 w-20"
                      value={band.rate}
                      onChange={(e) => setPayeRates((rates) => rates.map((b, j) => (j === i ? { ...b, rate: Number(e.target.value) } : b)))}
                    />
                    <button
                      type="button"
                      className="ml-auto rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      onClick={() => setPayeRates((rates) => rates.filter((_, j) => j !== i))}
                      aria-label="Remove bracket"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary !py-2 !text-xs transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
                  onClick={() => setPayeRates((rates) => [...rates, { upTo: null, rate: 0.3 }])}
                >
                  <Plus size={14} /> Bracket
                </button>
              </div>
            </SalaryPanel>
          </div>

          <SalaryPanel title="Live Preview">
            <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
              <SalaryField label="Sample Basic">
                <input
                  type="number"
                  className="input"
                  value={sampleBasic}
                  onChange={(e) => setSampleBasic(Number(e.target.value))}
                />
              </SalaryField>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <SalaryMiniStat label="Gross" value={formatRwf(sampleCalc.gross).replace(' RWF', '')} />
                <SalaryMiniStat label="PAYE" value={formatRwf(sampleCalc.paye).replace(' RWF', '')} />
                <SalaryMiniStat label="CSR" value={formatRwf(sampleCalc.rssbEmployee).replace(' RWF', '')} />
                <SalaryMiniStat label="RAMA" value={formatRwf(sampleCalc.ramaEmployee).replace(' RWF', '')} />
                <SalaryMiniStat label="Income" value={formatRwf(sampleCalc.incomeSalary).replace(' RWF', '')} />
                <SalaryMiniStat label="Payable" value={formatRwf(sampleCalc.finalPayable).replace(' RWF', '')} accent />
              </div>
            </div>
          </SalaryPanel>

          <SalaryPanel
            title="Register Preview"
            action={
              <button
                type="button"
                className="btn-secondary !py-2 !text-xs"
                onClick={exportPreviewCsv}
                disabled={!previewRows.length}
              >
                <Download size={14} /> CSV
              </button>
            }
          >
            <PayrollRegisterTable rows={previewRows} />
          </SalaryPanel>

          {versionHistory.length > 0 && (
            <SalaryPanel title="Version History">
              <ul className="space-y-2">
                {versionHistory.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-2.5 text-sm transition-colors hover:bg-[#FCB038]/[0.06]"
                  >
                    <span className="flex items-center gap-2.5 font-semibold text-navy">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy/[0.08] text-navy">
                        <History size={12} />
                      </span>
                      v{v.version}
                    </span>
                    <span className="text-xs font-medium text-muted">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </SalaryPanel>
          )}
        </div>
      )}

      {tab === 'employee-deductions' && (
        <SalaryPanel
          title="Per-Staff Deductions"
          action={
            <button
              type="button"
              className="btn-primary !py-2 !text-xs transition-transform duration-150 motion-safe:hover:-translate-y-0.5"
              onClick={() => setDedModalOpen(true)}
            >
              <Plus size={14} /> Add
            </button>
          }
        >
          {empDeductions.length === 0 ? (
            <SalaryEmpty message="No staff deductions" />
          ) : (
            <div className="space-y-2">
              {empDeductions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3.5 transition-colors hover:border-[#FCB038]/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/[0.06] text-xs font-bold text-navy">
                      {d.staffName
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-navy">{d.staffName}</p>
                      <p className="text-xs text-muted">{d.name} · {d.employeeNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-navy">{formatRwf(d.amount)}</span>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      onClick={() => void removeEmployeeDeduction(d.id)}
                      aria-label="Remove deduction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SalaryPanel>
      )}

      {/* Add Allowance / Deduction modal */}
      <SalaryModal
        open={lineItemModal !== null}
        title={lineItemModal === 'allowance' ? 'Add Allowance' : 'Add Deduction'}
        onClose={() => setLineItemModal(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setLineItemModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submitLineItem}>
              <Plus size={14} /> {lineItemModal === 'allowance' ? 'Add Allowance' : 'Add Deduction'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <SalaryField label="Name">
            <input
              className="input"
              value={liName}
              onChange={(e) => setLiName(e.target.value)}
              placeholder={lineItemModal === 'allowance' ? 'e.g. Transport Allowance' : 'e.g. Staff Loan'}
              autoFocus
            />
          </SalaryField>
          <SalaryField label="Amount Type">
            <select className="input" value={liAmountType} onChange={(e) => setLiAmountType(e.target.value)}>
              {AMOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </SalaryField>
          <SalaryField label={liAmountType === 'fixed' ? 'Amount (RWF)' : 'Percentage'}>
            <div className="relative">
              <Banknote size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                className="input pl-10"
                value={liAmount}
                onChange={(e) => setLiAmount(e.target.value)}
              />
            </div>
          </SalaryField>
          <SalaryField label="Channel">
            <select className="input cursor-pointer appearance-none" value={liChannel} onChange={(e) => setLiChannel(e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </SalaryField>
        </div>
      </SalaryModal>

      {/* Add Staff Deduction modal */}
      <SalaryModal
        open={dedModalOpen}
        title="Add Staff Deduction"
        onClose={() => setDedModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDedModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void addEmployeeDeduction()}>
              <Plus size={14} /> Add Deduction
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <SalaryField label="Staff">
            <StaffSearchSelect options={staffOptions} value={newDedStaffId} onChange={setNewDedStaffId} />
          </SalaryField>
          <SalaryField label="Name">
            <input
              className="input"
              value={newDedName}
              onChange={(e) => setNewDedName(e.target.value)}
              placeholder="e.g. Loan repayment"
            />
          </SalaryField>
          <SalaryField label="Monthly Amount">
            <div className="relative">
              <Banknote size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                className="input pl-10"
                value={newDedAmount}
                onChange={(e) => setNewDedAmount(e.target.value)}
              />
            </div>
          </SalaryField>
        </div>
      </SalaryModal>
    </PayrollPageLayout>
  );
}