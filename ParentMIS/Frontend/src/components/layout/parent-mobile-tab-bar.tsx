'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Home, MapPinned, Menu, MessageCircle, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const FULL_TABS = [
  { id: 'home', href: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' },
  {
    id: 'learn',
    href: '/academic',
    label: 'Learning',
    icon: GraduationCap,
    match: (p: string) =>
      p.startsWith('/academic') ||
      p.startsWith('/homework') ||
      p.startsWith('/timetable') ||
      p.startsWith('/attendance') ||
      p.startsWith('/profile'),
  },
  { id: 'pay', href: '/fees', label: 'Pay', icon: Wallet, match: (p: string) => p.startsWith('/fees') || p.startsWith('/transactions') },
  {
    id: 'chat',
    href: '/communication',
    label: 'Chat',
    icon: MessageCircle,
    match: (p: string) => p.startsWith('/communication') || p.startsWith('/notifications'),
  },
] as const;

const TRIP_TABS = [
  { id: 'home', href: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' },
  {
    id: 'trips',
    href: '/shuletrip',
    label: 'ShuleTrip',
    icon: MapPinned,
    match: (p: string) => p.startsWith('/shuletrip'),
  },
] as const;

export function ParentMobileTabBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname() ?? '';
  const { shuleTripOnly } = useAuth();
  const TABS = shuleTripOnly ? TRIP_TABS : FULL_TABS;

  return (
    <nav
      className="yo-tabbar fixed bottom-3 left-3 right-3 z-40 flex h-[70px] items-center justify-around rounded-[24px] bg-[var(--yo-navy)] pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'relative flex w-[62px] flex-col items-center gap-1 pt-1 text-[10px] font-semibold',
              active ? 'text-[var(--yo-amber)]' : 'text-[#8d9ab8]'
            )}
          >
            {active ? (
              <span className="absolute -top-2.5 h-[3px] w-[22px] rounded-full bg-[var(--yo-amber)]" aria-hidden />
            ) : null}
            <Icon className="size-[22px]" strokeWidth={1.9} />
            {tab.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        className="relative flex w-[62px] flex-col items-center gap-1 pt-1 text-[10px] font-semibold text-[#8d9ab8]"
        aria-label="All menu"
      >
        <Menu className="size-[22px]" strokeWidth={1.9} />
        More
      </button>
    </nav>
  );
}
