'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, History, Loader2, RefreshCw, User } from 'lucide-react';
import { SideDrawer, DrawerSection } from '@/components/side-drawer';
import { vehicleApi } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { VehicleAuditLog, VehicleRecord } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  sale_balance_change: 'Sale Balance Changed',
  purchase_price_change: 'Purchase Price Changed',
  depreciation_config_change: 'Depreciation Config Changed',
  recalculate: 'Balances Recalculated',
  import: 'Imported',
  setup_create: 'Setup Created',
  setup_update: 'Setup Updated',
};

function actionTone(action: string) {
  if (action === 'delete') return 'bg-red-100 text-red-700';
  if (action === 'sale_balance_change') return 'bg-amber-100 text-amber-800';
  if (action === 'purchase_price_change') return 'bg-sky-100 text-sky-700';
  if (action === 'depreciation_config_change') return 'bg-violet-100 text-violet-700';
  if (action === 'recalculate' || action === 'update') return 'bg-slate-100 text-slate-700';
  if (action === 'create' || action === 'import') return 'bg-emerald-100 text-emerald-700';
  if (action.startsWith('setup_')) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetadataBlock({ metadata }: { metadata: Record<string, unknown> }) {
  return (
    <details className="mt-2 rounded-xl border border-border bg-slate-50/70 px-3 py-2">
      <summary className="cursor-pointer text-[11px] font-medium text-muted">
        View captured values
      </summary>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    </details>
  );
}

interface VehicleHistoryDrawerProps {
  open: boolean;
  record: VehicleRecord | null;
  year?: number;
  onClose: () => void;
}

export function VehicleHistoryDrawer({ open, record, year, onClose }: VehicleHistoryDrawerProps) {
  const toast = useToast();
  const [logs, setLogs] = useState<VehicleAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!record) return;
    setLoading(true);
    try {
      const response = await vehicleApi.auditLogs(year, 100, record.id);
      setLogs(response.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load financial history'));
    } finally {
      setLoading(false);
    }
  }, [record, year, toast]);

  useEffect(() => {
    if (open && record) void load();
    if (!open) setLogs([]);
  }, [open, record, load]);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={record ? `Financial History #${record.sequence}` : 'Financial History'}
      subtitle={
        record
          ? `${record.name || record.upi || 'Vehicle record'} • Financial year ${record.year}`
          : undefined
      }
      icon={<History size={20} />}
      width="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {loading && logs.length === 0 ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" /> Loading financial history…
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted">
          No financial history has been recorded for this vehicle yet.
        </div>
      ) : (
        <div className="space-y-4">
          <DrawerSection
            title="Audit Timeline"
            description="Creation, edits, sale balance changes, purchase price changes, depreciation changes and recalculated balances."
          >
            <ol className="relative space-y-4 border-l border-border pl-5">
              {logs.map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-primary shadow" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionTone(
                        log.action
                      )}`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                      <Clock size={12} /> {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  {log.detail ? (
                    <p className="mt-1 text-sm font-medium text-navy">{log.detail}</p>
                  ) : null}
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted">
                    <User size={12} /> {log.actorEmail || 'System'}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 ? (
                    <MetadataBlock metadata={log.metadata} />
                  ) : null}
                </li>
              ))}
            </ol>
          </DrawerSection>

          <p className="text-center text-[11px] text-muted">
            Every financial change is captured with the previous and new values, the user and the
            timestamp.
          </p>
        </div>
      )}
    </SideDrawer>
  );
}
