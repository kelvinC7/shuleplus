"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { breadcrumbFromPath } from "@/config/org-admin-nav";
import { SignOutControl } from "@/components/sign-out-control";
import { performOrgAdminSignOut } from "@/utils/sign-out";

interface OrgAdminPageHeaderProps {
  onMenuOpen?: () => void;
}

function displayNameFromEmail(email?: string): string {
  if (!email) return "Organization Admin";
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OrgAdminPageHeader({ onMenuOpen }: OrgAdminPageHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iamUrl = (process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const displayName = displayNameFromEmail(user?.email);
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            {onMenuOpen ? (
              <button
                type="button"
                className="shrink-0 rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden"
                onClick={onMenuOpen}
                aria-label="Open menu"
              >
                <LayoutGrid size={18} />
              </button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {breadcrumbFromPath(pathname)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SignOutControl onLogout={() => void performOrgAdminSignOut()} />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white shadow-sm transition hover:bg-navy-light"
                aria-label="Account menu"
              >
                {initials || "A"}
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      KaziAdvance Admin
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      window.location.href = `${iamUrl}/organization-admin`;
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-navy transition hover:bg-slate-50"
                  >
                    <LayoutGrid size={16} />
                    IAM Organization Admin
                  </button>
                  <SignOutControl
                    variant="menu"
                    onLogout={() => void performOrgAdminSignOut()}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
