import {
  LayoutDashboard,
  BookOpen,
  BookCopy,
  RotateCcw,
  Users,
  Clock,
  FileText,
  Download,
  Package,
  BarChart3,
  Plus,
  Tags,
  Bookmark,
  MapPin,
  AlertTriangle,
  BookMarked,
  ShieldCheck,
  UserCheck,
  ArrowLeftRight,
  BookImage,
  Settings,
  DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LibSidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface LibSidebarSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: LibSidebarItem[];
}

export interface LibSidebarConfig {
  basePath: string;
  standalone?: LibSidebarItem[];
  sections: LibSidebarSection[];
}

export const LIB_SIDEBAR: LibSidebarConfig = {
  basePath: '/dashboard',
  standalone: [{ href: '/dashboard', label: 'Library Dashboard', icon: LayoutDashboard }],
  sections: [
    {
      id: 'catalog',
      title: 'Catalog',
      icon: BookOpen,
      items: [
        { href: '/catalog', label: 'All Resources', icon: BookOpen },
        { href: '/catalog/new', label: 'Add Resource', icon: Plus },
        { href: '/catalog/categories', label: 'Categories', icon: Tags },
        { href: '/catalog/subjects', label: 'Subjects', icon: Bookmark },
        { href: '/catalog/shelves', label: 'Shelves', icon: MapPin },
      ],
    },
    {
      id: 'circulation',
      title: 'Circulation',
      icon: RotateCcw,
      items: [
        { href: '/circulation/borrow', label: 'Borrow Book', icon: BookCopy },
        { href: '/circulation/returns', label: 'Returns', icon: RotateCcw },
        { href: '/circulation/reservations', label: 'Reservations', icon: Bookmark },
        { href: '/circulation/overdue', label: 'Overdue', icon: AlertTriangle },
        { href: '/circulation/fines', label: 'Fines', icon: DollarSign },
      ],
    },
    {
      id: 'members',
      title: 'Members',
      icon: Users,
      items: [
        { href: '/members/students', label: 'Students', icon: UserCheck },
        { href: '/members/teachers', label: 'Teachers', icon: ShieldCheck },
      ],
    },
    {
      id: 'operations',
      title: 'Operations',
      icon: Clock,
      items: [
        { href: '/visits', label: 'Library Visits', icon: Clock },
        { href: '/requests', label: 'Book Requests', icon: FileText },
        { href: '/digital', label: 'Digital Library', icon: Download },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: Package,
      items: [
        { href: '/inventory', label: 'Stock', icon: Package },
        { href: '/inventory/damaged', label: 'Damaged', icon: AlertTriangle },
        { href: '/inventory/lost', label: 'Lost', icon: BookImage },
        { href: '/inventory/transfers', label: 'Transfers', icon: ArrowLeftRight },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: BarChart3,
      items: [
        { href: '/reports', label: 'Reports', icon: BarChart3 },
        { href: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
};

export function breadcrumbLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Library Dashboard';
  const all = [
    ...(LIB_SIDEBAR.standalone ?? []),
    ...LIB_SIDEBAR.sections.flatMap((s) => s.items),
  ];
  const match = all.find((nav) =>
    nav.href === '/dashboard' ? pathname === nav.href : pathname.startsWith(nav.href)
  );
  return match?.label ?? 'Library';
}
