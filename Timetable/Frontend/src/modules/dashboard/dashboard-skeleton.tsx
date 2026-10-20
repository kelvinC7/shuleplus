'use client';

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 pb-6 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="h-3 w-28 rounded bg-slate-100" />
        <div className="mt-3 h-7 w-64 max-w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-40 rounded bg-slate-100" />
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[88px] min-w-[132px] rounded-2xl border border-slate-200 bg-white sm:min-w-0" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-2xl border border-slate-200 bg-white lg:col-span-2" />
        <div className="h-56 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-56 rounded-2xl border border-slate-200 bg-white" />
      </div>
      <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
