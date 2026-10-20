'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Pencil } from 'lucide-react';
import { api } from '@/services/api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { PillBadge } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';
import type { FeeStructure } from '@/types';
import { StructureFormModal } from '@/modules/structures/structure-form-modal';

type Detail = FeeStructure & {
  stats?: { students: number; totalPaid: number; outstanding: number; bills: number };
};

export function StructureDetailView() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [row, setRow] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/structures/${id}`);
      setRow(data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!row) return <p className="text-muted">Structure not found.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/structures" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
            <ArrowLeft size={14} /> Back to structures
          </Link>
          <FeesPageTitle>{row.name}</FeesPageTitle>
          <p className="text-sm text-muted">
            {row.academicYear} · {row.term} · {row.className ?? 'All classes'}
          </p>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={row.status} />
            <PillBadge tone="blue">{row.source ?? 'SCHOOL'}</PillBadge>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await api.post(`/structures/${id}/duplicate`, { academicYear: row.academicYear, copyItems: true });
              router.push('/structures');
            }}
          >
            <Copy size={14} /> Duplicate
          </button>
        </div>
      </div>

      <StatsGrid columns={4}>
        <StatCard label="Total Fees" value={`${Number(row.totalAmount).toLocaleString()} RWF`} />
        <StatCard label="Fee Items" value={row.items?.length ?? 0} />
        <StatCard label="Students" value={row.stats?.students ?? 0} />
        <StatCard label="Outstanding" value={`${(row.stats?.outstanding ?? 0).toLocaleString()} RWF`} />
      </StatsGrid>

      <div className="hr-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs uppercase text-muted">
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Required</th>
            </tr>
          </thead>
          <tbody>
            {(row.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{Number(item.amount).toLocaleString()} RWF</td>
                <td className="px-4 py-3">{item.source ?? 'SCHOOL'}</td>
                <td className="px-4 py-3">{item.paymentType ?? 'School Account'}</td>
                <td className="px-4 py-3">{item.itemType === 'MANDATORY' ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StructureFormModal
        open={editOpen}
        editing={row}
        onClose={() => setEditOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
