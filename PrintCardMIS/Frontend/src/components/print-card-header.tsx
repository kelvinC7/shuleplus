'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, ClipboardList, GraduationCap, History, ImagePlus, Layers, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { fetchPrintQueue } from '@/services/print-card-api';
import { performPrintCardSignOut } from '@/utils/sign-out';

const baseLinks = [
  { href: '/cards/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cards/students', label: 'Students', icon: GraduationCap },
  { href: '/cards/staff', label: 'Staff', icon: Users },
  { href: '/cards/photo-import', label: 'Photo Import', icon: ImagePlus },
  { href: '/cards/queue', label: 'Print Queue', icon: Layers, showCount: true },
  { href: '/cards/reprint-requests', label: 'Reprint Requests', icon: ClipboardList },
  { href: '/cards/history', label: 'Print History', icon: History },
];

export function PrintCardHeader() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [queueCount, setQueueCount] = useState(0);

  const links = session?.isSuperAdmin
    ? [
        ...baseLinks,
        { href: '/cards/organizations', label: 'Schools', icon: Building2 },
        { href: '/cards/users', label: 'Users', icon: Users },
      ]
    : baseLinks;

  useEffect(() => {
    let cancelled = false;
    void fetchPrintQueue()
      .then((rows) => {
        if (!cancelled) setQueueCount(rows.length);
      })
      .catch(() => {
        if (!cancelled) setQueueCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <header className="border-b border-border bg-white shadow-sm">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <Link href="/cards/dashboard" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="ShulePlus Print Card"
              className="h-8 max-w-[180px] object-contain object-left sm:h-9"
            />
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <nav className="-mx-1 flex gap-1 overflow-x-auto bg-slate-100 p-1 sm:mx-0 sm:flex-wrap sm:overflow-visible">
              {links.map(({ href, label, icon: Icon, showCount }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold transition ${
                      active ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                    {showCount && queueCount > 0 && (
                      <span className="bg-navy px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {queueCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={() => void performPrintCardSignOut()}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 sm:self-auto"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
