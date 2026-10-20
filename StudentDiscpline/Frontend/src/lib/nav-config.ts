import {
  LayoutDashboard, ShieldAlert, FileWarning, FolderTree, Ticket,
  DoorOpen, Award, FileText, PlusCircle, CheckCircle, Clock
} from 'lucide-react';

export interface NavItem {
  href?: string
  label: string
  icon: any
  children?: { href: string; label: string; icon: any }[]
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Discipline', icon: ShieldAlert, children: [
      { href: '/discipline', label: 'All Cases', icon: FileWarning },
      { href: '/discipline/create', label: 'Create Case', icon: PlusCircle },
      { href: '/discipline/categories', label: 'Categories', icon: FolderTree },
    ],
  },
  {
    label: 'Permissions', icon: Ticket, children: [
      { href: '/permissions', label: 'All Requests', icon: Clock },
      { href: '/permissions/create', label: 'New Request', icon: PlusCircle },
    ],
  },
  { href: '/gate', label: 'Gate Management', icon: DoorOpen },
  { href: '/behavior', label: 'Positive Behavior', icon: Award },
  { href: '/reports', label: 'Reports', icon: FileText },
]

export const FLAT_NAV = NAV_ITEMS.reduce<{ href: string; label: string }[]>((acc, item) => {
  if (item.href) acc.push({ href: item.href, label: item.label })
  if (item.children) item.children.forEach(c => acc.push({ href: c.href, label: c.label }))
  return acc
}, [])
