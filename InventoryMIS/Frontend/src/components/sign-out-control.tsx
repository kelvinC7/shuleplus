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
        className={`group flex w-full items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-left transition hover:border-red-500/40 hover:bg-red-500 hover:text-white ${className}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-500 transition group-hover:bg-white/20 group-hover:text-white">
          <LogOut size={18} />
        </span>
        <span>
          <span className="block text-sm font-semibold text-[#000435] group-hover:text-white">Sign out</span>
          <span className="block text-[11px] text-red-500/80 group-hover:text-white/80">End your session securely</span>
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
        className={`flex w-full items-center gap-2.5 border-t border-slate-200 px-4 py-3 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50 ${className}`}
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
      className={`hidden h-10 items-center gap-2 rounded-full border border-red-500/25 bg-white px-4 text-sm font-semibold text-red-500 shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white sm:inline-flex ${className}`}
      title="Sign out"
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
