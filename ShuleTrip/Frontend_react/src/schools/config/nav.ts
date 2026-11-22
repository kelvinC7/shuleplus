import { CalendarDays, LayoutDashboard, MapPin, PlusCircle, ShieldCheck, Users } from 'lucide-react';
import type { PortalNavItem } from '@/shared/config/portal-nav';

export const SCHOOL_HOME = '/school/dashboard';

/** Lean sidebar: daily school trip workflows only (other routes stay reachable from dashboard/trips). */
export const SCHOOL_NAV: PortalNavItem[] = [
  { label: 'Dashboard', href: SCHOOL_HOME, icon: LayoutDashboard },
  { label: 'Register new trip', href: '/school/trips/new', icon: PlusCircle },
  { label: 'My trips', href: '/school/trips', icon: MapPin },
  { label: 'Trip calendar', href: '/school/calendar', icon: CalendarDays },
  { label: 'Students & staff', href: '/school/participants', icon: Users },
  { label: 'Guardian consent', href: '/school/consent', icon: ShieldCheck },
];

export function schoolPageTitleFromPath(pathname: string): string {
  if (pathname === SCHOOL_HOME) return 'Dashboard';
  if (pathname.startsWith('/school/trips/new')) return 'Register new trip';
  if (/^\/school\/trips\/[^/]+\/edit/.test(pathname)) return 'Edit trip';
  if (pathname.startsWith('/school/trips')) return 'My trips';
  if (pathname.startsWith('/school/calendar')) return 'Trip calendar';
  if (pathname.startsWith('/school/participants')) return 'Students & staff';
  if (pathname.startsWith('/school/documents')) return 'Documents';
  if (pathname.startsWith('/school/safety')) return 'Safety & compliance';
  if (pathname.startsWith('/school/consent')) return 'Guardian consent';
  if (pathname.startsWith('/school/transport')) return 'Transport';
  if (pathname.startsWith('/school/operations')) return 'Trip operations';
  if (pathname.startsWith('/school/authorizations')) return 'Authorizations';
  if (pathname.startsWith('/school/notifications')) return 'Notifications';
  if (pathname.startsWith('/school/reports')) return 'Reports';
  if (pathname.startsWith('/school/settings')) return 'Settings';
  return 'School portal';
}

export type SchoolNavItem = PortalNavItem;
