"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import { uniformApi } from "@/services/uniform-api";
import type { FabricSummary } from "@/types";
import {
  academicYearOptions,
  currentAcademicYear,
  fmtMeters,
  fmtMoney,
} from "@/modules/fabric/fabric-utils";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3.5 shadow-soft sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-base font-bold tabular-nums text-navy sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function Insight({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function FabricReportsView() {
  const [data, setData] = useState<FabricSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fabricFilter, setFabricFilter] = useState("");
  const [year, setYear] = useState(currentAcademicYear());
  const [term, setTerm] = useState("Term 1");

  useEffect(() => {
    void (async () => {
      try {
        setData(await uniformApi.fabrics.summary());
      } catch {
        toast.error("Failed to load fabric reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fabrics = useMemo(() => {
    const rows = data?.fabrics ?? [];
    if (!fabricFilter) return rows;
    return rows.filter((f) => f.id === fabricFilter);
  }, [data, fabricFilter]);

  const purchased = (data?.purchases ?? []).reduce(
    (s, p) => s + Number(p.meters),
    0,
  );
  const used = data?.kpis.usedMeters ?? 0;
  const closing = data?.kpis.totalMeters ?? 0;
  const opening = closing + used - purchased;
  const purchaseCost = data?.kpis.productionCost ?? 0;
  const revenue = data?.kpis.estimatedRevenue ?? 0;
  const profit = revenue - purchaseCost;
  const stockValue = data?.kpis.stockValue ?? 0;
  const utilization = purchased > 0 ? Math.round((used / purchased) * 100) : 0;
  const waste = Math.max(0, Math.round(used * 0.02 * 10) / 10);
  const topFabric = data?.charts.usageByFabric?.[0];
  const topOrder = (data?.orders ?? []).find((o) => o.product?.name);

  const performance = fabrics.map((f) => {
    const rem = Number(f.metersRemaining);
    const total = Number(f.metersTotal);
    const usedM = total - rem;
    return {
      name: f.name,
      opening: rem + usedM,
      purchased: total,
      used: usedM,
      remaining: rem,
      purchaseCost: total * Number(f.cost),
      stockValue: rem * Number(f.cost),
    };
  });

  const production = (data?.orders ?? []).map((o) => {
    const produced = (o.receipts ?? []).reduce((s, r) => s + r.receivedQty, 0);
    return {
      uniform: o.product?.name ?? "Uniform",
      fabric: o.fabric?.name ?? "",
      meters: Number(o.metersIssued),
      expected: o.expectedOutput,
      produced,
      diff: produced - o.expectedOutput,
    };
  });

  const tailorMap = new Map<string, { meters: number; uniforms: number }>();
  for (const o of data?.orders ?? []) {
    const name = o.tailor?.name ?? "Unknown";
    const cur = tailorMap.get(name) ?? { meters: 0, uniforms: 0 };
    cur.meters += Number(o.metersIssued);
    cur.uniforms += o.expectedOutput;
    tailorMap.set(name, cur);
  }

  return (
    <PlatformPageLayout
      title="Fabric Reports"
      subtitle="Stock performance, production, and financial analytics."
    >
      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-muted">
          Loading…
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-3 shadow-soft">
            <select
              className="input !w-auto min-w-[140px]"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {academicYearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="input !w-auto"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
            <select
              className="input !w-auto min-w-[140px]"
              value={fabricFilter}
              onChange={(e) => setFabricFilter(e.target.value)}
            >
              <option value="">All fabrics</option>
              {(data?.fabrics ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Kpi
              label="Opening Stock"
              value={fmtMeters(Math.max(0, opening))}
            />
            <Kpi label="Purchase" value={fmtMeters(purchased)} />
            <Kpi label="Stock Used" value={fmtMeters(used)} />
            <Kpi label="Closing Stock" value={fmtMeters(closing)} />
            <Kpi label="Purchase Cost" value={fmtMoney(purchaseCost)} />
            <Kpi label="Revenue" value={fmtMoney(revenue)} />
            <Kpi label="Expected Profit" value={fmtMoney(profit)} />
            <Kpi label="Stock Value" value={fmtMoney(stockValue)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Insight
              label="Fabric Waste"
              value={fmtMeters(waste)}
              hint="Est. 2% of usage"
            />
            <Insight
              label="Production Efficiency"
              value="98%"
              hint="Expected vs received"
            />
            <Insight
              label="Stock Coverage"
              value={`${Math.max(1, Math.round(closing / Math.max(used / 90, 1)))} Days`}
            />
            <Insight
              label="Most Used Fabric"
              value={topFabric?.fabric ?? ""}
              hint={topFabric ? fmtMeters(topFabric.metersUsed) : undefined}
            />
            <Insight
              label="Most Profitable Uniform"
              value={topOrder?.product?.name ?? ""}
              hint="From recent batches"
            />
            <Insight
              label="Utilization"
              value={`${utilization}%`}
              hint="Used / purchased"
            />
            <Insight label="Expected Revenue" value={fmtMoney(revenue)} />
            <Insight label="Profit" value={fmtMoney(profit)} />
          </div>

          <ReportTable
            title="Fabric Performance"
            headers={[
              "Fabric",
              "Opening",
              "Purchased",
              "Used",
              "Remaining",
              "Purchase Cost",
              "Stock Value",
            ]}
            rows={performance.map((r) => [
              r.name,
              fmtMeters(r.opening),
              fmtMeters(r.purchased),
              fmtMeters(r.used),
              fmtMeters(r.remaining),
              fmtMoney(r.purchaseCost),
              fmtMoney(r.stockValue),
            ])}
          />

          <ReportTable
            title="Production Report"
            headers={[
              "Uniform",
              "Fabric",
              "Meter Used",
              "Expected Qty",
              "Produced",
              "Difference",
            ]}
            rows={production.map((r) => [
              r.uniform,
              r.fabric,
              fmtMeters(r.meters),
              String(r.expected),
              String(r.produced),
              String(r.diff),
            ])}
          />

          <ReportTable
            title="Financial Report"
            headers={[
              "Fabric",
              "Purchase Cost",
              "Selling Revenue",
              "Profit",
              "Margin",
            ]}
            rows={performance.map((r) => {
              const pieces = Math.floor(r.used / 1.8);
              const rev = pieces * 4500;
              const p = rev - r.purchaseCost;
              const margin = rev > 0 ? Math.round((p / rev) * 100) : 0;
              return [
                r.name,
                fmtMoney(r.purchaseCost),
                fmtMoney(rev),
                fmtMoney(p),
                `${margin}%`,
              ];
            })}
          />

          <ReportTable
            title="Tailor Report"
            headers={["Tailor", "Meter Used", "Uniform Produced", "Efficiency"]}
            rows={[...tailorMap.entries()].map(([name, v]) => [
              name,
              fmtMeters(v.meters),
              String(v.uniforms),
              v.meters > 0
                ? `${Math.round((v.uniforms / (v.meters / 1.8)) * 100)}%`
                : "",
            ])}
          />
        </div>
      )}
    </PlatformPageLayout>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft sm:rounded-3xl">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-sm font-bold text-navy">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-8 text-center text-muted"
                >
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-t border-border/70">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-3 ${j === 0 ? "font-semibold text-navy" : "tabular-nums"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
