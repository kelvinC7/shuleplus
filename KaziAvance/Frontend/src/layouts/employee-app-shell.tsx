"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { EmployeePageHeader } from "@/components/employee-page-header";
import { EmployeeSidebar } from "@/components/employee-sidebar";
import { ApiOfflineBanner } from "@/components/api-offline-banner";
import { performEmployeeSignOut } from "@/utils/sign-out";

export function EmployeeAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { employee } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <EmployeeSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName="KaziAdvance"
        employeeName={employee?.fullName ?? employee?.position}
        onLogout={() => void performEmployeeSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden lg:ml-[272px]">
        <EmployeePageHeader onMenuOpen={() => setOpen(true)} />
        <ApiOfflineBanner />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
