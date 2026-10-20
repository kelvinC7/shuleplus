'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { navForRole, roleLabel } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import { LoadingScreen } from '@/components/shared/loading';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authorized, error, user, profile, role, logout } = useAuth();
  const pathname = usePathname();

  if (!ready) return <LoadingScreen label="Checking session…" />;

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-navy">Access required</h1>
          <p className="mt-2 text-sm text-muted">{error ?? 'You need to sign in.'}</p>
          <div className="mt-6">
            <a
              href={process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000'}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-navy hover:bg-primary/90"
            >
              Go to ShulePlus
            </a>
          </div>
        </div>
      </div>
    );
  }

  const groups = navForRole(role);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navblue text-white lg:flex">
        <Link href="/app/dashboard" className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <UtensilsCrossed className="h-5 w-5 text-navy" />
          </span>
          <div>
            <p className="text-sm font-black italic tracking-tight">Canteen MIS</p>
            <p className="text-xs text-white/40 font-semibold">ShulePlus Ecosystem</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-widest text-white/30">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-full px-4 py-2 text-sm font-bold transition-all',
                        active
                          ? 'bg-primary text-navy shadow-lg shadow-primary/20'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-white/30">{roleLabel(role)}</p>
          <p className="truncate text-sm font-bold text-white">{user?.email ?? profile?.displayName}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-3 backdrop-blur">
          <p className="text-sm font-black italic tracking-tight text-navy">
            {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Dashboard'}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navblue text-sm font-black text-primary">
              {initials(profile?.displayName ?? user?.email)}
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut /> Sign out
            </Button>
          </div>
        </header>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
