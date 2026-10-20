import Image from 'next/image';
import Link from 'next/link';

interface SidebarBrandProps {
  href: string;
  subtitle?: string;
}

/** White logo on navy sidebar. */
export function SidebarBrand({ href, subtitle }: SidebarBrandProps) {
  return (
    <Link href={href} className="block">
      <Image
        src="/logo_white.png"
        alt="Shule+"
        width={140}
        height={42}
        className="h-7 w-auto sm:h-8"
        priority
      />
      {subtitle && (
        <p className="mt-3 truncate text-xs font-semibold tracking-wide text-white/85" suppressHydrationWarning>
          {subtitle}
        </p>
      )}
    </Link>
  );
}
