import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  Wallet,
  CalendarClock,
  Bell,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface OrgAdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ORG_ADMIN_NAV: OrgAdminNavItem[] = [
  { href: "/org-admin/dashboard", label: "Dashboard", description: "KPIs, trends & overview", icon: LayoutDashboard },
  { href: "/org-admin/employees", label: "Employees", description: "Roster & account management", icon: Users },
  { href: "/org-admin/eligibility", label: "Employee Eligibility", description: "Access control & advance rules", icon: ShieldCheck },
  { href: "/org-admin/requests", label: "Advance Requests", description: "Review & approve applications", icon: FileText },
  { href: "/org-admin/active-advances", label: "Active Advances", description: "Running salary advances", icon: Wallet },
  { href: "/org-admin/repayments", label: "Repayment Tracking", description: "Schedules & payroll sync", icon: CalendarClock },
  { href: "/org-admin/notifications", label: "Notifications", description: "Alerts & activity feed", icon: Bell },
  { href: "/org-admin/audit", label: "Audit Logs", description: "Action history & compliance", icon: ClipboardList },
];

export interface OrgAdminNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: OrgAdminNavItem[];
}

export const ORG_ADMIN_NAV_SECTIONS: OrgAdminNavSection[] = [
  { id: "overview", title: "Overview", icon: LayoutDashboard, items: [ORG_ADMIN_NAV[0]] },
  { id: "workforce", title: "Workforce", icon: Users, items: ORG_ADMIN_NAV.slice(1, 3) },
  { id: "advances", title: "Advances", icon: Wallet, items: ORG_ADMIN_NAV.slice(3, 6) },
  { id: "governance", title: "Governance", icon: Bell, items: ORG_ADMIN_NAV.slice(6) },
];

export function formatRwf(n: number) {
  return `${Math.round(n).toLocaleString("en-RW")} RWF`;
}

export function isOrgAdminNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function orgAdminSectionHasActiveItem(pathname: string, items: OrgAdminNavItem[]) {
  return items.some((item) => isOrgAdminNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = ORG_ADMIN_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? "KaziAdvance Admin";
}

export function breadcrumbFromPath(pathname: string): string {
  return `KaziAdvance Admin › ${pageTitleFromPath(pathname)}`;
}
