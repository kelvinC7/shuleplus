'use client';

import { ReactNode, useEffect, useState } from 'react';

/**
 * Renders children only after the client has mounted.
 * Prevents hydration mismatches from browser extensions that inject
 * attributes (e.g. fdprocessedid) into buttons/inputs before React hydrates.
 */
export function MountedOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return fallback;
  return children;
}
