'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileBarChart, ArrowRight } from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';

const LABELS: Record<string, string> = {
  overview: 'Overview',
  'all-assets': 'All Assets',
  categories: 'Categories',
  'financial-years': 'Financial Years',
  health: 'Health Status',
  assignments: 'Assignments',
  returns: 'Returns',
  transfers: 'Transfers',
  maintenance: 'Maintenance',
  depreciation: 'Depreciation',
  'damaged-lost': 'Damaged / Lost',
  locations: 'Locations',
};

const FALLBACK_TYPES = Object.keys(LABELS);

export function ReportsView() {
  const toast = useToast();
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assetsApi.reports();
      const list = data.data ?? [];
      setTypes(list.length ? list : FALLBACK_TYPES);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load reports'), 'Error');
      setTypes(FALLBACK_TYPES);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AssetsPageLayout
      kpis={[{ label: 'Report types', value: types.length || FALLBACK_TYPES.length }]}
    >
      {loading ? (
        <p className="text-sm text-muted">Loading reports…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <Link
              key={type}
              href={`/reports/${type}`}
              className="hr-card hr-card-hover group flex items-start gap-3 p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
                <FileBarChart size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy">{LABELS[type] ?? type}</p>
                <p className="mt-1 text-xs text-muted">View table and export CSV</p>
              </div>
              <ArrowRight
                size={16}
                className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-navy"
              />
            </Link>
          ))}
        </div>
      )}
    </AssetsPageLayout>
  );
}
