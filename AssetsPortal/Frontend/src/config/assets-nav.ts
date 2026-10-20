import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  Tags,
  CalendarRange,
  UserCheck,
  Undo2,
  ArrowLeftRight,
  Wrench,
  RefreshCw,
  FileBarChart,
  QrCode,
  Map,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AssetsNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ASSETS_NAV_ITEMS: AssetsNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Asset KPIs and category overview',
    icon: LayoutDashboard,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Trends by year, health and locations',
    icon: BarChart3,
  },
  {
    href: '/register',
    label: 'Asset Register',
    description: 'Full fixed-asset register',
    icon: ClipboardList,
  },
  {
    href: '/categories',
    label: 'Categories',
    description: 'Asset categories & depreciation rates',
    icon: Tags,
  },
  {
    href: '/year-setup',
    label: 'Year Setup',
    description: 'Financial year & opening balances',
    icon: CalendarRange,
  },
  {
    href: '/land',
    label: 'Land Register',
    description: 'Land parcels — no depreciation',
    icon: Map,
  },
  {
    href: '/assignments',
    label: 'Assignments',
    description: 'Assign assets to staff',
    icon: UserCheck,
  },
  {
    href: '/returns',
    label: 'Returns',
    description: 'Process asset returns',
    icon: Undo2,
  },
  {
    href: '/transfers',
    label: 'Transfers',
    description: 'Move assets between locations',
    icon: ArrowLeftRight,
  },
  {
    href: '/maintenance',
    label: 'Maintenance',
    description: 'Schedule and track repairs',
    icon: Wrench,
  },
  {
    href: '/replacements',
    label: 'Replacements',
    description: 'Approve asset replacements',
    icon: RefreshCw,
  },
  {
    href: '/reports',
    label: 'Reports',
    description: 'Exportable asset reports',
    icon: FileBarChart,
  },
  {
    href: '/scan',
    label: 'Scan & Lookup',
    description: 'Camera scan or manual asset lookup',
    icon: QrCode,
  },
];

export interface AssetsNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: AssetsNavItem[];
}

export const ASSETS_NAV_SECTIONS: AssetsNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [ASSETS_NAV_ITEMS[0], ASSETS_NAV_ITEMS[1]],
  },
  {
    id: 'register',
    title: 'Register',
    icon: ClipboardList,
    items: [ASSETS_NAV_ITEMS[2], ASSETS_NAV_ITEMS[3], ASSETS_NAV_ITEMS[4], ASSETS_NAV_ITEMS[5]],
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Wrench,
    items: ASSETS_NAV_ITEMS.slice(6, 11),
  },
  {
    id: 'insights',
    title: 'Insights',
    icon: FileBarChart,
    items: ASSETS_NAV_ITEMS.slice(11),
  },
];

export function isAssetsNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function assetsSectionHasActiveItem(pathname: string, items: AssetsNavItem[]) {
  return items.some((item) => isAssetsNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = ASSETS_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (item) return item.label;
  if (pathname.startsWith('/reports/')) return 'Report Detail';
  return 'Assets Portal';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  if (pathname.startsWith('/reports/')) return `Home • Reports • ${title}`;
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = ASSETS_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
