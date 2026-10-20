import Link from 'next/link';

interface SuperAdminModuleTileProps {
  href: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  badge?: string | number;
  accent?: 'default' | 'primary' | 'navy';
}

export function SuperAdminModuleTile({
  href,
  label,
  description,
  icon,
  badge,
  accent = 'default',
}: SuperAdminModuleTileProps) {
  const accentRing =
    accent === 'primary'
      ? 'hover:border-primary/50 hover:shadow-[0_12px_32px_rgba(252,176,56,0.15)]'
      : accent === 'navy'
        ? 'hover:border-navy/20 hover:shadow-[0_12px_32px_rgba(0,4,53,0.12)]'
        : 'hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,4,53,0.08)]';

  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,4,53,0.04)] transition-all duration-200 hover:-translate-y-0.5 ${accentRing}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150"
      />

      <div className="relative flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-light text-primary shadow-inner transition group-hover:from-primary group-hover:to-primary-hover group-hover:text-navy">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-poppins-bold uppercase tracking-wider text-navy">
              {badge}
            </span>
          )}
          <svg
            className="text-navy/15 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <div className="relative space-y-1">
        <h3 className="font-poppins-semibold text-sm leading-snug text-navy sm:text-base">{label}</h3>
        {description && (
          <p className="font-poppins-regular text-xs leading-relaxed text-muted line-clamp-2">{description}</p>
        )}
      </div>
    </Link>
  );
}
