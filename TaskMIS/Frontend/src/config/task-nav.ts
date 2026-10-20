import {
  LayoutDashboard,
  CheckSquare,
  Columns3,
  GitBranch,
  Workflow,
  CalendarDays,
  BarChart3,
  Bell,
  Settings,
  Clock,
  FileText,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TaskNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const TASK_NAV_ITEMS: TaskNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Real-time control center & KPIs',
    icon: LayoutDashboard,
  },
  {
    href: '/tasks',
    label: 'Tasks',
    description: 'Manage all tasks & assignments',
    icon: CheckSquare,
  },
  {
    href: '/board',
    label: 'Kanban Board',
    description: 'Drag & drop task board',
    icon: Columns3,
  },
  {
    href: '/workflows',
    label: 'Workflows',
    description: 'Build & manage workflows',
    icon: GitBranch,
  },
  {
    href: '/workflow-builder',
    label: 'Workflow Builder',
    description: 'Visual workflow designer',
    icon: Workflow,
  },
  {
    href: '/calendar',
    label: 'Calendar',
    description: 'Task scheduling & deadlines',
    icon: CalendarDays,
  },
  {
    href: '/time-tracking',
    label: 'Time Tracking',
    description: 'Track time on tasks',
    icon: Clock,
  },
  {
    href: '/reports',
    label: 'Reports',
    description: 'Analytics & performance reports',
    icon: BarChart3,
  },
  {
    href: '/notifications',
    label: 'Notifications',
    description: 'Alerts & notification center',
    icon: Bell,
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Module configuration & templates',
    icon: Settings,
  },
];

export const SUB_PAGES = TASK_NAV_ITEMS.filter((item) => item.href !== '/dashboard');
