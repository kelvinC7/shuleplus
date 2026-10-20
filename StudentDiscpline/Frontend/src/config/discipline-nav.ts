import {
  LayoutDashboard,
  ShieldAlert,
  FileWarning,
  Scale,
  Ticket,
  DoorOpen,
  Award,
  FileText,
  PlusCircle,
  Clock,
  Settings,
  QrCode,
  LogOut,
  LogIn,
  Users,
  AlertTriangle,
  ClipboardList,
  Tablet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DisciplineNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const DISCIPLINE_NAV_ITEMS: DisciplineNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Cases, permissions & behavior overview',
    icon: LayoutDashboard,
  },
  {
    href: '/discipline',
    label: 'All Cases',
    description: 'Track disciplinary incidents',
    icon: FileWarning,
  },
  {
    href: '/discipline/marks',
    label: 'Discipline Marks',
    description: 'Default rules & point values',
    icon: Scale,
  },
  {
    href: '/permissions',
    label: 'All Requests',
    description: 'Student permission slips',
    icon: Clock,
  },
  {
    href: '/permissions/create',
    label: 'New Request',
    description: 'Create a permission request',
    icon: PlusCircle,
  },
  {
    href: '/gate',
    label: 'Gate Dashboard',
    description: 'Monitor campus movement',
    icon: DoorOpen,
  },
  {
    href: '/gate/mode',
    label: 'Gate Mode',
    description: 'Tablet-friendly gate interface',
    icon: Tablet,
  },
  {
    href: '/gate/scan',
    label: 'QR / Card Scanner',
    description: 'Scan student or permission',
    icon: QrCode,
  },
  {
    href: '/gate/checkout',
    label: 'Check-Out',
    description: 'Record student departure',
    icon: LogOut,
  },
  {
    href: '/gate/checkin',
    label: 'Check-In / Returns',
    description: 'Record student return',
    icon: LogIn,
  },
  {
    href: '/gate/outside',
    label: 'Currently Outside',
    description: 'Students off campus now',
    icon: DoorOpen,
  },
  {
    href: '/gate/overdue',
    label: 'Overdue Students',
    description: 'Past expected return time',
    icon: AlertTriangle,
  },
  {
    href: '/gate/logs',
    label: 'Gate Logs',
    description: 'Entry & exit audit trail',
    icon: ClipboardList,
  },
  {
    href: '/gate/officers',
    label: 'Gate Officers',
    description: 'Manage gate staff',
    icon: Users,
  },
  {
    href: '/gate/settings',
    label: 'Gate Settings',
    description: 'Gates & security rules',
    icon: Settings,
  },
  {
    href: '/behavior',
    label: 'Positive Behavior',
    description: 'Awards & merit records',
    icon: Award,
  },
  {
    href: '/reports',
    label: 'Reports',
    description: 'Analytics & exports',
    icon: FileText,
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Default scores & mark rules',
    icon: Settings,
  },
];

export interface DisciplineNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: DisciplineNavItem[];
}

export const GATE_OFFICER_NAV_ITEMS: DisciplineNavItem[] = DISCIPLINE_NAV_ITEMS.slice(5, 13);

export const GATE_OFFICER_ALLOWED_PATHS = [
  '/gate',
  '/gate/mode',
  '/gate/scan',
  '/gate/checkout',
  '/gate/checkin',
  '/gate/outside',
  '/gate/overdue',
  '/gate/logs',
];

export function isGateOfficerOnlyPath(pathname: string) {
  return GATE_OFFICER_ALLOWED_PATHS.some(
    (p) => pathname === p || (p !== '/gate' && pathname.startsWith(`${p}/`))
  );
}

export function canAccessFullDiscipline(roles?: string[]) {
  const normalized = (roles ?? []).map((r) => r.toLowerCase());
  return normalized.some((r) =>
    ['organization_admin', 'school_manager', 'discipline_officer'].includes(r)
  );
}

export const DISCIPLINE_NAV_SECTIONS: DisciplineNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [DISCIPLINE_NAV_ITEMS[0]],
  },
  {
    id: 'discipline',
    title: 'Discipline',
    icon: ShieldAlert,
    items: DISCIPLINE_NAV_ITEMS.slice(1, 3),
  },
  {
    id: 'permissions',
    title: 'Permissions',
    icon: Ticket,
    items: DISCIPLINE_NAV_ITEMS.slice(3, 5),
  },
  {
    id: 'gate',
    title: 'Gate Management',
    icon: DoorOpen,
    items: DISCIPLINE_NAV_ITEMS.slice(5, 14),
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: FileText,
    items: DISCIPLINE_NAV_ITEMS.slice(14),
  },
];

export const GATE_OFFICER_NAV_SECTION: DisciplineNavSection = {
  id: 'gate-officer',
  title: 'Gate Officers',
  icon: DoorOpen,
  items: GATE_OFFICER_NAV_ITEMS,
};

export function getNavSections(gateOnly: boolean): DisciplineNavSection[] {
  if (gateOnly) return [GATE_OFFICER_NAV_SECTION];
  return DISCIPLINE_NAV_SECTIONS;
}

export function isDisciplineNavActive(pathname: string, href: string) {
  if (href === '/discipline') return pathname === '/discipline';
  if (href === '/gate') return pathname === '/gate';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function disciplineSectionHasActiveItem(pathname: string, items: DisciplineNavItem[]) {
  return items.some((item) => isDisciplineNavActive(pathname, item.href));
}

const GATE_TITLES: Record<string, string> = {
  '/gate': 'Gate Dashboard',
  '/gate/mode': 'Gate Mode',
  '/gate/scan': 'QR / Card Scanner',
  '/gate/checkout': 'Check-Out',
  '/gate/checkin': 'Check-In / Returns',
  '/gate/outside': 'Currently Outside',
  '/gate/overdue': 'Overdue Students',
  '/gate/logs': 'Gate Logs',
  '/gate/officers': 'Gate Officers',
  '/gate/settings': 'Gate Settings',
};

export function pageTitleFromPath(pathname: string): string {
  const gateMatch = Object.entries(GATE_TITLES).find(([href]) =>
    pathname === href || (href !== '/gate' && pathname.startsWith(`${href}/`))
  );
  if (gateMatch) return gateMatch[1];
  if (pathname === '/gate' || pathname.startsWith('/gate/')) return 'Gate Management';

  const item = DISCIPLINE_NAV_ITEMS.find(
    (nav) => pathname === nav.href || (nav.href !== '/discipline' && nav.href !== '/gate' && pathname.startsWith(`${nav.href}/`))
  );
  if (item) return item.label;
  if (pathname === '/discipline' || pathname.startsWith('/discipline/')) {
    if (pathname.includes('/create')) return 'Create Case';
    if (pathname.includes('/marks')) return 'Discipline Marks';
    if (pathname.match(/\/discipline\/[^/]+$/)) return 'Case Details';
    return 'Discipline Cases';
  }
  if (pathname.includes('/permissions/') && !pathname.includes('/create')) return 'Permission Details';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Student Discipline';
}
