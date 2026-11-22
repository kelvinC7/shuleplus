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
        className={`group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-white/10 ${className}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-primary transition group-hover:bg-primary/20">
          <LogOut size={18} />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">Sign out</span>
          <span className="block text-[11px] text-white/60 group-hover:text-white/80">End your session securely</span>
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
        className={`flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/5 ${className}`}
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
      className={`hidden h-10 items-center gap-2 rounded-full border border-danger/25 bg-white px-4 text-sm font-semibold text-danger shadow-sm transition hover:border-danger hover:bg-danger hover:text-white sm:inline-flex ${className}`}
      title="Sign out"
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
