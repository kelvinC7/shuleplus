import Link from 'next/link';

interface BackButtonProps {
  href: string;
  label?: string;
}

export function BackButton({ href, label = 'Back to Dashboard' }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="group mb-5 inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/80 py-2 pl-2.5 pr-4 text-sm font-poppins-medium text-navy shadow-[0_1px_2px_rgba(0,4,53,0.04)] backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-white hover:shadow-md"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy/[0.05] text-navy transition-all group-hover:-translate-x-0.5 group-hover:bg-primary group-hover:text-navy">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
