export interface SmNavLink {
  label: string;
  href: string;
}

export interface SmNavItem {
  label: string;
  href?: string;
  icon: 'dashboard' | 'students' | 'classes' | 'settings';
  children?: SmNavLink[];
}

export const SM_NAV_ITEMS: SmNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  {
    label: 'Students',
    icon: 'students',
    children: [
      { label: 'Manage Students', href: '/students' },
      { label: 'Student Reports', href: '/students/reports' },
      { label: 'Incomplete Profiles', href: '/students/reports/missing-information' },
      { label: 'Student Promotion', href: '/students/promotion' },
    ],
  },
  {
    label: 'Classes',
    icon: 'classes',
    children: [
      { label: 'Manage Classes', href: '/classes' },
      { label: 'Class Teachers', href: '/classes/head-teachers' },
      { label: 'Class Monitors', href: '/classes/monitors' },
    ],
  },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

export function isSmNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  if (href === '/students') {
    return (
      pathname === '/students' ||
      pathname.startsWith('/students/new') ||
      /^\/students\/[^/]+\/edit/.test(pathname) ||
      /^\/students\/[^/]+$/.test(pathname)
    );
  }
  if (href === '/students/promotion') {
    return pathname.startsWith('/students/promotion');
  }
  if (href === '/students/reports') {
    return pathname === '/students/reports';
  }
  if (href === '/students/reports/missing-information') {
    return pathname.startsWith('/students/reports/missing-information');
  }
  if (href === '/classes') {
    return pathname === '/classes' || pathname.startsWith('/classes/new') || /^\/classes\/[^/]+\/edit/.test(pathname);
  }
  if (href === '/classes/head-teachers') {
    return pathname.startsWith('/classes/head-teachers');
  }
  if (href === '/classes/monitors') {
    return pathname.startsWith('/classes/monitors');
  }
  if (href === '/settings') {
    return pathname === '/settings' || pathname.startsWith('/settings/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isStudentsGroupActive(pathname: string): boolean {
  return pathname.startsWith('/students');
}

export function isClassesGroupActive(pathname: string): boolean {
  return pathname.startsWith('/classes');
}

export function pageTitleFromPath(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/students/reports/missing-information')) return 'Incomplete Profiles';
  if (pathname.startsWith('/students/reports')) return 'Student Reports';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/students/new')) return 'Add Student';
  if (/^\/students\/[^/]+\/edit/.test(pathname)) return 'Edit Student';
  if (/^\/students\/[^/]+$/.test(pathname)) return 'Student Profile';
  if (pathname.startsWith('/students/promotion')) return 'Student Promotion';
  if (pathname.startsWith('/students')) return 'Manage Students';
  if (pathname.startsWith('/classes/new')) return 'New Class';
  if (/^\/classes\/[^/]+\/edit/.test(pathname)) return 'Edit Class';
  if (pathname.startsWith('/classes/head-teachers')) return 'Class Teachers';
  if (pathname.startsWith('/classes/monitors')) return 'Class Monitors';
  if (pathname.startsWith('/classes')) return 'Classes';
  return 'Student Management';
}

export function searchPlaceholderFromPath(pathname: string): string {
  if (pathname.startsWith('/students/promotion')) return 'Search students for promotion…';
  if (pathname.startsWith('/students/reports/missing-information')) return 'Search incomplete profiles…';
  if (pathname.startsWith('/students/reports')) return 'Search student reports…';
  if (pathname.startsWith('/settings')) return 'Search settings…';
  if (pathname.startsWith('/classes')) return 'Search classes, streams, categories…';
  if (pathname.startsWith('/dashboard') || pathname === '/') return 'Search students, classes…';
  return 'Search students, codes, guardians…';
}
