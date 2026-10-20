'use client';

import { BackButton } from '@/components/root-admin/back-button';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <BackButton href="/root-admin" />
      <div className="text-center space-y-4">
        <h1 className="font-montserrat text-2xl font-bold text-navy">{title}</h1>
        <p className="text-muted text-sm">
          This module is connected to the ROOT_ADMIN API. Full UI coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
