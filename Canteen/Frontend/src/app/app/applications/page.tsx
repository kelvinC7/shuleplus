'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X, UserPlus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/loading';
import { formatDateTime } from '@/lib/format';
import type { OnboardingRequest } from '@/types';

export default function ApplicationsPage() {
  const router = useRouter();
  const { data: applications, loading, error, reload } = useApi<OnboardingRequest[]>('/applications');

  async function decide(id: string, approve: boolean) {
    try {
      await api.post(`/applications/${id}/${approve ? 'approve' : 'reject'}`);
      toast.success(approve ? 'Application approved' : 'Application rejected');
      reload();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed');
    }
  }

  return (
    <div>
      <PageHeader title="Applications" description="Pending supplier and canteen onboarding requests." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (applications?.length ?? 0) === 0 ? (
        <EmptyState title="No applications" description="New onboarding requests will appear here." />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>School code</TH>
                <TH>Status</TH>
                <TH>Submitted</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {applications?.map((a) => {
                const meta = (a.metadata ?? {}) as Record<string, unknown>;
                return (
                  <TR key={a.id}>
                    <TD className="capitalize">{a.entityType}</TD>
                    <TD>{a.schoolCode ?? String(meta.schoolName ?? '—')}</TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                    <TD className="text-muted">{formatDateTime(a.createdAt)}</TD>
                    <TD className="text-right">
                      {a.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="success" onClick={() => decide(a.id, true)}>
                            <Check /> Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => decide(a.id, false)}>
                            <X /> Reject
                          </Button>
                        </div>
                      ) : a.supplierId ? (
                        <Button size="sm" variant="outline" onClick={() => router.push(`/app/suppliers/${a.supplierId}`)}>
                          View supplier
                        </Button>
                      ) : null}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
