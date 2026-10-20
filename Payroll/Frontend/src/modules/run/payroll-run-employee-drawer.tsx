'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  History,
  Plus,
  Shield,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { AvatarInitials } from '@/components/payroll-data-table';
import { formatRwf } from '@/config/payroll-nav';
import { payrollApi } from '@/services/payroll-api';
import type { EmployeeAdjustment, LineItemAdjust } from '@/types/run-overrides';
import type { EnrichedRegisterRow } from './payroll-run-types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'salary', label: 'Salary' },
  { id: 'allowances', label: 'Allowances' },
  { id: 'deductions', label: 'Deductions' },
  { id: 'tax', label: 'Tax' },
  { id: 'rssb', label: 'RSSB' },
  { id: 'documents', label: 'Documents' },
  { id: 'history', label: 'History' },
  { id: 'audit', label: 'Audit Logs' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props {
  open: boolean;
  row: EnrichedRegisterRow | null;
  adjustment: EmployeeAdjustment;
  onClose: () => void;
  onSave: (staffId: string, adj: EmployeeAdjustment) => void;
}

export function PayrollRunEmployeeDrawer({ open, row, adjustment, onClose, onSave }: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const [adj, setAdj] = useState<EmployeeAdjustment>(adjustment);
  const [advance, setAdvance] = useState<{ hasActiveAdvance: boolean; monthlyDeduction: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdj(adjustment);
    setTab('overview');
  }, [open, adjustment]);

  useEffect(() => {
    if (!open || !row?.staffId) return;
    payrollApi.advanceCheck(row.staffId).then(({ data }) => setAdvance(data.data)).catch(() => setAdvance(null));
  }, [open, row?.staffId]);

  if (!open || !row) return null;

  function setField<K extends keyof EmployeeAdjustment>(key: K, value: EmployeeAdjustment[K]) {
    setAdj((a) => ({ ...a, [key]: value }));
  }

  function updateLineItem(list: 'extraAllowances' | 'extraDeductions', idx: number, patch: Partial<LineItemAdjust>) {
    const items = [...(adj[list] ?? [])];
    items[idx] = { ...items[idx], ...patch };
    setField(list, items);
  }

  function addLineItem(list: 'extraAllowances' | 'extraDeductions') {
    setField(list, [...(adj[list] ?? []), { name: list === 'extraAllowances' ? 'Bonus' : 'Deduction', amount: 0 }]);
  }

  function removeLineItem(list: 'extraAllowances' | 'extraDeductions', idx: number) {
    setField(list, (adj[list] ?? []).filter((_, i) => i !== idx));
  }

  const totalAllowances = row.housing + row.transport + row.others + row.meal;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end bg-[#000435]/25 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-[min(100%,520px)] flex-col border-l border-slate-200 bg-white shadow-[-16px_0_48px_-12px_rgba(0,4,53,0.18)]">
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-[#000435]/[0.04] via-white to-[#FCB038]/[0.08] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AvatarInitials name={row.employeeName} seed={row.staffId} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FCB038]">Payroll Employee</p>
                <h2 className="text-lg font-bold text-[#000435]">{row.employeeName}</h2>
                <p className="font-mono text-xs text-muted">{row.employeeNumber}</p>
                <p className="mt-1 text-sm text-navy">
                  {row.position || '—'} · {row.department || '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                    {row.status.replace('_', ' ')}
                  </span>
                  <span className="rounded-full bg-[#FCB038]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#000435]">
                    Net {formatRwf(row.netSalary)}
                  </span>
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="shrink-0 overflow-x-auto border-b border-slate-100 px-3 py-2">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-[12px] px-3 py-1.5 text-[11px] font-semibold ${
                  tab === t.id ? 'bg-[#000435] text-white' : 'text-muted hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
          {tab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Gross', row.gross],
                  ['Allowances', totalAllowances],
                  ['Deductions', row.gross - row.netSalary],
                  ['Net Pay', row.netSalary],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
                    <p className={`mt-1 text-lg font-bold ${label === 'Net Pay' ? 'text-[#FCB038]' : 'text-navy'}`}>
                      {formatRwf(Number(val))}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-[18px] border border-slate-100 bg-white p-4 text-sm shadow-sm">
                <p className="font-semibold text-navy">Bank Details</p>
                <p className="mt-2 text-muted">{row.bankName || 'No bank'} · {row.bankAccount || '—'}</p>
              </div>
            </div>
          )}

          {tab === 'salary' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-[14px] border border-slate-100 bg-white px-4 py-3 text-sm">
                <input type="checkbox" checked={!!adj.excluded} onChange={(e) => setField('excluded', e.target.checked)} />
                Exclude from this payroll run
              </label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['basicSalaryOverride', 'Basic override'],
                  ['transportOverride', 'Transport'],
                  ['housingOverride', 'Housing'],
                  ['othersOverride', 'Others'],
                  ['mealOverride', 'Meal'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="rounded-[18px] border border-slate-100 bg-white p-3 shadow-sm">
                    <label className="text-[10px] font-bold uppercase text-muted">{label}</label>
                    <input
                      type="number"
                      className="input mt-1 !rounded-[12px] !py-2"
                      placeholder="Leave blank"
                      value={adj[key] ?? ''}
                      onChange={(e) => setField(key, e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'allowances' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Basic', row.basicSalary],
                ['H/A', row.housing],
                ['T/A', row.transport],
                ['Others', row.others],
                ['Meal', row.meal],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
                  <p className="mt-1 font-bold text-navy">{formatRwf(Number(val))}</p>
                </div>
              ))}
              <div className="col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy">Run allowances</p>
                  <button type="button" className="text-xs text-[#FCB038]" onClick={() => addLineItem('extraAllowances')}>
                    <Plus size={14} className="inline" /> Add
                  </button>
                </div>
                {(adj.extraAllowances ?? []).map((item, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <input className="input flex-1 !rounded-[12px]" value={item.name} onChange={(e) => updateLineItem('extraAllowances', i, { name: e.target.value })} />
                    <input type="number" className="input w-28 !rounded-[12px]" value={item.amount} onChange={(e) => updateLineItem('extraAllowances', i, { amount: Number(e.target.value) })} />
                    <button type="button" onClick={() => removeLineItem('extraAllowances', i)}><Trash2 size={16} className="text-red-500" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'deductions' && (
            <div className="space-y-3">
              {advance?.hasActiveAdvance && (
                <div className="rounded-[14px] bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Shule Avance: {formatRwf(advance.monthlyDeduction)} / month
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-slate-100 bg-white p-4"><p className="text-[10px] font-bold uppercase text-muted">PAYE</p><p className="mt-1 font-bold text-red-600">{formatRwf(row.paye)}</p></div>
                <div className="rounded-[18px] border border-slate-100 bg-white p-4"><p className="text-[10px] font-bold uppercase text-muted">Other</p><p className="mt-1 font-bold text-navy">{formatRwf(row.employeeDeductionTotal)}</p></div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy">Run deductions</p>
                  <button type="button" className="text-xs text-[#FCB038]" onClick={() => addLineItem('extraDeductions')}>
                    <Plus size={14} className="inline" /> Add
                  </button>
                </div>
                {(adj.extraDeductions ?? []).map((item, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <input className="input flex-1 !rounded-[12px]" value={item.name} onChange={(e) => updateLineItem('extraDeductions', i, { name: e.target.value })} />
                    <input type="number" className="input w-28 !rounded-[12px]" value={item.amount} onChange={(e) => updateLineItem('extraDeductions', i, { amount: Number(e.target.value) })} />
                    <button type="button" onClick={() => removeLineItem('extraDeductions', i)}><Trash2 size={16} className="text-red-500" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'tax' && (
            <div className="divide-y divide-slate-100 rounded-[18px] border border-slate-100 bg-white text-sm shadow-sm">
              {[
                ['Taxable Base', row.base],
                ['PAYE', row.paye],
                ['Mutuelle (CBHI)', row.cbhi],
                ['Net Salary', row.netSalary],
                ['Net Payable', row.finalPayable],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between px-4 py-3">
                  <span className="text-muted">{label}</span>
                  <span className="font-bold text-navy">{formatRwf(Number(val))}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'rssb' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['CSR Employee', row.rssbEmployee],
                ['CSR Employer', row.rssbEmployer],
                ['CSR 2%', row.occupationalHazardEmployer],
                ['Maternity Emp', row.maternityEmployee],
                ['Maternity Er', row.maternityEmployer],
                ['RAMA Emp', row.ramaEmployee],
                ['RAMA Er', row.ramaEmployer],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
                  <p className="mt-1 font-bold text-navy">{formatRwf(Number(val))}</p>
                </div>
              ))}
            </div>
          )}

          {(tab === 'documents' || tab === 'audit') && (
            <div className="flex flex-col items-center rounded-[18px] border border-dashed border-slate-200 bg-white py-16 text-center">
              {tab === 'documents' ? <FileText size={36} className="text-slate-300" /> : <Shield size={36} className="text-slate-300" />}
              <p className="mt-3 font-semibold text-navy">No {tab === 'documents' ? 'documents' : 'audit logs'} yet</p>
            </div>
          )}

          {tab === 'history' && (
            <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted">
                <History size={14} /> Current preview values
              </div>
              <p className="mt-2 text-sm text-navy">Gross {formatRwf(row.gross)} → Net {formatRwf(row.netSalary)}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white p-4">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-[12px] bg-slate-50 py-2"><p className="text-muted">Gross</p><p className="font-bold text-navy">{formatRwf(row.gross)}</p></div>
            <div className="rounded-[12px] bg-slate-50 py-2"><p className="text-muted">Tax</p><p className="font-bold text-red-600">{formatRwf(row.paye)}</p></div>
            <div className="rounded-[12px] bg-[#FCB038]/10 py-2"><p className="text-muted">Net</p><p className="font-bold text-[#000435]">{formatRwf(row.netSalary)}</p></div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 !rounded-[14px]" onClick={onClose}>Close</button>
            <button
              type="button"
              className="btn-primary flex-1 !rounded-[14px]"
              onClick={() => { onSave(row.staffId, adj); onClose(); }}
            >
              <SlidersHorizontal size={16} /> Apply Adjustments
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
