'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FieldLabel, StepSection, inputClass } from './wizard-ui';
import type { FeeLineItem, FeePolicyFormData } from './wizard-types';

interface Props {
  data: FeePolicyFormData;
  onChange: (patch: Partial<FeePolicyFormData>) => void;
}

function newItem(): FeeLineItem {
  return {
    id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    amount: 0,
    category: 'Tuition',
    mandatory: true,
  };
}

export function StepFeeStructure({ data, onChange }: Props) {
  function updateItem(id: string, patch: Partial<FeeLineItem>) {
    onChange({
      feeItems: data.feeItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function addItem() {
    onChange({ feeItems: [...data.feeItems, newItem()] });
  }

  function removeItem(id: string) {
    onChange({ feeItems: data.feeItems.filter((item) => item.id !== id) });
  }

  const total = data.feeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <StepSection
      title="Fee structure"
      description="Editable line items. Transparent cells until hovered or focused."
      action={
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-navy"
        >
          <Plus size={14} strokeWidth={2.5} /> Add line
        </button>
      }
    >
      <div className="overflow-hidden rounded-xl border border-navy/10">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-navy/[0.02]">
            <tr className="text-[11.5px] font-semibold uppercase tracking-wide text-navy/45">
              <th className="px-3 py-2.5">Fee name</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Amount (RWF)</th>
              <th className="px-3 py-2.5">Mandatory</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {data.feeItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-navy/40">
                  No fee lines yet. Add the first item.
                </td>
              </tr>
            ) : (
              data.feeItems.map((item) => (
                <tr key={item.id} className="border-t border-navy/5">
                  <td className="px-2 py-1.5">
                    <input
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 outline-none hover:border-navy/10 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="Fee name"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 outline-none hover:border-navy/10 focus:border-primary/60"
                      value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })}
                    >
                      {['Tuition', 'Boarding', 'Materials', 'Other'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 outline-none hover:border-navy/10 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      value={item.amount || ''}
                      onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={item.mandatory}
                      onChange={(e) => updateItem(item.id, { mandatory: e.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1.5 text-navy/35 hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label>
          <FieldLabel>Currency</FieldLabel>
          <input className={inputClass} value={data.currency} onChange={(e) => onChange({ currency: e.target.value })} />
        </label>
        <label>
          <FieldLabel>Max total fees (optional)</FieldLabel>
          <input
            type="number"
            className={inputClass}
            value={data.maxTotalFees ?? ''}
            onChange={(e) => onChange({ maxTotalFees: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <div className="rounded-xl border border-navy/10 bg-navy/[0.02] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/45">Running total</p>
          <p className="mt-1 text-[22px] font-bold text-navy">{total.toLocaleString()} {data.currency}</p>
        </div>
      </div>
    </StepSection>
  );
}
