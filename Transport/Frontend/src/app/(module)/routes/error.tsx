'use client';

import { useEffect } from 'react';

export default function RoutesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunk =
    error.name === 'ChunkLoadError' ||
    /Loading chunk|ChunkLoadError|failed to fetch dynamically imported module/i.test(error.message);

  useEffect(() => {
    console.error('[routes]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy">{isChunk ? 'Page update needed' : 'Something went wrong'}</h2>
      <p className="text-sm text-muted">
        {isChunk
          ? 'The routes page bundle could not load - usually after a dev server restart or code update. Reload to fetch the latest JavaScript.'
          : error.message || 'An unexpected error occurred on the routes page.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
        <button type="button" className="btn-secondary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
