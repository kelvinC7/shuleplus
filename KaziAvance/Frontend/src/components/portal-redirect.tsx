"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { captureTokenFromUrl, getToken } from "@/shared/auth-token";
import { isOrgOrPlatformAdmin, parseJwtPayload } from "@/shared/jwt";

/** If IAM sent an org admin to /dashboard, redirect before the auth gate runs. */
export function PortalRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureTokenFromUrl();
    const token = getToken();
    const user = token ? parseJwtPayload(token) : null;
    if (!isOrgOrPlatformAdmin(user)) return;

    const qs = searchParams.toString();
    const suffix = qs ? `?${qs}` : "";

    if (pathname === "/dashboard" || pathname === "/") {
      router.replace(`/org-admin/dashboard${suffix}`);
    }
  }, [pathname, router, searchParams]);

  return null;
}
