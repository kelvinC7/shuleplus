"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { ListFilterBar, ListToolbar, StatusBadge } from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { uniformApi } from "@/services/uniform-api";
import type { OutstandingPayment, PaymentStatus } from "@/types";

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

export function PaymentsView() {
  const [rows, setRows] = useState<OutstandingPayment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setRows(await uniformApi.payments.listOutstanding());
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function pay(saleId: string) {
    const amount = window.prompt("Payment amount (RWF)");
    if (!amount) return;
    try {
      await uniformApi.sales.addPayment(saleId, {
        amount: Number(amount),
        method: "CASH",
        status: "PARTIAL",
      });
      toast.success("Payment recorded");
      setRows(await uniformApi.payments.listOutstanding());
    } catch {
      toast.error("Payment failed");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.paymentStatus !== statusFilter) return false;
      if (!term) return true;
      const customer =
        r.customerName ||
        (r.student ? `${r.student.firstName} ${r.student.lastName}` : "");
      return `${r.invoiceNumber} ${customer}`.toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<OutstandingPayment>[] = [
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
      key: "total",
      header: "Total",
      render: (r) => (
        <span className="tabular-nums text-navy">
          {Number(r.total).toLocaleString()} RWF
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      render: (r) => (
        <span className="tabular-nums text-muted">
          {Number(r.paid).toLocaleString()} RWF
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      render: (r) => (
        <span className="font-semibold tabular-nums text-navy">
          {Number(r.balance).toLocaleString()} RWF
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={paymentTone(r.paymentStatus)}>
          {paymentLabel(r.paymentStatus)}
        </StatusBadge>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      render: (r) => (
        <button
          type="button"
          className="btn-primary !px-3 !py-1.5 text-xs"
          onClick={() => void pay(r.id)}
        >
          Pay
        </button>
      ),
    },
  ];

  return (
    <PlatformPageLayout
      title="Outstanding Payments"
      subtitle="Collect remaining balances on partial and pending sales."
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search invoice or customer…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
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
          emptyMessage="No outstanding payments"
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} payment${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>
    </PlatformPageLayout>
  );
}
