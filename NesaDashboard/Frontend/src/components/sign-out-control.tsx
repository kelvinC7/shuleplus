'use client';

import { LogOut } from 'lucide-react';

interface SignOutControlProps {
  onLogout: () => void;
  variant?: 'header' | 'sidebar' | 'menu';
  className?: string;
}

export function SignOutControl({ onLogout, variant = 'header', className = '' }: SignOutControlProps) {
  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={onLogout}
        className={`group flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-left text-white transition hover:bg-white/[0.1] ${className}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80 transition group-hover:bg-primary/20 group-hover:text-primary">
          <LogOut size={18} />
        </span>
        <span>
          <span className="block text-sm font-semibold">Sign out</span>
          <span className="block text-[11px] text-white/50 group-hover:text-white/70">
            End your session securely
          </span>
        </span>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={onLogout}
        className={`flex w-full items-center gap-2.5 border-t border-navy/10 px-4 py-3 text-left text-sm font-semibold text-navy/70 transition hover:bg-navy/[0.03] hover:text-navy ${className}`}
      >
        <LogOut size={16} />
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className={`hidden h-10 items-center gap-2 rounded-full border border-navy/10 bg-white px-4 text-sm font-semibold text-navy/70 transition hover:border-navy/20 hover:text-navy sm:inline-flex ${className}`}
      title="Sign out"
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
