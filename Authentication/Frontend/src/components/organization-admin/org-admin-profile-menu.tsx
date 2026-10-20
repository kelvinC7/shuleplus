'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { AuthUser } from '@/lib/auth';

interface OrgAdminProfileMenuProps {
  user: AuthUser | null;
  fullName: string;
  initials: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function OrgAdminProfileMenu({
  user,
  fullName,
  initials,
  open,
  onToggle,
  onClose,
}: OrgAdminProfileMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2.5 rounded-2xl border border-border bg-white py-1.5 pl-1.5 pr-2.5 transition hover:border-primary/30 hover:shadow-md sm:pr-3"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#000435] to-[#0a0f52] text-sm font-bold text-[#FCB038]">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[130px] truncate text-sm font-semibold leading-tight text-navy">
            {fullName}
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
            Org Admin
          </span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`hidden text-navy/40 transition sm:block ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,280px)] overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_20px_50px_-20px_rgba(0,4,53,0.35)]"
          role="menu"
        >
          <div className="border-b border-border bg-gradient-to-br from-[#f8fafc] to-white px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#000435] to-[#0a0f52] text-sm font-bold text-[#FCB038]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{fullName}</p>
                <p className="truncate text-xs text-muted">{user?.email ?? '—'}</p>
                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-primary">
                  {user?.organization?.name ?? 'Organization'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/change-password"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy transition hover:bg-[#f8fafc]"
              role="menuitem"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/5 text-navy/60">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              Change password
            </Link>
            <Link
              href="/organization-admin"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy transition hover:bg-[#f8fafc]"
              role="menuitem"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/5 text-navy/60">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" />
                </svg>
              </span>
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
