import {
  BarChart3,
  Building2,
  Calculator,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Receipt,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { RepSidebarConfig } from '@/components/school-representative/rep-sidebar-config';
import { CA_SCHOOL_FEES } from '@/components/chief-accountant/ca-school-fees-paths';

export const CA_SIDEBAR: RepSidebarConfig = {
  basePath: '/chief-accountant',
  standalone: [
    { href: '/chief-accountant', label: 'Overview', icon: LayoutDashboard },
    { href: '/chief-accountant/organizations', label: 'Organizations', icon: Building2 },
  ],
  sections: [
    {
      id: 'finance',
      title: 'Finance',
      icon: Wallet,
      items: [
        { href: `${CA_SCHOOL_FEES}/dashboard`, label: 'Fees dashboard', icon: Scale },
        { href: `${CA_SCHOOL_FEES}/structures`, label: 'Fee structures', icon: FileSpreadsheet },
        { href: `${CA_SCHOOL_FEES}/student-accounts`, label: 'Student fee accounts', icon: Scale },
        { href: `${CA_SCHOOL_FEES}/invoices`, label: 'Invoices', icon: FileSpreadsheet },
        { href: `${CA_SCHOOL_FEES}/requirements`, label: 'Bills & requirements', icon: Receipt },
        { href: `${CA_SCHOOL_FEES}/transactions`, label: 'Payment transactions', icon: Receipt },
        { href: `${CA_SCHOOL_FEES}/reconciliation`, label: 'Fee reconciliation', icon: ClipboardCheck },
      ],
    },
    {
      id: 'expenses',
      title: 'Expenses & Payments',
      icon: Receipt,
      items: [
        { href: '/chief-accountant/expenses', label: 'Expense register', icon: FileSpreadsheet },
        { href: '/chief-accountant/expenses/payment-requests', label: 'Payment requests', icon: Wallet },
      ],
    },
    {
      id: 'payroll',
      title: 'Payroll',
      icon: Calculator,
      items: [{ href: '/chief-accountant/payroll', label: 'Payroll review', icon: Calculator }],
    },
    {
      id: 'accounting',
      title: 'Accounting',
      icon: Calculator,
      items: [
        { href: '/chief-accountant/accounting/chart-of-accounts', label: 'Chart of accounts', icon: FileSpreadsheet },
        { href: '/chief-accountant/accounting/journal', label: 'Journal entries', icon: Receipt },
        { href: '/chief-accountant/accounting/ledger', label: 'General ledger', icon: FileSpreadsheet },
        { href: '/chief-accountant/accounting/reconciliation', label: 'Bank reconciliation', icon: ClipboardCheck },
      ],
    },
    {
      id: 'planning',
      title: 'Budget & Reports',
      icon: BarChart3,
      items: [
        { href: '/chief-accountant/budget', label: 'Budget & utilization', icon: BarChart3 },
        { href: '/chief-accountant/reports', label: 'Financial reports', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'controls',
      title: 'Approvals & Audit',
      icon: ShieldCheck,
      items: [{ href: '/chief-accountant/approvals', label: 'Approval center', icon: ShieldCheck }],
    },
  ],
};

export function caBreadcrumbLabel(pathname: string): string {
  const all = [...CA_SIDEBAR.standalone, ...CA_SIDEBAR.sections.flatMap((s) => s.items)];
  const match = all.find((nav) =>
    nav.href === CA_SIDEBAR.basePath
      ? pathname === nav.href
      : pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  if (pathname === '/chief-accountant' || pathname === '/chief-accountant/') return 'Overview';
  if (pathname.includes(`${CA_SCHOOL_FEES}/dashboard`)) return 'Fees dashboard';
  if (pathname.includes(`${CA_SCHOOL_FEES}/structures`)) return 'Fee structures';
  if (pathname.includes(`${CA_SCHOOL_FEES}/student-accounts`)) return 'Student fee accounts';
  if (pathname.includes(`${CA_SCHOOL_FEES}/invoices`)) return 'Invoices';
  if (pathname.includes(`${CA_SCHOOL_FEES}/requirements`)) return 'Bills & requirements';
  if (pathname.includes(`${CA_SCHOOL_FEES}/transactions`)) return 'Payment transactions';
  if (pathname.includes(`${CA_SCHOOL_FEES}/reconciliation`)) return 'Fee reconciliation';
  return match?.label ?? 'Finance';
}
