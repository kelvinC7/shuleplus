import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

type Variant = 'primary' | 'amber' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'bg-navy text-white shadow-sm shadow-navy/25 hover:bg-navy-muted active:bg-navy',
  amber:
    'bg-amber text-navy shadow-sm shadow-amber/40 hover:bg-[#ffbd4a] active:brightness-95',
  outline:
    'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200/70',
  danger:
    'border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 active:bg-red-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3 text-xs',
  md: 'h-11 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
  icon: 'h-10 w-10 p-0',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
