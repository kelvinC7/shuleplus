import { cn } from '@/shared/cn';

export const BRAND_ICON_SRC = '/yellow-icon.png';
export const BRAND_LOGO_SRC = '/logo.png';

/** Yellow app icon from `/public/yellow-icon.png`. */
export function BrandMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <img
      src={BRAND_ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

/** Wordmark from `/public/logo.png`. */
export function ProductLogo({ className, height = 36 }: { className?: string; height?: number }) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt="ShuleTrip"
      className={cn('w-auto shrink-0 object-contain object-left', className)}
      style={{ height }}
    />
  );
}

export function ShuleTripBrand({
  portalLabel,
  variant = 'dark',
  showSubtitle = false,
}: {
  portalLabel?: string;
  variant?: 'dark' | 'light';
  showSubtitle?: boolean;
}) {
  const subClass = variant === 'light' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark size={36} />
      <div className="min-w-0">
        <ProductLogo height={variant === 'light' ? 32 : 28} className="max-w-[160px]" />
        {showSubtitle && portalLabel ? (
          <p className={cn('mt-1 truncate text-[11px] font-semibold uppercase tracking-wide', subClass)}>
            {portalLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
