'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, ShoppingBag, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { KpiCard, StatsGrid } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SmsPurchaseWizard } from '@/components/sms-packages/purchase-wizard';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import type { SmsPortalConfig, SmsUsageSummary } from '@/lib/sms-packages-types';

const EMPTY_CONFIG: SmsPortalConfig = {
  enabled: false,
  momoPayeeNumber: null,
  momoUssdTemplate: null,
  defaultAllocation: 'CHILD',
  packages: [],
};

export default function SmsPackagesPage() {
  const { linkedStudents, user } = useAuth();
  const [config, setConfig] = useState<SmsPortalConfig | null>(null);
  const [summary, setSummary] = useState<SmsUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setConfigError(null);
    setSummaryError(null);
    try {
      const cfgRes = await api.get<{ data: SmsPortalConfig }>('/sms-packages/config');
      setConfig(cfgRes.data.data);
    } catch (e: unknown) {
      setConfig(EMPTY_CONFIG);
      setConfigError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Unable to load SMS package settings'
      );
    }
    try {
      const sumRes = await api.get<{ data: SmsUsageSummary }>('/sms-packages/summary');
      setSummary(sumRes.data.data);
    } catch (e: unknown) {
      setSummaryError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Usage summary unavailable'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const phone = (user as { phone?: string } | null)?.phone ?? '';
  const canPurchase = Boolean(config?.enabled && config.packages.length && linkedStudents.length);
  const showWizardEntry = Boolean(config && (config.packages.length || config.enabled));

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow="Family communication"
        title="SMS Packages"
        description="Buy SMS credits with MTN Mobile Money. After payment, your purchase waits for super-admin approval, then credits appear here."
        action={
          showWizardEntry ? (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              disabled={!canPurchase && !config?.packages.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-navy shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
            >
              <ShoppingBag className="h-4 w-4" />
              Buy SMS package
            </button>
          ) : null
        }
      />

      {configError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{configError}</p>
      ) : null}

      {!loading && config && !config.enabled ? (
        <div className="flex gap-3 rounded-2xl border border-navy/10 bg-slate-50 px-4 py-4 text-sm text-navy">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold">Purchases not open yet</p>
            <p className="mt-1 text-muted">
              Your school must enable <strong>Parent SMS packages</strong> in Super Admin → SMS Bulk → School SMS access.
              After that, use <strong>Buy SMS package</strong> to pay via MoMo and wait for approval under Super Admin →
              Parent purchases.
            </p>
          </div>
        </div>
      ) : null}

      {summaryError ? <p className="text-xs text-muted">{summaryError}</p> : null}

      {summary ? (
        <StatsGrid>
          <KpiCard label="Purchased" value={summary.totalPurchased.toLocaleString()} hint="SMS segments" />
          <KpiCard label="Remaining" value={summary.totalRemaining.toLocaleString()} hint="SMS segments" />
          <KpiCard label="Used" value={summary.totalUsed.toLocaleString()} hint="SMS segments" />
          <KpiCard label="Pending" value={String(summary.pendingPurchases)} hint="Awaiting approval" />
        </StatsGrid>
      ) : null}

      {!loading && config && !config.packages.length && !configError ? (
        <EmptyState
          icon={<Smartphone />}
          title="No packages configured"
          description="Ask your school to enable parent SMS packages and set term/year pricing in SMS settings."
        />
      ) : null}

      {config?.packages.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {config.packages.map((pkg) => (
            <div key={pkg.id} className="flex flex-col rounded-2xl border border-navy/8 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {pkg.kind === 'TERM' ? 'Per term' : 'Academic year'}
              </p>
              <p className="mt-1 text-lg font-bold text-navy">{pkg.title}</p>
              <p className="mt-2 text-2xl font-extrabold text-navy">RWF {pkg.priceRwf.toLocaleString()}</p>
              <p className="mt-1 text-sm text-muted">
                {pkg.segmentAllowance.toLocaleString()} segments · {pkg.validityDays} days
              </p>
              {pkg.description ? <p className="mt-2 text-xs text-muted">{pkg.description}</p> : null}
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                disabled={!canPurchase}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy/15 bg-white py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                Buy this package
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {config && showWizardEntry ? (
        <SmsPurchaseWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          config={config}
          students={linkedStudents}
          defaultPhone={typeof phone === 'string' ? phone : ''}
          purchaseEnabled={canPurchase}
          onComplete={() => void load()}
        />
      ) : null}
    </div>
  );
}
