"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  FileSpreadsheet,
  FileText,
  Package,
  PackageCheck,
  PackageX,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  DateRangeFilter,
  inDateRange,
  ListFilterBar,
  ListKpiStrip,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { useAuth } from "@/contexts/auth-context";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { exportToExcel, exportToPdf } from "@/lib/export-utils";
import { uniformApi } from "@/services/uniform-api";
import type { StockBalance } from "@/types";

function stockStatus(available: number): "in" | "low" | "out" {
  if (available <= 0) return "out";
  if (available <= 5) return "low";
  return "in";
}

function money(n: number) {
  return `${Math.round(n).toLocaleString()} RWF`;
}

function unitCost(r: StockBalance) {
  return (
    Number(r.variant?.costPrice ?? r.variant?.product?.costPrice ?? 0) || 0
  );
}

function unitSell(r: StockBalance) {
  return (
    Number(r.variant?.sellingPrice ?? r.variant?.product?.sellingPrice ?? 0) ||
    0
  );
}

/** Approximate opening = remaining + reserved + sold + damaged */
function openingQty(r: StockBalance) {
  return r.available + r.reserved + r.sold + r.damaged;
}

type StockMetrics = {
  row: StockBalance;
  opening: number;
  remaining: number;
  sold: number;
  damaged: number;
  cost: number;
  sell: number;
  purchaseTotal: number;
  moneySold: number;
  expected: number;
  profitLoss: number;
};

function metricsFor(r: StockBalance): StockMetrics {
  const opening = openingQty(r);
  const cost = unitCost(r);
  const sell = unitSell(r);
  const moneySold = r.sold * sell;
  const cogsSold = r.sold * cost;
  const damagedLoss = r.damaged * cost;
  return {
    row: r,
    opening,
    remaining: r.available,
    sold: r.sold,
    damaged: r.damaged,
    cost,
    sell,
    purchaseTotal: opening * cost,
    moneySold,
    expected: opening * sell,
    profitLoss: moneySold - cogsSold - damagedLoss,
  };
}

