'use client';

import { useEffect, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import { assetsApi } from '@/services/assets-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf, formatDate } from '@/utils/format';
import type { AssetFinancialDetails, AssetRow } from '@/types';
import { AssetAdjustmentForm } from '@/modules/register/asset-adjustment-form';
import { AssetAdjustmentModal } from '@/modules/register/asset-adjustment-modal';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white">
      <h4 className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h4>
      <div className="space-y-2 px-4 py-3">{children}</div>
    </section>
  );
}

function ValueRow({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className={muted ? 'text-muted' : 'text-slate-600'}>{label}</span>
      <span
        className={`text-right font-medium tabular-nums ${highlight ? 'text-navy' : muted ? 'text-muted' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function AdjustmentToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/80 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-navy">Add adjustment</p>
        <p className="text-xs text-muted">
          Turn on to add one or more cost or depreciation corrections for this asset.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-slate-300'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function AssetFinancialsPanel({
  asset,
  embedded,
  onUpdated,
}: {
  asset: AssetRow;
  embedded?: boolean;
  onUpdated?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<AssetFinancialDetails | null>(null);
  const [canAdjust, setCanAdjust] = useState(false);
  const [adjustmentOn, setAdjustmentOn] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const load = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [finRes, permRes] = await Promise.all([
        assetsApi.getAssetFinancials(asset.id),
        assetsApi.canCreateAdjustments(),
      ]);
      setDetails(finRes.data.data);
      setCanAdjust(permRes.data.data.allowed);
    } catch (err) {
      if (!opts?.silent) {
        setError(getApiErrorMessage(err, 'Unable to load asset financial details'));
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [asset.id]);

  useEffect(() => {
    setAdjustmentOn(false);
    setFormKey((k) => k + 1);
  }, [asset.id]);

  const handleAdjustmentSaved = () => {
    void load({ silent: true });
    onUpdated?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading financial details…
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? 'Financial details unavailable'}
      </div>
    );
  }

  const { original, adjustments, calculated, history, hasAdjustments } = details;
  const showAdjusted = hasAdjustments;

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-center gap-2 text-sm font-medium text-navy">
        <Scale size={16} />
        {embedded ? 'Register values & adjustments' : 'Register values'}
      </div>

      {embedded ? (
        <>
          <AdjustmentToggle enabled={adjustmentOn} onChange={setAdjustmentOn} />
          {adjustmentOn ? (
            <AssetAdjustmentForm
              key={formKey}
              asset={asset}
              onSaved={handleAdjustmentSaved}
            />
          ) : history.length > 0 ? (
            <button
              type="button"
              className="btn-secondary w-full text-sm"
              onClick={() => setAdjustmentOn(true)}
            >
              Add another adjustment
            </button>
          ) : null}
        </>
      ) : null}

      {canAdjust && !embedded ? (
        <div className="flex justify-end">
          <button type="button" className="btn-secondary text-xs" onClick={() => setAdjustOpen(true)}>
            Add adjustment
          </button>
        </div>
      ) : null}

      <Section title="Original values">
        <ValueRow label="Original asset cost" value={formatRwf(original.assetCost)} muted />
        <ValueRow label="Original total balance" value={formatRwf(original.totalBalance)} muted />
        <ValueRow
          label="Original accumulated depreciation"
          value={formatRwf(original.accumulatedDepreciation)}
          muted
        />
        <ValueRow label="Original depreciation rate" value={`${original.depreciationRate}%`} muted />
      </Section>

      {showAdjusted ? (
        <Section title="Adjustments">
          <ValueRow
            label="Cost adjustments"
            value={formatRwf(adjustments.costAdjustments, { signed: true })}
          />
          <ValueRow
            label="Accumulated dep. adjustments"
            value={formatRwf(adjustments.accumulatedDepAdjustments, { signed: true })}
          />
          <ValueRow
            label="Annual dep. adjustments"
            value={formatRwf(adjustments.annualDepAdjustments, { signed: true })}
          />
          <ValueRow
            label="Total dep. adjustments"
            value={formatRwf(adjustments.totalDepAdjustments, { signed: true })}
          />
        </Section>
      ) : null}

      <Section title="Calculated values (read-only)">
        {showAdjusted ? (
          <ValueRow
            label="Adjusted asset cost"
            value={formatRwf(calculated.adjustedAssetCost)}
            highlight
          />
        ) : null}
        <ValueRow
          label={showAdjusted ? 'Adjusted total balance' : 'Total balance'}
          value={formatRwf(calculated.adjustedTotalBalance)}
          highlight
        />
        <ValueRow
          label="Opening accumulated depreciation"
          value={formatRwf(calculated.openingAccumulatedDepreciation)}
        />
        {showAdjusted ? (
          <ValueRow
            label="Adjusted opening accumulated dep."
            value={formatRwf(calculated.adjustedOpeningAccumulatedDepreciation)}
          />
        ) : null}
        <ValueRow
          label="System annual depreciation"
          value={formatRwf(calculated.systemAnnualDepreciation)}
        />
        {showAdjusted ? (
          <ValueRow
            label="Manual depreciation adjustment"
            value={formatRwf(calculated.manualDepreciationAdjustment, { signed: true })}
          />
        ) : null}
        <ValueRow
          label="Final annual depreciation"
          value={formatRwf(calculated.finalAnnualDepreciation)}
          highlight
        />
        {showAdjusted && calculated.systemClosingAccumulatedDepreciation != null ? (
          <ValueRow
            label="System closing accumulated dep."
            value={formatRwf(calculated.systemClosingAccumulatedDepreciation)}
          />
        ) : null}
        {showAdjusted && calculated.manualTotalDepAdjustment != null ? (
          <ValueRow
            label="Manual total dep. adjustment"
            value={formatRwf(calculated.manualTotalDepAdjustment, { signed: true })}
          />
        ) : null}
        <ValueRow
          label="Closing accumulated depreciation"
          value={formatRwf(calculated.closingAccumulatedDepreciation)}
          highlight
        />
        <ValueRow label="Net book value" value={formatRwf(calculated.netBookValue)} highlight />
      </Section>

      {history.length > 0 ? (
        <Section title="Adjustment history">
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="pb-2 pr-2 font-medium">Date</th>
                  <th className="pb-2 pr-2 font-medium">Type</th>
                  <th className="pb-2 pr-2 text-right font-medium">Amount</th>
                  <th className="pb-2 pr-2 font-medium">Year</th>
                  <th className="pb-2 pr-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Created by</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-2 whitespace-nowrap">{formatDate(row.adjustmentDate)}</td>
                    <td className="py-2 pr-2">{row.adjustmentTypeLabel}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{row.signedAmount} FRW</td>
                    <td className="py-2 pr-2">{row.registerYear}</td>
                    <td className="py-2 pr-2 max-w-[120px] truncate" title={row.reason}>
                      {row.reason}
                    </td>
                    <td className="py-2">{row.createdByName ?? row.createdByEmail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {!embedded ? (
        <AssetAdjustmentModal
          open={adjustOpen}
          asset={asset}
          onClose={() => setAdjustOpen(false)}
          onSaved={handleAdjustmentSaved}
        />
      ) : null}
    </div>
  );
}
