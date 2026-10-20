import Image from 'next/image';
import Link from 'next/link';

interface HrSidebarBrandProps {
  href?: string;
  subtitle?: string;
}

export function HrSidebarBrand({ href = '/dashboard', subtitle = 'Loading…' }: HrSidebarBrandProps) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Shule+"
        width={120}
        height={36}
        className="h-8 w-auto brightness-0 invert"
        priority
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-primary">HR Center</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/45">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
