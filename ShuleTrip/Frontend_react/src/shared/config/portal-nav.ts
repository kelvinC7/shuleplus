import type { LucideIcon } from 'lucide-react';

export interface PortalNavLink {
  label: string;
  href: string;
}

export interface PortalNavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: PortalNavLink[];
}

export function isPortalNavActive(pathname: string, href: string): boolean {
  if (href === '/school/dashboard') {
    return pathname === '/school/dashboard';
  }
  if (href === '/school/trips/new') {
    return pathname === '/school/trips/new';
  }
  if (href === '/school/trips') {
    return pathname === '/school/trips' || /^\/school\/trips\/[^/]+\/edit/.test(pathname);
  }
  if (href === '/government/overview') {
    return pathname === '/government/overview';
  }
  if (href === '/government/review-queue') {
    return pathname === '/government/review-queue' || pathname.startsWith('/government/review/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isPortalNavGroupActive(groupLabel: string, pathname: string): boolean {
  switch (groupLabel) {
    case 'Admin':
      return pathname.startsWith('/government/admin');
    default:
      return false;
  }
}
