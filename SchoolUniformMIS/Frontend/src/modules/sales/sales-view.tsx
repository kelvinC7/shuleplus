"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import {
  ListFilterBar,
  ListToolbar,
  StatusBadge,
  timeAgo,
} from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
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

export function SalesView() {
  const [rows, setRows] = useState<UniformSale[]>([]);
  const [stock, setStock] = useState<StockBalance[]>([]);
  const [students, setStudents] = useState<UniformStudent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.paymentStatus !== statusFilter) return false;
      if (!term) return true;
      const customer =
        r.customerName ||
        (r.student
          ? `${r.student.firstName} ${r.student.lastName}`
          : r.customerType);
      return `${r.invoiceNumber} ${customer}`.toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter]);

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
      key: "total",
      header: "Total",
      render: (r) => (
        <span className="font-semibold tabular-nums text-navy">
          {Number(r.total).toLocaleString()} RWF
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
      render: (r) => <span className="text-muted">{timeAgo(r.createdAt)}</span>,
    },
  ];

  return (
    <PlatformPageLayout
      title="Sales"
      subtitle="Record walk-in and student sales with optional payments."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> New sale
        </button>
      }
    >
      <div className="space-y-4">
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
          ]}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
          }}
        />

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No sales yet"
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
              resultLabel={`${filtered.length} sale${filtered.length === 1 ? "" : "s"} found`}
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
