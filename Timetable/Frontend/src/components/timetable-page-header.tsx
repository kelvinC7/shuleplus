'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTimetableTab } from '@/contexts/timetable-tab-context';
import { pageTitleFromPath } from '@/config/timetable-nav';
import { SignOutControl } from '@/components/sign-out-control';
import { performTimetableSignOut } from '@/utils/sign-out';

interface TimetablePageHeaderProps {
  onMenuOpen?: () => void;
}

function displayNameFromEmail(email?: string): string {
  if (!email) return 'DOS Admin';
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function roleLabel(roles: string[]): string {
  if (roles.includes('ORGANIZATION_ADMIN')) return 'Organization Admin';
  if (roles.includes('SCHOOL_MANAGER')) return 'School Manager';
  if (roles.includes('DOS')) return 'Director of Studies';
  if (roles.length > 0) {
    return roles[0].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return 'Staff';
}

export function TimetablePageHeader({ onMenuOpen }: TimetablePageHeaderProps) {
  const pathname = usePathname();
  const { tabParam } = useTimetableTab();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  const pageTitle = pageTitleFromPath(pathname, tabParam);
  const displayName = displayNameFromEmail(user?.email);
  const role = roleLabel(user?.roles ?? []);
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-[0_1px_0_rgba(0,4,53,0.04)]">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            {onMenuOpen ? (
              <button
                type="button"
                className="shrink-0 rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                onClick={onMenuOpen}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
            ) : null}
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-[11px] text-muted sm:text-xs">
                Timetable Center <span className="text-border">›</span>{' '}
                <span className="text-navy/80">{pageTitle}</span>
              </p>
              <h1 className="truncate text-base font-semibold text-navy">{pageTitle}</h1>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-xs text-muted">
                Timetable Center <span className="text-border">›</span>{' '}
                <span className="text-navy/80">{pageTitle}</span>
              </p>
            </div>
          </div>

          <div className="relative hidden max-w-md flex-1 px-2 lg:block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
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
              placeholder="Search classes, teachers, subjects…"
              className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white"
              aria-label="Search"
            />
          </div>

          <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
            <SignOutControl variant="header" onLogout={() => void performTimetableSignOut()} />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2 transition hover:border-primary/40 sm:gap-2.5 sm:pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary">
                {initials || 'TT'}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[120px] truncate text-sm font-semibold leading-tight text-navy">
                  {displayName}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{role}</span>
              </span>
              <svg
                className={`hidden text-navy/30 sm:block ${menuOpen ? 'rotate-180' : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                  <p className="truncate text-xs text-muted">{user?.email ?? '—'}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.href = `${iamUrl}/organization-admin`;
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-navy hover:bg-navy/[0.03]"
                >
                  <LayoutGrid size={16} className="text-muted" />
                  Organization dashboard
                </button>
                <SignOutControl
                  variant="menu"
                  onLogout={() => {
                    setMenuOpen(false);
                    void performTimetableSignOut();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative w-full lg:hidden">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
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
            placeholder="Search classes, teachers, subjects…"
            className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white"
            aria-label="Search"
          />
        </div>
      </div>
    </header>
  );
}
