"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { captureTokenFromUrl, getToken } from "@/shared/auth-token";
import { isOrgOrPlatformAdmin, parseJwtPayload } from "@/shared/jwt";

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureTokenFromUrl();
    const qs = searchParams.toString();
    const token = getToken();
    const user = token ? parseJwtPayload(token) : null;
    const target = isOrgOrPlatformAdmin(user) ? "/org-admin/dashboard" : "/dashboard";
    router.replace(`${target}${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted">
      Opening KaziAdvance…
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading…
        </main>
      }
    >
      <HomeRedirect />
    </Suspense>
  );
}
