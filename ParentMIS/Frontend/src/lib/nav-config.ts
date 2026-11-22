import {
  LayoutDashboard,
  User,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  NotebookPen,
  FileText,
  CreditCard,
  MessageSquare,
  CalendarClock,
  ShieldAlert,
  Stethoscope,
  Calendar,
  FileDown,
  Receipt,
  Bell,
  Bus,
} from 'lucide-react';

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Academic',
    icon: GraduationCap,
    children: [
      { label: 'Profile', href: '/profile', icon: User },
      { label: 'Marks', href: '/academic', icon: GraduationCap },
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { label: 'Timetable', href: '/timetable', icon: CalendarDays },
      { label: 'Homework', href: '/homework', icon: NotebookPen },
    ],
  },
  {
    label: 'Finance',
    icon: CreditCard,
    children: [
      { label: 'Fee Management', href: '/fees', icon: CreditCard },
      { label: 'Transactions', href: '/transactions', icon: Receipt },
    ],
  },
  {
    label: 'Transport',
    icon: Bus,
    children: [
      { label: 'Transport overview', href: '/transport', icon: Bus },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Life',
    icon: MessageSquare,
    children: [
      { label: 'Communication', href: '/communication', icon: MessageSquare },
      { label: 'Leave & Permission', href: '/leave', icon: CalendarClock },
      { label: 'Discipline', href: '/discipline', icon: ShieldAlert },
      { label: 'Health Center', href: '/health', icon: Stethoscope },
      { label: 'Events & Calendar', href: '/events', icon: Calendar },
      { label: 'Documents', href: '/documents', icon: FileDown },
    ],
  },
];

export const FLAT_NAV = NAV_ITEMS.flatMap((item) => (item.children ? item.children : [item]));
