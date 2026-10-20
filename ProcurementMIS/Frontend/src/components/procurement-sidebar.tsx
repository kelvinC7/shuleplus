'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import {
  getNavItemsForUser,
  isNavActive,
  navHasActivePath,
  type NavItem,
} from '@/lib/nav-config';
import { useAuth } from '@/contexts/auth-context';
import {
  ProcurementSidebarChevron,
  ProcurementSidebarNavLink,
  ProcurementSidebarTopLink,
} from '@/components/procurement-sidebar-nav';
import { SignOutControl } from '@/components/sign-out-control';
import { performProcurementSignOut } from '@/utils/sign-out';

interface ProcurementSidebarProps {
  open: boolean;
  onClose: () => void;
  orgName: string;
}

export function ProcurementSidebar({ open, onClose, orgName }: ProcurementSidebarProps) {
  const pathname = usePathname();
  const { user, moduleAccessLevel } = useAuth();
  const navItems = getNavItemsForUser(user?.roles ?? [], moduleAccessLevel);
  const homeHref = '/dashboard';
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (navHasActivePath(item, pathname)) {
          next[item.label] = true;
        }
      }
      return next;
    });
  }, [pathname, navItems]);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`procurement-sidebar platform-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(288px,92vw)] flex-col bg-navy shadow-2xl transition-transform duration-300 ease-out lg:w-[280px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Procurement navigation"
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-2">
            <Link href={homeHref} onClick={onClose} className="min-w-0 flex-1 rounded-lg">
              <Image
                src="/logo_white.png"
                alt="Shule+"
                width={148}
                height={44}
                className="h-8 w-auto max-w-[148px] sm:h-9"
                priority
              />
              <p className="mt-1.5 text-[11px] font-medium tracking-wide text-white/50">
                manage smarter
              </p>
              <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#febf10]">
                {orgName}
              </p>
            </Link>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <nav
          className="procurement-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3"
          aria-label="Primary"
        >
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              if (item.sections) {
                const groupOpen = openGroups[item.label] ?? false;
                const groupActive = navHasActivePath(item, pathname);
                const panelId = `proc-nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`;

                return (
                  <li key={item.label} className="rounded-2xl">
                    <button
                      type="button"
                      aria-expanded={groupOpen}
                      aria-controls={panelId}
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [item.label]: !prev[item.label],
                        }))
                      }
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition sm:px-3 ${
                        groupActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          groupActive
                            ? 'bg-[#fcb038]/20 text-[#fcb038]'
                            : 'bg-white/[0.06] text-white/50'
                        }`}
                      >
                        <item.icon size={18} strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                        {item.label}
                      </span>
                      <ProcurementSidebarChevron open={groupOpen} />
                    </button>
                    {groupOpen ? (
                      <div
                        id={panelId}
                        className="ml-3 mt-1 space-y-3 border-l border-white/10 pb-2 pl-3"
                      >
                        {item.sections.map((section) => (
                          <div key={section.label}>
                            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                              {section.label}
                            </p>
                            <div className="space-y-0.5">
                              {section.items.map((link) => (
                                <ProcurementSidebarNavLink
                                  key={link.href}
                                  href={link.href}
                                  label={link.label}
                                  active={isNavActive(pathname, link.href)}
                                  onNavigate={onClose}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              }

              if (item.children) {
                const groupOpen = openGroups[item.label] ?? false;
                const groupActive = navHasActivePath(item, pathname);
                const panelId = `proc-nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`;

                return (
                  <li key={item.label} className="rounded-2xl">
                    <button
                      type="button"
                      aria-expanded={groupOpen}
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [item.label]: !prev[item.label],
                        }))
                      }
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left sm:px-3 ${
                        groupActive ? 'bg-white/[0.08] text-white' : 'text-white/70 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                        <item.icon size={18} strokeWidth={1.75} />
                      </span>
                      <span className="flex-1 truncate text-[13px] font-semibold">{item.label}</span>
                      <ProcurementSidebarChevron open={groupOpen} />
                    </button>
                    {groupOpen ? (
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                        {item.children.map((child) => (
                          <ProcurementSidebarNavLink
                            key={child.href}
                            href={child.href}
                            label={child.label}
                            active={isNavActive(pathname, child.href)}
                            onNavigate={onClose}
                          />
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              }

              if (!item.href) return null;

              return (
                <li key={item.href}>
                  <ProcurementSidebarTopLink
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isNavActive(pathname, item.href)}
                    onNavigate={onClose}
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          <SignOutControl
            variant="sidebar"
            onLogout={() => void performProcurementSignOut()}
          />
        </div>
      </aside>
    </>
  );
}
