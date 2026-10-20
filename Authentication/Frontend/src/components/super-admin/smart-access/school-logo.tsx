'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { resolvePublicAssetUrl } from '@/lib/organization-registration';
import { cn } from '@/lib/utils';

type SchoolLogoProps = {
  logoUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
};

export function SchoolLogo({ logoUrl, name, className, iconClassName }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = resolvePublicAssetUrl(logoUrl);

  if (!src || failed) {
    return <Building2 className={cn('h-5 w-5 text-navy', iconClassName, className)} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn('h-full w-full object-contain', className)}
      onError={() => setFailed(true)}
    />
  );
}
