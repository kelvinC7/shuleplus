'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SHULETRIP_NAV } from '@/lib/shuletrip-nav';

export function ShuleTripSubnav() {
  const pathname = usePathname();
  return (
    <nav
      className="-mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="ShuleTrip sections"
    >
      {SHULETRIP_NAV.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== '/shuletrip' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'snap-start inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-3.5 py-2.5 text-[11.5px] font-semibold leading-none sm:px-4 sm:text-sm',
              active
                ? 'border-[var(--yo-navy)] bg-[var(--yo-navy)] text-white'
                : 'border-[var(--yo-line)] bg-white text-[var(--yo-navy)]'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
