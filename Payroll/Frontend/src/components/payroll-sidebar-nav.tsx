'use client';

import Link from 'next/link';

interface PayrollSidebarNavLinkProps {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}

export function PayrollSidebarNavLink({ href, label, active, onNavigate }: PayrollSidebarNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center rounded-xl py-2.5 pl-4 pr-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
        active
          ? 'bg-primary text-navy shadow-[0_6px_16px_rgba(252,176,56,0.28)]'
          : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-navy/80" aria-hidden="true" />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function PayrollSidebarChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
