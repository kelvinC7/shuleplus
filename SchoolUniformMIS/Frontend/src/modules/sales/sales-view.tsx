"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileSpreadsheet, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  DateRangeFilter,
  ListFilterBar,
  ListKpiStrip,
  ListToolbar,
  StatusBadge,
  inDateRange,
  timeAgo,
} from "@/components/list-ui";
import { useAuth } from "@/contexts/auth-context";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { exportToExcel, exportToPdf } from "@/lib/export-utils";
import { uniformApi } from "@/services/uniform-api";
import type {
  PaymentStatus,
  StockBalance,
  UniformSale,
  UniformStudent,
} from "@/types";

function paymentTone(status: PaymentStatus) {
  if (status === "PAID") return "success" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "danger" as const;
}

function paymentLabel(status: PaymentStatus) {
  if (status === "PAID") return "Paid";
  if (status === "PARTIAL") return "Partial";
  return "Pending";
}

function money(n: number) {
  return `${Math.round(n).toLocaleString("en-RW")} RWF`;
}

function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(d: Date) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekLabelForDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const start = startOfWeekMonday(d);
  const end = endOfWeekSunday(d);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function inSpecificDate(iso: string | null | undefined, dateStr: string) {
  if (!dateStr) return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return toISODate(d) === dateStr;
}

