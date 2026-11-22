import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

type Variant = 'primary' | 'amber' | 'outline' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-muted',
  amber: 'bg-amber text-navy hover:brightness-105',
  outline: 'border border-line bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
