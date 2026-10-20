import Image from 'next/image';

/** Shown instantly while the public directory shell hydrates (Next.js App Router). */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-ink-50">
      <div className="site-container py-4">
        <div className="flex items-center gap-3">
          <Image src="/babyeyi-icon.png" alt="" width={40} height={40} priority className="h-10 w-10" />
          <div>
            <div className="h-4 w-28 animate-pulse rounded-full bg-ink-200" />
            <div className="mt-1.5 h-3 w-36 animate-pulse rounded-full bg-ink-100" />
          </div>
        </div>
      </div>

      <div className="site-container pb-16 pt-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-sky-700">babyeyi.rw</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink-900">Loading schools directory…</h1>
          <p className="mt-2 text-sm text-ink-500">Parents convenience — verified listings across Rwanda</p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden space-y-3 rounded-2xl border border-ink-200 bg-white p-5 lg:block">
            <div className="h-4 w-32 animate-pulse rounded-full bg-ink-200" />
            <div className="h-10 animate-pulse rounded-xl bg-ink-100" />
            <div className="h-10 animate-pulse rounded-xl bg-ink-100" />
            <div className="h-10 animate-pulse rounded-xl bg-ink-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-ink-200 bg-white p-5 shadow-sm"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="h-16 w-16 rounded-2xl bg-ink-100" />
                  <div className="h-8 w-8 rounded-full bg-ink-100" />
                </div>
                <div className="mt-4 h-4 w-3/4 rounded-full bg-ink-200" />
                <div className="mt-2 h-3 w-1/2 rounded-full bg-ink-100" />
                <div className="mt-4 h-3 w-full rounded-full bg-ink-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
