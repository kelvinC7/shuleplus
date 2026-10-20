import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  Target,
  FileStack,
  Paperclip,
  CalendarDays,
  Gauge,
  Wallet,
  PieChart,
  Layers,
} from 'lucide-react';

export interface NavLeaf {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavLeaf[];
}

/** Simplified Rwanda school action-plan sidebar (Lucide icons, no emoji). */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'planning',
    title: 'Action Planning',
    icon: ClipboardList,
    items: [
      { href: '/plans', label: 'Action Plans', icon: ClipboardList },
      { href: '/tasks', label: 'Objectives & Activities', icon: Target },
      { href: '/templates', label: 'Templates', icon: FileStack },
      { href: '/evidence', label: 'Evidence', icon: Paperclip },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring',
    icon: Gauge,
    items: [
      { href: '/kpis', label: 'KPIs & Targets', icon: Gauge },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    id: 'budget',
    title: 'Budget',
    icon: Wallet,
    items: [
      { href: '/budget', label: 'Activity Budget', icon: Wallet },
      { href: '/budget?view=utilization', label: 'Budget Utilization', icon: PieChart },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Layers,
    items: [{ href: '/pillars', label: 'Strategic Pillars', icon: Layers }],
  },
];

/** All routable paths for page title lookup (pathname only, no query). */
export const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/plans': 'Action Plans',
  '/plans/new': 'New Action Plan',
  '/tasks': 'Activities',
  '/templates': 'Templates',
  '/evidence': 'Evidence',
  '/calendar': 'Calendar',
  '/kpis': 'KPIs & Targets',
  '/budget': 'Budget',
  '/reports': 'Print & Export',
  '/pillars': 'Strategic Pillars',
  '/categories': 'Categories',
  '/approvals': 'Approvals',
  '/meetings': 'Meetings',
};

export const FLAT_NAV = NAV_SECTIONS.flatMap((s) => s.items);

export function isNavActive(pathname: string, href: string, search = '') {
  const [path, queryPart] = href.split('?');
  const pathMatch = pathname === path || pathname.startsWith(`${path}/`);
  if (!pathMatch) return false;

  const current = new URLSearchParams(search.replace(/^\?/, ''));

  if (!queryPart) {
    if (path === '/budget' && current.get('view') === 'utilization') return false;
    return true;
  }

  const expected = new URLSearchParams(queryPart);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function sectionHasActiveItem(pathname: string, items: NavLeaf[], search = '') {
  return items.some((item) => isNavActive(pathname, item.href, search));
}

export function pageTitleFromPath(pathname: string): string {
  if (pathname.startsWith('/plans/') && pathname.endsWith('/edit')) return 'Edit Plan';
  if (pathname.startsWith('/plans/')) return 'Plan Details';
  const base = pathname.split('?')[0];
  const exact = ROUTE_LABELS[base];
  if (exact) return exact;
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (base.startsWith(`${route}/`)) return label;
  }
  return 'Action Plans';
}
