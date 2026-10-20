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
  Fabric,
  ProductionOrder,
  ProductionStatus,
  Tailor,
} from "@/types";

function productionTone(status: ProductionStatus) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "warning" as const;
}

function productionLabel(status: ProductionStatus) {
  if (status === "WAITING") return "Waiting";
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "COMPLETED") return "Completed";
  return "Cancelled";
}

export function ProductionOrdersView() {
  const [rows, setRows] = useState<ProductionOrder[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tailorId: "",
    fabricId: "",
    metersIssued: "",
    expectedOutput: "",
    tailoringCost: "",
    deliveryDate: "",
  });

  async function load() {
    try {
      const [orders, t, f] = await Promise.all([
        uniformApi.productionOrders.list(),
        uniformApi.tailors.list(),
        uniformApi.fabrics.list(),
      ]);
      setRows(orders);
      setTailors(t);
      setFabrics(f);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      await uniformApi.productionOrders.create({
        tailorId: form.tailorId,
        fabricId: form.fabricId || undefined,
        metersIssued: Number(form.metersIssued) || 0,
        expectedOutput: Number(form.expectedOutput) || 0,
        tailoringCost: Number(form.tailoringCost) || 0,
        deliveryDate: form.deliveryDate || undefined,
        status: "WAITING",
      });
      toast.success("Order created");
      setOpen(false);
      void load();
    } catch {
      toast.error("Create failed");
    }
  }

  async function receive(id: string) {
    const received = window.prompt("Received quantity");
    if (!received) return;
    try {
      await uniformApi.productionOrders.receive(id, {
        receivedQty: Number(received),
        damagedQty: 0,
        unfinishedQty: 0,
      });
      toast.success("Production received");
      void load();
    } catch {
      toast.error("Receive failed");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!term) return true;
      return (r.tailor?.name ?? "").toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<ProductionOrder>[] = [
    {
      key: "tailor",
      header: "Tailor",
      render: (r) => (
        <span className="font-semibold text-navy">{r.tailor?.name ?? ""}</span>
      ),
    },
    {
      key: "expected",
      header: "Expected",
      render: (r) => (
        <span className="tabular-nums text-navy">{r.expectedOutput}</span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (r) => (
        <span className="font-semibold tabular-nums text-navy">
          {Number(r.tailoringCost).toLocaleString()} RWF
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={productionTone(r.status)}>
          {productionLabel(r.status)}
        </StatusBadge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => <span className="text-muted">{timeAgo(r.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) =>
        r.status !== "COMPLETED" ? (
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5 text-xs"
            onClick={() => void receive(r.id)}
          >
            Receive
          </button>
        ) : (
          <span className="text-xs text-muted">-</span>
        ),
    },
  ];

  return (
    <PlatformPageLayout
      title="Production Orders"
      subtitle="Create and receive tailor production orders."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> New order
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by tailor…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "WAITING", label: "Waiting" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
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
          emptyMessage="No production orders"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> New order
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
              resultLabel={`${filtered.length} order${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="hr-card w-full max-w-md space-y-3 p-6">
            <h2 className="text-lg font-semibold text-navy">
              Production order
            </h2>
            <select
              className="input"
              value={form.tailorId}
              onChange={(e) => setForm({ ...form, tailorId: e.target.value })}
            >
              <option value="">Tailor</option>
              {tailors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.fabricId}
              onChange={(e) => setForm({ ...form, fabricId: e.target.value })}
            >
              <option value="">Fabric (optional)</option>
              {fabrics.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Meters issued"
              value={form.metersIssued}
              onChange={(e) =>
                setForm({ ...form, metersIssued: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Expected output"
              value={form.expectedOutput}
              onChange={(e) =>
                setForm({ ...form, expectedOutput: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Tailoring cost"
              value={form.tailoringCost}
              onChange={(e) =>
                setForm({ ...form, tailoringCost: e.target.value })
              }
            />
            <input
              type="date"
              className="input"
              value={form.deliveryDate}
              onChange={(e) =>
                setForm({ ...form, deliveryDate: e.target.value })
              }
            />
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
