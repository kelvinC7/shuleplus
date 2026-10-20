'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { resolveCardAssetUrl } from '@/lib/smart-card-renderer';

type SchoolLogoProps = {
  logoUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
};

export function SchoolLogo({ logoUrl, name, className, iconClassName }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl ? resolveCardAssetUrl(logoUrl, 'iam') : '';

  if (!src || failed) {
    return <Building2 className={`h-5 w-5 text-navy ${iconClassName ?? ''} ${className ?? ''}`} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`h-full w-full object-contain ${className ?? ''}`}
      onError={() => setFailed(true)}
    />
  );
}
