'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ApDrawerProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}

export function ApDrawer({
  open,
  title,
  eyebrow,
  onClose,
  children,
  widthClass = 'max-w-lg',
}: ApDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-[#000435]/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={`relative flex h-full w-full ${widthClass} flex-col bg-white shadow-[-24px_0_64px_-16px_rgba(0,4,53,0.35)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-navy px-5 py-4 text-white">
          <div>
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 text-lg font-bold leading-tight">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </aside>
    </div>
  );
}
