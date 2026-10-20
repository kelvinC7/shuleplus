'use client';

import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  FileDown,
  Wand2,
  Users,
  BookOpen,
  Clock,
  Grid3X3,
  AlertTriangle,
  Radio,
  QrCode,
  History,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TimetableTab } from '@/types';

export interface TimetableNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const TIMETABLE_NAV_ITEMS: TimetableNavItem[] = [
  {
    href: '/dashboard',
    label: 'Timetable Dashboard',
    description: 'Overview & quick actions',
    icon: LayoutDashboard,
  },
  {
    href: '/timetable',
    label: 'Timetable Setup',
    description: 'Teachers, courses, generator & grid',
    icon: CalendarDays,
  },
  {
    href: '/live-monitor',
    label: 'Live Monitor',
    description: 'Real-time classroom & teacher activity',
    icon: Radio,
  },
  {
    href: '/live-history',
    label: 'Live History',
    description: 'Check-in history & punctuality analytics',
    icon: History,
  },
  {
    href: '/class-qr',
    label: 'Class QR',
    description: 'Class QR codes from Student Management',
    icon: QrCode,
  },
  {
    href: '/exports',
    label: 'Exports',
    description: 'Summaries, class & master PDF',
    icon: FileDown,
  },
  {
    href: '/smart-settings',
    label: 'Smart Settings',
    description: 'Live monitor rules and alerts',
    icon: SlidersHorizontal,
  },
];

export interface TimetableNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: TimetableNavItem[];
}

export interface TimetablePlanningNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tabId?: TimetableTab;
}

export const TIMETABLE_TABS: { id: TimetableTab; label: string; icon: LucideIcon; description: string }[] = [
  { id: 'teachers', label: 'Teachers', icon: Users, description: 'Limits & availability' },
  { id: 'courses', label: 'Courses', icon: BookOpen, description: 'Subject scheduling rules' },
  { id: 'schedule', label: 'Time Settings', icon: Clock, description: 'School day, periods, breaks and daily schedule for the generator' },
  { id: 'generator', label: 'Generator', icon: Wand2, description: 'Generate & apply' },
  { id: 'timetable', label: 'Timetable', icon: Grid3X3, description: 'Drag & drop grid' },
  { id: 'conflicts', label: 'Conflict Center', icon: AlertTriangle, description: 'Scan & auto-fix' },
];

export const TIMETABLE_PLANNING_NAV: TimetablePlanningNavItem[] = [
  {
    tabId: 'teachers',
    href: '/timetable?tab=teachers',
    label: 'Teachers',
    description: 'Limits & availability',
    icon: Users,
  },
  {
    tabId: 'courses',
    href: '/timetable?tab=courses',
    label: 'Courses',
    description: 'Subject scheduling rules',
    icon: BookOpen,
  },
  {
    href: '/config-class',
    label: 'Config Class',
    description: 'Configure courses & teachers per class',
    icon: ClipboardList,
  },
  {
    tabId: 'schedule',
    href: '/timetable?tab=schedule',
    label: 'Time Settings',
    description: 'School day, periods, breaks and daily schedule for the generator',
    icon: Clock,
  },
  {
    href: '/create-timetable',
    label: 'Create Timetable',
    description: 'Generator & manual entry per class',
    icon: Wand2,
  },
  {
    tabId: 'timetable',
    href: '/timetable?tab=timetable',
    label: 'Timetable',
    description: 'Drag & drop grid',
    icon: Grid3X3,
  },
  {
    href: '/extra-activities',
    label: 'Extra Activities',
    description: 'Clubs, CPD & after-school programmes',
    icon: Sparkles,
  },
  {
    tabId: 'conflicts',
    href: '/timetable?tab=conflicts',
    label: 'Conflict Center',
    description: 'Scan & auto-fix',
    icon: AlertTriangle,
  },
  {
    href: '/exports',
    label: 'Exports',
    description: 'Summaries, class & master PDF',
    icon: FileDown,
  },
];

