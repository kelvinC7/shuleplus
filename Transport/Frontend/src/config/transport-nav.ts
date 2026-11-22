import { LayoutDashboard, Route, Bus, Users, ClipboardList, Bell, Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TransportNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  mobileQuick?: boolean;
}

export interface TransportNavSection {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  items: TransportNavItem[];
}

/** Focused Transport navigation (core workflows only). */
export const TRANSPORT_NAV_SECTIONS: TransportNavSection[] = [
  {
    id: 'core',
    title: 'Transport',
    icon: Bus,
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        description: 'Overview',
        icon: LayoutDashboard,
        mobileQuick: true,
      },
      {
        href: '/buses',
        label: 'Buses & Fleet',
        description: 'Fleet',
        icon: Bus,
        mobileQuick: true,
      },
      {
        href: '/routes',
        label: 'Routes & Stops',
        description: 'Routes',
        icon: Route,
      },
      {
        href: '/students',
        label: 'Transport Learners',
        description: 'Learners',
        icon: Users,
      },
      {
        href: '/route-attendance',
        label: 'Route Attendance',
        description: 'Attendance',
        icon: ClipboardList,
        mobileQuick: true,
      },
      {
        href: '/boarding-records',
        label: 'Boarding Records',
        description: 'History',
        icon: ClipboardList,
      },
      {
        href: '/notifications',
        label: 'Parent Notifications',
        description: 'Notify',
        icon: Bell,
      },
      {
        href: '/parent-portal',
        label: 'Parent portal queue',
        description: 'Approvals',
        icon: Inbox,
      },
    ],
  },
];

export const TRANSPORT_NAV_ITEMS: TransportNavItem[] = TRANSPORT_NAV_SECTIONS.flatMap((s) => s.items);

export const TRANSPORT_MOBILE_QUICK_NAV = TRANSPORT_NAV_ITEMS.filter((i) => i.mobileQuick);

export function isTransportNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function transportSectionHasActiveItem(pathname: string, items: TransportNavItem[]) {
  return items.some((item) => isTransportNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = TRANSPORT_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? 'Transport';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Transport • Dashboard';
  return `Transport • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = TRANSPORT_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
