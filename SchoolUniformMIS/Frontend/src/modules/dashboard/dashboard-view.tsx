"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Layers,
  Package,
  Scissors,
  Shirt,
  TrendingDown,
  TrendingUp,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { StatusBadge } from "@/components/list-ui";
import { useSettings } from "@/contexts/settings-context";
import { uniformApi } from "@/services/uniform-api";
import type { DashboardLowStockItem, DashboardSummary } from "@/types";
import { cn } from "@/lib/utils";

const NAVY = "#000435";
const AMBER = "#FCB038";
const PIE_COLORS = [
  AMBER,
  NAVY,
  "#60A5FA",
  "#34D399",
  "#A78BFA",
  "#F472B6",
  "#94A3B8",
  "#F59E0B",
];

function money(n: number) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} RWF`;
}

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

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl bg-slate-50 text-sm text-muted">
      {label}
    </div>
  );
}

export function DashboardView() {
  const { settings } = useSettings();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    uniformApi.dashboard
      .get()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const kpis = summary?.kpis;
  const monthlySales = summary?.charts.monthlySales ?? [];
  const distribution = summary?.charts.distributionByClass ?? [];
  const fabricUsage = summary?.charts.fabricUsage ?? [];
  const hasSales = monthlySales.some((r) => r.total > 0);
  const salesTotal = monthlySales.reduce((s, r) => s + r.total, 0);

  const lowStockColumns: PlatformTableColumn<DashboardLowStockItem>[] = useMemo(
    () => [
      {
        key: "product",
        header: "Product",
        render: (r) => (
          <span className="font-semibold text-navy">{r.productName}</span>
        ),
      },
      {
        key: "size",
        header: "Size",
        render: (r) => <span className="text-muted">{r.size}</span>,
      },
      {
        key: "available",
        header: "Available",
        className: "text-right",
        render: (r) => (
          <div className="flex items-center justify-end gap-2">
            <StatusBadge tone={r.available <= 5 ? "danger" : "warning"}>
              {r.available <= 5 ? "Critical" : "Low"}
            </StatusBadge>
            <span className="tabular-nums font-bold text-danger">
              {r.available}
            </span>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PlatformPageLayout>
      <div className="space-y-6">
        <StatsGrid>
          <StatCard
            label="Uniforms in Stock"
            value={loading ? "" : (kpis?.uniformsInStock ?? 0)}
            icon={<Shirt size={20} strokeWidth={1.75} />}
            hint="Available units across all variants"
          />
          {settings?.enableFabricManagement ? (
            <StatCard
              label="Fabric Rolls"
              value={loading ? "" : (kpis?.fabricRolls ?? 0)}
              icon={<Layers size={20} strokeWidth={1.75} />}
              hint="Rolls currently tracked"
            />
          ) : (
            <StatCard
              label="Students with Uniform"
              value={loading ? "" : (kpis?.studentsWithUniform ?? 0)}
              icon={<Users size={20} strokeWidth={1.75} />}
              hint="Owning at least one item"
            />
          )}
          {settings?.enableTailoring ? (
            <StatCard
              label="Active Tailors"
              value={loading ? "" : (kpis?.tailors ?? 0)}
              icon={<Scissors size={20} strokeWidth={1.75} />}
              hint="Registered tailoring partners"
            />
          ) : (
            <StatCard
              label="Missing Uniforms"
              value={loading ? "" : (kpis?.studentsMissing ?? 0)}
              icon={<UserX size={20} strokeWidth={1.75} />}
              hint="Students without any item"
            />
          )}
          <StatCard
            label="Sales Today"
            value={loading ? "" : money(kpis?.salesToday ?? 0)}
            icon={<Wallet size={20} strokeWidth={1.75} />}
            hint="Total invoiced today"
          />
          <StatCard
            label="Profit This Month"
            value={loading ? "" : money(kpis?.profitThisMonth ?? 0)}
            icon={<TrendingUp size={20} strokeWidth={1.75} />}
            showTrend
            hint="Selling price minus cost"
          />
          <StatCard
            label="Loss This Month"
            value={loading ? "" : money(kpis?.lossThisMonth ?? 0)}
            icon={<TrendingDown size={20} strokeWidth={1.75} />}
            hint="Estimated damaged stock value"
          />
          <StatCard
            label="Students Missing Uniform"
            value={loading ? "" : (kpis?.studentsMissing ?? 0)}
            icon={<UserX size={20} strokeWidth={1.75} />}
            hint="No owned uniform items yet"
          />
          <StatCard
            label="Low Stock Alerts"
            value={loading ? "" : (kpis?.lowStockCount ?? 0)}
            icon={<AlertTriangle size={20} strokeWidth={1.75} />}
            hint="Variants at or below threshold"
          />
        </StatsGrid>

        <div className="grid gap-4 lg:grid-cols-5">
          <ChartCard
            className="lg:col-span-3"
            title="Monthly Sales"
            subtitle={
              hasSales
                ? `${money(salesTotal)} over the last 12 months`
                : "No sales recorded yet"
            }
          >
            {hasSales ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlySales}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={AMBER}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={AMBER}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)}M`
                          : v >= 1000
                            ? `${Math.round(v / 1000)}k`
                            : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        money(Number(value ?? 0)),
                        "Sales",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={AMBER}
                      strokeWidth={2.5}
                      fill="url(#salesFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="No sales data yet" />
            )}
          </ChartCard>

          <ChartCard
            className="lg:col-span-2"
            title="Distribution by Class"
            subtitle="Issued uniforms by class"
          >
            {distribution.length ? (
              <div className="flex h-[240px] flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-[160px] w-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="count"
                        nameKey="className"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {distribution.map((row, i) => (
                          <Cell
                            key={row.className}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-medium text-muted">Total</p>
                    <p className="text-sm font-bold text-navy">
                      {distribution.reduce((s, r) => s + r.count, 0)}
                    </p>
                  </div>
                </div>
                <div className="max-h-[220px] w-full flex-1 space-y-2 overflow-y-auto pr-1">
                  {distribution.map((row, i) => (
                    <div
                      key={row.className}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="truncate text-navy">
                          {row.className}
                        </span>
                      </div>
                      <span className="tabular-nums font-semibold text-navy">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChart label="No distribution data yet" />
            )}
          </ChartCard>
        </div>

        {settings?.enableFabricManagement ? (
          <ChartCard
            title="Fabric Usage"
            subtitle="Meters issued by fabric (last 12 months)"
            action={
              <Link
                href="/fabric-dashboard"
                className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
              >
                Fabric dashboard
              </Link>
            }
          >
            {fabricUsage.length ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={fabricUsage}
                    margin={{ top: 8, right: 8, left: -8, bottom: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="fabric"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value ?? 0).toLocaleString()} m`,
                        "Used",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="metersUsed"
                      fill={NAVY}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="No fabric usage yet" />
            )}
          </ChartCard>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Package className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-navy">
                  Low Stock Items
                </h3>
                <p className="text-xs text-muted">
                  Variants at or below the reorder threshold
                </p>
              </div>
            </div>
            <Link
              href="/stock"
              className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
            >
              View all stock
            </Link>
          </div>
          <PlatformDataTable
            variant="soft"
            columns={lowStockColumns}
            data={summary?.lowStockItems ?? []}
            rowKey={(r) => r.variantId}
            loading={loading}
            emptyMessage="No low stock items."
          />
        </div>
      </div>
    </PlatformPageLayout>
  );
}
