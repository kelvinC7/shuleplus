import type { PmSidebarConfig } from '@/config/pm-sidebar';
import { PM_SIDEBAR } from '@/config/pm-sidebar';
import { LayoutDashboard, MapPinned } from 'lucide-react';

export type PortalFeatures = {
  studentManagement: boolean;
  shuleTrip: boolean;
};

export const FULL_PORTAL_FEATURES: PortalFeatures = {
  studentManagement: true,
  shuleTrip: true,
};

export const SHULE_TRIP_ONLY_FEATURES: PortalFeatures = {
  studentManagement: false,
  shuleTrip: true,
};

export function isShuleTripOnlyPortal(features?: PortalFeatures | null) {
  if (!features) return false;
  return features.shuleTrip && !features.studentManagement;
}

/** Manual manifest parents: sidebar is only Home + ShuleTrip (sub-routes use in-page tabs). */
export const SHULE_TRIP_PARENT_SIDEBAR: PmSidebarConfig = {
  basePath: '/dashboard',
  standalone: [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/shuletrip', label: 'ShuleTrip', icon: MapPinned },
  ],
  sections: [],
};

export function filteredPmSidebar(features?: PortalFeatures | null): PmSidebarConfig {
  if (!isShuleTripOnlyPortal(features)) return PM_SIDEBAR;
  return SHULE_TRIP_PARENT_SIDEBAR;
}

export function inferPortalFeaturesFromSession(session: {
  parent?: { firstName?: string };
  portalFeatures?: PortalFeatures;
} | null): PortalFeatures {
  if (session?.portalFeatures && isShuleTripOnlyPortal(session.portalFeatures)) {
    return session.portalFeatures;
  }
  if (session?.parent?.firstName === 'Guardian') {
    return SHULE_TRIP_ONLY_FEATURES;
  }
  return SHULE_TRIP_ONLY_FEATURES;
}

export const LOGIN_HIGHLIGHTS_FULL = ['Pay fees', 'Follow marks', 'Top up pocket money'] as const;
export const LOGIN_HIGHLIGHTS_TRIP = ['Trip consent', 'Transport details', 'School trip alerts'] as const;
