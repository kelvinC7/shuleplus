'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TransportSubnav } from '@/components/transport/transport-subnav';
import { useStudentFetch } from '@/hooks/use-fetch';
import type { ParentTransportPortalResponse, TransportPortalPayload } from '@/types/parent-transport';
import { useTransportLocale } from '@/contexts/transport-locale-context';

export function useTransportPortal() {
  return useStudentFetch<ParentTransportPortalResponse>('/transport/portal');
}

export function isEnrolled(portal: TransportPortalPayload | undefined): portal is Extract<TransportPortalPayload, { enrolled: true }> {
  return Boolean(portal && portal.enrolled);
}

export function TransportPortalShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: (ctx: {
    data: ParentTransportPortalResponse;
    portal: Extract<TransportPortalPayload, { enrolled: true }>;
    reload: () => void;
  }) => ReactNode;
}) {
  const { data, loading, error, reload } = useTransportPortal();
  const { t } = useTransportLocale();

  return (
    <div className="space-y-5">
      <PageHeader
        variant="navy"
        eyebrow={t('portal.eyebrow')}
        title={title}
        description={description ?? t('portal.defaultDescription')}
      />
      <TransportSubnav />
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title={t('empty.loadError')} description={error} />
      ) : !data || !isEnrolled(data.portal) ? (
        (() => {
          const portal = data?.portal;
          const linkStatus =
            portal && !portal.enrolled && 'linkStatus' in portal ? portal.linkStatus : undefined;
          const code =
            portal && 'studentCode' in portal ? portal.studentCode : data?.student.shuleCode ?? '';
          if (linkStatus === 'unreachable') {
            return (
              <EmptyState
                title={t('empty.transportUnreachable')}
                description={t('empty.transportUnreachableDesc')}
              />
            );
          }
          if (linkStatus === 'no_assignment') {
            return (
              <EmptyState
                title={t('empty.noAssignment')}
                description={t('empty.noAssignmentDesc').replace('{code}', code || '—')}
              />
            );
          }
          return <EmptyState title={t('empty.noTransport')} description={t('empty.noTransportDesc')} />;
        })()
      ) : (
        children({ data, portal: data.portal, reload })
      )}
    </div>
  );
}
