'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';
import { AssetsModal } from './assets-modal';

export type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const isDanger = variant === 'danger';

  return (
    <AssetsModal
      open={open}
      title={title}
      onClose={onClose}
      icon={
        isDanger ? (
          <Trash2 size={18} className="text-red-200" />
        ) : (
          <AlertTriangle size={18} className="text-amber-200" />
        )
      }
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              isDanger
                ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60'
                : 'btn-primary'
            }
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          isDanger
            ? 'border-red-200 bg-red-50/80 text-red-900'
            : 'border-amber-200 bg-amber-50/80 text-amber-950'
        }`}
      >
        {description}
      </div>
      <p className="mt-3 text-xs text-muted">This action cannot be undone.</p>
    </AssetsModal>
  );
}

export type DeleteConfirmState =
  | { kind: 'single'; asset: { id: string; assetName: string; assetCode?: string } }
  | { kind: 'bulk'; ids: string[]; count: number }
  | null;

export function DeleteAssetsModal({
  state,
  loading,
  onConfirm,
  onClose,
}: {
  state: DeleteConfirmState;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  if (!state) return null;

  const isBulk = state.kind === 'bulk';

  return (
    <ConfirmActionModal
      open
      variant="danger"
      title={isBulk ? `Delete ${state.count} assets?` : 'Delete asset?'}
      confirmLabel={isBulk ? `Delete ${state.count} assets` : 'Delete asset'}
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
      description={
        isBulk ? (
          <>
            You are about to permanently remove{' '}
            <strong>{state.count} selected assets</strong> from the register. Financial totals and
            depreciation chains may need recalculation afterward.
          </>
        ) : (
          <>
            Remove <strong>{state.asset.assetName}</strong>
            {state.asset.assetCode ? (
              <>
                {' '}
                (<span className="font-mono">{state.asset.assetCode}</span>)
              </>
            ) : null}{' '}
            from the asset register?
          </>
        )
      }
    />
  );
}

export type DeleteAllScope = {
  count: number;
  hasFilters: boolean;
  filters: {
    year?: string;
    category?: string;
    health?: string;
    q?: string;
  };
};

export function DeleteAllRegisterModal({
  open,
  scope,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  scope: DeleteAllScope | null;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) {
      setTyped('');
      setAcknowledged(false);
    }
  }, [open]);

  const canConfirm = useMemo(
    () => typed.trim().toUpperCase() === 'DELETE' && acknowledged && (scope?.count ?? 0) > 0,
    [typed, acknowledged, scope?.count]
  );

  if (!open || !scope) return null;

  const filterPills = [
    scope.filters.year ? `Year ${scope.filters.year}` : null,
    scope.filters.category ? scope.filters.category : null,
    scope.filters.health
      ? scope.filters.health === 'NotUsedOld'
        ? 'Not Used (Old)'
        : 'Used'
      : null,
    scope.filters.q ? `Search: “${scope.filters.q}”` : null,
  ].filter(Boolean) as string[];

  return (
    <AssetsModal
      open={open}
      title="Delete all assets"
      subtitle={
        scope.hasFilters
          ? 'Removes every asset matching your current filters'
          : 'Removes the entire asset register for this organization'
      }
      icon={<ShieldAlert size={18} className="text-red-100" />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onConfirm()}
          >
            {loading ? 'Deleting…' : `Delete ${scope.count.toLocaleString()} assets`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50/80 p-4">
          <p className="text-sm font-semibold text-red-950">
            You are about to permanently delete{' '}
            <span className="text-lg tabular-nums">{scope.count.toLocaleString()}</span>{' '}
            asset{scope.count === 1 ? '' : 's'}.
          </p>
          <p className="mt-2 text-sm text-red-900/80">
            Depreciation chains, totals, and linked register history for{' '}
            {scope.hasFilters ? 'these filtered records' : 'all years and categories'} will be
            removed. Re-import or re-enter data if you need them again.
          </p>
        </div>

        {scope.hasFilters && filterPills.length > 0 ? (
          <div className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Current filters</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filterPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-navy"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
            <strong>No filters active.</strong> This clears the full register — every year and
            category.
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3 transition hover:bg-slate-50/80">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-red-600 focus:ring-red-500/30"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span className="text-sm text-navy">
            I understand this action is permanent and cannot be undone.
          </span>
        </label>

        <div>
          <label htmlFor="delete-all-confirm" className="text-sm font-medium text-navy">
            Type <span className="font-mono font-semibold text-red-700">DELETE</span> to confirm
          </label>
          <input
            id="delete-all-confirm"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="DELETE"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition placeholder:text-muted/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
          />
        </div>
      </div>
    </AssetsModal>
  );
}
