'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { resolveIamAssetUrl } from '@/lib/iam-assets';

type SchoolLogoProps = {
  logoUrl?: string | null;
  name: string;
  className?: string;
  iconSize?: number;
};

export function SchoolLogo({ logoUrl, name, className = 'h-9 w-9', iconSize = 16 }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveIamAssetUrl(logoUrl);

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-navy/5 text-navy/55 ${className}`}
      >
        <Building2 size={iconSize} aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`shrink-0 rounded-xl border border-navy/10 bg-white object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
