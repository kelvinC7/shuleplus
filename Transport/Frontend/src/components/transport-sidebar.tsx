'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { TRANSPORT_NAV_ITEMS, isTransportNavActive } from '@/config/transport-nav';
import { TransportSidebarNavLink } from '@/components/transport-sidebar-nav';
import { PwaInstallSidebarButton } from '@/components/pwa-install-sidebar-button';
import { SignOutControl } from '@/components/sign-out-control';

interface TransportSidebarProps {
  open: boolean;
  onClose: () => void;
  orgName: string;
  onLogout?: () => void;
}

export function TransportSidebar({ open, onClose, orgName, onLogout }: TransportSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`hr-sidebar platform-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(272px,88vw)] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:w-[272px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Transport module navigation"
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            <Image
              src="/logo_white.png"
              alt="Shule+"
              width={140}
              height={42}
              className="h-8 w-auto sm:h-9"
              priority
            />
          </Link>
          <p className="mt-1.5 text-[11px] font-medium tracking-wide text-white/45">Transport</p>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90">
            {orgName}
          </p>
        </div>

        <nav
          className="hr-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4"
          aria-label="Primary"
        >
          <ul className="space-y-0.5">
            {TRANSPORT_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <TransportSidebarNavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isTransportNavActive(pathname, item.href)}
                  onNavigate={onClose}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          <PwaInstallSidebarButton />
          {onLogout ? (
            <SignOutControl variant="sidebar" onLogout={onLogout} />
          ) : (
            <p className="px-1 text-[11px] text-white/40">Fleet · routes · attendance</p>
          )}
        </div>
      </aside>
    </>
  );
}
