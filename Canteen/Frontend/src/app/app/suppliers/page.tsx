'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/loading';
import { initials } from '@/lib/format';
import type { Supplier } from '@/types';

export default function SuppliersPage() {
  const router = useRouter();
  const { data: suppliers, loading, error } = useApi<Supplier[]>('/suppliers');

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendors supplying canteens across the platform."
        actions={
          <Link href="/app/register-supplier">
            <Button>
              <Plus /> Register supplier
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
      ) : (suppliers?.length ?? 0) === 0 ? (
        <EmptyState title="No suppliers yet" description="Register a supplier to start onboarding vendors." />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Supplier</TH>
                <TH>Category</TH>
                <TH>Contact</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {suppliers?.map((s) => (
                <TR key={s.id} onClick={() => router.push(`/app/suppliers/${s.id}`)} className="cursor-pointer">
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {initials(s.companyName)}
                      </span>
                      <div>
                        <p className="font-medium text-navy">{s.companyName}</p>
                        <p className="text-xs text-muted">{s.supplierCode}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>{s.category ?? '—'}</TD>
                  <TD>
                    <p>{s.contactPerson ?? '—'}</p>
                    <p className="text-xs text-muted">{s.phone ?? ''}</p>
                  </TD>
                  <TD>
                    <StatusBadge status={s.status} />
                  </TD>
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
