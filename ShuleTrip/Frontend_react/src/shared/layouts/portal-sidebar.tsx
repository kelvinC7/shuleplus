import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/cn';
import {
  isPortalNavActive,
  isPortalNavGroupActive,
  type PortalNavItem,
} from '@/shared/config/portal-nav';

const SIDEBAR_LOGO = '/logo_white.png';

function initialOpenGroups(pathname: string, nav: PortalNavItem[]): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  for (const item of nav) {
    if (item.children?.length) {
      open[item.label] = isPortalNavGroupActive(item.label, pathname);
    }
  }
  return open;
}

export function PortalSidebar({
  nav,
  moduleLabel,
  homeHref,
  orgLabel,
  onLogout,
  onNavigate,
}: {
  nav: PortalNavItem[];
  moduleLabel: string;
  homeHref: string;
  orgLabel?: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState(() => initialOpenGroups(pathname, nav));

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of nav) {
        if (item.children?.length && isPortalNavGroupActive(item.label, pathname)) {
          next[item.label] = true;
        }
      }
      return next;
    });
  }, [pathname, nav]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#000435] via-[#000435] to-[#0a1150] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link to={homeHref} onClick={onNavigate} className="flex items-center gap-3">
          <img
            src={SIDEBAR_LOGO}
            alt="Shule+"
            className="h-9 w-auto max-w-[160px] object-contain object-left"
          />
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber">
            {moduleLabel}
          </span>
        </div>
        {orgLabel ? (
          <p className="mt-2.5 truncate text-[11px] font-semibold text-white/55" title={orgLabel}>
            {orgLabel}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Workspace</p>
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            if (item.children?.length) {
              const groupActive = isPortalNavGroupActive(item.label, pathname);
              const expanded = openGroups[item.label] ?? groupActive;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition',
                      groupActive
                        ? 'bg-white/10 text-amber'
                        : 'text-white/70 hover:bg-white/6 hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0 opacity-90" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 opacity-70 transition-transform', expanded && 'rotate-180')}
                    />
                  </button>
                  {expanded ? (
                    <ul className="mt-1 flex flex-col gap-0.5 pl-2">
                      {item.children.map((child) => {
                        const active = isPortalNavActive(pathname, child.href);
                        return (
                          <li key={child.href}>
                            <NavLink
                              to={child.href}
                              onClick={onNavigate}
                              className={cn(
                                'flex items-center rounded-xl py-2 pl-4 pr-3 text-[13px] font-semibold transition',
                                active
                                  ? 'bg-amber text-navy shadow-sm shadow-amber/30'
                                  : 'text-white/60 hover:bg-white/8 hover:text-white'
                              )}
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            }

            const href = item.href!;
            const active = isPortalNavActive(pathname, href);
            return (
              <li key={href} className="relative">
                {active ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber"
                  />
                ) : null}
                <NavLink
                  to={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                    active
                      ? 'bg-white/10 text-amber'
                      : 'text-white/70 hover:bg-white/8 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0 opacity-90" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
        <p className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
          Shule+ · Edupoto
        </p>
      </div>
    </div>
  );
}

export const PORTAL_SIDEBAR_WIDTH = 272;
