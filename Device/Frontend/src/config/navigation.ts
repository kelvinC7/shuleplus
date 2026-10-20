import {
  BarChart3,
  Bell,
  Calendar,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ScrollText,
  Settings,
  User,
  Users,
  Wand2,
} from 'lucide-react';

import type { NavItem } from '@/components/layout/app-sidebar';

export const MODULE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Records',
    href: '/records',
    icon: FileText,
    children: [
      { label: 'All Records', href: '/records' },
      { label: 'Create Record', href: '/records/new' },
    ],
  },
  { label: 'Onboarding', href: '/onboarding', icon: Wand2 },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Notifications', href: '/notifications', icon: Bell, badge: '5' },
  { label: 'Users', href: '/users', icon: Users, adminOnly: true },
  { label: 'Audit Log', href: '/audit-log', icon: ScrollText },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help', href: '/help', icon: HelpCircle },
  { label: 'Profile', href: '/profile', icon: User },
];

export const QUICK_ACTIONS = [
  { label: 'New Record', href: '/records/new', icon: FileText },
  { label: 'Run Report', href: '/analytics', icon: BarChart3 },
  { label: 'Add User', href: '/users', icon: Users },
  { label: 'View Calendar', href: '/calendar', icon: Calendar },
] as const;
