'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';

const BASE_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/records', label: 'Records' },
  { href: '/reports', label: 'Reports' },
  { href: '/ui-showcase', label: 'UI Showcase' },
  { href: '/settings', label: 'Settings' },
  { href: '/profile', label: 'Profile' },
];

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary, isOrgAdmin } = useAuth();

  const nav = isOrgAdmin
    ? [...BASE_NAV.slice(0, 3), { href: '/users', label: 'Users' }, ...BASE_NAV.slice(3)]
    : BASE_NAV;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold text-navy">Sample Module</p>
            <p className="text-xs text-muted">{summary?.organizationName ?? 'Loading…'}</p>
          </div>
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-navy">
            v1.0.0
          </span>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-2 text-sm whitespace-nowrap ${
                pathname === item.href
                  ? 'bg-primary/20 font-semibold text-navy'
                  : 'text-muted hover:bg-navy/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
