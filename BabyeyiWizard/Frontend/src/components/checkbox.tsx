'use client';

import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  'aria-label'?: string;
}

/** Modern rounded checkbox used across circular list tables/cards. */
export function Checkbox({ checked, onChange, ...rest }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 transition-all duration-150 ${
        checked
          ? 'border-navy bg-navy text-primary'
          : 'border-slate-300 bg-white text-transparent hover:border-navy/40'
      }`}
      {...rest}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}
