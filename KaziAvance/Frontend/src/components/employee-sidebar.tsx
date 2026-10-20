"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  EMPLOYEE_NAV_SECTIONS,
  employeeSectionHasActiveItem,
  isEmployeeNavActive,
} from "@/config/employee-nav";
import { EmployeeSidebarChevron, EmployeeSidebarNavLink } from "@/components/employee-sidebar-nav";
import { SignOutControl } from "@/components/sign-out-control";

interface EmployeeSidebarProps {
  open: boolean;
  onClose: () => void;
  orgName: string;
  employeeName?: string;
  onLogout?: () => void;
}

export function EmployeeSidebar({
  open,
  onClose,
  orgName,
  employeeName,
  onLogout,
}: EmployeeSidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const section of EMPLOYEE_NAV_SECTIONS) {
        if (employeeSectionHasActiveItem(pathname, section.items)) {
          next[section.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`hr-sidebar platform-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(272px,88vw)] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:w-[272px] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="KaziAdvance employee navigation"
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <Image
              src="/logo.png"
              alt="Shule+"
              width={140}
              height={42}
              className="h-8 w-auto brightness-0 invert sm:h-9"
              priority
            />
          </Link>
          <p className="mt-1.5 text-[11px] font-medium tracking-wide text-white/45">manage smarter</p>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90">
            {orgName}
          </p>
          {employeeName ? (
            <p className="mt-1 truncate text-xs text-white/55">{employeeName}</p>
          ) : null}
        </div>

        <nav
          className="hr-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4"
          aria-label="Primary"
        >
          <ul className="space-y-1.5">
            {EMPLOYEE_NAV_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const sectionActive = employeeSectionHasActiveItem(pathname, section.items);
              const isOpen = openSections[section.id] ?? sectionActive;
              const panelId = `employee-nav-${section.id}`;

              return (
                <li key={section.id} className="rounded-2xl">
                  <button
                    type="button"
                    id={`${panelId}-trigger`}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleSection(section.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition sm:gap-3 sm:px-3 ${
                      sectionActive
                        ? "bg-white/[0.08] text-white"
                        : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        sectionActive ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-white/50"
                      }`}
                    >
                      <SectionIcon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        {section.title}
                      </span>
                      <span className="block truncate text-[13px] font-semibold text-white/90">
                        {section.items.find((i) => isEmployeeNavActive(pathname, i.href))?.label ??
                          `${section.items.length} links`}
                      </span>
                    </span>
                    <EmployeeSidebarChevron open={isOpen} />
                  </button>

                  {isOpen ? (
                    <ul id={panelId} className="mt-1 space-y-0.5 border-l border-white/10 py-1 pl-3 ml-5">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <EmployeeSidebarNavLink
                            href={item.href}
                            label={item.label}
                            active={isEmployeeNavActive(pathname, item.href)}
                            onNavigate={onClose}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          {onLogout ? <SignOutControl variant="sidebar" onLogout={onLogout} /> : null}
        </div>
      </aside>
    </>
  );
}
