'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  Landmark,
  Loader2,
  Pencil,
  Save,
  Wallet,
  X,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { landApi } from '@/services/land-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { LandMeta, LandSetupSummary } from '@/types';

const EMPTY_META: LandMeta = {
  years: [],
  activeYear: null,
  provinces: [],
  districts: [],
  sectors: [],
  categories: [],
  suppliers: [],
};

export function LandSetupView() {
  const toast = useToast();
  const [meta, setMeta] = useState<LandMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [setup, setSetup] = useState<LandSetupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await landApi.meta();
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
      const response = await landApi.setup(year);
      setSetup(response.data.data);
      setAmount(response.data.data.configured ? String(response.data.data.openingAmount) : '');
      setEditing(!response.data.data.configured);
      setError(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load Land Setup'));
    } finally {
      setLoading(false);
    }
  }, [year, toast]);

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  async function handleSave() {
    if (!year) return;
    const numeric = Number(amount.replace(/,/g, '').trim());
    if (!amount.trim()) {
      setError('Opening amount is required.');
      return;
    }
    if (!Number.isFinite(numeric) || numeric < 0) {
      setError('Enter a valid positive opening amount.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await landApi.saveSetup(year, numeric);
      setSetup(response.data.data);
      setEditing(false);
      toast.success('Land opening amount saved. Balances were recalculated.');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not save the Land opening amount');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setAmount(setup?.configured ? String(setup.openingAmount) : '');
    setEditing(false);
    setError(null);
  }

  async function handleSetActiveYear() {
    if (!year) return;
    setSettingActive(true);
    try {
      const response = await landApi.setActiveYear(year);
      setMeta(response.data.data);
      toast.success(`Land active year set to ${year}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not set the Land active year'));
    } finally {
      setSettingActive(false);
    }
  }

  const parsedAmount = Number(amount.replace(/,/g, '').trim());
  const projectedClosing = Number.isFinite(parsedAmount)
    ? parsedAmount + (setup?.totalPurchaseValue ?? 0)
    : setup?.closingBalance ?? 0;

  return (
    <AssetsPageLayout
      title="Land Setup"
      subtitle="Set the Land opening amount and choose the active year used by the Land module"
      actions={
        <>
          <Link href="/land/register" className="btn-secondary">
            Land Register <ArrowRight size={16} />
          </Link>
          {setup?.configured && !editing ? (
            <button type="button" className="btn-primary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Edit Opening Amount
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
                  <p className="text-[11px] text-muted">The opening amount is saved per organization and year</p>
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
                <Loader2 size={18} className="animate-spin" /> Loading Land Setup…
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Opening Amount for {year}
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
                    <p className="mt-2 text-3xl font-bold tabular-nums text-navy sm:text-4xl">
                      {formatRwf(setup.openingAmount)}
                    </p>
                  ) : (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Opening Amount (RWF) <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`input text-lg font-semibold ${error ? 'border-red-300 ring-2 ring-red-500/10' : ''}`}
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError(null);
                        }}
                        placeholder="e.g. 10,000,000"
                        autoFocus
                      />
                      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
                      <p className="mt-1.5 text-[11px] text-muted">
                        This amount becomes the opening balance of the first land record in {year}. It
                        does not affect other asset categories.
                      </p>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving…' : setup?.configured ? 'Save Changes' : 'Save Opening Amount'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={setup?.configured ? cancelEdit : () => setAmount('')}
                      disabled={saving}
                    >
                      <X size={16} /> {setup?.configured ? 'Cancel' : 'Clear'}
                    </button>
                  </div>
                ) : null}

                {setup?.configured && !editing ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] text-muted">
                      Editing the opening amount automatically recalculates every land record in{' '}
                      {year}, so the chain and total balances stay consistent.
                    </p>
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
                <span className="text-sm text-muted">Land Records</span>
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
                <Landmark size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">How Land balances work</p>
                <ol className="mt-2 space-y-1.5 text-xs text-muted">
                  <li>1. The first land record starts with this opening amount.</li>
                  <li>2. Its total balance = opening amount + purchase unit price.</li>
                  <li>3. The next record automatically uses that total as its opening amount.</li>
                  <li>4. The chain continues in record order and is recalculated after edits or deletes.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AssetsPageLayout>
  );
}