export function SalesView() {
  const { user, summary } = useAuth();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus Uniforms";

  const [rows, setRows] = useState<UniformSale[]>([]);
  const [stock, setStock] = useState<StockBalance[]>([]);
  const [students, setStudents] = useState<UniformStudent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [weekDate, setWeekDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | "week" | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerType: "WALK_IN",
    studentId: "",
    customerName: "",
    variantId: "",
    quantity: 1,
    unitPrice: "",
    method: "CASH",
    amount: "",
  });

  async function load() {
    try {
      const [sales, st, stu] = await Promise.all([
        uniformApi.sales.list(),
        uniformApi.stock.list(),
        uniformApi.students.list(),
      ]);
      setRows(sales);
      setStock(st);
      setStudents(stu);
    } catch {
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      const unitPrice = Number(form.unitPrice) || 0;
      const qty = form.quantity;
      const lineTotal = unitPrice * qty;
      await uniformApi.sales.create({
        customerType: form.customerType,
        studentId: form.studentId || undefined,
        customerName: form.customerName || undefined,
        lines: [
          { variantId: form.variantId, quantity: qty, unitPrice, lineTotal },
        ],
        payment: form.amount
          ? {
              amount: Number(form.amount),
              method: form.method,
              status: Number(form.amount) >= lineTotal ? "PAID" : "PARTIAL",
            }
          : undefined,
      });
      toast.success("Sale recorded");
      setOpen(false);
      void load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed",
      );
    }
  }

  const effectiveFrom = weekDate
    ? toISODate(startOfWeekMonday(new Date(`${weekDate}T00:00:00`)))
    : dateFrom;
  const effectiveTo = weekDate
    ? toISODate(endOfWeekSunday(new Date(`${weekDate}T00:00:00`)))
    : dateTo;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.paymentStatus !== statusFilter) return false;
      if (!inSpecificDate(r.createdAt, specificDate)) return false;
      if (!inDateRange(r.createdAt, effectiveFrom, effectiveTo)) return false;
      if (!term) return true;
      const customer =
        r.customerName ||
        (r.student
          ? `${r.student.firstName} ${r.student.lastName}`
          : r.customerType);
      return `${r.invoiceNumber} ${customer}`.toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter, specificDate, effectiveFrom, effectiveTo]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let paidSales = 0;
    let pendingSales = 0;
    for (const r of filtered) {
      totalAmount += Number(r.total) || 0;
      if (r.paymentStatus === "PAID") paidSales += 1;
      if (r.paymentStatus === "PENDING" || r.paymentStatus === "PARTIAL")
        pendingSales += 1;
    }
    return { count: filtered.length, totalAmount, paidSales, pendingSales };
  }, [filtered]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<UniformSale>[] = [
    {
      key: "invoice",
      header: "Invoice",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-navy">
          {r.invoiceNumber}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <span className="font-semibold text-navy">
          {r.customerName ||
            (r.student
              ? `${r.student.firstName} ${r.student.lastName}`
              : r.customerType)}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (r) => (
        <span className="tabular-nums text-muted">{r.lines?.length ?? 0}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (r) => (
        <span className="font-semibold tabular-nums text-navy">
          {money(Number(r.total))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Payment",
      render: (r) => (
        <StatusBadge tone={paymentTone(r.paymentStatus)}>
          {paymentLabel(r.paymentStatus)}
        </StatusBadge>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <div className="text-xs">
          <p className="font-medium text-navy">
            {new Date(r.createdAt).toLocaleDateString()}
          </p>
          <p className="text-muted">{timeAgo(r.createdAt)}</p>
        </div>
      ),
    },
  ];

  function periodLabel() {
    if (specificDate)
      return `Date: ${new Date(`${specificDate}T00:00:00`).toLocaleDateString()}`;
    if (weekDate) return `Week report: ${weekLabelForDate(weekDate)}`;
    if (effectiveFrom || effectiveTo)
      return `Period: ${effectiveFrom || "…"} to ${effectiveTo || "…"}`;
    return "All dates";
  }

  function exportRowsData() {
    return filtered.map((r) => ({
      invoice: r.invoiceNumber,
      date: new Date(r.createdAt).toLocaleString(),
      customer:
        r.customerName ||
        (r.student
          ? `${r.student.firstName} ${r.student.lastName}`
          : r.customerType),
      items: r.lines?.length ?? 0,
      total: Math.round(Number(r.total) || 0),
      status: paymentLabel(r.paymentStatus),
    }));
  }

  const exportColumns = [
    { header: "Invoice", accessor: "invoice" },
    { header: "Date", accessor: "date" },
    { header: "Customer", accessor: "customer" },
    { header: "Items", accessor: "items" },
    { header: "Total (RWF)", accessor: "total" },
    { header: "Payment Status", accessor: "status" },
  ];

  const exportTotals = {
    invoice: "TOTAL",
    date: "",
    customer: `${totals.count} sale(s)`,
    items: filtered.reduce((s, r) => s + (r.lines?.length ?? 0), 0),
    total: Math.round(totals.totalAmount),
    status: "",
  };

  const exportSummary = [
    { label: "Sales", value: String(totals.count) },
    { label: "Total Amount", value: money(totals.totalAmount) },
    { label: "Paid", value: String(totals.paidSales) },
    { label: "Pending/Partial", value: String(totals.pendingSales) },
  ];

  async function handlePdf(weekMode = false) {
    setExporting(weekMode ? "week" : "pdf");
    try {
      await exportToPdf({
        title: weekMode ? "Sales Week Report" : "Sales Report",
        subtitle: `${periodLabel()} · Uniform sales and payment summary`,
        organizationName: orgName,
        userName: user?.email || undefined,
        columns: exportColumns,
        data: exportRowsData(),
        totals: exportTotals,
        summary: exportSummary,
        fileName: `${orgName}_${weekMode ? "sales_week_report" : "sales_report"}`,
        orientation: "landscape",
      });
      toast.success(weekMode ? "Week report PDF exported" : "PDF exported");
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
        title: "Sales Report",
        subtitle: periodLabel(),
        organizationName: orgName,
        userName: user?.email || undefined,
        columns: exportColumns,
        data: exportRowsData(),
        totals: exportTotals,
        fileName: `${orgName}_sales_report`,
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
      title="Sales"
      subtitle="Record, filter, and report walk-in and student uniform sales with modern exports."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || filtered.length === 0}
            onClick={() => void handlePdf(false)}
          >
            <FileText size={15} />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || filtered.length === 0 || !weekDate}
            onClick={() => void handlePdf(true)}
            title={
              weekDate
                ? `Week report: ${weekLabelForDate(weekDate)}`
                : "Select a week date first"
            }
          >
            <CalendarDays size={15} />
            {exporting === "week" ? "Exporting…" : "Week Report"}
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
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" /> New sale
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <ListKpiStrip
          items={[
            { label: "Sales", value: totals.count, hint: periodLabel() },
            {
              label: "Total Amount",
              value: money(totals.totalAmount),
              hint: "Filtered sales value",
              tone: "text-navy",
            },
            {
              label: "Paid",
              value: totals.paidSales,
              hint: "Fully paid sales",
              tone: "text-emerald-700",
            },
            {
              label: "Pending/Partial",
              value: totals.pendingSales,
              hint: "Need follow-up",
              tone: "text-amber-700",
            },
          ]}
        />

        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search invoice or customer…"
          filters={[
            {
              key: "status",
              label: "Payment Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "PAID", label: "Paid" },
                { value: "PARTIAL", label: "Partial" },
                { value: "PENDING", label: "Pending" },
              ],
            },
            {
              key: "date",
              label: "Specific Date",
              type: "date",
              value: specificDate,
              onChange: (v) => {
                setSpecificDate(v);
                if (v) {
                  setWeekDate("");
                  setDateFrom("");
                  setDateTo("");
                }
              },
            },
            {
              key: "week",
              label: "Week (pick any day)",
              type: "date",
              value: weekDate,
              onChange: (v) => {
                setWeekDate(v);
                if (v) {
                  setSpecificDate("");
                }
              },
            },
          ]}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setSpecificDate("");
            setWeekDate("");
            setDateFrom("");
            setDateTo("");
          }}
        />

        <div className="rounded-xl border border-border bg-white p-3 shadow-soft sm:p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Date Range Filter
          </p>
          <DateRangeFilter
            from={effectiveFrom}
            to={effectiveTo}
            onFromChange={(v) => {
              setWeekDate("");
              setDateFrom(v);
            }}
            onToChange={(v) => {
              setWeekDate("");
              setDateTo(v);
            }}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
              setWeekDate("");
            }}
          />
          {weekDate ? (
            <p className="mt-2 text-xs font-medium text-navy">
              Week selected: {weekLabelForDate(weekDate)}
            </p>
          ) : null}
        </div>

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No sales found for the selected filters"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> New sale
            </button>
          }
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} sale${filtered.length === 1 ? "" : "s"} found · ${periodLabel()}`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="hr-card w-full max-w-lg space-y-3 p-6">
            <h2 className="text-lg font-semibold text-navy">New sale</h2>
            <select
              className="input"
              value={form.customerType}
              onChange={(e) =>
                setForm({ ...form, customerType: e.target.value })
              }
            >
              <option value="WALK_IN">Walk-in</option>
              <option value="STUDENT">Student</option>
              <option value="PARENT">Parent</option>
            </select>
            {form.customerType !== "WALK_IN" ? (
              <select
                className="input"
                value={form.studentId}
                onChange={(e) =>
                  setForm({ ...form, studentId: e.target.value })
                }
              >
                <option value="">Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder="Customer name"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
            )}
            <select
              className="input"
              value={form.variantId}
              onChange={(e) => setForm({ ...form, variantId: e.target.value })}
            >
              <option value="">Item variant</option>
              {stock.map((b) => (
                <option key={b.variantId} value={b.variantId}>
                  {b.variant?.product?.name} {b.variant?.size}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="input"
                placeholder="Qty"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) || 1 })
                }
              />
              <input
                className="input"
                placeholder="Unit price"
                value={form.unitPrice}
                onChange={(e) =>
                  setForm({ ...form, unitPrice: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK">Bank</option>
                <option value="CARD">Card</option>
              </select>
              <input
                className="input"
                placeholder="Paid now"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void save()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PlatformPageLayout>
  );
}
