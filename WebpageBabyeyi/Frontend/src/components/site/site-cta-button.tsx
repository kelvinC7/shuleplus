'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const siteCtaButtonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5',
    'text-[12px] font-extrabold capitalize tracking-normal',
    'transition hover:-translate-y-0.5',
    'sm:px-5 sm:text-[12.5px]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[#000435] text-white',
          'shadow-[0_10px_24px_rgba(0,4,53,0.28)] ring-2 ring-amber-400/90',
          'hover:bg-[#0a1454] hover:shadow-[0_14px_32px_rgba(0,4,53,0.32)]',
        ],
        secondary: [
          'bg-[#FCB038] text-[#000435]',
          'shadow-[0_10px_24px_rgba(252,176,56,0.32)] ring-2 ring-[#000435]/20',
          'hover:bg-amber-400 hover:shadow-[0_14px_32px_rgba(252,176,56,0.38)]',
        ],
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      fullWidth: false,
    },
  }
);

type SiteCtaButtonProps = VariantProps<typeof siteCtaButtonVariants> & {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SiteCtaButton({ href, icon, children, variant, fullWidth, className }: SiteCtaButtonProps) {
  const badgeClass =
    variant === 'secondary'
      ? 'bg-[#000435] text-white'
      : 'bg-[#FCB038] text-[#000435]';

  return (
    <a href={href} className={cn(siteCtaButtonVariants({ variant, fullWidth }), className)}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', badgeClass)}>
        {icon}
      </span>
      {children}
    </a>
  );
}
