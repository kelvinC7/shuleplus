'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TRANSPORT_MOBILE_QUICK_NAV, isTransportNavActive } from '@/config/transport-nav';

export function TransportMobileNav() {
  const pathname = usePathname();

  if (TRANSPORT_MOBILE_QUICK_NAV.length === 0) return null;

  return (
    <nav
      className="transport-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-white/95 backdrop-blur-lg lg:hidden"
      aria-label="Quick navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 py-1.5">
        {TRANSPORT_MOBILE_QUICK_NAV.map((item) => {
          const active = isTransportNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition ${
                  active ? 'bg-navy text-primary' : 'text-muted hover:bg-slate-50 hover:text-navy'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="truncate max-w-[4.5rem] text-center leading-tight">
                  {item.label.replace('Live QR ', '').replace('Trip ', '')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
