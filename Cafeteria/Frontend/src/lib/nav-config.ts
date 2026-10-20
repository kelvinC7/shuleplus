import {
  LayoutDashboard, UtensilsCrossed, Calendar, BookOpen, ChefHat, Users,
  ClipboardList, UserCheck, CalendarDays, ShieldCheck, Thermometer,
  Trash2, Truck, Heart, BarChart3, FileText, Bell, Settings, CookingPot,
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
    label: 'Meal Management', icon: UtensilsCrossed, children: [
      { href: '/menu-planning', label: 'Menu Planning', icon: Calendar },
      { href: '/recipes', label: 'Recipes', icon: BookOpen },
      { href: '/meal-production', label: 'Meal Production', icon: ChefHat },
      { href: '/beneficiaries', label: 'Beneficiaries', icon: Users },
    ],
  },
  {
    label: 'Kitchen', icon: CookingPot, children: [
      { href: '/kitchen-requests', label: 'Stock Requests', icon: ClipboardList },
      { href: '/kitchen-staff', label: 'Staff', icon: UserCheck },
      { href: '/duty-roster', label: 'Duty Roster', icon: CalendarDays },
      { href: '/hygiene', label: 'Hygiene & Safety', icon: ShieldCheck },
      { href: '/cold-storage', label: 'Cold Storage', icon: Thermometer },
    ],
  },
  { href: '/food-waste', label: 'Food Waste', icon: Trash2 },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/nutrition', label: 'Nutrition & Allergies', icon: Heart },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const FLAT_NAV = NAV_ITEMS.reduce<{ href: string; label: string }[]>((acc, item) => {
  if (item.href) acc.push({ href: item.href, label: item.label })
  if (item.children) item.children.forEach(c => acc.push({ href: c.href, label: c.label }))
  return acc
}, [])
