'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/loading';
import { formatDate } from '@/lib/format';
import type { Tenant } from '@/types';

export default function CanteensPage() {
  const router = useRouter();
  const { data: canteens, loading, error, reload } = useApi<Tenant[]>('/canteen/schools');

  return (
    <div>
      <PageHeader
        title="Canteens"
        description="All schools provisioned on the canteen module."
        actions={
          <Link href="/app/register-canteen">
            <Button>
              <Plus /> Register canteen
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : (canteens?.length ?? 0) === 0 ? (
        <EmptyState
          title="No canteens yet"
          description="Register a canteen to start provisioning school operations."
          action={
            <Link href="/app/register-canteen">
              <Button>Register canteen</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>School</TH>
                <TH>Code</TH>
                <TH>Status</TH>
                <TH>Connected</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {canteens?.map((c) => (
                <TR key={c.id} onClick={() => router.push(`/app/canteens/${c.id}`)} className="cursor-pointer">
                  <TD className="font-medium text-navy">{c.organizationName}</TD>
                  <TD>{c.schoolCode ?? c.organizationCode ?? '—'}</TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD className="text-muted">{formatDate(c.connectedAt)}</TD>
                  <TD className="text-right text-primary">View →</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
