'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSiteLanguage } from './language-provider';

interface LogoProps {
  className?: string;
  inverted?: boolean;
}

export function Logo({ className, inverted }: LogoProps) {
  const { t } = useSiteLanguage();

  return (
    <a
      href="#"
      className={cn(
        'flex shrink-0 items-center gap-2.5 text-[19px] font-semibold leading-[1.15]',
        inverted ? 'text-white' : 'text-sky-700',
        className,
      )}
    >
      <Image
        src="/babyeyi-icon.png"
        alt="babyeyi.rw logo"
        width={44}
        height={44}
        priority
        className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_3px_8px_rgba(12,74,110,0.35)] transition-transform duration-200 hover:scale-105 max-sm:h-9 max-sm:w-9"
      />
      <span>
        babyeyi<span className="text-amber-500">.rw</span>
        <small
          className={cn(
            'block text-[10px] font-medium tracking-[0.03em]',
            inverted ? 'text-sky-300' : 'text-ink-500',
          )}
        >
          {t.logoTagline}
        </small>
      </span>
    </a>
  );
}
