import {
  LayoutDashboard,
  School,
  Users,
  Truck,
  ShoppingCart,
  ClipboardList,
  Store,
  Receipt,
  Menu,
  Boxes,
  ShoppingBag,
  Banknote,
  BarChart3,
  Bell,
  PackageSearch,
  UserCircle,
  Compass,
  CircleUser,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/contexts/auth-context';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL: NavGroup[] = [
  {
    title: 'General',
    items: [
      { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/app/notifications', label: 'Notifications', icon: Bell },
      { href: '/app/account', label: 'Account', icon: UserCircle },
    ],
  },
];

const SUPERADMIN: NavGroup[] = [
  {
    title: 'Platform',
    items: [
      { href: '/app/canteens', label: 'Canteens', icon: School },
      { href: '/app/register-canteen', label: 'Register Canteen', icon: School },
      { href: '/app/suppliers', label: 'Suppliers', icon: Store },
      { href: '/app/register-supplier', label: 'Register Supplier', icon: Store },
      { href: '/app/applications', label: 'Applications', icon: ClipboardList },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/app/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/app/fleet', label: 'Fleet & Drivers', icon: Truck },
      { href: '/app/register-driver', label: 'Register Driver', icon: Truck },
    ],
  },
];

const OPERATOR: NavGroup[] = [
  {
    title: 'Point of Sale',
    items: [{ href: '/app/sales', label: 'New Sale', icon: Receipt, exact: true }],
  },
  {
    title: 'Canteen',
    items: [
      { href: '/app/menu', label: 'Menu Items', icon: Menu },
      { href: '/app/inventory', label: 'Inventory', icon: Boxes },
      { href: '/app/purchases', label: 'Purchases', icon: ShoppingBag },
      { href: '/app/purchases/new', label: 'Create Purchase', icon: ShoppingCart },
      { href: '/app/track-order', label: 'Track Orders', icon: PackageSearch },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/app/cashout', label: 'Cashout', icon: Banknote },
      { href: '/app/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Marketplace',
    items: [{ href: '/app/discover', label: 'Discover Suppliers', icon: Compass }],
  },
];

const SUPPLIER: NavGroup[] = [
  {
    title: 'Business',
    items: [
      { href: '/app/supplier/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/app/supplier/products', label: 'Products', icon: Boxes },
      { href: '/app/supplier/drivers', label: 'Drivers', icon: Truck },
      { href: '/app/supplier/deliveries', label: 'Deliveries', icon: PackageSearch },
    ],
  },
];

const DRIVER: NavGroup[] = [
  {
    title: 'Deliveries',
    items: [
      { href: '/app/driver/deliveries', label: 'My Deliveries', icon: Truck },
      { href: '/app/driver/location', label: 'Update Location', icon: Compass },
      { href: '/app/driver/profile', label: 'My Profile', icon: CircleUser },
    ],
  },
];

export function navForRole(role: AppRole): NavGroup[] {
  switch (role) {
    case 'superadmin':
      return [...ALL, ...SUPERADMIN];
    case 'operator':
      return [...ALL, ...OPERATOR];
    case 'supplier':
      return [...ALL, ...SUPPLIER];
    case 'driver':
      return [...ALL, ...DRIVER];
    default:
      return ALL;
  }
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case 'superadmin':
      return 'Platform Administrator';
    case 'operator':
      return 'Canteen Operator';
    case 'supplier':
      return 'Supplier';
    case 'driver':
      return 'Driver';
    default:
      return 'Staff';
  }
}
