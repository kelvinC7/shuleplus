'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star, Truck, TrendingUp, Clock } from 'lucide-react';
import { MainLayout } from '@/layouts/main-layout';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import {
  DataTable,
  DataTableCard,
  DataTableEmpty,
  DataTableHead,
  DataTableTh,
  ListFilterBar,
  PageLoading,
  StatusBadge,
} from '@/components/list-ui';
import { procurementApi } from '@/services/procurement-api';
import type { Supplier } from '@/types';

export default function SupplierPerformancePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await procurementApi.suppliers.list();
      setSuppliers(data);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = suppliers.filter(
    (s) =>
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const rated = suppliers.filter((s) => s.rating != null);
  const avgRating =
    rated.length > 0
      ? (rated.reduce((sum, s) => sum + Number(s.rating), 0) / rated.length).toFixed(1)
      : '—';
  const preferredCount = suppliers.filter((s) => s.status === 'PREFERRED').length;

  if (loading) {
    return (
      <MainLayout>
        <PageLoading label="Loading supplier performance…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Evaluate supplier reliability, ratings, and delivery performance."
        kpis={[
          { label: 'Suppliers', value: suppliers.length, icon: <Truck size={20} /> },
          { label: 'Preferred', value: preferredCount, icon: <Star size={20} /> },
          { label: 'Avg Rating', value: avgRating, icon: <TrendingUp size={20} /> },
          { label: 'Active', value: suppliers.filter((s) => s.status === 'ACTIVE').length, icon: <Clock size={20} /> },
        ]}
      >
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search suppliers…"
        />

        <DataTableCard className="mt-4">
          <DataTable minWidth="800px">
            <DataTableHead>
              <DataTableTh>Supplier</DataTableTh>
              <DataTableTh>Contact</DataTableTh>
              <DataTableTh className="text-center">Rating</DataTableTh>
              <DataTableTh className="text-center">Status</DataTableTh>
              <DataTableTh>Payment Terms</DataTableTh>
            </DataTableHead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/60 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-navy">{s.companyName}</td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {s.contactPerson ?? '—'}
                    {s.phone ? ` · ${s.phone}` : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.rating ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {s.rating}/5
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={s.status === 'PREFERRED' ? 'primary' : 'neutral'}>
                      {s.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{s.paymentTerms ?? '—'}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <DataTableEmpty colSpan={5} message="No suppliers found" />
              ) : null}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PlatformPageLayout>
    </MainLayout>
  );
}
