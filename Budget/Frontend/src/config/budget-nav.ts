import {
  LayoutDashboard,
  BarChart3,
  PlusCircle,
  Wallet,
  Activity,
  Building2,
  Scale,
  CheckCircle2,
  UserCog,
  Settings,
  ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface BudgetNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BUDGET_NAV_ITEMS: BudgetNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Budget KPIs and alerts',
    icon: LayoutDashboard,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Spend and allocation charts',
    icon: BarChart3,
  },
  {
    href: '/create',
    label: 'Create Budget',
    description: 'Draft income and submit',
    icon: PlusCircle,
  },
  {
    href: '/expenses',
    label: 'Expenses',
    description: 'Allocate and manage lines',
    icon: Wallet,
  },
  {
    href: '/usage',
    label: 'Usage Tracking',
    description: 'Register spend against lines',
    icon: Activity,
  },
  {
    href: '/departments',
    label: 'Departments',
    description: 'Department aggregation',
    icon: Building2,
  },
  {
    href: '/vs-actual',
    label: 'Budget vs Usage Tracking',
    description: 'Planned vs used utilization',
    icon: Scale,
  },
  {
    href: '/approvals',
    label: 'Approvals',
    description: 'Status timeline and submit',
    icon: CheckCircle2,
  },
  {
    href: '/manager',
    label: 'Manager Review',
    description: 'Approve or reject budgets',
    icon: UserCog,
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Academic year & terms',
    icon: Settings,
  },
  {
    href: '/audit-logs',
    label: 'Audit Logs',
    description: 'Who changed budgets and when',
    icon: ScrollText,
  },
];

export interface BudgetNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: BudgetNavItem[];
}

export const BUDGET_NAV_SECTIONS: BudgetNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [BUDGET_NAV_ITEMS[0], BUDGET_NAV_ITEMS[1]],
  },
  {
    id: 'planning',
    title: 'Planning',
    icon: PlusCircle,
    items: [BUDGET_NAV_ITEMS[2], BUDGET_NAV_ITEMS[3], BUDGET_NAV_ITEMS[4]],
  },
  {
    id: 'analysis',
    title: 'Analysis',
    icon: Scale,
    items: [BUDGET_NAV_ITEMS[5], BUDGET_NAV_ITEMS[6]],
  },
  {
    id: 'governance',
    title: 'Governance',
    icon: CheckCircle2,
    items: [BUDGET_NAV_ITEMS[7], BUDGET_NAV_ITEMS[8], BUDGET_NAV_ITEMS[9], BUDGET_NAV_ITEMS[10]],
  },
];

export function isBudgetNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function budgetSectionHasActiveItem(pathname: string, items: BudgetNavItem[]) {
  return items.some((item) => isBudgetNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = BUDGET_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (item) return item.label;
  return 'School Budget';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = BUDGET_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
