"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Plus, X } from "lucide-react";
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
import type { Fabric } from "@/types";
import {
  academicYearOptions,
  currentAcademicYear,
  estimatePieces,
  fabricStatus,
  fmtMeters,
  fmtMoney,
} from "@/modules/fabric/fabric-utils";

const emptyForm = {
  name: "",
  color: "",
  rollNumber: "",
  supplierName: "",
  invoiceNo: "",
  academicYear: currentAcademicYear(),
  purchaseDate: new Date().toISOString().slice(0, 10),
  costPerMeter: "",
  meters: "",
  otherCosts: "",
  tax: "",
  discount: "",
  applyTax: false,
  applyDiscount: false,
  reorderLevel: "50",
};

function previewRollCode(existingCount: number) {
  const seq = String(existingCount + 1).padStart(4, "0");
  return `FAB-${new Date().getFullYear()}-${seq}`;
}

export function FabricStockInView() {
  const { user, summary } = useAuth();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus Uniforms";

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    try {
      setFabrics(await uniformApi.fabrics.list());
    } catch {
      toast.error("Failed to load fabrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const meters = Number(form.meters) || 0;
  const costPerM = Number(form.costPerMeter) || 0;
  const other = Number(form.otherCosts) || 0;
  const tax = form.applyTax ? Number(form.tax) || 0 : 0;
  const discount = form.applyDiscount ? Number(form.discount) || 0 : 0;
  const fabricCost = meters * costPerM;
  const totalPurchase = Math.max(0, fabricCost + other + tax - discount);
  const estShirts = estimatePieces(meters, 1.8);
  const autoCode =
    editing?.rollNumber || form.rollNumber || previewRollCode(fabrics.length);

  const colorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const f of fabrics) if (f.color?.trim()) set.add(f.color.trim());
    return [...set].sort().map((c) => ({ value: c, label: c }));
  }, [fabrics]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fabrics.filter((f) => {
      const rem = Number(f.metersRemaining);
      const status = fabricStatus(rem).label.toLowerCase();
      if (statusFilter && status !== statusFilter) return false;
      if (colorFilter && (f.color ?? "") !== colorFilter) return false;
      const stockDate = f.purchaseDate ?? f.updatedAt;
      if (!inDateRange(stockDate, dateFrom, dateTo)) return false;
      if (
        q &&
        !`${f.name} ${f.color ?? ""} ${f.rollNumber ?? ""} ${f.supplier?.name ?? ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [fabrics, search, statusFilter, colorFilter, dateFrom, dateTo]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      rollNumber: previewRollCode(fabrics.length),
      academicYear: currentAcademicYear(),
    });
    setOpen(true);
  }

  function openEdit(f: Fabric) {
    const yearOptions = academicYearOptions();
    const savedYear = f.academicYear?.trim() || "";
    const normalizedYear = savedYear.includes("-")
      ? savedYear
      : /^\d{4}$/.test(savedYear)
        ? `${savedYear}-${Number(savedYear) + 1}`
        : currentAcademicYear();
    setEditing(f);
    setForm({
      ...emptyForm,
      name: f.name,
      color: f.color ?? "",
      rollNumber: f.rollNumber ?? "",
      supplierName: f.supplier?.name ?? "",
      academicYear: normalizedYear || yearOptions[2],
      purchaseDate: f.purchaseDate
        ? new Date(f.purchaseDate).toISOString().slice(0, 10)
        : emptyForm.purchaseDate,
      costPerMeter: String(Number(f.cost) || ""),
      meters: String(Number(f.metersRemaining) || ""),
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Fabric name is required");
      return;
    }
    if (!editing && meters <= 0) {
      toast.error("Meters are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await uniformApi.fabrics.update(editing.id, {
          name: form.name.trim(),
          color: form.color || undefined,
          rollNumber: form.rollNumber || undefined,
          academicYear: form.academicYear || undefined,
          supplierName: form.supplierName.trim() || undefined,
          cost: costPerM,
          metersRemaining: meters,
          purchaseDate: form.purchaseDate || undefined,
        });
        toast.success("Fabric updated");
      } else {
        await uniformApi.fabrics.stockIn({
          name: form.name.trim(),
          color: form.color || undefined,
          rollNumber: autoCode,
          academicYear: form.academicYear || undefined,
          supplierName: form.supplierName.trim() || undefined,
          invoiceNo: form.invoiceNo || undefined,
          purchaseDate: form.purchaseDate || undefined,
          meters,
          cost: costPerM,
          otherCosts: other || undefined,
          tax: tax || undefined,
          discount: discount || undefined,
          notes: form.reorderLevel
            ? `Reorder: ${form.reorderLevel}m`
            : undefined,
        });
        toast.success("Fabric stock recorded");
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      void load();
    } catch {
      toast.error(editing ? "Update failed" : "Stock in failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Fabric) {
    if (!window.confirm(`Delete fabric “${f.name}”? This cannot be undone.`))
      return;
    try {
      await uniformApi.fabrics.remove(f.id);
      toast.success("Fabric deleted");
      void load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Delete failed",
      );
    }
  }

  const exportRows = () =>
    filtered.map((f) => {
      const rem = Number(f.metersRemaining);
      const cost = Number(f.cost);
      return {
        fabric: f.name,
        code: f.rollNumber || "",
        color: f.color || "",
        available: rem,
        purchaseCost: cost,
        stockValue: Math.round(rem * cost),
        supplier: f.supplier?.name || "",
        academicYear: f.academicYear || "",
        updated: new Date(f.updatedAt).toLocaleDateString(),
        status: fabricStatus(rem).label,
      };
    });

  const exportColumns = [
    { header: "Fabric", accessor: "fabric" },
    { header: "Code", accessor: "code" },
    { header: "Color", accessor: "color" },
    { header: "Available (m)", accessor: "available" },
    { header: "Purchase Cost (RWF/m)", accessor: "purchaseCost" },
    { header: "Stock Value (RWF)", accessor: "stockValue" },
    { header: "Supplier", accessor: "supplier" },
    { header: "Academic Year", accessor: "academicYear" },
    { header: "Updated", accessor: "updated" },
    { header: "Status", accessor: "status" },
  ];

  const exportTotals = useMemo(() => {
    const rows = filtered.map((f) => {
      const rem = Number(f.metersRemaining);
      const cost = Number(f.cost);
      return { rem, value: rem * cost };
    });
    const totalMeters = rows.reduce((s, r) => s + r.rem, 0);
    const totalPurchase = Math.round(rows.reduce((s, r) => s + r.value, 0));
    return {
      fabric: "TOTAL",
      code: "",
      color: "",
      available: Math.round(totalMeters * 10) / 10,
      purchaseCost: "",
      stockValue: totalPurchase,
      supplier: "",
      academicYear: "",
      updated: "",
      status: `Total Purchase: RWF ${totalPurchase.toLocaleString("en-RW")}`,
    };
  }, [filtered]);

  async function handlePdf() {
    setExporting("pdf");
    try {
      await exportToPdf({
        title: "Fabric Stock In Report",
        subtitle: `Inventory · Total Purchase RWF ${Number(exportTotals.stockValue).toLocaleString("en-RW")}`,
        organizationName: orgName,
        userName: user?.email || undefined,
        columns: exportColumns,
        data: exportRows(),
        totals: exportTotals,
        fileName: `${orgName}_fabric_stock_in`,
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
        title: "Fabric Stock In Report",
        subtitle: `Inventory · Total Purchase RWF ${Number(exportTotals.stockValue).toLocaleString("en-RW")}`,
        organizationName: orgName,
        userName: user?.email || undefined,
        columns: exportColumns,
        data: exportRows(),
        totals: exportTotals,
        fileName: `${orgName}_fabric_stock_in`,
      });
      toast.success("Excel exported");
    } catch {
      toast.error("Excel export failed");
    } finally {
      setExporting(null);
    }
  }

  const columns: PlatformTableColumn<Fabric>[] = [
    {
      key: "fabric",
      header: "Fabric",
      render: (f) => (
        <div>
          <p className="font-semibold text-navy">{f.name}</p>
          <p className="text-[11px] text-muted">{f.rollNumber || ""}</p>
        </div>
      ),
    },
    {
      key: "color",
      header: "Color",
      render: (f) =>
        f.color ? <StatusBadge tone="sky">{f.color}</StatusBadge> : "",
    },
    {
      key: "available",
      header: "Available",
      render: (f) => (
        <span className="tabular-nums font-semibold text-navy">
          {fmtMeters(Number(f.metersRemaining))}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Purchase Cost",
      render: (f) => (
        <span className="tabular-nums text-muted">
          {fmtMoney(Number(f.cost))}/m
        </span>
      ),
    },
    {
      key: "value",
      header: "Stock Value",
      render: (f) => (
        <span className="tabular-nums font-semibold text-navy">
          {fmtMoney(Number(f.metersRemaining) * Number(f.cost))}
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (f) => (
        <span className="text-muted">{f.supplier?.name || ""}</span>
      ),
    },
    {
      key: "year",
      header: "Year",
      render: (f) => <span className="text-muted">{f.academicYear || ""}</span>,
    },
    {
      key: "stockInDate",
      header: "Stock in date",
      render: (f) => (
        <span className="whitespace-nowrap text-muted">
          {f.purchaseDate
            ? new Date(f.purchaseDate).toLocaleDateString()
            : new Date(f.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (f) => (
        <span className="text-muted">
          {new Date(f.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (f) => {
        const s = fabricStatus(Number(f.metersRemaining));
        const tone =
          s.label === "Healthy"
            ? "success"
            : s.label === "Low"
              ? "warning"
              : "danger";
        return (
          <StatusBadge tone={tone}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {s.label}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <PlatformPageLayout
      title="Fabric Stock In"
      subtitle="Record purchases with live cost and stock preview."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || filtered.length === 0}
            onClick={() => void handlePdf()}
          >
            <FileText size={15} />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || filtered.length === 0}
            onClick={handleExcel}
          >
            <FileSpreadsheet size={15} />
            {exporting === "excel" ? "Exporting…" : "Export Excel"}
          </button>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Fabric Stock
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search fabric, color, supplier…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (v) => {
                setStatusFilter(v);
                setPage(1);
              },
              options: [
                { value: "healthy", label: "Healthy" },
                { value: "low", label: "Low Stock" },
                { value: "out", label: "Out of Stock" },
              ],
            },
            {
              key: "color",
              label: "Color",
              value: colorFilter,
              onChange: (v) => {
                setColorFilter(v);
                setPage(1);
              },
              options: colorOptions,
            },
          ]}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setColorFilter("");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        />

        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onFromChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
          onToChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
          label="Purchase date"
        />

        <PlatformDataTable
          variant="soft"
          showRowNumbers
          className="[&_table]:min-w-[900px]"
          columns={columns}
          data={pageRows}
          rowKey={(f) => f.id}
          loading={loading}
          emptyMessage="No fabrics yet. Add your first stock-in."
          emptyAction={
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={15} /> New Fabric Stock
            </button>
          }
          selected={selected}
          onSelectRow={(id) => {
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectAll={() => {
            if (pageRows.length > 0 && selected.size === pageRows.length) {
              setSelected(new Set());
            } else {
              setSelected(new Set(pageRows.map((f) => f.id)));
            }
          }}
          allSelected={pageRows.length > 0 && selected.size === pageRows.length}
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={(p) => {
            setPage(p);
            setSelected(new Set());
          }}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setSelected(new Set());
          }}
          onEdit={openEdit}
          onDelete={(f) => void handleDelete(f)}
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} fabric${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setSelected(new Set());
              }}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-navy/45 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-5xl flex-col bg-[#f7f8fb] shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  {editing ? "Edit Fabric" : "Stock In"}
                </p>
                <h3 className="text-lg font-bold text-navy">
                  {editing ? "Update Fabric Stock" : "New Fabric Stock"}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-xl border border-border p-2 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1fr_300px]">
              <div className="space-y-4 p-4 sm:p-6">
                <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                  <h4 className="mb-3 text-sm font-bold text-navy">
                    Basic Information
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Fabric Name *">
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Blue Cotton"
                      />
                    </Field>
                    <Field label="Fabric Code (auto)">
                      <input
                        className="input bg-slate-50 text-muted"
                        value={autoCode}
                        readOnly
                        title="Generated automatically"
                      />
                    </Field>
                    <Field label="Academic Year">
                      <select
                        className="input"
                        value={form.academicYear}
                        onChange={(e) =>
                          setForm({ ...form, academicYear: e.target.value })
                        }
                      >
                        {academicYearOptions().map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                        {form.academicYear &&
                        !academicYearOptions().includes(form.academicYear) ? (
                          <option value={form.academicYear}>
                            {form.academicYear}
                          </option>
                        ) : null}
                      </select>
                    </Field>
                    <Field label="Color">
                      <input
                        className="input"
                        value={form.color}
                        onChange={(e) =>
                          setForm({ ...form, color: e.target.value })
                        }
                        placeholder="Navy / Blue"
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
                  <h4 className="mb-3 text-sm font-bold text-navy">
                    {editing ? "Stock & Cost" : "Purchase Information"}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Supplier">
                      <input
                        className="input"
                        value={form.supplierName}
                        onChange={(e) =>
                          setForm({ ...form, supplierName: e.target.value })
                        }
                        placeholder="Supplier name"
                      />
                    </Field>
                    {!editing ? (
                      <Field label="Invoice No">
                        <input
                          className="input"
                          value={form.invoiceNo}
                          onChange={(e) =>
                            setForm({ ...form, invoiceNo: e.target.value })
                          }
                        />
                      </Field>
                    ) : null}
                    <Field label="Purchase Date">
                      <input
                        type="date"
                        className="input"
                        value={form.purchaseDate}
                        onChange={(e) =>
                          setForm({ ...form, purchaseDate: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Cost / Meter (RWF)">
                      <input
                        type="number"
                        className="input"
                        value={form.costPerMeter}
                        onChange={(e) =>
                          setForm({ ...form, costPerMeter: e.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label={editing ? "Available Meters *" : "Total Meters *"}
                    >
                      <input
                        type="number"
                        className="input"
                        value={form.meters}
                        onChange={(e) =>
                          setForm({ ...form, meters: e.target.value })
                        }
                      />
                    </Field>
                    {!editing ? (
                      <>
                        <Field label="Other Costs (optional)">
                          <input
                            type="number"
                            className="input"
                            value={form.otherCosts}
                            onChange={(e) =>
                              setForm({ ...form, otherCosts: e.target.value })
                            }
                            placeholder="Transport & extras"
                          />
                          <p className="mt-1 text-[11px] text-muted">
                            Includes transport and any other extras
                          </p>
                        </Field>
                        <Field label="Reorder Level (m)">
                          <input
                            type="number"
                            className="input"
                            value={form.reorderLevel}
                            onChange={(e) =>
                              setForm({ ...form, reorderLevel: e.target.value })
                            }
                          />
                        </Field>

                        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-border bg-slate-50/80 p-3">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                                checked={form.applyTax}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    applyTax: e.target.checked,
                                    tax: e.target.checked ? form.tax : "",
                                  })
                                }
                              />
                              <span className="text-sm font-semibold text-navy">
                                Apply Tax
                              </span>
                            </label>
                            {form.applyTax ? (
                              <input
                                type="number"
                                className="input mt-2"
                                value={form.tax}
                                onChange={(e) =>
                                  setForm({ ...form, tax: e.target.value })
                                }
                                placeholder="Tax amount (RWF)"
                              />
                            ) : null}
                          </div>
                          <div className="rounded-xl border border-border bg-slate-50/80 p-3">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                                checked={form.applyDiscount}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    applyDiscount: e.target.checked,
                                    discount: e.target.checked
                                      ? form.discount
                                      : "",
                                  })
                                }
                              />
                              <span className="text-sm font-semibold text-navy">
                                Apply Discount
                              </span>
                            </label>
                            {form.applyDiscount ? (
                              <input
                                type="number"
                                className="input mt-2"
                                value={form.discount}
                                onChange={(e) =>
                                  setForm({ ...form, discount: e.target.value })
                                }
                                placeholder="Discount amount (RWF)"
                              />
                            ) : null}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </section>
              </div>

              <aside className="border-t border-border bg-white p-4 lg:border-l lg:border-t-0 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  Fabric Preview
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-50 to-white p-4">
                  <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-sky-100/80 text-sky-700">
                    <span className="text-sm font-bold">
                      {form.color || "Fabric"}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-navy">
                    {form.name || "New fabric"}
                  </h4>
                  <p className="text-xs text-emerald-600">
                    Available · {fmtMeters(meters)}
                  </p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <PreviewRow
                      k="Purchase Cost"
                      v={`${fmtMoney(costPerM)}/m`}
                    />
                    <PreviewRow k="Estimated Shirts" v={String(estShirts)} />
                    <PreviewRow k="Fabric Cost" v={fmtMoney(fabricCost)} />
                    {!editing ? (
                      <>
                        <PreviewRow k="Other Costs" v={fmtMoney(other)} />
                        {form.applyTax ? (
                          <PreviewRow k="Tax" v={fmtMoney(tax)} />
                        ) : null}
                        {form.applyDiscount ? (
                          <PreviewRow
                            k="Discount"
                            v={`−${fmtMoney(discount)}`}
                          />
                        ) : null}
                      </>
                    ) : null}
                    <PreviewRow
                      k="Stock Value"
                      v={fmtMoney(editing ? fabricCost : totalPurchase)}
                      bold
                    />
                    {form.academicYear ? (
                      <PreviewRow k="Academic Year" v={form.academicYear} />
                    ) : null}
                    {form.supplierName.trim() ? (
                      <PreviewRow k="Supplier" v={form.supplierName.trim()} />
                    ) : null}
                  </dl>
                </div>
                <button
                  type="button"
                  className="btn-primary mt-4 w-full justify-center"
                  disabled={saving}
                  onClick={() => void submit()}
                >
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Confirm Stock In"}
                </button>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </PlatformPageLayout>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function PreviewRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className={bold ? "font-bold text-navy" : "font-semibold text-navy"}>
        {v}
      </dd>
    </div>
  );
}
