'use client';

import { TransportSectionShell } from '@/components/transport/transport-section-shell';
import { TransportNotificationsHub } from '@/components/transport/transport-notifications-hub';
import { useTransportLocale } from '@/contexts/transport-locale-context';

export default function TransportNotificationsPage() {
  const { t } = useTransportLocale();
  return (
    <TransportSectionShell
      title={t('notifications.title')}
      description={t('notifications.subtitle')}
    >
      <TransportNotificationsHub />
    </TransportSectionShell>
  );
}
