import {
  LayoutDashboard,
  School,
  Files,
  ScrollText,
  CheckCircle2,
  Map,
  Building2,
  MapPinned,
  CalendarDays,
  List,
  FileSearch,
  UserCircle,
  BarChart3,
  ClipboardCheck,
  GitBranch,
  Send,
  Archive,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
  RotateCcw,
  XCircle,
  Users,
  UserCog,
  Landmark,
  CalendarRange,
  PartyPopper,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NesaNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface NesaNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NesaNavItem[];
}

/** Module root paths — active match is exact only (not prefix). */
const MODULE_DASHBOARDS = new Set([
  '/nesa/dashboard',
  '/nesa/schools',
  '/nesa/circulars',
  '/nesa/fee-policy',
  '/nesa/general-assembly-policies',
  '/nesa/approvals',
  '/nesa/provinces',
  '/nesa/districts',
  '/nesa/sectors',
  '/nesa/academic-years',
]);

export const NESA_NAV_ITEMS: NesaNavItem[] = [
  // Module 1 — Dashboard
  {
    href: '/nesa/dashboard',
    label: 'Dashboard',
    description: 'National KPIs, map & executive overview',
    icon: LayoutDashboard,
  },

  // Module 2 — Schools
  {
    href: '/nesa/schools',
    label: 'Schools List',
    description: 'Browse registered schools from Authentication',
    icon: List,
  },
  {
    href: '/nesa/schools/details',
    label: 'School Details',
    description: 'Open a school from the list for location & profile',
    icon: FileSearch,
  },
  {
    href: '/nesa/schools/profile',
    label: 'School Profile',
    description: 'Registration & branding profile',
    icon: UserCircle,
  },
  {
    href: '/nesa/schools/circulars',
    label: 'School Circulars',
    description: 'Circulars issued by a school',
    icon: Files,
  },
  {
    href: '/nesa/schools/analytics',
    label: 'School Analytics',
    description: 'School-level performance charts',
    icon: BarChart3,
  },

  // Module 3 — Circulars
  {
    href: '/nesa/circulars',
    label: 'Circulars Dashboard',
    description: 'Circular registry overview',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/circulars/list',
    label: 'Circular List',
    description: 'All submitted circulars',
    icon: List,
  },
  {
    href: '/nesa/circulars/details',
    label: 'Circular Details',
    description: 'Full circular record',
    icon: FileSearch,
  },
  {
    href: '/nesa/circulars/approval',
    label: 'Circular Approval',
    description: 'Approve school circular requests',
    icon: ClipboardCheck,
  },

  // Module 4 — Fee Policy (sidebar: dashboard only; sub-routes via in-page links)
  {
    href: '/nesa/fee-policy',
    label: 'Fee Policy Dashboard',
    description: 'National fee policy overview',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/fee-policy/create',
    label: 'Create Fee Policy',
    description: 'Tuition ceiling policy form',
    icon: ScrollText,
  },
  {
    href: '/nesa/general-assembly-policies',
    label: 'General Assembly Policies',
    description: 'Add-on fee rules',
    icon: Landmark,
  },
  {
    href: '/nesa/fee-policy/simulate',
    label: 'Policy Simulation',
    description: 'Preview limits',
    icon: ClipboardCheck,
  },
  {
    href: '/nesa/fee-policy/versions',
    label: 'Policy Versions',
    description: 'Version history',
    icon: GitBranch,
  },
  {
    href: '/nesa/fee-policy/comparison',
    label: 'Policy Comparison',
    description: 'Compare versions',
    icon: GitBranch,
  },
  {
    href: '/nesa/fee-policy/publish',
    label: 'Publish Policy',
    description: 'Release approved policy',
    icon: Send,
  },
  {
    href: '/nesa/fee-policy/archived',
    label: 'Archived Policies',
    description: 'Retired policies',
    icon: Archive,
  },
  {
    href: '/nesa/fee-policy/compliance',
    label: 'Compliance Monitoring',
    description: 'School adherence',
    icon: ShieldCheck,
  },
  {
    href: '/nesa/fee-policy/violations',
    label: 'Fee Violations',
    description: 'Reported breaches',
    icon: AlertTriangle,
  },

  // Module 5 — Approvals
  {
    href: '/nesa/approvals',
    label: 'Approval Dashboard',
    description: 'Cross-module approval inbox',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/approvals/pending',
    label: 'Pending',
    description: 'Awaiting first review',
    icon: Clock,
  },
  {
    href: '/nesa/approvals/under-review',
    label: 'Under Review',
    description: 'Currently being reviewed',
    icon: Eye,
  },
  {
    href: '/nesa/approvals/returned',
    label: 'Returned',
    description: 'Sent back for corrections',
    icon: RotateCcw,
  },
  {
    href: '/nesa/approvals/approved',
    label: 'Approved',
    description: 'Fully approved items',
    icon: CheckCircle2,
  },
  {
    href: '/nesa/approvals/rejected',
    label: 'Rejected',
    description: 'Declined submissions',
    icon: XCircle,
  },

  // Module 6 — Provinces
  {
    href: '/nesa/provinces',
    label: 'Provinces Dashboard',
    description: 'Provincial education overview',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/provinces/list',
    label: 'Province List',
    description: 'All provinces',
    icon: List,
  },
  {
    href: '/nesa/provinces/details',
    label: 'Province Details',
    description: 'Province profile & stats',
    icon: FileSearch,
  },
  {
    href: '/nesa/provinces/districts',
    label: 'Districts',
    description: 'Districts within a province',
    icon: Building2,
  },
  {
    href: '/nesa/provinces/schools',
    label: 'Schools',
    description: 'Schools by province',
    icon: School,
  },
  {
    href: '/nesa/provinces/analytics',
    label: 'Analytics',
    description: 'Provincial analytics',
    icon: BarChart3,
  },
  {
    href: '/nesa/provinces/performance',
    label: 'Performance',
    description: 'KPI & target tracking',
    icon: Landmark,
  },
  {
    href: '/nesa/provinces/reports',
    label: 'Reports',
    description: 'Provincial reports',
    icon: Files,
  },

  // Module 7 — Districts
  {
    href: '/nesa/districts',
    label: 'Districts Dashboard',
    description: 'District offices overview',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/districts/list',
    label: 'District List',
    description: 'All district offices',
    icon: List,
  },
  {
    href: '/nesa/districts/officers',
    label: 'Officer Management',
    description: 'Assign and manage officers',
    icon: Users,
  },
  {
    href: '/nesa/districts/school-assignment',
    label: 'School Assignment',
    description: 'Map schools to districts',
    icon: School,
  },
  {
    href: '/nesa/districts/performance',
    label: 'Performance',
    description: 'District performance metrics',
    icon: Landmark,
  },
  {
    href: '/nesa/districts/reports',
    label: 'Reports',
    description: 'District reports',
    icon: Files,
  },

  // Module 8 — Sectors
  {
    href: '/nesa/sectors',
    label: 'Sectors Dashboard',
    description: 'Sector offices overview',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/sectors/list',
    label: 'Sector List',
    description: 'All sector offices',
    icon: List,
  },
  {
    href: '/nesa/sectors/officer-assignment',
    label: 'Officer Assignment',
    description: 'Assign sector officers',
    icon: UserCog,
  },
  {
    href: '/nesa/sectors/schools',
    label: 'Schools',
    description: 'Schools by sector',
    icon: School,
  },
  {
    href: '/nesa/sectors/circular-monitoring',
    label: 'Circular Monitoring',
    description: 'Track circular compliance',
    icon: Files,
  },
  {
    href: '/nesa/sectors/analytics',
    label: 'Analytics',
    description: 'Sector analytics',
    icon: BarChart3,
  },

  // Module 9 — Academic Years
  {
    href: '/nesa/academic-years',
    label: 'Academic Years Dashboard',
    description: 'Calendar & term overview',
    icon: LayoutDashboard,
  },
  {
    href: '/nesa/academic-years/years',
    label: 'Academic Years',
    description: 'Define academic years',
    icon: CalendarDays,
  },
  {
    href: '/nesa/academic-years/terms',
    label: 'Terms',
    description: 'Term dates & structure',
    icon: CalendarRange,
  },
  {
    href: '/nesa/academic-years/holidays',
    label: 'Holidays',
    description: 'National & school holidays',
    icon: PartyPopper,
  },
  {
    href: '/nesa/academic-years/examination-calendar',
    label: 'Examination Calendar',
    description: 'National exam schedule',
    icon: GraduationCap,
  },
  {
    href: '/nesa/academic-years/school-calendar',
    label: 'School Calendar',
    description: 'School year calendar grid',
    icon: Calendar,
  },
];

