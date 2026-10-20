"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface OrgAdminSidebarNavLinkProps {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}

export function OrgAdminSidebarNavLink({ href, label, active, onNavigate }: OrgAdminSidebarNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`relative flex items-center rounded-xl px-3 py-2 text-[13px] font-medium transition ${
        active
          ? "bg-primary text-navy shadow-sm"
          : "text-white/65 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary" aria-hidden />
      ) : null}
      {label}
    </Link>
  );
}

export function OrgAdminSidebarChevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      size={16}
      className={`shrink-0 text-white/40 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    />
  );
}
