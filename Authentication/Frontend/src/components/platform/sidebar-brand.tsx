import Image from 'next/image';
import Link from 'next/link';

interface SidebarBrandProps {
  href: string;
  subtitle?: string;
  /** `dark` = white logo on navy sidebar (no box). `plate` = full-color logo on white plate. */
  variant?: 'dark' | 'plate';
}

export function SidebarBrand({ href, subtitle, variant = 'plate' }: SidebarBrandProps) {
  const isDark = variant === 'dark';

  return (
    <Link href={href} className="block">
      {isDark ? (
        <Image
          src="/logo_white.png"
          alt="Shule+"
          width={160}
          height={48}
          className="h-9 w-auto max-w-[180px] object-contain object-left"
          priority
        />
      ) : (
        <div className="rounded-xl bg-white px-3 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
          <Image
            src="/logo.png"
            alt="Shule+"
            width={180}
            height={54}
            className="h-9 w-full object-contain object-left"
            priority
          />
        </div>
      )}
      {subtitle && (
        <p
          className={`mt-3 truncate text-xs font-semibold tracking-wide ${
            isDark ? 'text-white/85' : 'text-white/85'
          }`}
          suppressHydrationWarning
        >
          {subtitle}
        </p>
      )}
    </Link>
  );
}
