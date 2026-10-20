'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.name === 'ChunkLoadError' ||
    /loading chunk|failed to fetch dynamically imported module|__webpack_modules__|is not a function|Cannot find module '\.\//i.test(
      error.message,
    );

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-medium text-ink-900">
          {isChunkError ? 'Page update in progress' : 'Something went wrong'}
        </p>
        <p className="mt-2 text-sm text-ink-500">
          {isChunkError
            ? 'The app was updated or the dev server recompiled. Reload to fetch the latest version.'
            : error.message || 'An unexpected error occurred.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            Reload page
          </button>
          {!isChunkError ? (
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full border border-ink-200 px-6 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
