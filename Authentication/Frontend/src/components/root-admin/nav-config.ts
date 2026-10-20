import type { SidebarNavConfig } from '../platform/sidebar-nav-types';

export interface RootAdminNavItem {
  href: string;
  label: string;
  icon: 'dashboard' | 'organizations' | 'admins' | 'modules' | 'subscriptions' | 'health' | 'activity' | 'security' | 'notifications' | 'settings' | 'analytics' | 'control';
}

export const ROOT_ADMIN_SIDEBAR: SidebarNavConfig = {
  basePath: '/root-admin',
  standalone: [
    { href: '/root-admin', label: 'Dashboard', icon: 'dashboard' },
  ],
  sections: [
    {
      id: 'insights',
      title: 'Insights',
      icon: 'analytics',
      items: [
        { href: '/root-admin/analytics', label: 'Analytics', icon: 'analytics' },
      ],
    },
    {
      id: 'organizations',
      title: 'Organizations',
      icon: 'organizations',
      items: [
        { href: '/root-admin/organizations', label: 'All Organizations', icon: 'organizations' },
      ],
    },
    {
      id: 'access',
      title: 'Access',
      icon: 'admins',
      items: [
        { href: '/root-admin/users', label: 'Users & Access', icon: 'admins' },
        { href: '/root-admin/super-admins', label: 'Super Admins', icon: 'admins' },
        { href: '/root-admin/system-administrators', label: 'Platform Administrators', icon: 'admins' },
        { href: '/root-admin/system-administrators/new', label: 'Add Administrator', icon: 'admins' },
      ],
    },
    {
      id: 'modules',
      title: 'Modules',
      icon: 'modules',
      items: [
        { href: '/root-admin/module-catalog', label: 'Module Catalog', icon: 'modules' },
        { href: '/root-admin/modules', label: 'Module Toggle', icon: 'modules' },
      ],
    },
    {
      id: 'platform',
      title: 'Platform',
      icon: 'settings',
      items: [
        { href: '/root-admin/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
        { href: '/root-admin/system-health', label: 'System Health', icon: 'health' },
        { href: '/root-admin/audit-logs', label: 'Audit Logs', icon: 'activity' },
        { href: '/root-admin/security', label: 'Security Center', icon: 'security' },
        { href: '/root-admin/control-center', label: 'Control Center', icon: 'control' },
        { href: '/root-admin/notifications', label: 'Notifications', icon: 'notifications' },
        { href: '/root-admin/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
};

/** Flat list for breadcrumbs */
export const ROOT_ADMIN_NAV_SECTIONS = ROOT_ADMIN_SIDEBAR.sections;
