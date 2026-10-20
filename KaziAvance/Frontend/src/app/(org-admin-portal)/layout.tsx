"use client";

import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/shared/notifications";

export default function OrgAdminPortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AuthGate>{children}</AuthGate>
      </NotificationProvider>
    </AuthProvider>
  );
}
