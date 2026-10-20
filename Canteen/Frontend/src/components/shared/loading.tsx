import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-5 w-5 animate-spin rounded-full border-2 border-muted/30 border-t-primary', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/15', className)} />;
}
