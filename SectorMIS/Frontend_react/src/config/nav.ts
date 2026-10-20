export interface SeiNavLink {
  label: string;
  href: string;
  icon: string;
}

export interface SeiNavItem {
  label: string;
  href?: string;
  icon: string;
  children?: SeiNavLink[];
}

export const SEI_NAV_ITEMS: SeiNavItem[] = [
  {
    label: 'Overview',
    icon: 'overview',
    children: [
      { label: 'Command Center', href: '/dashboard', icon: 'command' },
      { label: 'Morning Situation', href: '/morning', icon: 'morning' },
    ],
  },
  {
    label: 'Schools & Attendance',
    icon: 'schools',
    children: [
      { label: 'Schools', href: '/schools', icon: 'schools' },
      { label: 'Student Attendance', href: '/students', icon: 'students' },
      { label: 'Staff Attendance', href: '/staff', icon: 'staff' },
    ],
  },
  {
    label: 'Intelligence',
    icon: 'intelligence',
    children: [
      { label: 'Analytics', href: '/analytics', icon: 'analytics' },
      { label: 'Attention Required', href: '/attention', icon: 'attention' },
      { label: 'Data Quality', href: '/data-quality', icon: 'quality' },
      { label: 'Attendance Integrity', href: '/integrity', icon: 'integrity' },
    ],
  },
  {
    label: 'Field Operations',
    icon: 'operations',
    children: [
      { label: 'Device Health', href: '/devices', icon: 'devices' },
      { label: 'Sector Map', href: '/map', icon: 'map' },
      { label: 'Follow-up Cases', href: '/follow-up', icon: 'followup' },
      { label: 'School Visits', href: '/visits', icon: 'visits' },
    ],
  },
  { label: 'Reports', href: '/reports', icon: 'reports' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

const GROUP_PREFIXES: Record<string, string[]> = {
  Overview: ['/dashboard', '/morning', '/'],
  'Schools & Attendance': ['/schools', '/students', '/staff'],
  Intelligence: ['/analytics', '/attention', '/data-quality', '/integrity'],
  'Field Operations': ['/devices', '/map', '/follow-up', '/visits'],
};

export function isSeiNavGroupActive(label: string, pathname: string): boolean {
  const prefixes = GROUP_PREFIXES[label];
  if (!prefixes) return false;
  return prefixes.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));
}

export function isSeiNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  if (href === '/schools') {
    return pathname === '/schools' || pathname.startsWith('/schools/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleFromPath(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'Command Center';
  if (pathname.startsWith('/morning')) return 'Morning Situation';
  if (pathname.startsWith('/schools/')) return 'School Profile';
  if (pathname.startsWith('/schools')) return 'Schools';
  if (pathname.startsWith('/students')) return 'Student Attendance';
  if (pathname.startsWith('/staff')) return 'Staff Attendance';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/attention')) return 'Attention Required';
  if (pathname.startsWith('/devices')) return 'Device Health';
  if (pathname.startsWith('/data-quality')) return 'Data Quality';
  if (pathname.startsWith('/map')) return 'Sector Map';
  if (pathname.startsWith('/follow-up')) return 'Follow-up Cases';
  if (pathname.startsWith('/visits')) return 'School Visits';
  if (pathname.startsWith('/integrity')) return 'Attendance Integrity';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'SEI Attendance';
}

export function searchPlaceholderFromPath(pathname: string): string {
  if (pathname.startsWith('/schools')) return 'Search schools…';
  if (pathname.startsWith('/follow-up')) return 'Search cases…';
  if (pathname.startsWith('/students')) return 'Search students, schools…';
  return 'Search sector attendance…';
}
