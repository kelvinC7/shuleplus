"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { OrgAdminPageHeader } from "@/components/org-admin-page-header";
import { OrgAdminSidebar } from "@/components/org-admin-sidebar";
import { ApiOfflineBanner } from "@/components/api-offline-banner";
import { performOrgAdminSignOut } from "@/utils/sign-out";

export function OrgAdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const orgName = "Your Organization";

  return (
    <div className="dashboard-bg min-h-screen">
      <OrgAdminSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={orgName}
        onLogout={() => void performOrgAdminSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden lg:ml-[272px]">
        <OrgAdminPageHeader onMenuOpen={() => setOpen(true)} />
        <ApiOfflineBanner />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
