import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/shared/cn';
import { Button } from '@/components/ui/button';
import type { PortalNavItem } from '@/shared/config/portal-nav';
import { PortalSidebar, PORTAL_SIDEBAR_WIDTH } from '@/shared/layouts/portal-sidebar';

export function PortalShell({
  moduleLabel,
  pageTitleFromPath,
  homeHref,
  orgLabel,
  nav,
  onLogout,
  primaryAction,
  children,
}: {
  moduleLabel: string;
  pageTitleFromPath: (pathname: string) => string;
  homeHref: string;
  orgLabel?: string;
  nav: PortalNavItem[];
  onLogout: () => void;
  primaryAction?: { label: string; href: string };
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = pageTitleFromPath(pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] print:bg-white">
      <aside
        data-portal-chrome
        className={cn(
          'fixed inset-y-0 left-0 z-40 shadow-[4px_0_24px_rgba(0,4,53,0.12)] transition-transform print:hidden lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ width: PORTAL_SIDEBAR_WIDTH }}
      >
        <PortalSidebar
          nav={nav}
          moduleLabel={moduleLabel}
          homeHref={homeHref}
          orgLabel={orgLabel}
          onLogout={onLogout}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          data-portal-chrome
          className="fixed inset-0 z-30 bg-black/40 print:hidden lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div data-portal-main className="min-w-0 lg:ml-[272px] print:ml-0">
        <header
          data-portal-chrome
          className="sticky top-0 z-20 border-b border-navy/8 bg-white/92 backdrop-blur-md print:hidden"
        >
          <div className="flex h-[60px] items-center gap-3 px-4 md:px-6">
            <button
              type="button"
              className="rounded-lg border border-navy/10 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 lg:flex-none">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{moduleLabel}</p>
              <h1 className="truncate text-base font-bold text-navy sm:text-lg">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {primaryAction ? (
                <Link to={primaryAction.href} className="hidden sm:inline-flex">
                  <Button variant="amber" type="button">
                    {primaryAction.label}
                  </Button>
                </Link>
              ) : null}
              <button
                type="button"
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 print:mx-0 print:max-w-none print:px-0 print:py-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
      <p className="text-lg font-bold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">{body}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
        Coming soon <ChevronRight className="h-3 w-3" />
      </p>
    </div>
  );
}
