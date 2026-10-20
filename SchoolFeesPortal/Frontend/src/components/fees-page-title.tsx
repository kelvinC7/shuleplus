'use client';

import type { ReactNode } from 'react';

interface FeesPageTitleProps {
  children: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}

export function FeesPageTitle({
  children,
  as: Tag = 'h2',
  className = 'text-xl font-bold text-navy',
}: FeesPageTitleProps) {
  return <Tag className={`tracking-tight ${className}`}>{children}</Tag>;
}
