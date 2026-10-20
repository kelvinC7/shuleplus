import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Tags,
  CalendarDays,
  CalendarPlus,
  Settings2,
  Building2,
  Network,
  FolderOpen,
  GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface HrNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const HR_NAV_ITEMS: HrNavItem[] = [
  {
    href: '/dashboard',
    label: 'HR Dashboard',
    description: 'Workforce overview, KPIs & quick actions',
    icon: LayoutDashboard,
  },
  {
    href: '/directory',
    label: 'Employee Directory',
    description: 'Search, filter & manage all staff',
    icon: Users,
  },
  {
    href: '/registration',
    label: 'Employee Registration',
    description: 'Register new staff via wizard',
    icon: UserPlus,
  },
  {
    href: '/contracts',
    label: 'Employment Contracts',
    description: 'Track contracts, expiry & renewals',
    icon: FileText,
  },
  {
    href: '/categories',
    label: 'Employment Categories',
    description: 'Staff classification & headcount',
    icon: Tags,
  },
  {
    href: '/leave',
    label: 'Leave Dashboard',
    description: 'Balances, approvals & leave analytics',
    icon: CalendarDays,
  },
  {
    href: '/leave/register',
    label: 'Register Leave',
    description: 'Submit a new leave request',
    icon: CalendarPlus,
  },
  {
    href: '/leave/policies',
    label: 'Leave Policies',
    description: 'Entitlements, rules & approval workflows',
    icon: Settings2,
  },
  {
    href: '/departments',
    label: 'Departments',
    description: 'Org units, heads & budgets',
    icon: Building2,
  },
  {
    href: '/organization',
    label: 'Organizations',
    description: 'Org chart & reporting lines',
    icon: Network,
  },
  {
    href: '/documents',
    label: 'Staff Documents',
    description: 'Compliance & document repository',
    icon: FolderOpen,
  },
  {
    href: '/qualifications',
    label: 'Qualifications',
    description: 'Academic credentials & verification',
    icon: GraduationCap,
  },
];

export interface HrNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: HrNavItem[];
}

export const HR_NAV_SECTIONS: HrNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [HR_NAV_ITEMS[0]],
  },
  {
    id: 'workforce',
    title: 'Workforce',
    icon: Users,
    items: HR_NAV_ITEMS.slice(1, 5),
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: CalendarDays,
    items: HR_NAV_ITEMS.slice(5, 10),
  },
  {
    id: 'records',
    title: 'Records',
    icon: FolderOpen,
    items: HR_NAV_ITEMS.slice(10),
  },
];

export function isHrNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function hrSectionHasActiveItem(pathname: string, items: HrNavItem[]) {
  return items.some((item) => isHrNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = HR_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (item) return item.label;
  if (pathname.includes('/directory/') && pathname.endsWith('/edit')) return 'Edit Employee';
  if (pathname.includes('/directory/')) return 'Employee Profile';
  return 'HR Center';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  if (title === 'Edit Employee' || title === 'Employee Profile') return `Home • Employee Directory • ${title}`;
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = HR_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
