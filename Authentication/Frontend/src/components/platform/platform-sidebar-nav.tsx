'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NavIcon } from '../super-admin/nav-icon';
import type { SidebarNavConfig } from './sidebar-nav-types';

interface Props {
  config: SidebarNavConfig;
  pathname: string;
}

function isActive(href: string, pathname: string, basePath: string) {
  if (href === basePath) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionHasActive(section: SidebarNavConfig['sections'][0], pathname: string, basePath: string) {
  return section.items.some((item) => isActive(item.href, pathname, basePath));
}

export function PlatformSidebarNav({ config, pathname }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const section of config.sections) {
      if (sectionHasActive(section, pathname, config.basePath)) {
        next[section.id] = true;
      }
    }
    setOpen((prev) => ({ ...prev, ...next }));
  }, [pathname, config.basePath, config.sections]);

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className="px-3 py-4">
      {config.standalone?.map((item) => {
        const active = isActive(item.href, pathname, config.basePath);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
              active
                ? 'bg-primary text-navy shadow-md shadow-primary/20'
                : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span className={active ? 'text-navy' : 'text-white/45'}>
              <NavIcon name={item.icon} />
            </span>
            {item.label}
          </Link>
        );
      })}

      <div className="space-y-1">
        {config.sections.map((section) => {
          const expanded = open[section.id] ?? false;
          const activeInSection = sectionHasActive(section, pathname, config.basePath);

          return (
            <div key={section.id} className="rounded-xl">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                  activeInSection
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
                aria-expanded={expanded}
              >
                <span className={activeInSection ? 'text-primary' : 'text-white/45'}>
                  <NavIcon name={section.icon} />
                </span>
                <span className="flex-1">{section.title}</span>
                <svg
                  className={`shrink-0 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div
                className={`grid transition-all duration-200 ease-out ${
                  expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <ul className="overflow-hidden">
                  <div className="ml-3 space-y-0.5 border-l border-white/10 py-1 pl-2">
                    {section.items.map((item) => {
                      const active = isActive(item.href, pathname, config.basePath);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition ${
                              active
                                ? 'bg-primary text-navy shadow-sm'
                                : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span className={active ? 'text-navy' : 'text-white/35'}>
                              <NavIcon name={item.icon} />
                            </span>
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </div>
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
