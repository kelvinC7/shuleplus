import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileSpreadsheet,
  Settings2,
  Play,
  BarChart3,
  UserX,
  Wallet,
  Send,
  Receipt,
  Building2,
  User,
  Cog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PayrollNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const PAYROLL_NAV: PayrollNavItem[] = [
  { href: '/dashboard', label: 'Payroll Dashboard', description: 'Overview, KPIs & module navigation', icon: LayoutDashboard },
  { href: '/employees', label: 'Employee Directory', description: 'Payroll staff roster & profiles', icon: Users },
  { href: '/employees/register', label: 'Employee Registration', description: 'Register new payroll staff', icon: UserPlus },
  { href: '/employees/import', label: 'Employee Import', description: 'Bulk import from Excel', icon: FileSpreadsheet },
  { href: '/salary-template', label: 'Salary Template', description: 'Statutory rates, PAYE & allowances', icon: FileSpreadsheet },
  { href: '/staff-salary-setup', label: 'Staff Salary Setup', description: 'Per-employee salary packages', icon: Settings2 },
  { href: '/settings', label: 'Payroll Settings', description: 'Academic year, terms & calendar', icon: Cog },
  { href: '/run', label: 'Payroll Run', description: 'Generate monthly payroll register', icon: Play },
  { href: '/reports', label: 'Payroll Reports', description: 'Tax & bank regulatory exports', icon: BarChart3 },
  { href: '/termination-benefits', label: 'Termination Benefits', description: 'Severance & settlement workflow', icon: UserX },
  { href: '/salary-payment', label: 'Salary Payment', description: 'Review runs & mark as paid', icon: Wallet },
  { href: '/disbursement', label: 'Payroll Disbursement', description: 'Process payments & deductions', icon: Send },
  { href: '/payslips', label: 'Pay Slips', description: 'Preview, PDF & print payslips', icon: Receipt },
  { href: '/bank-payroll', label: 'Bank Payroll', description: 'Bank transfer files by institution', icon: Building2 },
  { href: '/my-payroll', label: 'My Payroll', description: 'Staff self-service payslip view', icon: User },
];

export interface PayrollNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: PayrollNavItem[];
}

export const PAYROLL_NAV_SECTIONS: PayrollNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [PAYROLL_NAV[0]],
  },
  {
    id: 'workforce',
    title: 'Workforce',
    icon: Users,
    items: PAYROLL_NAV.slice(1, 7),
  },
  {
    id: 'processing',
    title: 'Processing',
    icon: Play,
    items: PAYROLL_NAV.slice(7, 11),
  },
  {
    id: 'compliance',
    title: 'Reports & Pay',
    icon: BarChart3,
    items: PAYROLL_NAV.slice(11, 14),
  },
  {
    id: 'self-service',
    title: 'Self Service',
    icon: User,
    items: [PAYROLL_NAV[14]],
  },
];

export const SUB_PAGES = PAYROLL_NAV.filter((i) => i.href !== '/dashboard');

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatRwf(n: number) {
  return `${Math.round(n).toLocaleString('en-RW')} RWF`;
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PROCESSING: 'bg-amber-100 text-amber-800',
    PROCESSED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-emerald-100 text-emerald-800',
    SUBMITTED: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-sky-100 text-sky-800',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function isPayrollNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function payrollSectionHasActiveItem(pathname: string, items: PayrollNavItem[]) {
  return items.some((item) => isPayrollNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = PAYROLL_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? 'Payroll Center';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = PAYROLL_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
