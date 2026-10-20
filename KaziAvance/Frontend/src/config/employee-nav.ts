import {
  LayoutDashboard,
  Wallet,
  Calculator,
  History,
  FolderOpen,
  Bell,
  type LucideIcon,
} from "lucide-react";

export interface EmployeeNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const EMPLOYEE_NAV: EmployeeNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, eligibility & balances",
    icon: LayoutDashboard,
  },
  {
    href: "/request",
    label: "Request Advance",
    description: "Calculator & application wizard",
    icon: Calculator,
  },
  {
    href: "/advances",
    label: "My Advances",
    description: "Active advance & repayments",
    icon: Wallet,
  },
  {
    href: "/history",
    label: "History",
    description: "Salary & advance history",
    icon: History,
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Uploads & agreements",
    icon: FolderOpen,
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Alerts & messages",
    icon: Bell,
  },
];

export interface EmployeeNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: EmployeeNavItem[];
}

export const EMPLOYEE_NAV_SECTIONS: EmployeeNavSection[] = [
  { id: "home", title: "Home", icon: LayoutDashboard, items: [EMPLOYEE_NAV[0]] },
  { id: "advances", title: "Advances", icon: Wallet, items: EMPLOYEE_NAV.slice(1, 4) },
  { id: "account", title: "Account", icon: FolderOpen, items: EMPLOYEE_NAV.slice(4) },
];

export function isEmployeeNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function employeeSectionHasActiveItem(pathname: string, items: EmployeeNavItem[]) {
  return items.some((item) => isEmployeeNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = EMPLOYEE_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? "KaziAdvance";
}

export function breadcrumbFromPath(pathname: string): string {
  return `KaziAdvance › ${pageTitleFromPath(pathname)}`;
}
