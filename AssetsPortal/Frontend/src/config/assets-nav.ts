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
  Car,
  Settings2,
  Upload,
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

export const LAND_NAV_ITEMS: AssetsNavItem[] = [
  {
    href: '/land/dashboard',
    label: 'Land Dashboard',
    description: 'Land KPIs and analytics',
    icon: LayoutDashboard,
  },
  {
    href: '/land/setup',
    label: 'Land Setup',
    description: 'Opening amount by financial year',
    icon: Settings2,
  },
  {
    href: '/land/register',
    label: 'Land Register',
    description: 'Independent land parcel register',
    icon: Map,
  },
  {
    href: '/land/import',
    label: 'Import Land',
    description: 'Bulk import land from Excel',
    icon: Upload,
  },
  {
    href: '/land/reports',
    label: 'Land Reports',
    description: 'Land financial and location reports',
    icon: FileBarChart,
  },
];

export const VEHICLE_NAV_ITEMS: AssetsNavItem[] = [
  {
    href: '/vehicles/dashboard',
    label: 'Vehicle Dashboard',
    description: 'Vehicle KPIs and analytics',
    icon: LayoutDashboard,
  },
  {
    href: '/vehicles/register',
    label: 'Vehicle Register',
    description: 'Independent vehicle register',
    icon: Car,
  },
  {
    href: '/vehicles/setup',
    label: 'Vehicle Setup',
    description: 'Opening balance and depreciation',
    icon: Settings2,
  },
  {
    href: '/vehicles/import',
    label: 'Import Vehicles',
    description: 'Bulk import vehicles from Excel',
    icon: Upload,
  },
  {
    href: '/vehicles/reports',
    label: 'Vehicle Reports',
    description: 'Vehicle financial and depreciation reports',
    icon: FileBarChart,
  },
];

export interface AssetsNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: AssetsNavItem[];
}

const byHref = (href: string) => ASSETS_NAV_ITEMS.find((item) => item.href === href)!;

export const ASSETS_NAV_SECTIONS: AssetsNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [byHref('/dashboard'), byHref('/analytics')],
  },
  {
    id: 'register',
    title: 'Register',
    icon: ClipboardList,
    items: [byHref('/register'), byHref('/categories'), byHref('/year-setup')],
  },
  {
    id: 'land',
    title: 'Land',
    icon: Map,
    items: LAND_NAV_ITEMS,
  },
  {
    id: 'vehicles',
    title: 'Vehicles',
    icon: Car,
    items: VEHICLE_NAV_ITEMS,
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Wrench,
    items: [
      byHref('/assignments'),
      byHref('/returns'),
      byHref('/transfers'),
      byHref('/maintenance'),
      byHref('/replacements'),
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    icon: FileBarChart,
    items: [byHref('/reports'), byHref('/scan')],
  },
];

const ALL_NAV_ITEMS = [...ASSETS_NAV_ITEMS, ...LAND_NAV_ITEMS, ...VEHICLE_NAV_ITEMS];

export function isAssetsNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function assetsSectionHasActiveItem(pathname: string, items: AssetsNavItem[]) {
  return items.some((item) => isAssetsNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = ALL_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (item) return item.label;
  if (pathname === '/land') return 'Land';
  if (pathname === '/vehicles') return 'Vehicles';
  if (pathname.startsWith('/reports/')) return 'Report Detail';
  return 'Assets Portal';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  if (pathname.startsWith('/land/')) return `Home • Land • ${title}`;
  if (pathname.startsWith('/vehicles/')) return `Home • Vehicles • ${title}`;
  if (pathname.startsWith('/reports/')) return `Home • Reports • ${title}`;
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = ALL_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
