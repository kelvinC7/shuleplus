'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AP_NAV_ITEMS } from '@/config/ap-nav';
import { NotificationsBell } from '@/components/notifications-bell';
import { useApPermissions } from '@/hooks/use-ap-permissions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';

function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { summary } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex flex-col">
          <span className="text-lg font-bold text-navy truncate">Action Plans</span>
          <span className="text-xs text-muted truncate">{summary?.organizationName ?? 'Loading…'}</span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {AP_NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      onClick={() => router.push(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-navy text-center">
          ShulePlus
        </span>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  const { primaryRole } = useApPermissions();

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="ap-pattern">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-white/90 backdrop-blur-sm px-6">
          <SidebarTrigger />
          <span className="text-sm text-muted">Action Plans Module</span>
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-navy sm:inline">
            {primaryRole}
          </span>
          <NotificationsBell />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