/** Hidden from sidebar until national territory modules ship. */
const HIDDEN_SIDEBAR_SECTION_IDS = new Set(['provinces', 'districts', 'sectors']);

export const NESA_NAV_SECTIONS: NesaNavSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: NESA_NAV_ITEMS.filter((i) => i.href === '/nesa/dashboard'),
  },
  {
    id: 'schools',
    title: 'Schools',
    icon: School,
    items: NESA_NAV_ITEMS.filter((i) => i.href.startsWith('/nesa/schools')),
  },
  {
    id: 'circulars',
    title: 'Circulars',
    icon: Files,
    items: NESA_NAV_ITEMS.filter((i) => i.href.startsWith('/nesa/circulars')),
  },
  {
    id: 'fee-policy',
    title: 'Fee Policy',
    icon: ScrollText,
    items: NESA_NAV_ITEMS.filter((i) => i.href === '/nesa/fee-policy'),
  },
  {
    id: 'approvals',
    title: 'Approvals',
    icon: CheckCircle2,
    items: NESA_NAV_ITEMS.filter((i) => i.href === '/nesa/approvals'),
  },
  {
    id: 'provinces',
    title: 'Provinces',
    icon: Map,
    items: NESA_NAV_ITEMS.filter((i) => i.href.startsWith('/nesa/provinces')),
  },
  {
    id: 'districts',
    title: 'Districts',
    icon: Building2,
    items: NESA_NAV_ITEMS.filter((i) => i.href.startsWith('/nesa/districts')),
  },
  {
    id: 'sectors',
    title: 'Sectors',
    icon: MapPinned,
    items: NESA_NAV_ITEMS.filter((i) => i.href.startsWith('/nesa/sectors')),
  },
  {
    id: 'academic-years',
    title: 'Academic Years',
    icon: CalendarDays,
    items: NESA_NAV_ITEMS.filter((i) => i.href.startsWith('/nesa/academic-years')),
  },
].filter((section) => !HIDDEN_SIDEBAR_SECTION_IDS.has(section.id));

