'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Search } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { HR_SIDEBAR, breadcrumbLabel } from '@/config/hr-sidebar';
import { SidebarBrand } from '@/components/layout/sidebar-brand';
import { HrSidebarNav } from '@/components/layout/hr-sidebar-nav';
import { AdminLayout } from '@shuleplus/ui';

interface HrShellProps {
  children: ReactNode;
}

export function HrShell({ children }: HrShellProps) {
  const pathname = usePathname();
  const { summary, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const iamUrl = process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const orgName = summary?.organizationName ?? 'Human Resources';
  const pageTitle = useMemo(() => breadcrumbLabel(pathname), [pathname]);

  const email = user?.email ?? '—';
  const initials = email !== '—' ? email.slice(0, 2).toUpperCase() : 'HR';

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
    <div className="dashboard-bg min-h-screen">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <SidebarBrand href="/dashboard" subtitle={orgName} />
        </div>

        <div className="hr-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <HrSidebarNav config={HR_SIDEBAR} pathname={pathname} />
        </div>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white">ShulePlus HR</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50">
              Manage employees, contracts, leave, and organizational structure.
            </p>
            <a
              href={`${iamUrl}/organization-admin`}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Organization Hub
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-[260px]">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-white/95 shadow-[0_1px_0_rgba(0,4,53,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
            <button
              type="button"
              className="shrink-0 rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            <div className="hidden min-w-0 shrink-0 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Human Resources</p>
              <p className="truncate font-semibold text-navy">{pageTitle}</p>
            </div>

            <div className="hidden h-8 w-px bg-border lg:block" />

            <div className="min-w-0 flex-1">
              <div className="relative mx-auto max-w-xl">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  placeholder="Search employees, departments, or documents…"
                  className="w-full rounded-xl border border-border bg-[#f4f6fb] py-2.5 pr-4 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white focus:shadow-sm"
                />
              </div>
            </div>

            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-2xl border border-border bg-white py-1.5 pl-1.5 pr-2.5 transition hover:border-primary/30 hover:shadow-sm sm:pr-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-light text-sm font-bold text-primary">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[130px] truncate text-sm font-semibold leading-tight text-navy">
                    {orgName}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                    HR Module
                  </span>
                </span>
                <svg
                  className={`hidden text-navy/30 sm:block transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
                  <div className="border-b border-border bg-[#f8fafc] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-navy">{orgName}</p>
                    <p className="truncate text-xs text-muted">{email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-navy hover:bg-navy/[0.03]"
                  >
                    HR Dashboard
                  </Link>
                  <Link
                    href="/directory"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-navy hover:bg-navy/[0.03]"
                  >
                    Employee Directory
                  </Link>
                  <a
                    href={`${iamUrl}/organization-admin`}
                    className="block border-t border-border px-4 py-2.5 text-sm text-navy hover:bg-navy/[0.03]"
                  >
                    Back to Organization Hub
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <AdminLayout size="xl">{children}</AdminLayout>
        </main>
      </div>
    </div>
  );
}
