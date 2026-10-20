"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  Package,
  Scissors,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { fmtMeters, fmtMoney } from "@/modules/fabric/fabric-utils";
import { uniformApi } from "@/services/uniform-api";
import type { FabricPurchase, FabricSummary } from "@/types";
import { cn } from "@/lib/utils";

const AMBER = "#FCB038";

function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function FabricBarChart({
  rows,
  format = "meters",
}: {
  rows: { label: string; value: number }[];
  format?: "meters" | "money";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  if (!rows.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl bg-slate-50 text-sm text-muted">
        No data yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-navy">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {format === "money" ? fmtMoney(r.value) : fmtMeters(r.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(6, (r.value / max) * 100)}%`,
                background: `linear-gradient(to right, #000435, ${AMBER})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FabricDashboardView() {
  const [data, setData] = useState<FabricSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await uniformApi.fabrics.summary());
      } catch {
        toast.error("Failed to load fabric dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const k = data?.kpis;

  const purchaseColumns: PlatformTableColumn<FabricPurchase>[] = useMemo(
    () => [
      {
        key: "fabric",
        header: "Fabric",
        render: (p) => (
          <span className="font-semibold text-navy">{p.name}</span>
        ),
      },
      {
        key: "meters",
        header: "Meters",
        render: (p) => (
          <span className="tabular-nums">{fmtMeters(Number(p.meters))}</span>
        ),
      },
      {
        key: "cost",
        header: "Cost",
        render: (p) => (
          <span className="tabular-nums">{fmtMoney(Number(p.cost))}</span>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (p) => (
          <span className="text-muted">
            {new Date(p.purchaseDate).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PlatformPageLayout
      title="Fabric Management"
      subtitle="Stock, usage, and production outlook for this term."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/fabric-stock-in" className="btn-primary">
            <ArrowDownToLine className="h-4 w-4" /> Stock In
          </Link>
          <Link href="/fabric-stock-out" className="btn-secondary">
            <ArrowUpFromLine className="h-4 w-4" /> Stock Out
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-muted">
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <StatsGrid>
            <StatCard
              label="Fabric Types"
              value={k?.fabricTypes ?? 0}
              icon={<Layers size={20} strokeWidth={1.75} />}
              hint="Distinct fabrics tracked"
            />
            <StatCard
              label="Fabric in Stock"
              value={fmtMeters(k?.totalMeters ?? 0)}
              icon={<Layers size={20} strokeWidth={1.75} />}
              hint="Total meters available"
            />
            <StatCard
              label="Stock Value"
              value={fmtMoney(k?.stockValue ?? 0)}
              icon={<Wallet size={20} strokeWidth={1.75} />}
              hint="Current inventory value"
            />
            <StatCard
              label="Low Stock"
              value={k?.lowStock ?? 0}
              icon={<AlertTriangle size={20} strokeWidth={1.75} />}
              hint="Below 50 m"
            />
            <StatCard
              label="Used This Term"
              value={fmtMeters(k?.usedMeters ?? 0)}
              icon={<TrendingUp size={20} strokeWidth={1.75} />}
              hint="Meters issued to production"
            />
            <StatCard
              label="Expected Uniforms"
              value={k?.expectedUniforms ?? 0}
              icon={<Scissors size={20} strokeWidth={1.75} />}
              hint="From active batches"
            />
            <StatCard
              label="Production Cost"
              value={fmtMoney(k?.productionCost ?? 0)}
              icon={<Wallet size={20} strokeWidth={1.75} />}
              hint="Fabric purchase spend"
            />
            <StatCard
              label="Est. Revenue"
              value={fmtMoney(k?.estimatedRevenue ?? 0)}
              icon={<TrendingUp size={20} strokeWidth={1.75} />}
              showTrend
              hint="Projected from production"
            />
          </StatsGrid>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Top Used Fabrics"
              subtitle="Meters consumed from inventory"
            >
              <FabricBarChart
                rows={(data?.charts.usageByFabric ?? []).map((r) => ({
                  label: r.fabric,
                  value: r.metersUsed,
                }))}
              />
            </ChartCard>

            <ChartCard
              title="Stock Remaining"
              subtitle="Available meters by fabric"
            >
              <FabricBarChart
                rows={(data?.charts.usageByFabric ?? []).map((r) => ({
                  label: r.fabric,
                  value: r.remaining,
                }))}
              />
            </ChartCard>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Package className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    Recent Purchases
                  </h3>
                  <p className="text-xs text-muted">Latest stock-in activity</p>
                </div>
              </div>
              <Link
                href="/fabric-stock-in"
                className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
            <PlatformDataTable
              variant="soft"
              columns={purchaseColumns}
              data={(data?.purchases ?? []).slice(0, 8)}
              rowKey={(p) => p.id}
              loading={false}
              emptyMessage="No purchases yet — start with Stock In"
            />
          </div>
        </div>
      )}
    </PlatformPageLayout>
  );
}