export function isNavActive(pathname: string, href: string): boolean {
  if (MODULE_DASHBOARDS.has(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionHasActiveItem(pathname: string, items: NesaNavItem[]): boolean {
  return items.some((item) => isNavActive(pathname, item.href));
}

export function isFeePolicyArea(pathname: string): boolean {
  return (
    pathname === '/nesa/fee-policy' ||
    pathname.startsWith('/nesa/fee-policy/') ||
    pathname.startsWith('/nesa/general-assembly')
  );
}

export function isApprovalsArea(pathname: string): boolean {
  return pathname === '/nesa/approvals' || pathname.startsWith('/nesa/approvals/');
}

export function sectionIsActive(pathname: string, section: NesaNavSection): boolean {
  if (section.id === 'fee-policy') return isFeePolicyArea(pathname);
  if (section.id === 'approvals') return isApprovalsArea(pathname);
  return sectionHasActiveItem(pathname, section.items);
}

export function pageTitleFromPath(pathname: string): string {
  const exact = NESA_NAV_ITEMS.find((nav) => nav.href === pathname);
  if (exact) return exact.label;

  const byPrefix = [...NESA_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((nav) => isNavActive(pathname, nav.href));
  if (byPrefix) return byPrefix.label;

  return 'NESA Dashboard';
}

export function breadcrumbFromPath(pathname: string): string[] {
  const title = pageTitleFromPath(pathname);
  const section = NESA_NAV_SECTIONS.find((s) => sectionIsActive(pathname, s));
  if (!section) return [title];
  if (section.id === 'dashboard') return [title];
  if (title === section.title || title.startsWith(section.title)) {
    return [title];
  }
  if (section.id === 'fee-policy' && pathname !== '/nesa/fee-policy') {
    return ['Fee Policy Dashboard', title];
  }
  if (section.id === 'approvals' && pathname !== '/nesa/approvals') {
    return ['Approval Dashboard', title];
  }
  return [section.title, title];
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = [...NESA_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((nav) => isNavActive(pathname, nav.href));
  return item?.icon ?? LayoutDashboard;
}
