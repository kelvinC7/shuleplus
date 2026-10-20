'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { pageTitleFromPath } from '@/config/discipline-nav';
import { SignOutControl } from '@/components/sign-out-control';
import { performDisciplineSignOut } from '@/utils/sign-out';

interface DisciplinePageHeaderProps {
  onMenuOpen?: () => void;
}

function displayNameFromEmail(email?: string): string {
  if (!email) return 'Discipline Admin';
  const local = email.split('@')[0] ?? email;
  return local.split(/[._-]/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function roleLabel(roles: string[]): string {
  if (roles.includes('ORGANIZATION_ADMIN')) return 'Organization Admin';
  if (roles.includes('SCHOOL_MANAGER')) return 'School Manager';
  if (roles.includes('DISCIPLINE_OFFICER')) return 'Discipline Officer';
  if (roles.length > 0) {
    return roles[0].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return 'Discipline Staff';
}

export function DisciplinePageHeader({ onMenuOpen }: DisciplinePageHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  const pageTitle = pageTitleFromPath(pathname);
  const displayName = displayNameFromEmail(user?.email);
  const role = roleLabel(user?.roles ?? []);
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            {onMenuOpen ? (
              <button type="button" className="shrink-0 rounded-xl border border-slate-200 p-2 text-[#000435] transition hover:border-[#fcb038]/40 lg:hidden" onClick={onMenuOpen} aria-label="Open menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              </button>
            ) : null}
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                Student Discipline <span className="text-slate-300">›</span> <span className="text-[#000435]/80">{pageTitle}</span>
              </p>
              <h1 className="truncate text-base font-semibold text-[#000435]">{pageTitle}</h1>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-xs text-slate-500">
                Student Discipline <span className="text-slate-300">›</span> <span className="text-[#000435]/80">{pageTitle}</span>
              </p>
            </div>
          </div>

          <div className="relative hidden max-w-md flex-1 px-2 lg:block">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="search" placeholder="Search cases, students, permissions…" className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-2.5 pr-4 pl-10 text-sm text-[#000435] outline-none transition placeholder:text-slate-400 focus:border-[#fcb038]/50 focus:bg-white" aria-label="Search" />
          </div>

          <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
            <SignOutControl variant="header" onLogout={() => void performDisciplineSignOut()} />
            <button type="button" onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 transition hover:border-[#fcb038]/40 sm:pr-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#000435] text-sm font-medium text-[#fcb038]">{initials || 'SD'}</span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[120px] truncate text-sm font-medium leading-tight text-[#000435]">{displayName}</span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">{role}</span>
              </span>
            </button>

            {menuOpen ? (
              <div role="menu" className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="truncate text-sm font-medium text-[#000435]">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email ?? '—'}</p>
                </div>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); window.location.href = `${iamUrl}/organization-admin`; }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#000435] hover:bg-[#000435]/[0.03]">
                  <LayoutGrid size={16} className="text-slate-400" />
                  Organization dashboard
                </button>
                <SignOutControl variant="menu" onLogout={() => { setMenuOpen(false); void performDisciplineSignOut(); }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
