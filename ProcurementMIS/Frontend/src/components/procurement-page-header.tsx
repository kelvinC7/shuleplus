'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutGrid, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { pageTitleFromPath } from '@/lib/nav-config';
import { performProcurementSignOut } from '@/utils/sign-out';
import { isProcurementSupervisor } from '@/utils/permissions';
import type { ModuleAccessLevel } from '@/services/iam-api';

interface ProcurementPageHeaderProps {
  onMenuOpen?: () => void;
}

function displayNameFromEmail(email?: string): string {
  if (!email) return 'Procurement Admin';
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function roleLabel(roles: string[], moduleAccessLevel?: ModuleAccessLevel | null): string {
  if (roles.some((r) => r.toLowerCase().includes('organization_admin'))) {
    return 'Organization Admin';
  }
  if (isProcurementSupervisor(roles, moduleAccessLevel)) return 'Module Supervisor';
  if (moduleAccessLevel === 'USER') return 'Module User';
  return 'Procurement Officer';
}

export function ProcurementPageHeader({ onMenuOpen }: ProcurementPageHeaderProps) {
  const pathname = usePathname();
  const { user, isSupervisor, moduleAccessLevel } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  const pageTitle = pageTitleFromPath(pathname);
  const displayName = displayNameFromEmail(user?.email);
  const role = roleLabel(user?.roles ?? [], moduleAccessLevel);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            {onMenuOpen ? (
              <button
                type="button"
                className="shrink-0 rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden"
                onClick={onMenuOpen}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Procurement <span className="text-slate-400">›</span>{' '}
                <span className="font-medium text-navy/80">{pageTitle}</span>
              </p>
              <h1 className="truncate text-base font-semibold text-navy sm:text-lg">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="relative hidden max-w-md flex-1 px-2 lg:block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search requests, orders, suppliers…"
              className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-primary/50 focus:bg-white"
              aria-label="Search"
            />
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2 transition hover:border-primary/40 sm:gap-2.5 sm:pr-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary">
                {initials || 'PO'}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[120px] truncate text-sm font-semibold leading-tight text-navy">
                  {displayName}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {role}
                </span>
              </span>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email ?? '—'}</p>
                </div>
                {isSupervisor ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      window.location.href = `${iamUrl}/organization-admin`;
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-navy/[0.03]"
                  >
                    <LayoutGrid size={16} className="text-slate-400" />
                    Organization dashboard
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void performProcurementSignOut();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative w-full lg:hidden">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search requests, orders, suppliers…"
            className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-primary/50 focus:bg-white"
            aria-label="Search"
          />
        </div>
      </div>
    </header>
  );
}
