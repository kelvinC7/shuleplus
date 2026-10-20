"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Layers,
  Plus,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { ListFilterBar, ListToolbar, StatusBadge, DateRangeFilter, inDateRange } from "@/components/list-ui";
import { useAuth } from "@/contexts/auth-context";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { exportToExcel, exportToPdf } from "@/lib/export-utils";
import { uniformApi } from "@/services/uniform-api";
import type { Fabric, FabricIssue } from "@/types";
import { fmtMeters, fmtMoney } from "@/modules/fabric/fabric-utils";
import { ManualFabricUsageModal } from "@/modules/fabric/manual-fabric-usage-modal";

function noteField(notes: string | null | undefined, key: string) {
  if (!notes) return "";
  const re = new RegExp(`${key}:\\s*([^·]+)`, "i");
  return notes.match(re)?.[1]?.trim() || "";
}

function colorSwatch(color?: string | null) {
  const c = (color || "").toLowerCase();
  if (c.includes("white")) return "#e8e8e8";
  if (c.includes("black")) return "#1e1e1e";
  if (c.includes("grey") || c.includes("gray")) return "#9ca3af";
  if (c.includes("blue") || c.includes("navy")) return "#1e3a8a";
  if (c.includes("green")) return "#166534";
  if (c.includes("red")) return "#b91c1c";
  if (c.includes("yellow") || c.includes("gold")) return "#ca8a04";
  return "#94a3b8";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function FabricStockOutView() {
  const { user, summary } = useAuth();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus Uniforms";

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [issues, setIssues] = useState<FabricIssue[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<FabricIssue | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const [f, i] = await Promise.all([
        uniformApi.fabrics.list(),
        uniformApi.fabricIssues.list(),
      ]);
      setFabrics(f);
      setIssues(i);
    } catch {
      toast.error("Failed to load stock-out data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((r) => {
      if (!inDateRange(r.issuedAt, dateFrom, dateTo)) return false;
      if (!q) return true;
      return `${r.fabric?.name ?? ""} ${r.tailor?.name ?? ""} ${r.notes ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [issues, search, dateFrom, dateTo]);

  const issuePaging = usePagedRows(filteredIssues);
  const pageRows = issuePaging.pageRows;

  const manualKpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let totalMeters = 0;
    let monthMeters = 0;
    let valueImpact = 0;
    for (const r of filteredIssues) {
      const m = Number(r.meters);
      totalMeters += m;
      valueImpact += m * Number(r.fabric?.cost ?? 0);
      if (new Date(r.issuedAt) >= monthStart) monthMeters += m;
    }
    return {
      totalIssues: filteredIssues.length,
      totalMeters,
      monthMeters,
      valueImpact: Math.round(valueImpact),
    };
  }, [filteredIssues]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, dateFrom, dateTo]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const ids = pageRows.map((r) => r.id);
    if (ids.length > 0 && selectedIds.size === ids.length)
      setSelectedIds(new Set());
    else setSelectedIds(new Set(ids));
  }

  function openCreate() {
    setEditingIssue(null);
    setManualOpen(true);
  }

  function openEdit(issue: FabricIssue) {
    setEditingIssue(issue);
    setManualOpen(true);
  }

  async function handleDelete(issue: FabricIssue) {
    const name = issue.fabric?.name ?? "this issue";
    if (
      !window.confirm(
        `Delete stock-out of ${fmtMeters(Number(issue.meters))} from “${name}”? Meters will be restored to stock.`,
      )
    ) {
      return;
    }
    try {
      await uniformApi.fabricIssues.remove(issue.id);
      toast.success("Stock-out deleted. Meters restored.");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
      void load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Delete failed",
      );
    }
  }

  const issueColumns: PlatformTableColumn<FabricIssue>[] = [
    {
      key: "fabric",
      header: "Fabric",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span
            className="h-9 w-9 shrink-0 rounded-md border border-slate-200 shadow-sm"
            style={{ backgroundColor: colorSwatch(r.fabric?.color) }}
            title={r.fabric?.color || "Fabric"}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">
              {r.fabric?.name ?? ""}
            </p>
            <p className="truncate text-[11px] text-muted">
              Roll: {r.fabric?.rollNumber || ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "meters",
      header: "Meters Used",
      render: (r) => (
        <div>
          <p className="tabular-nums font-semibold text-navy">
            {fmtMeters(Number(r.meters))}
          </p>
          <span className="mt-0.5 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            Manual
          </span>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (r) => {
        const purpose = noteField(r.notes, "Purpose") || "";
        const uniform = noteField(r.notes, "Uniform");
        return (
          <div>
            <p className="font-medium text-navy">{purpose}</p>
            {uniform ? (
              <p className="text-[11px] text-muted">Uniform: {uniform}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "notes",
      header: "Notes",
      render: (r) => {
        const dept = noteField(r.notes, "Department");
        const free = (r.notes || "")
          .split(" · ")
          .filter(
            (p) =>
              !/^(Purpose|Uniform|Production Order|Department|Responsible|Variant|Batch|Warehouse):/i.test(
                p,
              ),
          )
          .join(" · ");
        return (
          <span className="block max-w-[180px] truncate text-sm text-muted">
            {free || dept || ""}
          </span>
        );
      },
    },
    {
      key: "usedBy",
      header: "Used By",
      render: (r) => {
        const name =
          noteField(r.notes, "Responsible") ||
          r.tailor?.name ||
          user?.email?.split("@")[0] ||
          "Staff";
        const role = r.tailor?.company || "Store Manager";
        return (
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-[10px] font-bold text-navy">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold capitalize text-navy">
                {name}
              </p>
              <p className="truncate text-[11px] text-muted">{role}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <span className="whitespace-nowrap text-sm text-muted">
          {new Date(r.issuedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const exportCanRun = filteredIssues.length > 0;

  function buildManualExport() {
    const rows = filteredIssues.map((r) => {
      const meters = Number(r.meters);
      const unitCost = Number(r.fabric?.cost ?? 0);
      const purchaseValue = Math.round(meters * unitCost);
      return {
        fabric: r.fabric?.name ?? "",
        roll: r.fabric?.rollNumber || "",
        meters,
        purpose: noteField(r.notes, "Purpose") || "Manual",
        uniform: noteField(r.notes, "Uniform") || "",
        usedBy: noteField(r.notes, "Responsible") || r.tailor?.name || "",
        department: noteField(r.notes, "Department") || "",
        purchaseValue,
        date: new Date(r.issuedAt).toLocaleDateString(),
      };
    });
    const totalMeters = rows.reduce((s, r) => s + r.meters, 0);
    const totalPurchase = rows.reduce((s, r) => s + r.purchaseValue, 0);
    return {
      title: "Fabric Stock Out: Manual Usage",
      subtitle: "Manual meter usage report",
      columns: [
        { header: "Fabric", accessor: "fabric" },
        { header: "Roll / Batch", accessor: "roll" },
        { header: "Meters Used", accessor: "meters" },
        { header: "Purpose", accessor: "purpose" },
        { header: "Uniform", accessor: "uniform" },
        { header: "Used By", accessor: "usedBy" },
        { header: "Department", accessor: "department" },
        { header: "Purchase Value (RWF)", accessor: "purchaseValue" },
        { header: "Date", accessor: "date" },
      ],
      data: rows,
      totals: {
        fabric: "TOTAL",
        roll: "",
        meters: Math.round(totalMeters * 10) / 10,
        purpose: "",
        uniform: "",
        usedBy: "",
        department: "",
        purchaseValue: totalPurchase,
        date: "",
      },
      summary: [
        { label: "Total Issues", value: String(manualKpis.totalIssues) },
        {
          label: "Total Meters",
          value: `${manualKpis.totalMeters.toLocaleString()} m`,
        },
        {
          label: "This Month",
          value: `${manualKpis.monthMeters.toLocaleString()} m`,
        },
        {
          label: "Total Purchase",
          value: `RWF ${manualKpis.valueImpact.toLocaleString("en-RW")}`,
        },
      ],
      fileName: `${orgName}_fabric_stock_out_manual`,
    };
  }

  async function handlePdf() {
    if (!exportCanRun) return;
    setExporting("pdf");
    try {
      const payload = buildManualExport();
      await exportToPdf({
        ...payload,
        organizationName: orgName,
        userName: user?.email || undefined,
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
    if (!exportCanRun) return;
    setExporting("excel");
    try {
      const payload = buildManualExport();
      exportToExcel({
        ...payload,
        organizationName: orgName,
        userName: user?.email || undefined,
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
      title="Fabric Stock Out"
      subtitle="Record manual fabric meter usage and stock-outs."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || !exportCanRun}
            onClick={() => void handlePdf()}
          >
            <FileText size={15} />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || !exportCanRun}
            onClick={handleExcel}
          >
            <FileSpreadsheet size={15} />
            {exporting === "excel" ? "Exporting…" : "Export Excel"}
          </button>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Manual Usage
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search issues…"
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
          label="Stock-out date"
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Total Issues"
            value={String(manualKpis.totalIssues)}
            hint="All time"
            icon={<Layers className="h-4 w-4" />}
            tone="sky"
          />
          <KpiCard
            label="Total Meters Used"
            value={fmtMeters(manualKpis.totalMeters)}
            hint="All time"
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="emerald"
          />
          <KpiCard
            label="This Month"
            value={fmtMeters(manualKpis.monthMeters)}
            hint={new Date().toLocaleString("en", {
              month: "long",
              year: "numeric",
            })}
            icon={<Clock3 className="h-4 w-4" />}
            tone="amber"
          />
          <KpiCard
            label="Value Impact"
            value={fmtMoney(manualKpis.valueImpact)}
            hint="Purchase value used"
            icon={<TrendingUp className="h-4 w-4" />}
            tone="rose"
          />
        </div>

        <PlatformDataTable
          variant="soft"
          showRowNumbers
          className="[&_table]:min-w-[980px]"
          columns={issueColumns}
          data={issuePaging.pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No manual stock-outs yet"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={openCreate}
            >
              <Plus size={15} /> Manual Usage
            </button>
          }
          selected={selectedIds}
          onSelectRow={toggleRow}
          onSelectAll={toggleAll}
          allSelected={
            issuePaging.pageRows.length > 0 &&
            selectedIds.size === issuePaging.pageRows.length
          }
          page={issuePaging.page}
          pageSize={issuePaging.pageSize}
          total={filteredIssues.length}
          totalPages={issuePaging.totalPages}
          onPageChange={(p) => {
            issuePaging.setPage(p);
            setSelectedIds(new Set());
          }}
          onPageSizeChange={(n) => {
            issuePaging.setPageSize(n);
            setSelectedIds(new Set());
          }}
          onEdit={openEdit}
          onDelete={(r) => void handleDelete(r)}
          toolbar={
            <ListToolbar
              resultLabel={`${filteredIssues.length} issue${filteredIssues.length === 1 ? "" : "s"} found`}
              pageSize={issuePaging.pageSize}
              onPageSizeChange={(n) => {
                issuePaging.setPageSize(n);
                setSelectedIds(new Set());
              }}
            />
          }
        />
      </div>

      <ManualFabricUsageModal
        open={manualOpen}
        fabrics={fabrics}
        editing={editingIssue}
        onClose={() => {
          setManualOpen(false);
          setEditingIssue(null);
        }}
        onSaved={() => void load()}
      />
    </PlatformPageLayout>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-navy sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  );
}
