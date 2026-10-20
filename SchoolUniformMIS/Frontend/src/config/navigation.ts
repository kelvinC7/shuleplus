import {
  BarChart3,
  HelpCircle,
  LayoutDashboard,
  Package,
  Settings,
  Shirt,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { NavItem } from "@/components/layout/app-sidebar";

/** Legacy design-preview nav (live app uses `lib/nav-config.ts`). */
export const MODULE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Shirt },
  { label: "Stock", href: "/stock", icon: Package },
  { label: "Students", href: "/students", icon: Users },
  { label: "Sales", href: "/sales", icon: ShoppingCart },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export const QUICK_ACTIONS = [
  { label: "New product", href: "/products", icon: Shirt },
  { label: "New sale", href: "/sales", icon: ShoppingCart },
  { label: "Students", href: "/students", icon: Users },
  { label: "Reports", href: "/reports", icon: BarChart3 },
] as const;
