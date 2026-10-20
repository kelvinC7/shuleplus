import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Truck,
  BarChart3,
  ClipboardList,
  Package,
  RotateCcw,
  Settings,
  Building2,
  Users,
  FileSignature,
  Wallet,
  Bell,
  TrendingUp,
} from 'lucide-react';
import type { ModuleAccessLevel } from '@/services/iam-api';
import { isProcurementSupervisor } from '@/utils/permissions';

export interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export interface NavSection {
  label: string;
  items: NavLink[];
}

export interface NavItem {
  href?: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: NavLink[];
  sections?: NavSection[];
}

export const SUPERVISOR_NAV: NavItem[] = [
  {
    label: 'Procurement',
    icon: ShoppingCart,
    sections: [
      {
        label: 'Overview',
        items: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }],
      },
      {
        label: 'Requests',
        items: [{ href: '/purchase-requests', label: 'Purchase Requests', icon: FileText }],
      },
      {
        label: 'Purchasing',
        items: [
          { href: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
          { href: '/goods-receivings', label: 'Goods Received', icon: Package },
          { href: '/returns', label: 'Returns', icon: RotateCcw },
          { href: '/contracts', label: 'Contracts', icon: FileSignature },
          { href: '/budgets', label: 'Budgets', icon: Wallet },
        ],
      },
      {
        label: 'Suppliers',
        items: [
          { href: '/suppliers', label: 'Suppliers', icon: Truck },
          { href: '/suppliers/performance', label: 'Supplier Performance', icon: TrendingUp },
        ],
      },
      {
        label: 'Reports & Analytics',
        items: [
          { href: '/reports/analytics', label: 'Procurement Analytics', icon: BarChart3 },
          { href: '/reports/department-spending', label: 'Department Spending', icon: Building2 },
          { href: '/reports/requester-analysis', label: 'Requester Analysis', icon: Users },
        ],
      },
      {
        label: 'Alerts',
        items: [{ href: '/notifications', label: 'Notifications', icon: Bell }],
      },
    ],
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const MANAGE_USER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/purchase-requests', label: 'Purchase Requests', icon: FileText },
];

/** @deprecated use SUPERVISOR_NAV */
export const NAV_ITEMS = SUPERVISOR_NAV;

function flattenNavItems(items: NavItem[]): { href: string; label: string }[] {
  const acc: { href: string; label: string }[] = [];
  for (const item of items) {
    if (item.href) acc.push({ href: item.href, label: item.label });
    item.children?.forEach((c) => acc.push({ href: c.href, label: c.label }));
    item.sections?.forEach((s) =>
      s.items.forEach((c) => acc.push({ href: c.href, label: c.label })),
    );
  }
  return acc;
}

export const FLAT_NAV = flattenNavItems(SUPERVISOR_NAV);

const ALL_FLAT_NAV = [
  ...flattenNavItems(MANAGE_USER_NAV),
  ...FLAT_NAV,
];

export function pageTitleFromPath(pathname: string): string {
  const match = [...ALL_FLAT_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  if (match) return match.label;
  if (pathname.startsWith('/reports')) return 'Reports';
  return 'Dashboard';
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavItemsForUser(
  roles: string[] = [],
  moduleAccessLevel?: ModuleAccessLevel | null,
): NavItem[] {
  if (isProcurementSupervisor(roles, moduleAccessLevel)) {
    return SUPERVISOR_NAV;
  }
  return MANAGE_USER_NAV;
}

export function navHasActivePath(item: NavItem, pathname: string): boolean {
  if (item.href && isNavActive(pathname, item.href)) return true;
  if (item.children?.some((c) => isNavActive(pathname, c.href))) return true;
  if (item.sections?.some((s) => s.items.some((c) => isNavActive(pathname, c.href)))) {
    return true;
  }
  return false;
}
