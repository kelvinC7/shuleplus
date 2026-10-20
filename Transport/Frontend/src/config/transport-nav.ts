import {
  LayoutDashboard,
  Radio,
  Route,
  Bus,
  Users,
  CreditCard,
  ScanLine,
  UserRound,
  ShieldAlert,
  UserX,
  Siren,
  FileWarning,
  Wallet,
  Fuel,
  Wrench,
  FolderOpen,
  BarChart3,
  LineChart,
  Settings,
  Smartphone,
  Bell,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TransportNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface TransportNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: TransportNavItem[];
}

export const TRANSPORT_NAV_SECTIONS: TransportNavSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [
      { href: '/dashboard', label: 'Dashboard', description: "Today's live KPIs", icon: LayoutDashboard },
      { href: '/operations', label: 'Live Operations', description: 'Trip control center', icon: Radio },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Bus,
    items: [
      { href: '/trips', label: 'Trips', description: 'Boarding, live and completed', icon: Radio },
      { href: '/routes', label: 'Routes & Stops', description: 'Pickup and drop-off', icon: Route },
      { href: '/buses', label: 'Buses', description: 'Fleet profiles', icon: Bus },
      { href: '/students', label: 'Students', description: 'Transport assignments', icon: Users },
      { href: '/cards', label: 'RFID Cards', description: 'Issue, block, replace', icon: CreditCard },
      { href: '/boarding', label: 'Boarding & Exit', description: 'RFID tap desk', icon: ScanLine },
      { href: '/crew', label: 'Drivers & Attendants', description: 'Crew profiles', icon: UserRound },
    ],
  },
  {
    id: 'safety',
    title: 'Safety',
    icon: ShieldAlert,
    items: [
      { href: '/alerts', label: 'Alerts', description: 'Wrong bus, unknown cards', icon: ShieldAlert },
      { href: '/missing', label: 'Missing Students', description: 'Passenger check', icon: UserX },
      { href: '/emergencies', label: 'Emergencies', description: 'Panic and incidents', icon: Siren },
      { href: '/incidents', label: 'Incidents', description: 'Safety log', icon: FileWarning },
    ],
  },
  {
    id: 'management',
    title: 'Management',
    icon: Wrench,
    items: [
      { href: '/fees', label: 'Transport Fees', description: 'Route billing', icon: Wallet },
      { href: '/fuel', label: 'Fuel', description: 'Litres and cost', icon: Fuel },
      { href: '/maintenance', label: 'Maintenance', description: 'Service and inspection', icon: Wrench },
      { href: '/documents', label: 'Documents', description: 'Insurance and papers', icon: FolderOpen },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: BarChart3,
    items: [
      { href: '/reports', label: 'Transport Reports', description: 'Summary and finance', icon: BarChart3 },
      { href: '/analytics', label: 'Bus Analytics', description: 'Utilization and trends', icon: LineChart },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    items: [
      { href: '/devices', label: 'RFID Devices', description: 'Readers on buses', icon: Smartphone },
      { href: '/settings', label: 'Notification Settings', description: 'Rules and channels', icon: Bell },
      { href: '/permissions', label: 'Permissions', description: 'Access rules', icon: Shield },
    ],
  },
];

export const TRANSPORT_NAV_ITEMS: TransportNavItem[] = TRANSPORT_NAV_SECTIONS.flatMap((s) => s.items);

export function isTransportNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function transportSectionHasActiveItem(pathname: string, items: TransportNavItem[]) {
  return items.some((item) => isTransportNavActive(pathname, item.href));
}

export function pageTitleFromPath(pathname: string): string {
  const item = TRANSPORT_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? 'Smart Transport';
}

export function breadcrumbFromPath(pathname: string): string {
  const title = pageTitleFromPath(pathname);
  if (pathname === '/dashboard') return 'Home • Dashboard';
  return `Home • ${title}`;
}

export function navIconFromPath(pathname: string): LucideIcon {
  const item = TRANSPORT_NAV_ITEMS.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.icon ?? LayoutDashboard;
}
