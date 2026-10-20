import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  Truck,
  ShoppingCart,
  ArrowRightLeft,
  Scale,
  ClipboardList,
  FileText,
  BarChart3,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

/** @deprecated Use NAV_SECTIONS / INVENTORY_NAV_ITEMS */
export interface LegacyNavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  children?: { href: string; label: string; icon: LucideIcon }[];
}

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Stock overview & alerts', icon: LayoutDashboard },
  { href: '/products', label: 'Products', description: 'Catalog & SKUs', icon: Package },
  { href: '/categories', label: 'Categories', description: 'Product groupings', icon: FolderTree },
  { href: '/stock-summary', label: 'Stock Summary', description: 'Levels & expiry', icon: BarChart3 },
  { href: '/stores', label: 'Stores', description: 'Warehouses & locations', icon: Warehouse },
  { href: '/suppliers', label: 'Suppliers', description: 'Vendor directory', icon: Truck },
  { href: '/receivings', label: 'Stock Receiving', description: 'Goods inward (GRN)', icon: ShoppingCart },
  { href: '/issues', label: 'Stock Issue', description: 'Goods outward', icon: ArrowRightLeft },
  { href: '/transfers', label: 'Transfers', description: 'Move stock between stores', icon: ArrowRightLeft },
  { href: '/adjustments', label: 'Adjustments', description: 'Corrections & write-offs', icon: Scale },
  { href: '/stock-requests', label: 'Requests', description: 'Department requisitions', icon: ClipboardList },
  { href: '/physical-counts', label: 'Physical Counts', description: 'Physical stock counts', icon: ClipboardList },
  { href: '/disposals', label: 'Disposals', description: 'Expired & damaged stock', icon: Trash2 },
  { href: '/reports', label: 'Reports', description: 'Exports & analytics', icon: FileText },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [INVENTORY_NAV_ITEMS[0]],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: Package,
    items: INVENTORY_NAV_ITEMS.slice(1, 4),
  },
  {
    id: 'locations',
    title: 'Locations',
    icon: Warehouse,
    items: INVENTORY_NAV_ITEMS.slice(4, 6),
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: ShoppingCart,
    items: INVENTORY_NAV_ITEMS.slice(6, 10),
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: ClipboardList,
    items: INVENTORY_NAV_ITEMS.slice(10),
  },
];

/** Legacy flat nav for AppSidebar (deprecated) */
export const NAV_ITEMS: LegacyNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Inventory',
    icon: Package,
    children: [
      { href: '/products', label: 'Products', icon: Package },
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/stock-summary', label: 'Stock Summary', icon: BarChart3 },
    ],
  },
  { href: '/stores', label: 'Stores', icon: Warehouse },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  {
    label: 'Transactions',
    icon: ShoppingCart,
    children: [
      { href: '/receivings', label: 'Stock Receiving', icon: ShoppingCart },
      { href: '/issues', label: 'Stock Issue', icon: ArrowRightLeft },
      { href: '/transfers', label: 'Transfers', icon: ArrowRightLeft },
      { href: '/adjustments', label: 'Adjustments', icon: Scale },
    ],
  },
  { href: '/stock-requests', label: 'Requests', icon: ClipboardList },
  { href: '/physical-counts', label: 'Physical Counts', icon: ClipboardList },
  { href: '/disposals', label: 'Disposals', icon: Trash2 },
  { href: '/reports', label: 'Reports', icon: FileText },
];

export const FLAT_NAV = INVENTORY_NAV_ITEMS.map(({ href, label }) => ({ href, label }));

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionHasActiveItem(pathname: string, items: NavItem[]) {
  return items.some((item) => isNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = INVENTORY_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (item) return item.label;
  return 'Inventory';
}
