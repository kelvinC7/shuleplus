import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  ClipboardCheck,
  QrCode,
  ListChecks,
  UserCheck,
  Wallet,
  Shield,
  CalendarDays,
  User,
  UserCog,
  Presentation,
  Home,
  School,
  Briefcase,
  Building2,
  FileText,
  ClipboardList,
  ScanLine,
} from 'lucide-react';
import { SALARY_ADVANCE } from './salary-advance-brand';

export interface TeacherNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  available?: boolean;
  /** Who can see this nav item when available */
  access?: 'all' | 'approve' | 'org-admin';
}

export interface TeacherNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: TeacherNavItem[];
}

export const TEACHER_NAV_SECTIONS: TeacherNavSection[] = [
  {
    id: 'home',
    title: 'Home',
    icon: Home,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, available: true }],
  },
  {
    id: 'teaching',
    title: 'Academic · Teaching',
    icon: School,
    items: [
      { href: '/timetable', label: 'My Timetable', icon: Calendar, available: true },
      { href: '/classroom-scan', label: 'Classroom Check-In', icon: QrCode, available: true },
      { href: '/students', label: 'My Classes', icon: Users, available: true },
      { href: '/my-teaching', label: 'My Teaching', icon: Presentation, available: true },
      { href: '/english-club', label: 'My Courses', icon: BookOpen, available: true },
      { href: '/examinations', label: 'Examinations', icon: ScanLine, available: true },
    ],
  },
  {
    id: 'attendance',
    title: 'Academic · Attendance',
    icon: ClipboardCheck,
    items: [
      { href: '/attendance', label: 'Period Attendance', icon: ClipboardCheck, available: true },
      { href: '/roll-call', label: 'Round Roll Call', icon: ListChecks, available: true },
      { href: '/my-attendance', label: 'My Attendance', icon: UserCheck, available: true },
    ],
  },
  {
    id: 'assessments',
    title: 'Courses & Marks',
    icon: ClipboardList,
    items: [
      { href: '/assessments', label: 'Courses & Marks', icon: ClipboardList, available: true },
      { href: '/assessments/create', label: 'Create Assessment', icon: FileText, available: true },
      { href: '/homework', label: 'Homework', icon: BookOpen, available: true },
    ],
  },
  {
    id: 'work-records',
    title: 'Work & Records',
    icon: Briefcase,
    items: [
      { href: '/permissions', label: 'Permissions', icon: FileText, available: true },
      { href: '/calendar', label: 'School Calendar', icon: CalendarDays, available: true },
    ],
  },
  {
    id: 'school-services',
    title: 'School Services',
    icon: Building2,
    items: [
      {
        href: '/salary-advance',
        label: SALARY_ADVANCE.shortName,
        icon: Wallet,
        available: true,
        access: 'all',
      },
      {
        href: '/salary-advance/approvals',
        label: SALARY_ADVANCE.approvals,
        icon: Shield,
        available: true,
        access: 'approve',
      },
      {
        href: '/salary-advance/approvers',
        label: SALARY_ADVANCE.approvers,
        icon: UserCog,
        available: true,
        access: 'org-admin',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    icon: User,
    items: [{ href: '/profile', label: 'My Account', icon: User, available: true }],
  },
];

export function isTeacherNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  if (href === '/assessments') {
    return pathname.startsWith('/assessments/') && !pathname.startsWith('/assessments/create');
  }
  if (href === '/examinations') {
    return pathname.startsWith('/examinations/');
  }
  return pathname.startsWith(`${href}/`);
}

export function teacherSectionHasActiveItem(pathname: string, items: TeacherNavItem[]): boolean {
  return items.some((item) => isTeacherNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  for (const section of TEACHER_NAV_SECTIONS) {
    for (const item of section.items) {
      if (isTeacherNavActive(pathname, item.href)) return item.label;
    }
  }
  return 'Teacher Portal';
}

export const DASHBOARD_TILES = [
  {
    href: '/examinations',
    title: 'Examinations',
    description: 'Assigned exam rooms, student lists, entry and exit attendance',
    available: true,
  },
  {
    href: '/my-teaching',
    title: 'My Teaching',
    description: "Today's lessons, start class, and complete",
    available: true,
  },
  {
    href: '/timetable',
    title: 'My Timetable',
    description: "Today's schedule with check-in status",
    available: true,
  },
  {
    href: '/classroom-scan',
    title: 'Classroom Check-In',
    description: 'Scan classroom QR for your period',
    available: true,
  },
  {
    href: '/attendance',
    title: 'Period Attendance',
    description: 'Mark period attendance and roll call',
    available: true,
  },
  {
    href: '/my-attendance',
    title: 'My Attendance',
    description: 'Your RFID check-in and attendance history',
    available: true,
  },
  {
    href: '/assessments',
    title: 'Courses & Marks',
    description: 'Manage your courses, assessments, and marks',
    available: true,
  },
  {
    href: '/permissions',
    title: 'Permissions',
    description: 'Request leave and track approval status',
    available: true,
  },
  {
    href: '/calendar',
    title: 'School Calendar',
    description: 'Events, holidays, exams, and meetings',
    available: true,
  },
  {
    href: '/salary-advance',
    title: SALARY_ADVANCE.name,
    description: 'Request and manage salary advances via payroll deduction',
    available: true,
  },
  {
    href: '/students',
    title: 'My Classes',
    description: 'Class rosters and student profiles',
    available: true,
  },
  {
    href: '/english-club',
    title: 'My Courses',
    description: 'Subjects and classes you teach',
    available: true,
  },
];
