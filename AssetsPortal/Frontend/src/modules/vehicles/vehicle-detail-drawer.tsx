'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  Car,
  History,
  Loader2,
  MapPin,
  Pencil,
  Receipt,
  Settings2,
  Wallet,
} from 'lucide-react';
import { SideDrawer, DrawerSection } from '@/components/side-drawer';
import { vehicleApi } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate, formatNumber, formatRwf } from '@/utils/format';
import type { VehicleRecordDetail } from '@/types';

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-navy">{value || '—'}</div>
    </div>
  );
}

interface VehicleDetailDrawerProps {
  open: boolean;
  recordId: string | null;
  onClose: () => void;
  onEdit: (record: VehicleRecordDetail) => void;
  onHistory?: (record: VehicleRecordDetail) => void;
}

export function VehicleDetailDrawer({
  open,
  recordId,
  onClose,
  onEdit,
  onHistory,
}: VehicleDetailDrawerProps) {
  const toast = useToast();
  const [record, setRecord] = useState<VehicleRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const response = await vehicleApi.getRecord(recordId);
      setRecord(response.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load vehicle record'));
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
      title={record ? `Vehicle Record #${record.sequence}` : 'Vehicle Details'}
      subtitle={
        record
          ? `${record.upi ? `UPI ${record.upi}` : record.name || 'Vehicle'} • Financial year ${record.year}`
          : undefined
      }
      icon={<Car size={20} />}
      width="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {record && onHistory ? (
            <button type="button" className="btn-secondary" onClick={() => onHistory(record)}>
              <History size={16} /> Financial History
            </button>
          ) : null}
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
          <Loader2 size={18} className="animate-spin" /> Loading vehicle record…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-navy to-navy-light px-5 py-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90">
              Total Vehicle Balance
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatRwf(record.totalBalance)}</p>
            <p className="mt-2 text-xs text-white/70">
              Opening {formatRwf(record.openingAmount)} + Purchase{' '}
              {formatRwf(record.purchaseUnitPrice)} − Sale Balance {formatRwf(record.saleBalance)}
            </p>
          </div>

          <DrawerSection title="Vehicle Profile">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <MapPin size={14} /> Vehicle identity and classification
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Vehicle Name" value={record.name} />
              <Info label="Label" value={record.label} />
              <Info label="Location" value={record.location} />
              <Info label="Type" value={record.type ?? record.vehicleType} />
              <Info label="Category" value={record.category} />
              <Info label="Size" value={record.size} />
              <Info label="Material" value={record.material} />
              <Info label="UPI" value={record.upi} />
              <Info label="SKU" value={record.sku} />
              <Info label="Quantity" value={formatNumber(record.quantity ?? 1)} />
              <Info label="Financial Year" value={record.year} />
            </div>
          </DrawerSection>

          <DrawerSection title="Purchase Details">
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <Receipt size={14} /> Supplier and acquisition details
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Supplier" value={record.supplier} />
              <Info label="Tax" value={record.tax} />
              <Info label="Purchase Date" value={purchaseDate ? formatDate(purchaseDate) : null} />
              <Info label="Purchase Unit Price" value={formatRwf(record.purchaseUnitPrice)} />
            </div>
          </DrawerSection>

          <DrawerSection
            title="Financial Summary"
            description="How the total balance was obtained. The sale balance does not reduce depreciation."
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <Calculator size={14} /> Sequential vehicle balance calculation
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Opening Amount</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.openingAmount)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {record.previous ? `Carried from record #${record.previous.sequence}` : 'From Vehicle Setup'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Purchase Unit Price</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.purchaseUnitPrice)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Added to the opening amount</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Sale Balance</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.saleBalance)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Subtracted from the total balance</p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-amber-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ochre">Total Balance</p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.totalBalance)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Opening + Purchase − Sale balance</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm">
              <Wallet size={16} className="text-ochre" />
              <span className="tabular-nums text-muted">{formatRwf(record.openingAmount)}</span>
              <span className="text-muted">+</span>
              <span className="tabular-nums text-muted">{formatRwf(record.purchaseUnitPrice)}</span>
              <span className="text-muted">−</span>
              <span className="tabular-nums text-muted">{formatRwf(record.saleBalance)}</span>
              <span className="text-muted">=</span>
              <span className="font-semibold tabular-nums text-navy">{formatRwf(record.totalBalance)}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Previous Vehicle Record</p>
                {record.previous ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-navy">
                      #{record.previous.sequence}{' '}
                      {record.previous.name || record.previous.upi
                        ? `• ${record.previous.name ?? record.previous.upi}`
                        : ''}
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
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Next Vehicle Record</p>
                {record.next ? (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-navy">
                      #{record.next.sequence}{' '}
                      {record.next.name || record.next.upi
                        ? `• ${record.next.name ?? record.next.upi}`
                        : ''}
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

            <p className="mt-3 text-[11px] text-muted">
              Last calculation update:{' '}
              {record.lastCalculatedAt ? formatDate(record.lastCalculatedAt) : '—'}
            </p>
          </DrawerSection>

          <DrawerSection
            title="Depreciation Configuration"
            description="Depreciation is calculated from the total balance and the configured rate."
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
              <Settings2 size={14} /> Mode, rate and useful life
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Depreciation Mode" value={record.depMode} />
              <Info label="Depreciation Rate" value={`${formatNumber(record.depRate)}%`} />
              <Info label="Useful Years" value={formatNumber(record.usefulYears ?? 0)} />
              <Info
                label="Source"
                value={record.useSetupDepreciation ? 'Vehicle Setup' : 'Record override'}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Accumulated Depreciation
                </p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.accumulatedDepreciation)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Year-start accumulated value</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Annual Depreciation
                </p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.annualDep)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">(Total balance − accumulated) × rate</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Total Depreciation
                </p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.totalDep)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Accumulated + annual</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Net Book Value
                </p>
                <p className="mt-1 text-base font-bold tabular-nums text-navy">
                  {formatRwf(record.netBookValue)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">Total balance − total depreciation</p>
              </div>
            </div>
          </DrawerSection>

          <p className="text-center text-[11px] text-muted">
            <Link href="/vehicles/setup" className="font-medium text-ochre hover:underline">
              Vehicle Setup
            </Link>{' '}
            controls the opening amount and depreciation configuration used by the first vehicle record
            of each financial year.
          </p>
        </div>
      )}
    </SideDrawer>
  );
}
