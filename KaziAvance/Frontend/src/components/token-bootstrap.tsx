"use client";

import { Suspense, useEffect } from "react";
import { captureTokenFromUrl } from "@/shared/auth-token";

function TokenBootstrapInner() {
  useEffect(() => {
    captureTokenFromUrl();
  }, []);

  return null;
}

export function TokenBootstrapSuspense() {
  return (
    <Suspense fallback={null}>
      <TokenBootstrapInner />
    </Suspense>
  );
}
