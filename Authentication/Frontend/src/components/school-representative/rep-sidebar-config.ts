import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Receipt,
  Scale,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface RepSidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, only highlight on exact path (e.g. finance hub vs school-fees). */
  exact?: boolean;
}

export interface RepSidebarSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: RepSidebarItem[];
}

export interface RepSidebarConfig {
  basePath: string;
  standalone: RepSidebarItem[];
  sections: RepSidebarSection[];
}

export const REP_SIDEBAR: RepSidebarConfig = {
  basePath: '/school-representative',
  standalone: [
    { href: '/school-representative', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/school-representative/schools', label: 'My Schools', icon: Building2 },
  ],
  sections: [
    {
      id: 'people',
      title: 'People',
      icon: Users,
      items: [
        { href: '/school-representative/students', label: 'Students', icon: GraduationCap },
        { href: '/school-representative/staff', label: 'Staff', icon: Users },
      ],
    },
    {
      id: 'academics',
      title: 'Academics',
      icon: BookOpen,
      items: [{ href: '/school-representative/academics', label: 'Academic summary', icon: BookOpen }],
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: Wallet,
      items: [
        { href: '/school-representative/finance/school-fees', label: 'School fees', icon: Scale },
        { href: '/school-representative/finance/transactions', label: 'Payment transactions', icon: Receipt },
        { href: '/school-representative/finance/balances', label: 'Student balances', icon: LineChart },
        { href: '/school-representative/finance/reports', label: 'Financial Analytics', icon: BarChart3 },
      ],
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: ClipboardCheck,
      items: [
        { href: '/school-representative/attendance/metrics', label: 'Attendance metrics', icon: BarChart3 },
        { href: '/school-representative/attendance/gate', label: 'Gate attendance', icon: ClipboardCheck },
      ],
    },
    {
      id: 'insights',
      title: 'Insights',
      icon: BarChart3,
      items: [
        { href: '/school-representative/reports', label: 'Reports & analytics', icon: FileBarChart },
        { href: '/school-representative/alerts', label: 'Alerts & follow-up', icon: AlertCircle },
      ],
    },
  ],
};

export function repBreadcrumbLabel(pathname: string): string {
  const all = [...REP_SIDEBAR.standalone, ...REP_SIDEBAR.sections.flatMap((s) => s.items)];
  const match = all.find((nav) =>
    nav.href === REP_SIDEBAR.basePath
      ? pathname === nav.href
      : pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (pathname === '/school-representative' || pathname === '/school-representative/') return 'Dashboard';
  return match?.label ?? 'Representative';
}
