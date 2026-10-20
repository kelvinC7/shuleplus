"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SidebarVariant = "light" | "dark" | "compact";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon | React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
  children?: { label: string; href: string }[];
}

function isLucideIcon(icon: NavItem["icon"]): icon is LucideIcon {
  return (
    typeof icon === "function" ||
    (typeof icon === "object" && icon !== null && "render" in (icon as object))
  );
}

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  if (isLucideIcon(icon)) {
    const Icon = icon;
    return <Icon className="size-4.5 shrink-0" />;
  }
  return <>{icon}</>;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface AppSidebarProps {
  variant?: SidebarVariant;
  items: NavItem[];
  appName?: string;
  className?: string;
}

function NavLink({
  item,
  variant,
  pathname,
  compact,
}: {
  item: NavItem;
  variant: SidebarVariant;
  pathname: string;
  compact?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const childActive =
    item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const [open, setOpen] = React.useState(active || childActive);
  const isDark = variant === "dark";
  const hasChildren = item.children && item.children.length > 0;

  const baseLink = cn(
    "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
    compact ? "size-10 justify-center px-0" : "px-3 py-2.5",
    active || childActive
      ? isDark
        ? "bg-primary text-primary-foreground shadow-glow-primary"
        : "bg-primary/12 text-primary"
      : isDark
        ? "text-white/70 hover:bg-white/10 hover:text-white"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

  if (hasChildren && !compact) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(baseLink, "w-full")}
        >
          <NavIcon icon={item.icon} />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge ? (
            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
              {item.badge}
            </span>
          ) : null}
          {open ? (
            <ChevronDown className="size-4 opacity-60" />
          ) : (
            <ChevronRight className="size-4 opacity-60" />
          )}
        </button>
        {open ? (
          <div className="mt-1 ml-4 space-y-0.5 border-l border-white/10 pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(pathname, child.href)
                    ? isDark
                      ? "bg-white/10 font-medium text-white"
                      : "bg-primary/10 font-medium text-primary"
                    : isDark
                      ? "text-white/60 hover:text-white"
                      : "text-muted-foreground hover:text-foreground",
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={baseLink}
      title={compact ? item.label : undefined}
    >
      <NavIcon icon={item.icon} />
      {!compact ? (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge ? (
            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
              {item.badge}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

export function AppSidebar({
  variant = "dark",
  items,
  appName = "Sample Module",
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const isDark = variant === "dark";
  const isCompact = variant === "compact";

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r transition-colors",
        isCompact ? "w-[72px]" : "w-64",
        isDark
          ? "border-white/10 bg-gradient-to-b from-[#000435] to-[#0a0f5c] text-white"
          : "border-border/60 bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b px-4 py-5",
          isDark ? "border-white/10" : "border-border/60",
          isCompact && "justify-center px-2",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow-primary">
          <GraduationCap className="size-5" />
        </div>
        {!isCompact ? (
          <div>
            <p
              className={cn(
                "text-lg font-bold tracking-tight",
                isDark ? "text-white" : "text-foreground",
              )}
            >
              {appName}
            </p>
            <p className="text-[10px] font-medium tracking-widest text-primary uppercase">
              ShulePlus ERP
            </p>
          </div>
        ) : null}
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto p-3",
          isCompact && "px-2",
        )}
      >
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            variant={variant}
            pathname={pathname}
            compact={isCompact}
          />
        ))}
      </nav>

      {!isCompact ? (
        <div
          className={cn(
            "border-t p-4",
            isDark ? "border-white/10" : "border-border/60",
          )}
        >
          <div
            className={cn(
              "rounded-xl p-3 text-center text-xs",
              isDark
                ? "bg-white/5 text-white/60"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            <p className="font-semibold text-primary">v2.0.0</p>
            <p className="mt-0.5">Enterprise Edition</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
