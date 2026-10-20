"use client";

import { Suspense, useEffect } from "react";
import { captureTokenFromUrl } from "@/shared/auth-token";

/** Captures ?token= from URL on every route before module auth runs. */
export function TokenBootstrap() {
  useEffect(() => {
    captureTokenFromUrl();
  }, []);
  return null;
}

export function TokenBootstrapSuspense() {
  return (
    <Suspense fallback={null}>
      <TokenBootstrap />
    </Suspense>
  );
}
