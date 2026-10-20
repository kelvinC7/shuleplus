"use client";

import type { ReactNode } from "react";
import { AccessDeniedView } from "@/components/access-denied-view";
import { AuthLoadingView } from "@/components/auth-loading-view";
import { useAuth } from "@/contexts/auth-context";

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authorized, error, reload } = useAuth();

  if (!ready) {
    return <AuthLoadingView />;
  }

  if (!authorized) {
    return <AccessDeniedView error={error} onRefreshSession={reload} />;
  }

  return <>{children}</>;
}
