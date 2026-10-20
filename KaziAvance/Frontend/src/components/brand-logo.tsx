export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label="Shule+">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-sm font-bold text-primary">
        S+
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-bold text-navy">shule+</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          manage smarter
        </span>
      </span>
    </div>
  );
}
