import Image from 'next/image';
import Link from 'next/link';

interface SidebarBrandProps {
  href: string;
  subtitle?: string;
}

/** Full-color logo on a light plate — readable on navy sidebars. */
export function SidebarBrand({ href, subtitle }: SidebarBrandProps) {
  return (
    <Link href={href} className="block">
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
      {subtitle && (
        <p className="mt-3 truncate text-xs font-semibold tracking-wide text-white/85" suppressHydrationWarning>
          {subtitle}
        </p>
      )}
    </Link>
  );
}
