'use client';

import { User } from 'lucide-react';
import { resolvePersonPhotoUrl } from '@/lib/smart-card-renderer';
import type { PersonKind } from '@/services/print-card-api';

type Props = {
  fullName: string;
  photoUrl?: string | null;
  kind: PersonKind;
  size?: 'sm' | 'md';
  className?: string;
};

export function CardRecordAvatar({ fullName, photoUrl, kind, size = 'md', className = '' }: Props) {
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4';
  const src = photoUrl ? resolvePersonPhotoUrl(photoUrl, kind === 'STUDENT' ? 'student' : 'staff') : '';
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full border border-slate-200 object-cover bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <span
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-navy ${className}`}
      title={fullName}
    >
      {initials.length >= 2 ? initials : <User className={`${icon} text-muted`} />}
    </span>
  );
}
