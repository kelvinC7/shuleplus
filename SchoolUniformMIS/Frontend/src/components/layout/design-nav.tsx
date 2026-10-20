"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/design", label: "Overview", exact: true },
  { href: "/design/headers", label: "Page Headers" },
  { href: "/design/module-headers", label: "Module Headers" },
  { href: "/design/charts", label: "Charts" },
  { href: "/design/sidebar", label: "Sidebar" },
];

export function DesignNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/design" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-xs font-bold">SP</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Design System</p>
              <p className="text-[10px] text-muted-foreground">ShulePlus ERP</p>
            </div>
          </Link>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/sandbox"
          className="hidden text-xs font-medium text-muted-foreground hover:text-primary sm:block"
        >
          ← Sandbox
        </Link>
      </div>
    </header>
  );
}
