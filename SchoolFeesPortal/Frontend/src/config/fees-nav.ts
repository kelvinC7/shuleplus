import {
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  Wallet,
  CalendarClock,
  Scale,
  GraduationCap,
  Receipt,
  Bell,
  BarChart3,
  Bot,
  ShieldCheck,
  FileBarChart,
  Tags,
  CreditCard,
  ClipboardCheck,
  ClipboardList,
  BadgeCheck,
  ScrollText,
  FileCheck2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface FeesNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const FEES_NAV_ITEMS: FeesNavItem[] = [
  {
    href: '/dashboard',
    label: 'Finance Dashboard',
    description: 'Collections, KPIs & live activity',
    icon: LayoutDashboard,
  },
  {
    href: '/analytics',
    label: 'Fee Analytics',
    description: 'Revenue trends & forecasting',
    icon: BarChart3,
  },
  {
    href: '/structures',
    label: 'Fee Structures',
    description: 'Templates, versions & categories',
    icon: Layers,
  },
  {
    href: '/structures/new',
    label: 'New Fee Structure',
    description: 'Create a configurable fee template',
    icon: Tags,
  },
  {
    href: '/billing',
    label: 'Student Billing',
    description: 'Bills, adjustments & approvals',
    icon: FileSpreadsheet,
  },
  {
    href: '/billing/new',
    label: 'Create Bill',
    description: 'Individual or class billing wizard',
    icon: FileSpreadsheet,
  },
  {
    href: '/payments',
    label: 'Payments',
    description: 'Cash, MoMo, bank & digital pay',
    icon: Wallet,
  },
  {
    href: '/payments/new',
    label: 'Record Payment',
    description: 'Collect & match payments',
    icon: CreditCard,
  },
  {
    href: '/installments',
    label: 'Fee Collection',
    description: 'Collect payments · Allocations · Receipts',
    icon: CalendarClock,
  },
  {
    href: '/outstanding',
    label: 'Outstanding Balances',
    description: 'Aging · Risk scoring · Priority collections',
    icon: Scale,
  },
  {
    href: '/scholarships',
    label: 'Scholarships',
    description: 'Financial aid · Eligibility · Approvals',
    icon: GraduationCap,
  },
  {
    href: '/receipts',
    label: 'Receipts',
    description: 'Digital receipts · QR verify · Void audit',
    icon: Receipt,
  },
  {
    href: '/notifications',
    label: 'Fee Reminders',
    description: 'Overview · Send · Automated rules',
    icon: Bell,
  },
  {
    href: '/notifications/send',
    label: 'Send Reminder',
    description: 'Select unpaid or partial balances',
    icon: Bell,
  },
  {
    href: '/notifications/rules',
    label: 'Automated Rules',
    description: '7 / 14 / 30 / 45 day sequences',
    icon: CalendarClock,
  },
  {
    href: '/notifications/templates',
    label: 'Templates',
    description: 'In-app, push, email and SMS copy',
    icon: ScrollText,
  },
  {
    href: '/notifications/history',
    label: 'Reminder History',
    description: 'Delivery audit trail',
    icon: ClipboardList,
  },
  {
    href: '/notifications/settings',
    label: 'Communication Settings',
    description: 'Channels, quiet hours, SMS consent',
    icon: ShieldCheck,
  },
  {
    href: '/ai-assistant',
    label: 'AI Financial Assistant',
    description: 'Predictions & smart insights',
    icon: Bot,
  },
  {
    href: '/audit',
    label: 'Audit & Security',
    description: 'Logs, approvals & fraud alerts',
    icon: ShieldCheck,
  },
  {
    href: '/reports',
    label: 'Financial Reports',
    description: 'Daily to executive statements',
    icon: FileBarChart,
  },
  {
    href: '/examination-eligibility',
    label: 'Examination Lists',
    description: 'Publish who may sit examinations',
    icon: ClipboardList,
  },
  {
    href: '/examination-eligibility/eligibility',
    label: 'Eligibility',
    description: 'Automatic fee clearance for exams',
    icon: ClipboardCheck,
  },
  {
    href: '/examination-eligibility/exceptions',
    label: 'Manual Exceptions',
    description: 'Allow unpaid students by agreement',
    icon: BadgeCheck,
  },
  {
    href: '/examination-eligibility/published',
    label: 'Published Lists',
    description: 'Official class examination lists',
    icon: FileCheck2,
  },
  {
    href: '/examination-eligibility/reports',
    label: 'Clearance Reports',
    description: 'Examination clearance summaries',
    icon: ScrollText,
  },
  {
    href: '/report-cards',
    label: 'Report card access',
    description: 'Published reports · fees clearance · manual allow',
    icon: FileCheck2,
  },
];

export interface FeesNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FeesNavItem[];
}

export const FEES_NAV_SECTIONS: FeesNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [FEES_NAV_ITEMS[0], FEES_NAV_ITEMS[1]],
  },
  {
    id: 'billing',
    title: 'Billing',
    icon: FileSpreadsheet,
    items: [FEES_NAV_ITEMS[2], FEES_NAV_ITEMS[4], FEES_NAV_ITEMS[6]],
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: Wallet,
    items: [FEES_NAV_ITEMS[8], FEES_NAV_ITEMS[9], FEES_NAV_ITEMS[10], FEES_NAV_ITEMS[11]],
  },
  {
    id: 'reminders',
    title: 'Fee Reminders',
    icon: Bell,
    items: [FEES_NAV_ITEMS[12], FEES_NAV_ITEMS[13], FEES_NAV_ITEMS[14], FEES_NAV_ITEMS[15], FEES_NAV_ITEMS[16], FEES_NAV_ITEMS[17]],
  },
  {
    id: 'examination',
    title: 'Examination',
    icon: ClipboardCheck,
    items: [FEES_NAV_ITEMS[21], FEES_NAV_ITEMS[22], FEES_NAV_ITEMS[23], FEES_NAV_ITEMS[24], FEES_NAV_ITEMS[25], FEES_NAV_ITEMS[26]],
  },
];

export function isFeesNavActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  if (href === '/structures') return pathname === '/structures' || pathname.startsWith('/structures/');
  if (href === '/billing') return pathname === '/billing' || pathname.startsWith('/billing/');
  if (href === '/payments') return pathname === '/payments' || pathname.startsWith('/payments/');
  if (href === '/notifications') {
    return pathname === '/notifications' || pathname === '/notifications/';
  }
  if (href === '/examination-eligibility') {
    return pathname === '/examination-eligibility' || pathname === '/examination-eligibility/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function feesSectionHasActiveItem(pathname: string, items: FeesNavItem[]) {
  return items.some((item) => isFeesNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const exact = FEES_NAV_ITEMS.find((nav) => pathname === nav.href);
  if (exact) return exact.label;
  const item = FEES_NAV_ITEMS.find((nav) => pathname.startsWith(`${nav.href}/`));
  return item?.label ?? 'School Fees';
}
