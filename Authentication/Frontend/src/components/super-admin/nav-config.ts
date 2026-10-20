import type { SidebarNavConfig } from '../platform/sidebar-nav-types';

export interface SuperAdminNavItem {
  href: string;
  label: string;
  icon: 'dashboard' | 'organizations' | 'approvals' | 'admins' | 'customers' | 'modules' | 'subscriptions' | 'notifications' | 'reports' | 'analytics' | 'support' | 'security' | 'activity' | 'settings' | 'profile' | 'smartAccess' | 'smartCards' | 'smsBulk';
}

export const SUPER_ADMIN_SIDEBAR: SidebarNavConfig = {
  basePath: '/super-admin',
  standalone: [
    { href: '/super-admin', label: 'Dashboard', icon: 'dashboard' },
  ],
  sections: [
    {
      id: 'insights',
      title: 'Insights',
      icon: 'analytics',
      items: [
        { href: '/super-admin/analytics', label: 'Analytics', icon: 'analytics' },
        { href: '/super-admin/reports', label: 'Reports', icon: 'reports' },
      ],
    },
    {
      id: 'organizations',
      title: 'Organizations',
      icon: 'organizations',
      items: [
        { href: '/super-admin/organizations', label: 'All Organizations', icon: 'organizations' },
        { href: '/super-admin/pending-approvals', label: 'Pending Approvals', icon: 'approvals' },
        { href: '/super-admin/organization-administrators', label: 'Users & Access', icon: 'admins' },
        { href: '/super-admin/representatives', label: 'Representatives', icon: 'admins' },
        { href: '/super-admin/chief-accountants', label: 'Chief accountants', icon: 'admins' },
        { href: '/super-admin/sei-officers', label: 'SEI Officers', icon: 'admins' },
        { href: '/super-admin/deo-officers', label: 'DEO Officers', icon: 'admins' },
        { href: '/super-admin/nesa-dashboard-users', label: 'NESA Dashboard Users', icon: 'analytics' },
        { href: '/super-admin/customers', label: 'Customers', icon: 'customers' },
      ],
    },
    {
      id: 'modules',
      title: 'Modules',
      icon: 'modules',
      items: [
        { href: '/super-admin/modules', label: 'Modules Hub', icon: 'modules' },
        { href: '/super-admin/module-catalog', label: 'Module Catalog', icon: 'modules' },
        { href: '/super-admin/module-assignment', label: 'Module Assignment', icon: 'modules' },
        { href: '/super-admin/module-provisioning', label: 'Provisioning', icon: 'modules' },
      ],
    },
    {
      id: 'ticha',
      title: 'Ticha Services',
      icon: 'modules',
      items: [
        { href: '/super-admin/ticha-avance', label: 'TichaAvance', icon: 'subscriptions' },
        { href: '/super-admin/ticha-deals', label: 'Ticha Deals', icon: 'modules' },
      ],
    },
    {
      id: 'curriculum',
      title: 'Curriculum Intelligence',
      icon: 'modules',
      items: [
        { href: '/super-admin/curriculum', label: 'Overview', icon: 'dashboard' },
        { href: '/super-admin/curriculum/library', label: 'Curriculum Library', icon: 'modules' },
        { href: '/super-admin/curriculum/add', label: 'Add Curriculum Book', icon: 'modules' },
        { href: '/super-admin/curriculum/jobs', label: 'AI Processing Jobs', icon: 'analytics' },
        { href: '/super-admin/curriculum/library?status=NEEDS_REVIEW', label: 'Review & Publish', icon: 'approvals' },
      ],
    },
    {
      id: 'shulekit',
      title: 'ShuleKit',
      icon: 'modules',
      items: [
        { href: '/super-admin/shulekit', label: 'Dashboard', icon: 'dashboard' },
        { href: '/super-admin/shulekit/products', label: 'Products', icon: 'modules' },
        { href: '/super-admin/shulekit/categories', label: 'Categories', icon: 'modules' },
        { href: '/super-admin/shulekit/standard-kits', label: 'Standard Kits', icon: 'modules' },
        { href: '/super-admin/shulekit/custom-products', label: 'Custom Kit Products', icon: 'modules' },
        { href: '/super-admin/shulekit/orders', label: 'Orders', icon: 'reports' },
        { href: '/super-admin/shulekit/deliveries', label: 'Deliveries', icon: 'subscriptions' },
        { href: '/super-admin/shulekit/pricing', label: 'Pricing Rules', icon: 'analytics' },
        { href: '/super-admin/shulekit/district-kits', label: 'District School Kits', icon: 'organizations' },
        { href: '/super-admin/shulekit/reports', label: 'Reports', icon: 'reports' },
        { href: '/super-admin/shulekit/settings', label: 'Settings', icon: 'settings' },
      ],
    },
    {
      id: 'smart-access',
      title: 'Smart Access & IDs',
      icon: 'smartAccess',
      items: [
        { href: '/super-admin/smart-access', label: 'Smart Access', icon: 'smartAccess' },
        { href: '/super-admin/gate-devices', label: 'Gate Devices', icon: 'smartAccess' },
        { href: '/super-admin/smart-cards', label: 'Print Card', icon: 'smartCards' },
      ],
    },
    {
      id: 'rfid-network',
      title: 'RFID Network',
      icon: 'smartAccess',
      items: [
        { href: '/super-admin/rfid-network', label: 'Overview', icon: 'dashboard' },
        { href: '/super-admin/rfid-network/schools', label: 'Schools', icon: 'organizations' },
        { href: '/super-admin/rfid-network/devices', label: 'Devices', icon: 'modules' },
        { href: '/super-admin/rfid-network/events', label: 'Live Events', icon: 'activity' },
        { href: '/super-admin/rfid-network/firmware', label: 'Firmware', icon: 'modules' },
        { href: '/super-admin/rfid-network/profiles', label: 'Config Profiles', icon: 'settings' },
      ],
    },
    {
      id: 'communication',
      title: 'SMS BULK',
      icon: 'smsBulk',
      items: [
        { href: '/super-admin/sms-bulk', label: 'Dashboard', icon: 'dashboard' },
        { href: '/super-admin/sms-bulk/students', label: 'Students & Parents', icon: 'admins' },
        { href: '/super-admin/sms-bulk/send', label: 'Send SMS', icon: 'smsBulk' },
        { href: '/super-admin/sms-bulk/campaigns', label: 'Campaigns', icon: 'reports' },
        { href: '/super-admin/sms-bulk/scheduled', label: 'Scheduled SMS', icon: 'analytics' },
        { href: '/super-admin/sms-bulk/templates', label: 'Templates', icon: 'notifications' },
        { href: '/super-admin/sms-bulk/automations', label: 'Automations', icon: 'activity' },
        { href: '/super-admin/sms-bulk/delivery', label: 'Delivery Reports', icon: 'reports' },
        { href: '/super-admin/sms-bulk/credits', label: 'SMS Credits', icon: 'subscriptions' },
        { href: '/super-admin/sms-bulk/settings', label: 'SMS Settings', icon: 'settings' },
      ],
    },
    {
      id: 'platform',
      title: 'Platform',
      icon: 'settings',
      items: [
        { href: '/super-admin/developer-access', label: 'Developer Access', icon: 'security' },
        { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
        { href: '/super-admin/notifications', label: 'Notifications', icon: 'notifications' },
        { href: '/super-admin/security', label: 'Security', icon: 'security' },
        { href: '/super-admin/activity-logs', label: 'Activity Logs', icon: 'activity' },
        { href: '/super-admin/support', label: 'Support Center', icon: 'support' },
        { href: '/super-admin/settings', label: 'Settings', icon: 'settings' },
        { href: '/super-admin/profile', label: 'Profile', icon: 'profile' },
      ],
    },
  ],
};

export const SUPER_ADMIN_NAV: SuperAdminNavItem[] = [
  ...(SUPER_ADMIN_SIDEBAR.standalone ?? []),
  ...SUPER_ADMIN_SIDEBAR.sections.flatMap((s) => s.items),
] as SuperAdminNavItem[];

export const SUPER_ADMIN_NAV_SECTIONS = SUPER_ADMIN_SIDEBAR.sections;
