"use client";

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { AcademicPeriodProvider } from "@/contexts/academic-period-context";
import { MainLayout } from "@/layouts/main-layout";
import { SessionAccessDeniedScreen } from "@/components/session-access";

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();

  if (!ready) {
    return (
      <div className="dashboard-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-white p-6 text-center shadow-soft">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-navy">Verifying session…</p>
          <p className="mt-1 text-xs text-muted">
            Checking license and tenant access
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <SessionAccessDeniedScreen
        error={error}
        moduleName="Uniforms"
        idPrefix="uniforms"
      />
    );
  }

  return (
    <SettingsProvider>
      <AcademicPeriodProvider>
        <MainLayout>{children}</MainLayout>
      </AcademicPeriodProvider>
    </SettingsProvider>
  );
}

export default function ModuleLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
