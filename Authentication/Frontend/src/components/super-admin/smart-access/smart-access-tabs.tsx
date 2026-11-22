'use client';

import Link from 'next/link';
import { BarChart3, Radio } from 'lucide-react';

const tabs = [
  { id: 'access' as const, href: '/super-admin/smart-access', label: 'Assign access', icon: Radio },
  { id: 'reports' as const, href: '/super-admin/smart-access/reports', label: 'Reports', icon: BarChart3 },
];

export function SmartAccessTabs({ active }: { active: 'access' | 'reports' }) {
  return (
    <nav
      className="inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-white p-1 shadow-sm"
      aria-label="Smart Access sections"
    >
      {tabs.map(({ id, href, label, icon: Icon }) => {
        const on = active === id;
        return (
          <Link
            key={id}
            href={href}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              on
                ? 'bg-navy text-white shadow-sm'
                : 'text-navy/70 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
