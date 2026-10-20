import {
  LayoutDashboard,
  GraduationCap,
  CreditCard,
  MessageSquare,
  User,
  CalendarCheck,
  CalendarDays,
  NotebookPen,
  CalendarClock,
  ShieldAlert,
  Stethoscope,
  Calendar,
  FileDown,
  Bell,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PmSidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface PmSidebarSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: PmSidebarItem[];
}

export interface PmSidebarConfig {
  basePath: string;
  standalone?: PmSidebarItem[];
  sections: PmSidebarSection[];
}

export const PM_SIDEBAR: PmSidebarConfig = {
  basePath: '/dashboard',
  standalone: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  sections: [
    {
      id: 'academic',
      title: 'Academic',
      icon: GraduationCap,
      items: [
        { href: '/profile', label: 'Profile', icon: User },
        { href: '/academic', label: 'Marks', icon: GraduationCap },
        { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
        { href: '/timetable', label: 'Timetable', icon: CalendarDays },
        { href: '/homework', label: 'Homework', icon: NotebookPen },
      ],
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: CreditCard,
      items: [
        { href: '/fees', label: 'Fees', icon: CreditCard },
        { href: '/transactions', label: 'Transactions', icon: Receipt },
      ],
    },
    {
      id: 'life',
      title: 'Life',
      icon: MessageSquare,
      items: [
        { href: '/communication', label: 'Communication', icon: MessageSquare },
        { href: '/notifications', label: 'Notifications', icon: Bell },
        { href: '/leave', label: 'Leave', icon: CalendarClock },
        { href: '/discipline', label: 'Discipline', icon: ShieldAlert },
        { href: '/health', label: 'Health', icon: Stethoscope },
        { href: '/events', label: 'Events', icon: Calendar },
        { href: '/documents', label: 'Documents', icon: FileDown },
      ],
    },
  ],
};

export function breadcrumbLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  const all = [
    ...(PM_SIDEBAR.standalone ?? []),
    ...PM_SIDEBAR.sections.flatMap((s) => s.items),
  ];
  const match = all.find((nav) =>
    nav.href === '/dashboard' ? pathname === nav.href : pathname.startsWith(nav.href)
  );
  return match?.label ?? 'Parent Portal';
}
