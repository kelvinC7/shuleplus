'use client';

import type { SchoolBudget } from '@/types';

interface BudgetSelectorProps {
  budgets: SchoolBudget[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function BudgetSelector({ budgets, value, onChange, className = '' }: BudgetSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-navy outline-none focus:border-primary/50 ${className}`}
      aria-label="Select budget"
    >
      <option value="">Active budget</option>
      {budgets.map((b) => (
        <option key={b.id} value={b.id}>
          {b.budgetCode} — {b.title} ({b.status.replace(/_/g, ' ')})
        </option>
      ))}
    </select>
  );
}
