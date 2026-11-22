'use client';

import { useEffect } from 'react';
import { ErrorDialog } from '@/components/error-dialog';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorDialog message={error.message} onRetry={reset} />;
}
