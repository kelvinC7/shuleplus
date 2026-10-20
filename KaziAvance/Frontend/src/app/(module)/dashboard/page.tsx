"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { DashboardView } from "@/modules/dashboard/dashboard-view";

export default function DashboardPage() {
  const router = useRouter();
  const { portal, ready } = useAuth();

  useEffect(() => {
    if (ready && portal === "org-admin") {
      router.replace("/org-admin/dashboard");
    }
  }, [portal, ready, router]);

  if (!ready || portal === "org-admin") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted">
        Redirecting to admin console…
      </main>
    );
  }

  return <DashboardView />;
}
