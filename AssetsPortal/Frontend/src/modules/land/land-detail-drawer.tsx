'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Receipt,
  Wallet,
} from 'lucide-react';
import { SideDrawer, DrawerSection } from '@/components/side-drawer';
import { landApi } from '@/services/land-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate, formatRwf } from '@/utils/format';
import type { LandRecordDetail } from '@/types';

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-navy">{value || '—'}</div>
    </div>
  );
}

interface LandDetailDrawerProps {
  open: boolean;
  recordId: string | null;
  onClose: () => void;
  onEdit: (record: LandRecordDetail) => void;
}

export function LandDetailDrawer({ open, recordId, onClose, onEdit }: LandDetailDrawerProps) {
  const toast = useToast();
  const [record, setRecord] = useState<LandRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const response = await landApi.getRecord(recordId);
      setRecord(response.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load land record'));
      onClose();
    } finally {
      setLoading(false);
    }
  }, [recordId, toast, onClose]);

  useEffect(() => {
    if (open && recordId) void load();
    if (!open) setRecord(null);
  }, [open, recordId, load]);

  const purchaseDate =
    record?.purchaseDate ??
    (record?.purchaseYear
      ? `${record.purchaseYear}-${String(record.purchaseMonth ?? 1).padStart(2, '0')}-${String(
          record.purchaseDay ?? 1
        ).padStart(2, '0')}`
      : null);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={record ? `Land Record #${record.sequence}` : 'Land Details'}
      subtitle={record ? `${record.upi ? `UPI ${record.upi}` : 'Land parcel'} • Financial year ${record.year}` : undefined}
      icon={<Landmark size={20} />}
      width="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {record ? (
            <button type="button" className="btn-primary" onClick={() => onEdit(record)}>
              <Pencil size={16} /> Edit Record
            </button>
          ) : null}
        </>
      }
    >
      {loading || !record ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" /> Loading land record…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-navy to-navy-light px-5 py-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90">
              Total Land Balance
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatRwf(record.totalBalance)}</p>
            <p className="mt-2 text-xs text-white/70">
              Opening {formatRwf(record.openingAmount)} + Purchase {formatRwf(record.purchaseUnitPrice)}
            </p>
          </div>

          <DrawerSection title="Land Information">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <MapPin size={14} /> Location & parcel identity
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Province" value={record.province} />
              <Info label="District" value={record.district} />
              <Info label="Sector" value={record.sector} />
              <Info label="Cellule" value={record.cellule} />
              <Info label="Village" value={record.village} />
              <Info label="Type" value={record.landType} />
              <Info label="Category" value={record.category} />
              <Info label="Size" value={record.size} />
              <Info label="Material" value={record.material} />
              <Info label="UPI" value={record.upi} />
              <Info label="SKU" value={record.sku} />
            </div>
          </DrawerSection>

          <DrawerSection title="Purchase Information">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <Receipt size={14} /> Supplier & acquisition details
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Supplier" value={record.supplier} />
              <Info label="Tax" value={record.tax} />
              <Info
                label="Purchase Date"
                value={purchaseDate ? formatDate(purchaseDate) : null}
              />
              <Info label="Purchase Unit Price" value={formatRwf(record.purchaseUnitPrice)} />
            </div>
          </DrawerSection>

          <DrawerSection title="Financial Information" description="How the total balance was obtained.">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <Calculator size={14} /> Sequential land balance calculation
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Opening Amount</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.openingAmount)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {record.previous ? `Carried from record #${record.previous.sequence}` : 'From Land Setup'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Purchase Unit Price</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.purchaseUnitPrice)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Added to the opening amount</p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-amber-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ochre">Total Balance</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.totalBalance)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Opening + Purchase price</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm">
              <Wallet size={16} className="text-ochre" />
              <span className="tabular-nums text-muted">{formatRwf(record.openingAmount)}</span>
              <span className="text-muted">+</span>
              <span className="tabular-nums text-muted">{formatRwf(record.purchaseUnitPrice)}</span>
              <span className="text-muted">=</span>
              <span className="font-semibold tabular-nums text-navy">{formatRwf(record.totalBalance)}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Previous Land Record</p>
                {record.previous ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-navy">
                      #{record.previous.sequence} {record.previous.upi ? `• ${record.previous.upi}` : ''}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {formatRwf(record.previous.totalBalance)}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted">First record in this financial year</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Next Land Record</p>
                {record.next ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-navy">
                      #{record.next.sequence} {record.next.upi ? `• ${record.next.upi}` : ''}
                    </span>
                    <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
                      Opening {formatRwf(record.next.openingAmount)}
                      <ArrowRight size={12} />
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted">Latest record in this financial year</p>
                )}
              </div>
            </div>
          </DrawerSection>

          <p className="text-center text-[11px] text-muted">
            <Link href="/land/setup" className="font-medium text-ochre hover:underline">
              Land Setup
            </Link>{' '}
            controls the opening amount used by the first land record of each financial year.
          </p>
        </div>
      )}
    </SideDrawer>
  );
}
