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
  Smartphone,
  History,
  MessageSquareText,
  PieChart,
  Bus,
  MapPin,
  Settings2,
  MapPinned,
  ClipboardCheck,
  PackageCheck,
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
        { href: '/academic?tab=overview', label: 'Overview', icon: LayoutDashboard },
        { href: '/academic?tab=marks', label: 'Marks & performance', icon: GraduationCap },
        { href: '/academic?tab=schedule', label: 'Assessment schedule', icon: CalendarClock },
        { href: '/academic?tab=reports', label: 'Report cards', icon: FileDown },
        { href: '/academic?tab=feedback', label: 'Teacher feedback', icon: NotebookPen },
        { href: '/shulekit', label: 'ShuleKit', icon: PackageCheck },
        { href: '/profile', label: 'Profile', icon: User },
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
      id: 'family-comms',
      title: 'Family communication',
      icon: Smartphone,
      items: [
        { href: '/sms-packages', label: 'SMS Packages', icon: Smartphone },
        { href: '/sms-packages/history', label: 'SMS Purchase History', icon: History },
        { href: '/sms-packages/messages', label: 'Messages & Delivery', icon: MessageSquareText },
        { href: '/sms-packages/usage', label: 'SMS Usage', icon: PieChart },
      ],
    },
    {
      id: 'transport',
      title: 'Transport',
      icon: Bus,
      items: [
        { href: '/transport', label: 'Bus & route', icon: Bus },
        { href: '/transport/map', label: 'Live map', icon: MapPin },
        { href: '/transport/notifications', label: 'Bus alerts', icon: Bell },
        { href: '/transport/settings', label: 'Alerts & language', icon: Settings2 },
      ],
    },
    {
      id: 'shuletrip',
      title: 'ShuleTrip',
      icon: MapPinned,
      items: [
        { href: '/shuletrip', label: 'Overview', icon: MapPinned },
        { href: '/shuletrip/upcoming', label: 'Upcoming trips', icon: Calendar },
        { href: '/shuletrip/consents', label: 'Consent center', icon: ClipboardCheck },
        { href: '/shuletrip/history', label: 'Trip history', icon: History },
        { href: '/shuletrip/notifications', label: 'Trip alerts', icon: Bell },
      ],
    },
    {
      id: 'life',
      title: 'Life',
      icon: MessageSquare,
      items: [
        { href: '/communication', label: 'Communication', icon: MessageSquare },
        { href: '/notifications', label: 'All notifications', icon: Bell },
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