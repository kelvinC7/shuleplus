'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { assetsApi } from '@/services/assets-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { ADJUSTMENT_TYPE_OPTIONS } from '@/lib/adjustment-math';
import type { AssetRow } from '@/types';

export function AssetAdjustmentForm({
  asset,
  onSaved,
  onCancel,
  showCancel,
}: {
  asset: AssetRow;
  onSaved: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}) {
  const [adjustmentType, setAdjustmentType] = useState('cost_increase');
  const [amount, setAmount] = useState('');
  const [registerYear, setRegisterYear] = useState(String(asset.registerYear));
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setRegisterYear(String(asset.registerYear));
  }, [asset.id, asset.registerYear]);

  const reset = () => {
    setAdjustmentType('cost_increase');
    setAmount('');
    setRegisterYear(String(asset.registerYear));
    setReason('');
    setNote('');
    setAdjustmentDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setSuccessMessage(null);
  };

  const clearSuccess = () => {
    if (successMessage) setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount.replace(/,/g, ''));
    if (!(parsedAmount > 0)) {
      setError('Enter a valid adjustment amount greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required for audit purposes.');
      return;
    }

    setSaving(true);
    try {
      await assetsApi.createAssetAdjustment(asset.id, {
        adjustment_type: adjustmentType,
        amount: parsedAmount,
        register_year: Number(registerYear) || asset.registerYear,
        reason: reason.trim(),
        note: note.trim() || undefined,
        adjustment_date: adjustmentDate,
      });
      reset();
      setSuccessMessage('Adjustment saved. You can add another below.');
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to save adjustment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <p className="text-xs text-amber-950">
        Original values stay on record. Save each correction separately — you can add as
        many adjustments as needed before updating the asset.
      </p>

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Adjustment type</label>
        <select
          className="input w-full"
          value={adjustmentType}
          onChange={(e) => {
            clearSuccess();
            setAdjustmentType(e.target.value);
          }}
        >
          <optgroup label="Asset cost">
            {ADJUSTMENT_TYPE_OPTIONS.filter((o) => o.group === 'Cost').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Depreciation">
            {ADJUSTMENT_TYPE_OPTIONS.filter((o) => o.group === 'Depreciation').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Amount (FRW) *</label>
          <input
            type="number"
            min={1}
            step={1}
            className="input w-full"
            value={amount}
            onChange={(e) => {
              clearSuccess();
              setAmount(e.target.value);
            }}
            placeholder="e.g. 766000"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Effective register year
          </label>
          <input
            type="number"
            className="input w-full"
            value={registerYear}
            onChange={(e) => {
              clearSuccess();
              setRegisterYear(e.target.value);
            }}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Adjustment date</label>
          <input
            type="date"
            className="input w-full"
            value={adjustmentDate}
            onChange={(e) => {
              clearSuccess();
              setAdjustmentDate(e.target.value);
            }}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input w-full"
            value={reason}
            onChange={(e) => {
              clearSuccess();
              setReason(e.target.value);
            }}
            placeholder="Purchase amount correction"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Supporting note</label>
        <textarea
          className="input min-h-[64px] w-full"
          value={note}
          onChange={(e) => {
            clearSuccess();
            setNote(e.target.value);
          }}
          placeholder="Optional details for the audit trail"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-amber-200/80 pt-3">
        {showCancel && onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Saving…
            </>
          ) : (
            'Save adjustment'
          )}
        </button>
        {successMessage ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSuccessMessage(null);
              reset();
            }}
          >
            Clear form
          </button>
        ) : null}
      </div>
    </form>
  );
}
