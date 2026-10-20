'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { TASK_NAV_ITEMS } from '@/config/task-nav';
import { Menu, X } from 'lucide-react';

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen task-pattern">
      <header className="border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/dashboard" className="text-lg font-bold text-navy hover:text-ochre">
              Task Center
            </Link>
            <p className="text-xs text-muted">{summary?.organizationName ?? 'Loading...'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-navy sm:inline-block">
              ShulePlus Tasks
            </span>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-navy hover:bg-navy/5 sm:hidden"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:flex sm:px-6">
          {TASK_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-xs whitespace-nowrap sm:text-sm ${
                  active
                    ? 'bg-primary/20 font-semibold text-navy'
                    : 'text-muted hover:bg-navy/5 hover:text-navy'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {mobileOpen && (
          <nav className="flex flex-col gap-1 border-t border-border px-4 pb-3 pt-2 sm:hidden">
            {TASK_NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active
                      ? 'bg-primary/20 font-semibold text-navy'
                      : 'text-muted hover:bg-navy/5 hover:text-navy'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