export const TIMETABLE_NAV_SECTIONS: TimetableNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [TIMETABLE_NAV_ITEMS[0]],
  },
  {
    id: 'planning',
    title: 'Planning',
    icon: Wand2,
    items: [],
  },
  {
    id: 'operations',
    title: 'Live Operations',
    icon: Radio,
    items: [TIMETABLE_NAV_ITEMS[2], TIMETABLE_NAV_ITEMS[3], TIMETABLE_NAV_ITEMS[4], TIMETABLE_NAV_ITEMS[6]],
  },
];

export interface TimetableSetupNavItem {
  tabId: TimetableTab;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const TIMETABLE_SETUP_NAV: TimetableSetupNavItem[] = TIMETABLE_TABS.map((tab) => ({
  tabId: tab.id,
  href: `/timetable?tab=${tab.id}`,
  label: tab.label,
  description: tab.description,
  icon: tab.icon,
}));

export function isTimetableSetupPath(pathname: string) {
  return pathname === '/timetable';
}

export function activeTimetableTab(tabParam: string | null): TimetableTab {
  if (tabParam && TIMETABLE_TABS.some((t) => t.id === tabParam)) {
    return tabParam as TimetableTab;
  }
  return 'teachers';
}

export function isTimetableTabActive(pathname: string, tabParam: string | null, tabId: TimetableTab) {
  return isTimetableSetupPath(pathname) && activeTimetableTab(tabParam) === tabId;
}

export function isTimetableNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isPlanningNavActive(
  pathname: string,
  tabParam: string | null,
  item: TimetablePlanningNavItem
) {
  if (item.tabId) return isTimetableTabActive(pathname, tabParam, item.tabId);
  return isTimetableNavActive(pathname, item.href);
}

export function planningSectionActive(pathname: string) {
  return (
    pathname === '/config-class' ||
    pathname.startsWith('/config-class/') ||
    pathname === '/teacher-assignments' ||
    pathname.startsWith('/teacher-assignments/') ||
    pathname === '/smart-settings' ||
    pathname.startsWith('/smart-settings/') ||
    isTimetableSetupPath(pathname) ||
    pathname === '/exports' ||
    pathname.startsWith('/exports/') ||
    pathname === '/extra-activities' ||
    pathname.startsWith('/extra-activities/') ||
    pathname === '/create-timetable' ||
    pathname.startsWith('/create-timetable/')
  );
}

export function timetableSectionHasActiveItem(pathname: string, items: TimetableNavItem[]) {
  return items.some((item) => isTimetableNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string, tabParam?: string | null): string {
  if (isTimetableSetupPath(pathname)) {
    const tab = TIMETABLE_TABS.find((t) => t.id === activeTimetableTab(tabParam ?? null));
    return tab ? `${tab.label}` : 'Timetable Setup';
  }
  if (pathname === '/create-timetable') return 'Create Timetable';
  if (pathname === '/config-class') return 'Config Class';
  if (pathname === '/extra-activities') return 'Extra Activities';
  if (pathname === '/teacher-assignments') return 'Teacher Assignments';
  if (pathname === '/exports') return 'Exports';
  const item = TIMETABLE_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (item) return item.label;
  return 'Timetable Center';
}

export function breadcrumbFromPath(pathname: string, tabParam?: string | null): string {
  if (isTimetableSetupPath(pathname)) {
    const tab = TIMETABLE_TABS.find((t) => t.id === activeTimetableTab(tabParam ?? null));
    return tab ? `Home • Planning • ${tab.label}` : 'Home • Planning';
  }
  if (pathname === '/create-timetable') return 'Home • Planning • Create Timetable';
  if (pathname === '/config-class') return 'Home • Planning • Config Class';
  if (pathname === '/teacher-assignments') return 'Home • Planning • Teacher Assignments';
  if (pathname === '/extra-activities') return 'Home • Planning • Extra Activities';
  if (pathname === '/smart-settings') return 'Home • Live Operations • Smart Settings';
  if (pathname === '/exports') return 'Home • Planning • Exports';
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  if (pathname === '/extra-activities' || pathname.startsWith('/extra-activities/')) {
    return Sparkles;
  }
  const planning = TIMETABLE_PLANNING_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (planning) return planning.icon;
  const item = TIMETABLE_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
