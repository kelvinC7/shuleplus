import { SUPER_ADMIN_NAV, type SuperAdminNavItem } from './nav-config';

const DESCRIPTIONS: Record<string, string> = {
  Dashboard: 'Overview, KPIs & platform health',
  Organizations: 'Create, manage & monitor tenants',
  'Organization Administrators': 'Invite admins & manage access',
  Customers: 'Schools, businesses, NGOs & more',
  Modules: 'Enable Academic, Finance, Digital Attendance & more',
  Subscriptions: 'Plans, billing & renewals',
  Notifications: 'Broadcast email, SMS & alerts',
  Reports: 'Export PDF, Excel & CSV reports',
  Analytics: 'Growth, revenue & usage insights',
  'Support Center': 'Tickets, chat & knowledge base',
  Security: 'Audit logs, MFA & force logout',
  'Activity Logs': 'Recent platform activity',
  Settings: 'Branding, regions & defaults',
  Profile: 'Your account & preferences',
};

const BADGES: Record<string, string | number> = {
  Organizations: 'Live',
  Notifications: 'New',
};

export interface DashboardModuleConfig {
  href: string;
  label: string;
  description: string;
  badge?: string | number;
  iconName: SuperAdminNavItem['icon'];
}

export const SUPER_ADMIN_DASHBOARD_MODULES: DashboardModuleConfig[] = SUPER_ADMIN_NAV.filter(
  (item) => item.href !== '/super-admin'
).map((item) => ({
  href: item.href,
  label: item.label,
  description: DESCRIPTIONS[item.label] ?? '',
  badge: BADGES[item.label],
  iconName: item.icon,
}));

export const SUPER_ADMIN_HIGHLIGHT_MODULES: DashboardModuleConfig[] = [
  {
    href: '/super-admin/organizations',
    label: 'Organizations',
    description: 'Full tenant lifecycle management',
    iconName: 'organizations',
  },
  {
    href: '/super-admin/subscriptions',
    label: 'Subscriptions',
    description: 'Plans, invoices & renewals',
    iconName: 'subscriptions',
  },
  {
    href: '/super-admin/notifications',
    label: 'Notifications',
    description: 'Broadcast & schedule messages',
    iconName: 'notifications',
  },
];
