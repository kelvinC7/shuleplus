'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { AuthUser } from '@/lib/auth';

interface MenuLink {
  href: string;
  label: string;
  icon: 'home' | 'lock' | 'user' | 'settings';
}

function MenuIcon({ type }: { type: MenuLink['icon'] }) {
  if (type === 'lock') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (type === 'user') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (type === 'settings') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}

interface PlatformProfileMenuProps {
  user: AuthUser | null;
  fullName: string;
  initials: string;
  roleLabel: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  links: MenuLink[];
}

export function PlatformProfileMenu({
  user,
  fullName,
  initials,
  roleLabel,
  subtitle,
  open,
  onToggle,
  onClose,
  links,
}: PlatformProfileMenuProps) {
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
            {roleLabel}
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
                {subtitle ? (
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-primary">
                    {subtitle}
                  </p>
                ) : (
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-muted">
                    {roleLabel}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy transition hover:bg-[#f8fafc]"
                role="menuitem"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/5 text-navy/60">
                  <MenuIcon type={link.icon} />
                </span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
