'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LOGO_GRADIENTS = [
  'bg-gradient-to-br from-sky-400 to-sky-700',
  'bg-gradient-to-br from-amber-400 to-amber-600',
  'bg-gradient-to-br from-magenta-400 to-magenta-600',
  'bg-gradient-to-br from-teal-500 to-sky-700',
];

type SchoolLogoProps = {
  name: string;
  initials: string;
  logoUrl?: string | null;
  size?: number;
  index?: number;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

/** School branding — plain img so /uploads hits nginx (Next/Image optimizer cannot reach IAM). */
export function SchoolLogo({
  name,
  initials,
  logoUrl,
  size = 64,
  index = 0,
  className,
  imageClassName,
  fallbackClassName,
}: SchoolLogoProps) {
  const [src, setSrc] = useState(logoUrl ?? '');
  const [imgOk, setImgOk] = useState(Boolean(logoUrl));

  useEffect(() => {
    setSrc(logoUrl ?? '');
    setImgOk(Boolean(logoUrl));
  }, [logoUrl]);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden font-medium tracking-wide text-white',
        imgOk && src ? 'bg-white ring-[1.5px] ring-ink-200' : LOGO_GRADIENTS[index % LOGO_GRADIENTS.length],
        className,
      )}
      style={{ width: size, height: size }}
    >
      {imgOk && src ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploads proxied by nginx, not Next image optimizer
        <img
          src={src}
          alt={`${name} logo`}
          width={size}
          height={size}
          className={cn('h-full w-full object-contain', imageClassName)}
          loading="lazy"
          decoding="async"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className={cn('text-[19px]', fallbackClassName)}>{initials}</span>
      )}
    </div>
  );
}

export { LOGO_GRADIENTS };
