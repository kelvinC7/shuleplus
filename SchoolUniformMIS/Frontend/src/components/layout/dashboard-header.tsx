"use client";

import * as React from "react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  MessageSquare,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DashboardHeaderProps {
  title?: string;
  breadcrumbs?: string[];
  userName?: string;
  userRole?: string;
  notificationCount?: number;
  messageCount?: number;
  onSearch?: (query: string) => void;
  className?: string;
}

/**
 * Global dashboard top bar - search, notifications, user menu.
 * Matches the enterprise header pattern from the ShulePlus design reference.
 */
export function DashboardHeader({
  title = "Dashboard",
  breadcrumbs = ["Home", "Dashboard"],
  userName = "Jean Ishimwe",
  userRole = "Super Admin",
  notificationCount = 8,
  messageCount = 3,
  onSearch,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center gap-4 border-b border-border/60 bg-card px-6 py-4 shadow-soft",
        className,
      )}
    >
      {/* Title block */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow-primary">
          <LayoutDashboard className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb}>
                {i > 0 && <span className="mx-1.5 text-border">•</span>}
                <span
                  className={
                    i === breadcrumbs.length - 1 ? "text-foreground/80" : ""
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mx-auto hidden w-full max-w-md flex-1 md:block">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search anything..."
          className="h-11 rounded-xl border-border/60 bg-muted/30 pl-10 pr-14"
          onChange={(e) => onSearch?.(e.target.value)}
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4.5" />
          {notificationCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {notificationCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="relative flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Messages"
        >
          <MessageSquare className="size-4.5" />
          {messageCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {messageCount}
            </span>
          ) : null}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card py-1.5 pr-2 pl-1.5 transition-colors hover:bg-muted"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
