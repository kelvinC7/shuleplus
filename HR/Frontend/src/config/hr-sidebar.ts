import { LayoutDashboard, Users, Building2, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HR_NAV_ITEMS } from './hr-nav';

export interface HrSidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface HrSidebarSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: HrSidebarItem[];
}

export interface HrSidebarConfig {
  basePath: string;
  standalone?: HrSidebarItem[];
  sections: HrSidebarSection[];
}

function item(href: string): HrSidebarItem {
  const nav = HR_NAV_ITEMS.find((i) => i.href === href);
  if (!nav) throw new Error(`Unknown HR nav href: ${href}`);
  return { href: nav.href, label: nav.label, icon: nav.icon };
}

export const HR_SIDEBAR: HrSidebarConfig = {
  basePath: '/dashboard',
  standalone: [{ href: '/dashboard', label: 'HR Dashboard', icon: LayoutDashboard }],
  sections: [
    {
      id: 'people',
      title: 'People',
      icon: Users,
      items: [item('/directory'), item('/registration'), item('/qualifications')],
    },
    {
      id: 'employment',
      title: 'Employment',
      icon: Briefcase,
      items: [item('/contracts'), item('/categories'), item('/leave')],
    },
    {
      id: 'organization',
      title: 'Organization',
      icon: Building2,
      items: [item('/departments'), item('/organization'), item('/documents')],
    },
  ],
};

export function breadcrumbLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'HR Dashboard';
  const all = [
    ...(HR_SIDEBAR.standalone ?? []),
    ...HR_SIDEBAR.sections.flatMap((s) => s.items),
  ];
  const match = all.find((nav) =>
    nav.href === '/dashboard' ? pathname === nav.href : pathname.startsWith(nav.href)
  );
  return match?.label ?? 'Human Resources';
}
