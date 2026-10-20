import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Shirt,
  Package,
  Scissors,
  Warehouse,
  Users,
  Truck,
  CreditCard,
  FileText,
  Settings,
  CalendarDays,
  AlertTriangle,
  Layers,
  UserCog,
  Undo2,
} from "lucide-react";

export interface NavLeaf {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavLeaf[];
  requiresFabric?: boolean;
  requiresTailoring?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    title: "Overview",
    icon: LayoutDashboard,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "products",
    title: "Products",
    icon: Shirt,
    items: [
      { href: "/products", label: "Uniform Items", icon: Shirt },
      { href: "/packages", label: "Packages", icon: Package },
    ],
  },
  {
    id: "fabric",
    title: "Fabric",
    icon: Layers,
    requiresFabric: true,
    items: [
      { href: "/fabric-dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/fabric-stock-in", label: "Fabric Stock In", icon: Package },
      { href: "/fabric-stock-out", label: "Fabric Stock Out", icon: Truck },
      {
        href: "/fabric-estimator",
        label: "Production Estimator",
        icon: Scissors,
      },
      { href: "/tailors", label: "Tailoring", icon: UserCog },
      { href: "/fabric-settings", label: "Settings", icon: Settings },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: Warehouse,
    items: [{ href: "/stock", label: "Stock", icon: Warehouse }],
  },
  {
    id: "students",
    title: "Students",
    icon: Users,
    items: [
      { href: "/students", label: "Student Profiles", icon: Users },
      { href: "/distributions", label: "Sells", icon: Truck },
      { href: "/returns", label: "Returns", icon: Undo2 },
      {
        href: "/students/missing",
        label: "Missing Uniforms",
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    icon: CreditCard,
    items: [
      { href: "/sales", label: "Sales", icon: CreditCard },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: FileText,
    items: [
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/academic-settings", label: "Academic Settings", icon: CalendarDays },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function filterNavBySettings(
  settings: {
    enableFabricManagement?: boolean;
    enableTailoring?: boolean;
  } | null,
): NavSection[] {
  return NAV_SECTIONS.filter((section) => {
    if (section.requiresFabric && !settings?.enableFabricManagement)
      return false;
    if (section.requiresTailoring && !settings?.enableTailoring) return false;
    return true;
  }).map((section) => {
    if (section.id !== "fabric") return section;
    // Hide Tailoring leaf when tailoring module is disabled
    if (settings?.enableTailoring) return section;
    return {
      ...section,
      items: section.items.filter((item) => item.href !== "/tailors"),
    };
  });
}

export const FLAT_NAV = NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ href: i.href, label: i.label })),
);

export function isNavActive(pathname: string, href: string) {
  if (href === "/students")
    return pathname === "/students" || /^\/students\/[^/]+$/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionHasActiveItem(pathname: string, items: NavLeaf[]) {
  return items.some((item) => isNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  if (pathname.startsWith("/students/") && pathname !== "/students/missing")
    return "Student Profile";
  const item = FLAT_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`),
  );
  return item?.label ?? "Uniforms";
}
