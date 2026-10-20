import type { SidebarNavConfig } from '../platform/sidebar-nav-types';

export const DEVELOPER_SIDEBAR: SidebarNavConfig = {
  basePath: '/developers',
  standalone: [{ href: '/developers', label: 'Overview', icon: 'dashboard' }],
  sections: [
    {
      id: 'api',
      title: 'API',
      icon: 'modules',
      items: [
        { href: '/developers/docs', label: 'Documentation', icon: 'reports' },
        { href: '/developers/explorer', label: 'API Explorer', icon: 'analytics' },
        { href: '/developers/sandbox', label: 'My Sandbox', icon: 'organizations' },
      ],
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: 'settings',
      items: [
        { href: '/developers/applications', label: 'Applications', icon: 'modules' },
        { href: '/developers/credentials', label: 'Credentials', icon: 'security' },
        { href: '/developers/webhooks', label: 'Webhooks', icon: 'activity' },
      ],
    },
    {
      id: 'monitor',
      title: 'Monitor',
      icon: 'analytics',
      items: [
        { href: '/developers/usage', label: 'API Usage', icon: 'analytics' },
        { href: '/developers/logs', label: 'API Logs', icon: 'reports' },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      icon: 'profile',
      items: [
        { href: '/developers/security', label: 'Security', icon: 'security' },
        { href: '/developers/notifications', label: 'Notifications', icon: 'notifications' },
        { href: '/developers/support', label: 'Help & Support', icon: 'support' },
      ],
    },
  ],
};

function allDeveloperNavItems() {
  return [
    ...(DEVELOPER_SIDEBAR.standalone ?? []),
    ...DEVELOPER_SIDEBAR.sections.flatMap((s) => s.items),
  ];
}

export function developerPageTitle(pathname: string): string {
  if (pathname === '/developers') return 'Overview';
  const match = allDeveloperNavItems().find((item) =>
    item.href === '/developers' ? pathname === item.href : pathname.startsWith(item.href)
  );
  return match?.label ?? 'Developer Portal';
}