export function StockView() {
  const { user, summary } = useAuth();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus Uniforms";

  const [rows, setRows] = useState<StockBalance[]>([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    uniformApi.stock
      .list()
      .then(setRows)
      .catch(() => toast.error("Failed to load stock"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const name = r.variant?.product?.name ?? "";
      const size = r.variant?.size ?? "";
      const color = r.variant?.color ?? "";
      if (term && !`${name} ${size} ${color}`.toLowerCase().includes(term))
        return false;
      const ss = stockStatus(r.available);
      if (stockFilter && ss !== stockFilter) return false;
      if (!inDateRange(r.updatedAt, dateFrom, dateTo)) return false;
      return true;
    });
  }, [rows, search, stockFilter, dateFrom, dateTo]);

  const enriched = useMemo(() => filtered.map(metricsFor), [filtered]);

  const totals = useMemo(() => {
    return enriched.reduce(
      (acc, m) => ({
        opening: acc.opening + m.opening,
        remaining: acc.remaining + m.remaining,
        sold: acc.sold + m.sold,
        damaged: acc.damaged + m.damaged,
        purchaseTotal: acc.purchaseTotal + m.purchaseTotal,
        moneySold: acc.moneySold + m.moneySold,
        expected: acc.expected + m.expected,
        profitLoss: acc.profitLoss + m.profitLoss,
      }),
      {
        opening: 0,
        remaining: 0,
        sold: 0,
        damaged: 0,
        purchaseTotal: 0,
        moneySold: 0,
        expected: 0,
        profitLoss: 0,
      },
    );
  }, [enriched]);

  const kpis = useMemo(() => {
    const inStock = filtered.filter(
      (r) => stockStatus(r.available) === "in",
    ).length;
    const low = filtered.filter(
      (r) => stockStatus(r.available) === "low",
    ).length;
    const out = filtered.filter(
      (r) => stockStatus(r.available) === "out",
    ).length;
    return [
      {
        label: "Units remaining",
        value: totals.remaining,
        tone: "purple" as const,
        icon: <Package />,
      },
      {
        label: "In stock SKUs",
        value: inStock,
        tone: "success" as const,
        icon: <PackageCheck />,
      },
      {
        label: "Low stock SKUs",
        value: low,
        tone: "warning" as const,
        icon: <AlertTriangle />,
      },
      {
        label: "Out of stock",
        value: out,
        tone: "danger" as const,
        icon: <PackageX />,
      },
    ];
  }, [filtered, totals.remaining]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(enriched);

  const columns: PlatformTableColumn<StockMetrics>[] = [
    {
      key: "item",
      header: "Item",
      render: (m) => (
        <div className="min-w-[120px]">
          <p className="font-semibold text-navy">
            {m.row.variant?.product?.name ?? ""}
          </p>
          <p className="text-[10px] text-muted">
            Cost {money(m.cost)} · Sell {money(m.sell)}
          </p>
        </div>
      ),
    },
    {
      key: "size",
      header: "Size",
      render: (m) => (
        <span className="text-muted">{m.row.variant?.size ?? ""}</span>
      ),
    },
    {
      key: "color",
      header: "Color",
      render: (m) => (
        <span className="text-muted">{m.row.variant?.color ?? ""}</span>
      ),
    },
    {
      key: "opening",
      header: "Opening",
      render: (m) => (
        <span className="tabular-nums font-semibold text-navy">
          {m.opening}
        </span>
      ),
    },
    {
      key: "sold",
      header: "Sold",
      render: (m) => <span className="tabular-nums text-muted">{m.sold}</span>,
    },
    {
      key: "remaining",
      header: "Remaining",
      render: (m) => (
        <span className="tabular-nums font-semibold text-navy">
          {m.remaining}
        </span>
      ),
    },
    {
      key: "damaged",
      header: "Damaged",
      render: (m) => (
        <span className="tabular-nums text-muted">{m.damaged}</span>
      ),
    },
    {
      key: "purchase",
      header: "Purchase total",
      render: (m) => (
        <span className="tabular-nums text-sm text-navy">
          {money(m.purchaseTotal)}
        </span>
      ),
    },
    {
      key: "moneySold",
      header: "Money sold",
      render: (m) => (
        <span className="tabular-nums text-sm font-medium text-emerald-700">
          {money(m.moneySold)}
        </span>
      ),
    },
    {
      key: "expected",
      header: "Expected",
      render: (m) => (
        <span className="tabular-nums text-sm text-navy">
          {money(m.expected)}
        </span>
      ),
    },
    {
      key: "pl",
      header: "Income / Loss",
      render: (m) => (
        <span
          className={`tabular-nums text-sm font-semibold ${
            m.profitLoss >= 0 ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {m.profitLoss >= 0 ? "+" : ""}
          {money(m.profitLoss)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (m) => {
        const ss = stockStatus(m.remaining);
        return (
          <StatusBadge
            tone={ss === "in" ? "success" : ss === "low" ? "warning" : "danger"}
          >
            {ss === "in"
              ? "In Stock"
              : ss === "low"
                ? "Low Stock"
                : "Out of Stock"}
          </StatusBadge>
        );
      },
    },
    {
      key: "updated",
      header: "Updated",
      render: (m) => (
        <span className="whitespace-nowrap text-muted">
          {timeAgo(m.row.updatedAt)}
        </span>
      ),
    },
  ];

  function exportRows() {
    return enriched.map((m) => {
      const ss = stockStatus(m.remaining);
      return {
        item: m.row.variant?.product?.name ?? "",
        size: m.row.variant?.size ?? "",
        color: m.row.variant?.color ?? "",
        opening: m.opening,
        sold: m.sold,
        remaining: m.remaining,
        damaged: m.damaged,
        unitCost: m.cost,
        unitSell: m.sell,
        purchaseTotal: Math.round(m.purchaseTotal),
        moneySold: Math.round(m.moneySold),
        expected: Math.round(m.expected),
        profitLoss: Math.round(m.profitLoss),
        status:
          ss === "in"
            ? "In Stock"
            : ss === "low"
              ? "Low Stock"
              : "Out of Stock",
      };
    });
  }

  const exportColumns = [
    { header: "Item", accessor: "item" },
    { header: "Size", accessor: "size" },
    { header: "Color", accessor: "color" },
    { header: "Opening", accessor: "opening" },
    { header: "Sold", accessor: "sold" },
    { header: "Remaining", accessor: "remaining" },
    { header: "Damaged", accessor: "damaged" },
    { header: "Unit cost (RWF)", accessor: "unitCost" },
    { header: "Unit sell (RWF)", accessor: "unitSell" },
    { header: "Purchase total (RWF)", accessor: "purchaseTotal" },
    { header: "Money sold (RWF)", accessor: "moneySold" },
    { header: "Expected (RWF)", accessor: "expected" },
    { header: "Income / Loss (RWF)", accessor: "profitLoss" },
    { header: "Status", accessor: "status" },
  ];

  const exportTotals = {
    item: "TOTAL",
    size: "",
    color: "",
    opening: totals.opening,
    sold: totals.sold,
    remaining: totals.remaining,
    damaged: totals.damaged,
    unitCost: "",
    unitSell: "",
    purchaseTotal: Math.round(totals.purchaseTotal),
    moneySold: Math.round(totals.moneySold),
    expected: Math.round(totals.expected),
    profitLoss: Math.round(totals.profitLoss),
    status: "",
  };

  async function handlePdf() {
    setExporting("pdf");
    try {
      await exportToPdf({
        title: "Stock Report",
        subtitle: "Opening · Sold · Remaining · Financial summary",
        organizationName: orgName,
        userName: user?.email || undefined,
        columns: exportColumns,
        data: exportRows(),
        totals: exportTotals,
        fileName: `${orgName}_stock_report`,
        orientation: "landscape",
      });
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExporting(null);
    }
  }

  function handleExcel() {
    setExporting("excel");
    try {
      exportToExcel({
        title: "Stock Report",
        subtitle: "Opening · Sold · Remaining · Financial summary",
        organizationName: orgName,
        userName: user?.email || undefined,
        columns: exportColumns,
        data: exportRows(),
        totals: exportTotals,
        fileName: `${orgName}_stock_report`,
      });
      toast.success("Excel exported");
    } catch {
      toast.error("Excel export failed");
    } finally {
      setExporting(null);
    }
  }

  return (
    <PlatformPageLayout
      title="Stock"
      subtitle="Opening, sold, remaining, and money performance per uniform SKU."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || enriched.length === 0}
            onClick={() => void handlePdf()}
          >
            <FileText size={15} />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || enriched.length === 0}
            onClick={handleExcel}
          >
            <FileSpreadsheet size={15} />
            {exporting === "excel" ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by item, size or color…"
          filters={[
            {
              key: "stock",
              label: "Stock Status",
              value: stockFilter,
              onChange: setStockFilter,
              options: [
                { value: "in", label: "In Stock" },
                { value: "low", label: "Low Stock" },
                { value: "out", label: "Out of Stock" },
              ],
            },
          ]}
          onReset={() => {
            setSearch("");
            setStockFilter("");
            setDateFrom("");
            setDateTo("");
          }}
        />

        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
          }}
          label="Stock updated"
        />

        <ListKpiStrip items={kpis} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MoneyCard
            label="Purchase total"
            hint="Opening × cost"
            value={money(totals.purchaseTotal)}
            icon={<Wallet className="h-4 w-4" />}
            tone="navy"
          />
          <MoneyCard
            label="Total money sold"
            hint={`${totals.sold.toLocaleString()} units sold`}
            value={money(totals.moneySold)}
            icon={<Banknote className="h-4 w-4" />}
            tone="emerald"
          />
          <MoneyCard
            label="Expected revenue"
            hint="Opening × sell price"
            value={money(totals.expected)}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="amber"
          />
          <MoneyCard
            label={totals.profitLoss >= 0 ? "Income (profit)" : "Loss"}
            hint="Sold profit − damaged cost"
            value={`${totals.profitLoss >= 0 ? "+" : ""}${money(totals.profitLoss)}`}
            icon={
              totals.profitLoss >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )
            }
            tone={totals.profitLoss >= 0 ? "emerald" : "danger"}
          />
        </div>

        <PlatformDataTable
          className="[&_table]:min-w-[1100px]"
          columns={columns}
          data={pageRows}
          rowKey={(m) => m.row.id}
          loading={loading}
          emptyMessage="No stock balances yet"
          page={page}
          pageSize={pageSize}
          total={enriched.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          toolbar={
            <ListToolbar
              resultLabel={`${enriched.length} SKU${enriched.length === 1 ? "" : "s"} found`}
              resultHint={`Opening ${totals.opening.toLocaleString()} · Remaining ${totals.remaining.toLocaleString()} · Sold ${totals.sold.toLocaleString()}`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>
    </PlatformPageLayout>
  );
}

function MoneyCard({
  label,
  hint,
  value,
  icon,
  tone,
}: {
  label: string;
  hint: string;
  value: string;
  icon: ReactNode;
  tone: "navy" | "emerald" | "amber" | "danger";
}) {
  const iconTone = {
    navy: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  };
  const valueTone = tone === "danger" ? "text-red-600" : "text-navy";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 shadow-soft">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-[18px] [&_svg]:w-[18px] ${iconTone[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p
          className={`text-xl font-bold tabular-nums leading-tight ${valueTone}`}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
      </div>
    </div>
  );
}
