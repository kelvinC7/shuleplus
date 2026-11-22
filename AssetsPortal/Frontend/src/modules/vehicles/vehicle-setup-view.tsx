'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  Car,
  Loader2,
  Pencil,
  Save,
  Settings2,
  Wallet,
  X,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { vehicleApi } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { VehicleMeta, VehicleSetupSummary } from '@/types';

const EMPTY_META: VehicleMeta = {
  organizationName: '',
  years: [],
  activeYear: null,
  locations: [],
  names: [],
  labels: [],
  types: [],
  categories: [],
  suppliers: [],
  purchaseYears: [],
};

export function VehicleSetupView() {
  const toast = useToast();
  const [meta, setMeta] = useState<VehicleMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [setup, setSetup] = useState<VehicleSetupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [opening, setOpening] = useState('');
  const [accumulated, setAccumulated] = useState('');
  const [mode, setMode] = useState('Diminishing');
  const [rate, setRate] = useState('');
  const [usefulYears, setUsefulYears] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await vehicleApi.meta();
        setMeta(response.data.data);
        setYear(response.data.data.activeYear ?? response.data.data.years[0]?.year ?? null);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not load financial years'));
        setLoading(false);
      }
    })();
  }, [toast]);

  const loadSetup = useCallback(async () => {
    if (!year) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await vehicleApi.setup(year);
      const payload = response.data.data;
      setSetup(payload);
      setOpening(payload.configured ? String(payload.openingAmount) : '');
      setAccumulated(payload.configured ? String(payload.accumulatedDepreciation) : '0');
      setMode(payload.depreciationMode || 'Diminishing');
      setRate(payload.configured ? String(payload.depreciationRate) : '');
      setUsefulYears(payload.configured ? String(payload.usefulYears) : '');
      setEditing(!payload.configured);
      setError(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load Vehicle Setup'));
    } finally {
      setLoading(false);
    }
  }, [year, toast]);

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  async function handleSave() {
    if (!year) return;
    const numericOpening = Number(opening.replace(/,/g, '').trim());
    const numericAccumulated = accumulated.trim()
      ? Number(accumulated.replace(/,/g, '').trim())
      : 0;
    const numericRate = rate.trim() ? Number(rate.replace(/%/g, '').trim()) : 0;
    const numericYears = usefulYears.trim() ? Number(usefulYears) : 0;

    if (!opening.trim()) {
      setError('Opening amount is required.');
      return;
    }
    if (!Number.isFinite(numericOpening) || numericOpening < 0) {
      setError('Enter a valid positive opening amount.');
      return;
    }
    if (!Number.isFinite(numericAccumulated) || numericAccumulated < 0) {
      setError('Accumulated depreciation must be a valid positive number.');
      return;
    }
    if (!Number.isFinite(numericRate) || numericRate < 0) {
      setError('Enter a valid depreciation rate.');
      return;
    }
    if (!Number.isInteger(numericYears) || numericYears < 0) {
      setError('Useful years must be a whole number of at least 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await vehicleApi.saveSetup({
        year,
        opening_amount: numericOpening,
        accumulated_depreciation: numericAccumulated,
        depreciation_mode: mode,
        depreciation_rate: numericRate,
        useful_years: numericYears,
      });
      setSetup(response.data.data);
      setEditing(false);
      toast.success('Vehicle Setup saved. Balances and depreciation were recalculated.');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not save Vehicle Setup');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (setup?.configured) {
      setOpening(String(setup.openingAmount));
      setAccumulated(String(setup.accumulatedDepreciation));
      setMode(setup.depreciationMode || 'Diminishing');
      setRate(String(setup.depreciationRate));
      setUsefulYears(String(setup.usefulYears));
    } else {
      setOpening('');
      setAccumulated('0');
      setMode('Diminishing');
      setRate('');
      setUsefulYears('');
    }
    setEditing(false);
    setError(null);
  }

  async function handleSetActiveYear() {
    if (!year) return;
    setSettingActive(true);
    try {
      const response = await vehicleApi.setActiveYear(year);
      setMeta(response.data.data);
      toast.success(`Vehicle active year set to ${year}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not set the Vehicle active year'));
    } finally {
      setSettingActive(false);
    }
  }

  const parsedOpening = Number(opening.replace(/,/g, '').trim());
  const projectedClosing = Number.isFinite(parsedOpening)
    ? parsedOpening + (setup?.totalPurchaseValue ?? 0) - (setup?.totalSaleBalance ?? 0)
    : setup?.closingBalance ?? 0;

  return (
    <AssetsPageLayout
      title="Vehicle Setup"
      subtitle="Configure the opening balance and depreciation, and choose the active year used by the Vehicle module"
      actions={
        <>
          <Link href="/vehicles/register" className="btn-secondary">
            Vehicle Register <ArrowRight size={16} />
          </Link>
          {setup?.configured && !editing ? (
            <button type="button" className="btn-primary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Edit Setup
            </button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="hr-card overflow-hidden">
          <div className="border-b border-border bg-slate-50/70 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-primary">
                  <CalendarRange size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">Financial Year</p>
                  <p className="text-[11px] text-muted">
                    Setup is saved per organization and financial year
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="input max-w-[200px]"
                  value={year ?? ''}
                  onChange={(e) => setYear(Number(e.target.value))}
                  disabled={loading || saving}
                >
                  {meta.years.map((fy) => (
                    <option key={fy.id} value={fy.year}>
                      {fy.year} {fy.year === meta.activeYear ? '• Active' : ''}
                    </option>
                  ))}
                </select>
                {year !== null && year === meta.activeYear ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    <BadgeCheck size={12} /> Active year
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleSetActiveYear()}
                    disabled={loading || saving || settingActive || year === null}
                  >
                    {settingActive ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                    Set active year
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-6">
            {loading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted">
                <Loader2 size={18} className="animate-spin" /> Loading Vehicle Setup…
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Vehicle Setup for {year}
                  </p>
                  {setup?.configured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      <BadgeCheck size={12} /> Saved
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Not configured
                    </span>
                  )}
                </div>

                {!editing && setup?.configured ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Opening Amount
                      </p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-navy sm:text-4xl">
                        {formatRwf(setup.openingAmount)}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Accumulated Depreciation
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-navy">
                          {formatRwf(setup.accumulatedDepreciation)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Depreciation
                        </p>
                        <p className="mt-1 text-sm font-semibold text-navy">
                          {setup.depreciationMode} · {formatNumber(setup.depreciationRate)}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Useful Years
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-navy">
                          {formatNumber(setup.usefulYears)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Opening Amount (RWF) <span className="text-red-500">*</span>
                        </span>
                        <input
                          className={`input ${error ? 'border-red-300 ring-2 ring-red-500/10' : ''}`}
                          inputMode="decimal"
                          value={opening}
                          onChange={(e) => {
                            setOpening(e.target.value);
                            setError(null);
                          }}
                          placeholder="e.g. 10,000,000"
                          autoFocus
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Accumulated Depreciation (RWF)
                        </span>
                        <input
                          className="input"
                          inputMode="decimal"
                          value={accumulated}
                          onChange={(e) => setAccumulated(e.target.value)}
                          placeholder="Year-start accumulated depreciation"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Depreciation Mode
                        </span>
                        <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                          <option value="Diminishing">Diminishing</option>
                          <option value="Straight Line">Straight Line</option>
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Depreciation Rate (%)
                        </span>
                        <input
                          className="input"
                          inputMode="decimal"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="e.g. 25"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Number of Useful Years
                        </span>
                        <input
                          className="input"
                          inputMode="numeric"
                          value={usefulYears}
                          onChange={(e) => setUsefulYears(e.target.value)}
                          placeholder="e.g. 5"
                        />
                      </label>
                    </div>
                    {error ? (
                      <p className="text-xs font-medium text-red-600">{error}</p>
                    ) : (
                      <p className="text-[11px] text-muted">
                        This opening amount becomes the opening balance of the first vehicle record in{' '}
                        {year}. Editing the setup recalculates every vehicle record in this financial
                        year. It does not affect other asset categories.
                      </p>
                    )}
                  </div>
                )}

                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving…' : setup?.configured ? 'Save Changes' : 'Save Vehicle Setup'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="hr-card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Wallet size={15} /> Setup Summary
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Financial Year</span>
                <span className="text-sm font-semibold text-navy">{year ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Opening Amount</span>
                <span className="text-sm font-semibold tabular-nums text-navy">
                  {setup?.configured ? formatRwf(setup.openingAmount) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Vehicle Records</span>
                <span className="text-sm font-semibold tabular-nums text-navy">
                  {formatNumber(setup?.recordCount ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Total Purchase Value</span>
                <span className="text-sm font-semibold tabular-nums text-navy">
                  {formatRwf(setup?.totalPurchaseValue ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Total Sale Balance</span>
                <span className="text-sm font-semibold tabular-nums text-navy">
                  {formatRwf(setup?.totalSaleBalance ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-sm font-medium text-navy">
                  {editing ? 'Projected Closing Balance' : 'Closing Balance'}
                </span>
                <span className="text-sm font-bold tabular-nums text-navy">
                  {formatRwf(editing ? projectedClosing : setup?.closingBalance ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="hr-card border-primary/20 bg-gradient-to-br from-amber-50/70 to-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ochre shadow-sm">
                <Car size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">How Vehicle balances work</p>
                <ol className="mt-2 space-y-1.5 text-xs text-muted">
                  <li>1. The first vehicle record starts with this opening amount.</li>
                  <li>2. Total balance = opening amount + purchase unit price − sale balance.</li>
                  <li>3. The next record automatically uses that total as its opening amount.</li>
                  <li>4. Depreciation uses the configured rate; the sale balance does not reduce it.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="hr-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
                <Settings2 size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Depreciation configuration</p>
                <p className="mt-1 text-xs text-muted">
                  Annual depreciation = (total balance − accumulated depreciation) × rate. Records
                  inherit this configuration unless they opt into a record-level override.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AssetsPageLayout>
  );
}
