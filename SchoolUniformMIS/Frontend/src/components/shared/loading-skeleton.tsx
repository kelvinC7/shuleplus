import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton presets - keep loading states consistent across modules.
 */

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-border/60 bg-card p-6 shadow-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-8 w-28" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border/60 bg-card shadow-soft">
      <div className="flex gap-4 border-b bg-muted/40 px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[16px] border border-border/60 bg-card p-6 shadow-soft"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <Skeleton className="mt-6 h-9 w-28 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
