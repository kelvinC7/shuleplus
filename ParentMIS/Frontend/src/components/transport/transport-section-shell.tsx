'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { TransportSubnav } from '@/components/transport/transport-subnav';
import { useTransportLocale } from '@/contexts/transport-locale-context';

/** Transport pages that do not require an active route assignment (e.g. alerts, settings). */
export function TransportSectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t } = useTransportLocale();
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        variant="navy"
        eyebrow={t('portal.eyebrow')}
        title={title}
        description={description ?? t('portal.defaultDescription')}
      />
      <TransportSubnav />
      {children}
    </div>
  );
}
