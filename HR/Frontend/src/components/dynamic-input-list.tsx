'use client';

import { Plus, X } from 'lucide-react';

interface DynamicInputListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}

export function DynamicInputList({
  items,
  onChange,
  placeholder = 'Enter item…',
  addLabel = 'Add another',
}: DynamicInputListProps) {
  const rows = items.length ? items : [''];

  function updateAt(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    onChange(next);
  }

  function removeAt(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length ? next : ['']);
  }

  function addRow() {
    onChange([...rows, '']);
  }

  return (
    <div className="space-y-2.5">
      {rows.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000435]/[0.06] text-[11px] font-bold text-[#000435]">
            {index + 1}
          </span>
          <input
            className="input flex-1"
            value={item}
            onChange={(e) => updateAt(index, e.target.value)}
            placeholder={placeholder}
          />
          {rows.length > 1 ? (
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              aria-label="Remove item"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#FCB038]/50 bg-[#FCB038]/5 px-3.5 py-2 text-xs font-bold text-[#946207] transition hover:bg-[#FCB038]/10"
      >
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}

export function ListPreview({ items, emptyLabel = 'None' }: { items: string[]; emptyLabel?: string }) {
  const cleaned = items.map((i) => i.trim()).filter(Boolean);
  if (!cleaned.length) {
    return <span className="text-sm font-semibold text-slate-400">{emptyLabel}</span>;
  }
  return (
    <ul className="space-y-1.5">
      {cleaned.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-semibold text-[#000435]"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FCB038]/20 text-[10px] font-bold text-[#946207]">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}
