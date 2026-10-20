'use client';

import { useEffect } from 'react';

/** Recover from client-side crashes without the generic Next.js error screen. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Parent Portal]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Parent Portal unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">
            Something went wrong loading this page. Try again or sign in from the login screen.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-amber-400"
            >
              Try again
            </button>
            <a
              href="/login"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Go to login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
