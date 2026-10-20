'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';

const ACTIVE_LINK =
  'bg-[#fcb038] text-[#000435] shadow-[0_6px_16px_rgba(252,176,56,0.28)]';
const INACTIVE_LINK = 'text-white/70 hover:bg-white/[0.06] hover:text-white';

export function ProcurementSidebarNavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center rounded-xl py-2.5 pl-4 pr-3 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fcb038]/70 ${
        active ? ACTIVE_LINK : INACTIVE_LINK
      }`}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#000435]/80"
          aria-hidden="true"
        />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function ProcurementSidebarChevron({ open }: { open: boolean }) {
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

export function ProcurementSidebarTopLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fcb038]/70 sm:gap-3 ${
        active ? ACTIVE_LINK : INACTIVE_LINK
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          active ? 'bg-[#000435]/10 text-[#000435]' : 'bg-white/[0.06] text-white/55'
        }`}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
