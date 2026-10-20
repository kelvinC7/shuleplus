'use client';

import { useEffect, useState } from 'react';
import { Settings2, Truck, Wallet } from 'lucide-react';
import { shulekitAdminApi } from '@/lib/shulekit-admin-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  ShuleKitDataPanel,
  ShuleKitPageShell,
  ShuleKitStatCard,
  skBtnPrimary,
  skInputClass,
} from './shulekit-page-shell';

export function ShuleKitSettingsView() {
  const toast = useToast();
  const [form, setForm] = useState({
    homeDeliveryFee: '2500',
    schoolPickupFee: '0',
    lowStockThreshold: '10',
    customKitsEnabled: true,
    standardKitsEnabled: true,
    supportPhone: '',
    supportEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    shulekitAdminApi
      .getSettings()
      .then((s) =>
        setForm({
          homeDeliveryFee: String(s.homeDeliveryFee ?? 2500),
          schoolPickupFee: String(s.schoolPickupFee ?? 0),
          lowStockThreshold: String(s.lowStockThreshold ?? 10),
          customKitsEnabled: Boolean(s.customKitsEnabled),
          standardKitsEnabled: Boolean(s.standardKitsEnabled),
          supportPhone: String(s.supportPhone ?? ''),
          supportEmail: String(s.supportEmail ?? ''),
        })
      )
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      await shulekitAdminApi.updateSettings({
        homeDeliveryFee: Number(form.homeDeliveryFee),
        schoolPickupFee: Number(form.schoolPickupFee),
        lowStockThreshold: Number(form.lowStockThreshold),
        customKitsEnabled: form.customKitsEnabled,
        standardKitsEnabled: form.standardKitsEnabled,
        supportPhone: form.supportPhone,
        supportEmail: form.supportEmail,
      });
      toast.success('Settings saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShuleKitPageShell
      title="Settings"
      description="Delivery fees, feature flags, and support contacts."
      actions={
        <button type="button" disabled={loading || saving} onClick={() => void save()} className={skBtnPrimary}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      }
    >
      {loading ? (
        <ShuleKitDataPanel loading loadingLabel="Loading settings…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ShuleKitStatCard
              icon={<Truck className="h-4 w-4" />}
              label="Home delivery fee"
              value={`${Number(form.homeDeliveryFee || 0).toLocaleString()} FRW`}
              tone="amber"
            />
            <ShuleKitStatCard
              icon={<Wallet className="h-4 w-4" />}
              label="School pickup fee"
              value={`${Number(form.schoolPickupFee || 0).toLocaleString()} FRW`}
              tone="sky"
            />
            <ShuleKitStatCard
              icon={<Settings2 className="h-4 w-4" />}
              label="Low stock threshold"
              value={form.lowStockThreshold}
              tone="navy"
            />
          </div>

          <section className="max-w-2xl space-y-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-semibold text-navy">Fees & alerts</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['homeDeliveryFee', 'Home delivery fee (FRW)'],
                ['schoolPickupFee', 'School pickup fee (FRW)'],
                ['lowStockThreshold', 'Low stock threshold'],
                ['supportPhone', 'Support phone'],
                ['supportEmail', 'Support email'],
              ].map(([key, label]) => (
                <label key={key} className={`block text-sm ${key.startsWith('support') ? 'sm:col-span-2' : ''}`}>
                  <span className="text-xs font-medium text-muted">{label}</span>
                  <input
                    className={`mt-1 ${skInputClass}`}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <h2 className="text-sm font-semibold text-navy">Feature flags</h2>
              <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.standardKitsEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, standardKitsEnabled: e.target.checked }))}
                  className="h-4 w-4 accent-navy"
                />
                <span className="font-medium text-navy">Standard kits enabled</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.customKitsEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, customKitsEnabled: e.target.checked }))}
                  className="h-4 w-4 accent-navy"
                />
                <span className="font-medium text-navy">Custom kits enabled</span>
              </label>
            </div>
          </section>
        </>
      )}
    </ShuleKitPageShell>
  );
}
