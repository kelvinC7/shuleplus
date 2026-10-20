import {
  LayoutDashboard,
  FilePlus2,
  Files,
  CheckCircle2,
  Bell,
  Settings,
  LayoutTemplate,
  History,
  Eye,
  BadgeCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface BabyeyiNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BABYEYI_NAV_ITEMS: BabyeyiNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Overview, KPIs & quick actions', icon: LayoutDashboard },
  { href: '/create', label: 'Create Circular', description: 'Build a new fee circular', icon: FilePlus2 },
  { href: '/circulars', label: 'Circular List', description: 'Manage all circulars', icon: Files },
  { href: '/approvals', label: 'Approvals', description: 'Review and sign circulars', icon: CheckCircle2 },
  { href: '/templates', label: 'Templates', description: 'Reusable circular layouts', icon: LayoutTemplate },
  { href: '/versions', label: 'Versions', description: 'Circular revision history', icon: History },
  { href: '/preview', label: 'Preview', description: 'Print and share preview', icon: Eye },
  { href: '/verify', label: 'Verify', description: 'QR / document authenticity', icon: BadgeCheck },
  { href: '/notifications', label: 'Notifications', description: 'Activity alerts', icon: Bell },
  { href: '/settings', label: 'Settings', description: 'Academic year, term & branding', icon: Settings },
];

export interface BabyeyiNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: BabyeyiNavItem[];
}

export const BABYEYI_NAV_SECTIONS: BabyeyiNavSection[] = [
  { id: 'overview', title: 'Overview', icon: LayoutDashboard, items: BABYEYI_NAV_ITEMS.slice(0, 1) },
  { id: 'circulars', title: 'Circulars', icon: Files, items: BABYEYI_NAV_ITEMS.slice(1, 3) },
  { id: 'workflow', title: 'Workflow', icon: CheckCircle2, items: BABYEYI_NAV_ITEMS.slice(3, 8) },
  { id: 'admin', title: 'Administration', icon: Settings, items: BABYEYI_NAV_ITEMS.slice(8) },
];

export function isNavActive(pathname: string, href: string) {
  if (href === '/circulars/details') return pathname.includes('/circulars/') && pathname !== '/circulars';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionHasActiveItem(pathname: string, items: BabyeyiNavItem[]) {
  return items.some((item) => isNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = BABYEYI_NAV_ITEMS.find((nav) => isNavActive(pathname, nav.href));
  if (item) return item.label;
  if (pathname.includes('/circulars/')) return 'Circular Details';
  if (pathname.includes('/create')) {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('id')) {
      return 'Edit Circular';
    }
    return 'Create Circular';
  }
  return 'Babyeyi Wizard';
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = BABYEYI_NAV_ITEMS.find((nav) => isNavActive(pathname, nav.href));
  return item?.icon ?? LayoutDashboard;
}
