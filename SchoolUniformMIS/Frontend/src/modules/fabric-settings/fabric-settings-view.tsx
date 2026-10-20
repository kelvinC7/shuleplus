"use client";

import { useState } from "react";
import { Layers, Ruler, AlertTriangle, Scissors } from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/contexts/settings-context";
import type { SchoolUniformSettings } from "@/types";

type FlagKey = Extract<
  keyof SchoolUniformSettings,
  "enableFabricManagement" | "enableTailoring" | "enableAutoStockAlerts"
>;

const FLAGS: {
  key: FlagKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "enableFabricManagement",
    label: "Fabric Management",
    description:
      "Show the Fabric module (dashboard, stock in/out, estimator, reports).",
    icon: Layers,
  },
  {
    key: "enableTailoring",
    label: "Tailoring Integration",
    description: "Link production batches to tailors and production orders.",
    icon: Scissors,
  },
  {
    key: "enableAutoStockAlerts",
    label: "Low Stock Alerts",
    description:
      "Highlight fabrics below the reorder threshold on the dashboard.",
    icon: AlertTriangle,
  },
];

export function FabricSettingsView() {
  const { settings, loading, update } = useSettings();
  const [saving, setSaving] = useState<string | null>(null);
  const [reorderLevel, setReorderLevel] = useState("50");
  const [defaultMeters, setDefaultMeters] = useState("1.8");
  const [avgSellPrice, setAvgSellPrice] = useState("4500");

  async function toggle(key: FlagKey, value: boolean) {
    setSaving(key);
    try {
      await update({ [key]: value });
      toast.success("Setting updated");
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSaving(null);
    }
  }

  return (
    <PlatformPageLayout
      title="Fabric Settings"
      subtitle="Defaults and feature flags for fabric management."
    >
      <div className="space-y-4 sm:space-y-5">
        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted">
            Loading…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {FLAGS.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.key}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {f.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {f.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(settings?.[f.key])}
                    disabled={saving === f.key}
                    onCheckedChange={(v) => void toggle(f.key, Boolean(v))}
                    className="mt-1 shrink-0"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:rounded-3xl sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-navy">Estimation Defaults</h3>
          </div>
          <p className="mb-4 text-xs text-muted">
            Used as starting values in the Production Estimator. Saved locally
            for this session.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                Reorder Level (m)
              </span>
              <input
                className="input"
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                Default m / Student
              </span>
              <input
                className="input"
                type="number"
                step="0.1"
                value={defaultMeters}
                onChange={(e) => setDefaultMeters(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted">
                Avg Sell Price (RWF)
              </span>
              <input
                className="input"
                type="number"
                value={avgSellPrice}
                onChange={(e) => setAvgSellPrice(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => {
              try {
                localStorage.setItem(
                  "fabric-defaults",
                  JSON.stringify({
                    reorderLevel: Number(reorderLevel),
                    defaultMeters: Number(defaultMeters),
                    avgSellPrice: Number(avgSellPrice),
                  }),
                );
                toast.success("Defaults saved on this device");
              } catch {
                toast.error("Could not save defaults");
              }
            }}
          >
            Save Defaults
          </button>
        </div>
      </div>
    </PlatformPageLayout>
  );
}
