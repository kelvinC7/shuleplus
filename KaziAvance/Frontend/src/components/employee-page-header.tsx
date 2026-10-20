"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { breadcrumbFromPath, pageTitleFromPath } from "@/config/employee-nav";
import { SignOutControl } from "@/components/sign-out-control";
import { performEmployeeSignOut } from "@/utils/sign-out";

interface EmployeePageHeaderProps {
  onMenuOpen?: () => void;
}

export function EmployeePageHeader({ onMenuOpen }: EmployeePageHeaderProps) {
  const pathname = usePathname();
  const { user, employee } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iamUrl = (process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const pageTitle = pageTitleFromPath(pathname);
  const displayName = employee?.fullName ?? user?.email?.split("@")[0] ?? "Employee";
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
              <h1 className="truncate text-base font-semibold text-navy lg:hidden">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SignOutControl onLogout={() => void performEmployeeSignOut()} />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white shadow-sm transition hover:bg-navy-light"
                aria-label="Account menu"
              >
                {initials || "E"}
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                    <p className="truncate text-xs text-muted">{employee?.email ?? user?.email}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Employee Portal
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      window.location.href = `${iamUrl}/post-login`;
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-navy transition hover:bg-slate-50"
                  >
                    <LayoutGrid size={16} />
                    Back to applications
                  </button>
                  <SignOutControl
                    variant="menu"
                    onLogout={() => void performEmployeeSignOut()}
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
