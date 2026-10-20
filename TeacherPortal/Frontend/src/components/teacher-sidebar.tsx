'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TEACHER_NAV_SECTIONS,
  teacherSectionHasActiveItem,
  isTeacherNavActive,
} from '@/config/teacher-nav';
import { canSeeNavItem } from '@/config/teacher-nav-access';
import {
  TeacherSidebarChevron,
  TeacherSidebarNavLink,
} from '@/components/teacher-sidebar-nav';
import { SignOutControl } from '@/components/sign-out-control';
import type { AvanceAccess } from '@/types';

interface TeacherSidebarProps {
  open: boolean;
  onClose: () => void;
  orgName: string;
  avanceAccess: AvanceAccess | null;
  onLogout?: () => void;
}

export function TeacherSidebar({
  open,
  onClose,
  orgName,
  avanceAccess,
  onLogout,
}: TeacherSidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const section of TEACHER_NAV_SECTIONS) {
        if (teacherSectionHasActiveItem(pathname, section.items)) {
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
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Teacher navigation"
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-5 sm:px-5">
          <Link
            href="/dashboard"
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            <Image
              src="/logo_white.png"
              alt="Shule Teacher — manage smarter"
              width={200}
              height={56}
              priority
              className="h-auto w-[min(200px,100%)] object-contain object-left"
            />
          </Link>
          <p className="mt-3 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/95">
            {orgName}
          </p>
        </div>

        <nav
          className="hr-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4"
          aria-label="Primary"
        >
          <ul className="space-y-1.5">
            {TEACHER_NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter((item) => canSeeNavItem(item, avanceAccess));
              if (visibleItems.length === 0) return null;

              const SectionIcon = section.icon;
              const sectionActive = teacherSectionHasActiveItem(pathname, visibleItems);
              const isOpen = openSections[section.id] ?? sectionActive;
              const panelId = `teacher-nav-${section.id}`;
              const activeLabel =
                visibleItems.find((i) => isTeacherNavActive(pathname, i.href))?.label ??
                `${visibleItems.length} links`;

              return (
                <li key={section.id} className="rounded-2xl">
                  <button
                    type="button"
                    id={`${panelId}-trigger`}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleSection(section.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:gap-3 sm:px-3 ${
                      sectionActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        sectionActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-white/[0.06] text-white/50'
                      }`}
                    >
                      <SectionIcon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        {section.title}
                      </span>
                      <span className="block truncate text-[13px] font-semibold text-white/90">
                        {activeLabel}
                      </span>
                    </span>
                    <TeacherSidebarChevron open={isOpen} />
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={`${panelId}-trigger`}
                    hidden={!isOpen}
                    className={
                      isOpen ? 'mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-3 ml-4' : undefined
                    }
                  >
                    {isOpen
                      ? visibleItems.map((item) => (
                          <TeacherSidebarNavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            active={isTeacherNavActive(pathname, item.href)}
                            onNavigate={onClose}
                          />
                        ))
                      : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          {onLogout ? (
            <SignOutControl variant="sidebar" onLogout={onLogout} />
          ) : (
            <div className="rounded-2xl bg-white/[0.06] p-3 sm:p-4">
              <p className="text-xs font-semibold text-white">Teacher Portal</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                Teaching, attendance, timetable & school services.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
