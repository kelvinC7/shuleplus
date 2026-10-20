import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Clock,
  FileBarChart,
  LayoutDashboard,
  Radio,
  Settings,
  Terminal,
  UserCheck,
  Wifi,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DeviceNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface DeviceNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: DeviceNavItem[];
}

export const DEVICE_NAV_ITEMS: DeviceNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Device KPIs and live attendance',
    icon: LayoutDashboard,
  },
  {
    href: '/devices',
    label: 'All Devices',
    description: 'RFID reader fleet overview',
    icon: Radio,
  },
  {
    href: '/devices/online',
    label: 'Online',
    description: 'Connected readers',
    icon: Wifi,
  },
  {
    href: '/devices/offline',
    label: 'Offline',
    description: 'Disconnected readers',
    icon: AlertTriangle,
  },
  {
    href: '/devices/alerts',
    label: 'Alerts',
    description: 'Device warnings and notifications',
    icon: Zap,
  },
  {
    href: '/attendance',
    label: 'Live Attendance',
    description: 'Real-time check-in counters',
    icon: UserCheck,
  },
  {
    href: '/events',
    label: 'Card Events',
    description: 'Scans and sync status',
    icon: Activity,
  },
  {
    href: '/unknown-cards',
    label: 'Unknown Cards',
    description: 'Unregistered card alerts',
    icon: AlertTriangle,
  },
  {
    href: '/reports',
    label: 'Attendance Reports',
    description: 'Exportable attendance summaries',
    icon: FileBarChart,
  },
  {
    href: '/commands',
    label: 'Device Commands',
    description: 'Remote command center',
    icon: Terminal,
  },
  {
    href: '/configuration',
    label: 'Configuration',
    description: 'Wi-Fi, time and profiles',
    icon: Settings,
  },
  {
    href: '/logs',
    label: 'Logs',
    description: 'Device troubleshooting logs',
    icon: ClipboardList,
  },
];

export const DEVICE_NAV_SECTIONS: DeviceNavSection[] = [
  {
    id: 'overview',
    title: 'Digital Attendance',
    icon: LayoutDashboard,
    items: [DEVICE_NAV_ITEMS[0], DEVICE_NAV_ITEMS[5]],
  },
  {
    id: 'devices',
    title: 'Devices',
    icon: Radio,
    items: DEVICE_NAV_ITEMS.slice(1, 5),
  },
  {
    id: 'events',
    title: 'Events & Cards',
    icon: Activity,
    items: DEVICE_NAV_ITEMS.slice(6, 8),
  },
  {
    id: 'ops',
    title: 'Operations',
    icon: Terminal,
    items: DEVICE_NAV_ITEMS.slice(8),
  },
];

export function pageTitleFromPath(pathname: string): string {
  if (pathname.match(/^\/devices\/[^/]+$/) && !['/devices/online', '/devices/offline', '/devices/alerts', '/devices/register'].includes(pathname)) {
    return 'Device Details';
  }
  const item = DEVICE_NAV_ITEMS.find(
    (i) => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(`${i.href}/`))
  );
  return item?.label ?? 'Digital Attendance';
}

export function isDeviceNavActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/devices') return pathname === '/devices' || (pathname.startsWith('/devices/') && !['/devices/online', '/devices/offline', '/devices/alerts', '/devices/register'].some((p) => pathname.startsWith(p)));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function deviceSectionHasActiveItem(pathname: string, items: DeviceNavItem[]) {
  return items.some((item) => isDeviceNavActive(pathname, item.href));
}
