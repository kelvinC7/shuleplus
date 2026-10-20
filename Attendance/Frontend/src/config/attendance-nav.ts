import {
  LayoutDashboard,
  Radio,
  LogIn,
  LogOut,
  ClipboardList,
  AlertTriangle,
  GraduationCap,
  UserSquare2,
  CreditCard,
  Cpu,
  BarChart3,
  Settings,
  ScanLine,
  Users,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AttendanceNavItem {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

export interface AttendanceNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: AttendanceNavItem[];
}

/** Top-level links (always visible, not nested). */
export const ATTENDANCE_STANDALONE: AttendanceNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Management overview',
    icon: LayoutDashboard,
  },
  {
    href: '/live-monitor',
    label: 'Live Monitor',
    description: 'Live entry and exit',
    icon: Radio,
  },
];

export const ATTENDANCE_NAV_SECTIONS: AttendanceNavSection[] = [
  {
    id: 'attendance',
    title: 'Attendance',
    icon: ScanLine,
    items: [
      { href: '/entry', label: 'Entry', description: 'School arrival', icon: LogIn },
      { href: '/exit', label: 'Exit', description: 'School departure', icon: LogOut },
      { href: '/records', label: 'Records', description: 'Historical database', icon: ClipboardList },
      { href: '/exceptions', label: 'Exceptions', description: 'Scan issues', icon: AlertTriangle },
    ],
  },
  {
    id: 'people',
    title: 'People',
    icon: Users,
    items: [
      { href: '/students', label: 'Students', description: 'Student attendance', icon: GraduationCap },
      { href: '/staff', label: 'Staff', description: 'Staff attendance', icon: UserSquare2 },
    ],
  },
  {
    id: 'access',
    title: 'Access',
    icon: CreditCard,
    items: [
      { href: '/cards', label: 'Cards', description: 'Card lifecycle', icon: CreditCard },
      { href: '/devices', label: 'Devices & Gates', description: 'Readers & gates', icon: Cpu },
    ],
  },
];

export const ATTENDANCE_FOOTER: AttendanceNavItem[] = [
  { href: '/analytics', label: 'Analytics', description: 'Charts & insights', icon: BarChart3 },
  { href: '/reports', label: 'Reports', description: 'Export & tables', icon: BarChart3 },
  { href: '/parent-sms', label: 'Parent SMS', description: 'Message log', icon: MessageSquare },
  { href: '/settings', label: 'Settings', description: 'Policies & rules', icon: Settings },
];

export const ALL_NAV_ITEMS: AttendanceNavItem[] = [
  ...ATTENDANCE_STANDALONE,
  ...ATTENDANCE_NAV_SECTIONS.flatMap((s) => s.items),
  ...ATTENDANCE_FOOTER,
];

export function isAttendanceNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function attendanceSectionHasActiveItem(pathname: string, items: AttendanceNavItem[]) {
  return items.some((item) => isAttendanceNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = ALL_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? 'Digital Attendance';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = ALL_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
