"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Legacy IAM launch path → employee dashboard */
function EmployeeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/dashboard${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted">
      Opening employee dashboard…
    </main>
  );
}

export default function EmployeePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted">
          Loading…
        </main>
      }
    >
      <EmployeeRedirect />
    </Suspense>
  );
}
