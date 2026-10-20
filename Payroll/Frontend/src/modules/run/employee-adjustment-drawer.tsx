'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { EmployeeAdjustment, LineItemAdjust } from '@/types/run-overrides';
import { payrollApi } from '@/services/payroll-api';
import { formatRwf } from '@/config/payroll-nav';

interface Props {
  open: boolean;
  staffId: string | null;
  staffName?: string;
  adjustment: EmployeeAdjustment;
  onClose: () => void;
  onSave: (staffId: string, adj: EmployeeAdjustment) => void;
}

export function EmployeeAdjustmentDrawer({ open, staffId, staffName, adjustment, onClose, onSave }: Props) {
  const [adj, setAdj] = useState<EmployeeAdjustment>(adjustment);
  const [advance, setAdvance] = useState<{ hasActiveAdvance: boolean; monthlyDeduction: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdj(adjustment);
  }, [open, adjustment]);

  useEffect(() => {
    if (!open || !staffId) return;
    payrollApi.advanceCheck(staffId).then(({ data }) => setAdvance(data.data)).catch(() => setAdvance(null));
  }, [open, staffId]);

  if (!open || !staffId) return null;

  function setField<K extends keyof EmployeeAdjustment>(key: K, value: EmployeeAdjustment[K]) {
    setAdj((a) => ({ ...a, [key]: value }));
  }

  function updateLineItem(
    list: 'extraAllowances' | 'extraDeductions',
    idx: number,
    patch: Partial<LineItemAdjust>
  ) {
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end bg-navy/30 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-amber" />
            <div>
              <h2 className="font-semibold text-navy">Employee Adjustment</h2>
              <p className="text-xs text-muted">{staffName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!adj.excluded}
              onChange={(e) => setField('excluded', e.target.checked)}
            />
            Exclude from this run
          </label>

          {advance?.hasActiveAdvance && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Shule Avance: {formatRwf(advance.monthlyDeduction)} monthly repayment scheduled
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {([
              ['basicSalaryOverride', 'Basic override'],
              ['transportOverride', 'Transport'],
              ['housingOverride', 'Housing'],
              ['othersOverride', 'Others'],
              ['mealOverride', 'Meal'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] font-semibold uppercase text-muted">{label}</label>
                <input
                  type="number"
                  className="input mt-1"
                  placeholder="Leave blank"
                  value={adj[key] ?? ''}
                  onChange={(e) => setField(key, e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Extra allowances (this run)</h3>
              <button type="button" className="text-xs text-amber" onClick={() => addLineItem('extraAllowances')}>
                <Plus size={14} className="inline" /> Add
              </button>
            </div>
            {(adj.extraAllowances ?? []).map((item, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input className="input flex-1" value={item.name} onChange={(e) => updateLineItem('extraAllowances', i, { name: e.target.value })} />
                <input type="number" className="input w-28" value={item.amount} onChange={(e) => updateLineItem('extraAllowances', i, { amount: Number(e.target.value) })} />
                <button type="button" onClick={() => removeLineItem('extraAllowances', i)}><Trash2 size={16} className="text-red-500" /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Extra deductions (this run)</h3>
              <button type="button" className="text-xs text-amber" onClick={() => addLineItem('extraDeductions')}>
                <Plus size={14} className="inline" /> Add
              </button>
            </div>
            {(adj.extraDeductions ?? []).map((item, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input className="input flex-1" value={item.name} onChange={(e) => updateLineItem('extraDeductions', i, { name: e.target.value })} />
                <input type="number" className="input w-28" value={item.amount} onChange={(e) => updateLineItem('extraDeductions', i, { amount: Number(e.target.value) })} />
                <button type="button" onClick={() => removeLineItem('extraDeductions', i)}><Trash2 size={16} className="text-red-500" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => { onSave(staffId, adj); onClose(); }}>Apply</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
