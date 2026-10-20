'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { pageTitleFromPath } from '@/config/babyeyi-nav';
import { SignOutControl } from '@/components/sign-out-control';
import { performSignOut } from '@/utils/sign-out';

interface BabyeyiPageHeaderProps {
  onMenuOpen?: () => void;
}

export function BabyeyiPageHeader({ onMenuOpen }: BabyeyiPageHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const pageTitle = pageTitleFromPath(pathname);
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {onMenuOpen ? (
            <button type="button" className="shrink-0 rounded-xl border border-border p-2 text-navy lg:hidden" onClick={onMenuOpen} aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">Babyeyi Wizard <span className="text-border">›</span> <span className="text-navy/80">{pageTitle}</span></p>
            <h1 className="truncate text-base font-semibold text-navy sm:text-lg">{pageTitle}</h1>
          </div>
        </div>

        <div className="relative shrink-0 flex items-center gap-2" ref={menuRef}>
          <SignOutControl variant="header" onLogout={() => void performSignOut()} />
          <button type="button" onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2 sm:pr-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary">{initials}</span>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border bg-white shadow-xl">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <button type="button" onClick={() => { window.location.href = `${iamUrl}/organization-admin`; }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-navy/[0.03]">
                <LayoutGrid size={16} className="text-muted" /> Organization dashboard
              </button>
              <SignOutControl variant="menu" onLogout={() => void performSignOut()} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
