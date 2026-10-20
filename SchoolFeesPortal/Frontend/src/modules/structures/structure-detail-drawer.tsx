'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Pencil,
  Copy,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/services/api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { PillBadge } from '@/components/fees-data-table';
import type { FeeStructure } from '@/types';

type Detail = FeeStructure & {
  stats?: { students: number; totalPaid: number; outstanding: number; bills: number };
};

type Props = {
  structureId: string | null;
  refreshToken?: number;
  onClose: () => void;
  onEdit: (row: FeeStructure) => void;
  onDuplicate: (row: FeeStructure) => void;
  onDeactivate: (row: FeeStructure) => void;
  onActivate: (row: FeeStructure) => void;
};

export function StructureDetailDrawer({
  structureId,
  refreshToken = 0,
  onClose,
  onEdit,
  onDuplicate,
  onDeactivate,
  onActivate,
}: Props) {
  const [row, setRow] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!structureId) {
      setRow(null);
      setEntered(false);
      return;
    }
    setLoading(true);
    void api
      .get(`/structures/${structureId}`)
      .then(({ data }) => setRow(data.data))
      .finally(() => setLoading(false));
    requestAnimationFrame(() => setEntered(true));
  }, [structureId, refreshToken]);

  useEffect(() => {
    if (!structureId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [structureId, onClose]);

  if (!structureId) return null;

  const items = row?.items ?? [];
  const total = Number(row?.totalAmount ?? 0);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className={`absolute inset-0 bg-navy/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-[-12px_0_40px_rgba(0,4,53,0.12)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Fee structure</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-navy">
              {loading ? 'Loading…' : row?.name ?? 'Structure'}
            </h2>
            {row ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={row.status} />
                <PillBadge tone={row.source === 'BABYEYI' ? 'violet' : row.source === 'MIXED' ? 'amber' : 'blue'}>
                  {row.source ?? 'SCHOOL'}
                </PillBadge>
                <span className="text-xs text-muted">{row.code}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : row ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-slate-50/80 p-3 text-sm">
                <Meta label="Academic year" value={row.academicYear} />
                <Meta label="Term" value={row.term} />
                <Meta label="Class" value={row.className ?? 'All classes'} />
                <Meta label="Fee items" value={String(items.length)} />
              </div>

              <StatsGrid columns={2}>
                <StatCard label="Total fees" value={`${total.toLocaleString()} RWF`} />
                <StatCard label="Students billed" value={row.stats?.students ?? 0} />
              </StatsGrid>

              {(row.stats?.outstanding ?? 0) > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="font-semibold">{(row.stats?.outstanding ?? 0).toLocaleString()} RWF</span>{' '}
                  outstanding across {row.stats?.bills ?? 0} bill(s).
                </div>
              ) : null}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-navy">Fee line items</h3>
                  <span className="text-xs font-semibold text-muted">{items.length} items</span>
                </div>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white px-3.5 py-3 transition hover:border-primary/20 hover:bg-primary/[0.02]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-navy">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {item.source ?? 'SCHOOL'} · {item.paymentType ?? 'School Account'} ·{' '}
                          {item.itemType === 'MANDATORY' ? 'Required' : 'Optional'}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-navy">
                        {Number(item.amount).toLocaleString()} RWF
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-navy/[0.04] px-4 py-3">
                  <span className="text-sm font-semibold text-navy">Grand total</span>
                  <span className="text-base font-bold text-navy">{total.toLocaleString()} RWF</span>
                </div>
              </div>

              {row.updatedAt ? (
                <p className="text-xs text-muted">
                  Last updated{' '}
                  {new Date(row.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">Structure not found.</p>
          )}
        </div>

        {row ? (
          <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
            <button type="button" className="btn-primary flex-1 text-sm" onClick={() => onEdit(row)}>
              <Pencil size={14} /> Edit
            </button>
            <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => onDuplicate(row)}>
              <Copy size={14} /> Duplicate
            </button>
            {row.status === 'ACTIVE' ? (
              <button
                type="button"
                className="btn-secondary w-full text-sm !text-amber-800 !border-amber-200 hover:!bg-amber-50"
                onClick={() => onDeactivate(row)}
              >
                <Ban size={14} /> Deactivate
              </button>
            ) : row.status === 'ARCHIVED' || row.status === 'DRAFT' ? (
              <button
                type="button"
                className="btn-secondary w-full text-sm !text-emerald-800 !border-emerald-200 hover:!bg-emerald-50"
                onClick={() => onActivate(row)}
              >
                <CheckCircle2 size={14} /> Activate
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}
