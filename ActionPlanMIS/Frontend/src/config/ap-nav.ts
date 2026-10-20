import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Wallet,
  Target,
  Tags,
  CheckSquare,
  FileText,
  Users,
  MessageSquare,
  Building2,
  Kanban,
  CalendarRange,
  Flag,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ApNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const AP_NAV_ITEMS: ApNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Executive overview & analytics',
    icon: LayoutDashboard,
  },
  {
    href: '/pillars',
    label: 'Strategic Pillars',
    description: 'Rwanda school planning priorities',
    icon: Layers,
  },
  {
    href: '/plans',
    label: 'Action Plans',
    description: 'Create, manage & track all plans',
    icon: ClipboardList,
  },
  {
    href: '/calendar',
    label: 'Calendar',
    description: 'Schedules, deadlines & events',
    icon: Calendar,
  },
  {
    href: '/tasks',
    label: 'Tasks',
    description: 'Task management & subtasks',
    icon: CheckSquare,
  },
  {
    href: '/kanban',
    label: 'Kanban',
    description: 'Board view of plan tasks',
    icon: Kanban,
  },
  {
    href: '/gantt',
    label: 'Gantt',
    description: 'Timeline of plans and tasks',
    icon: CalendarRange,
  },
  {
    href: '/milestones',
    label: 'Milestones',
    description: 'Key dates across all plans',
    icon: Flag,
  },
  {
    href: '/budget',
    label: 'Budget & Expenses',
    description: 'Financial tracking & costs',
    icon: Wallet,
  },
  {
    href: '/kpis',
    label: 'KPIs',
    description: 'Performance indicators',
    icon: Target,
  },
  {
    href: '/categories',
    label: 'Categories',
    description: 'Plan categorization',
    icon: Tags,
  },
  {
    href: '/approvals',
    label: 'Approvals',
    description: 'Approval workflow queue',
    icon: Users,
  },
  {
    href: '/meetings',
    label: 'Meetings',
    description: 'Meeting management & minutes',
    icon: MessageSquare,
  },
  {
    href: '/templates',
    label: 'Templates',
    description: 'Reusable plan templates',
    icon: FileText,
  },
  {
    href: '/reports',
    label: 'Reports',
    description: 'Export & analytics reports',
    icon: Building2,
  },
];

export const SUB_PAGES = AP_NAV_ITEMS.filter((item) => item.href !== '/dashboard');
