import type { RootAdminNavItem } from '../root-admin/nav-config';
import type { SuperAdminNavItem } from '../super-admin/nav-config';

export type SidebarNavItem = RootAdminNavItem | SuperAdminNavItem;

export interface SidebarNavSection {
  id: string;
  title: string;
  icon: SidebarNavItem['icon'];
  items: SidebarNavItem[];
}

export interface SidebarStandaloneLink {
  href: string;
  label: string;
  icon: SidebarNavItem['icon'];
}

export interface SidebarNavConfig {
  basePath: string;
  standalone?: SidebarStandaloneLink[];
  sections: SidebarNavSection[];
}
