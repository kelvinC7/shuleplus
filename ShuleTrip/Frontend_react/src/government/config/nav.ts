import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Radar,
  Settings,
  Shield,
  ShieldCheck,
  Stamp,
  UserCog,
} from 'lucide-react';
import type { PortalNavItem } from '@/shared/config/portal-nav';

export const GOVERNMENT_HOME = '/government/overview';

/**
 * Flat nav — each link is filtered by role in useGovernmentNav (canAccessHref).
 * Shared items for every official; stage workspaces only when their role allows.
 */
export const GOVERNMENT_NAV: PortalNavItem[] = [
  { label: 'Dashboard', href: GOVERNMENT_HOME, icon: LayoutDashboard },
  { label: 'Action queue', href: '/government/review-queue', icon: ClipboardCheck },
  { label: 'Intake', href: '/government/intake', icon: ClipboardList },
  { label: 'Education', href: '/government/education-review', icon: GraduationCap },
  { label: 'Transport', href: '/government/safety', icon: Shield },
  { label: 'Checkpoint', href: '/government/checkpoint', icon: MapPin },
  { label: 'Final approval', href: '/government/final-approval', icon: Stamp },
  { label: 'Applications', href: '/government/applications', icon: ClipboardList },
  { label: 'Approved', href: '/government/approved', icon: ShieldCheck },
  { label: 'Monitoring', href: '/government/monitoring', icon: Radar },
  { label: 'Documents', href: '/government/documents', icon: FileStack },
  { label: 'Schools', href: '/government/schools', icon: Building2 },
  { label: 'Settings', href: '/government/settings', icon: Settings },
  {
    label: 'Admin',
    icon: UserCog,
    children: [
      { label: 'Users', href: '/government/admin/users' },
      { label: 'Workflow', href: '/government/admin/workflow' },
    ],
  },
];

export function governmentPageTitleFromPath(pathname: string): string {
  if (pathname === GOVERNMENT_HOME) return 'Dashboard';
  if (pathname.startsWith('/government/intake')) return 'Intake';
  if (pathname.startsWith('/government/review-queue') || pathname.startsWith('/government/review/')) return 'Action queue';
  if (pathname.startsWith('/government/applications')) return 'Applications';
  if (pathname.startsWith('/government/pending')) return 'Pending decisions';
  if (pathname.startsWith('/government/education-review')) return 'Education';
  if (pathname.startsWith('/government/safety')) return 'Transport';
  if (pathname.startsWith('/government/checkpoint')) return 'Checkpoint';
  if (pathname.startsWith('/government/final-approval')) return 'Final approval';
  if (pathname.startsWith('/government/approved')) return 'Approved trips';
  if (pathname.startsWith('/government/monitoring')) return 'Monitoring';
  if (pathname.startsWith('/government/incidents')) return 'Incidents';
  if (pathname.startsWith('/government/documents')) return 'Documents';
  if (pathname.startsWith('/government/schools')) return 'Schools';
  if (pathname.startsWith('/government/reports')) return 'Reports';
  if (pathname.startsWith('/government/policies')) return 'Policies';
  if (pathname.startsWith('/government/audit')) return 'Audit logs';
  if (pathname.startsWith('/government/settings')) return 'Settings';
  if (pathname.startsWith('/government/admin/overview')) return 'Admin overview';
  if (pathname.startsWith('/government/admin/users')) return 'Users';
  if (pathname.startsWith('/government/admin/roles')) return 'Roles';
  if (pathname.startsWith('/government/admin/authorities')) return 'Authorities';
  if (pathname.startsWith('/government/admin/workflow')) return 'Workflow';
  if (pathname.startsWith('/government/admin/security')) return 'Security';
  return 'Government';
}

export type GovernmentNavItem = PortalNavItem;
