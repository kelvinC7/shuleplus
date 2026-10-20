"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { ListFilterBar, ListToolbar, StatusBadge } from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { fmtMeters } from "@/modules/fabric/fabric-utils";
import { ProductionEstimatorWizard } from "@/modules/fabric/production-estimator-wizard";
import { uniformApi } from "@/services/uniform-api";
import type { ProductionOrder } from "@/types";

const WIZARD_STEPS = [
  "Year & Class",
  "Uniform & Fabric",
  "Production Qty",
  "Tailor",
  "Confirm",
] as const;

function batchLabel(o: ProductionOrder) {
  const m = o.notes?.match(/Batch\s+([A-Z0-9-]+)/i);
  return m?.[1] ?? `PO-${o.id.slice(-5).toUpperCase()}`;
}

function classFromNotes(notes?: string | null) {
  const m = notes?.match(/Class\s+([^\s(]+)/i);
  return m?.[1] ?? "";
}

function studentsFromNotes(notes?: string | null) {
  const m = notes?.match(/\((\d+)\s+students/i);
  return m?.[1] ?? "";
}

function statusTone(
  status: ProductionOrder["status"],
): "success" | "info" | "danger" | "warning" {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "info";
  if (status === "CANCELLED") return "danger";
  return "warning";
}

function statusLabel(status: ProductionOrder["status"]) {
  if (status === "WAITING") return "Pending";
  if (status === "IN_PROGRESS") return "In Production";
  if (status === "COMPLETED") return "Completed";
  return "Cancelled";
}

export function FabricEstimatorView() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    try {
      setOrders(await uniformApi.productionOrders.list());
    } catch {
      toast.error("Failed to load production batches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      `${batchLabel(o)} ${o.fabric?.name ?? ""} ${o.product?.name ?? ""} ${o.tailor?.name ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [orders, search]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<ProductionOrder>[] = [
    {
      key: "batch",
      header: "Batch",
      render: (o) => (
        <span className="font-semibold text-navy">{batchLabel(o)}</span>
      ),
    },
    { key: "uniform", header: "Uniform", render: (o) => o.product?.name ?? "" },
    { key: "fabric", header: "Fabric", render: (o) => o.fabric?.name ?? "" },
    { key: "class", header: "Class", render: (o) => classFromNotes(o.notes) },
    {
      key: "students",
      header: "Students",
      render: (o) => (
        <span className="tabular-nums">{studentsFromNotes(o.notes)}</span>
      ),
    },
    {
      key: "meters",
      header: "Meters",
      render: (o) => (
        <span className="tabular-nums">
          {fmtMeters(Number(o.metersIssued))}
        </span>
      ),
    },
    {
      key: "expected",
      header: "Expected",
      render: (o) => <span className="tabular-nums">{o.expectedOutput}</span>,
    },
    {
      key: "tailor",
      header: "Tailor",
      render: (o) => <span className="text-muted">{o.tailor?.name ?? ""}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <StatusBadge tone={statusTone(o.status)}>
          {statusLabel(o.status)}
        </StatusBadge>
      ),
    },
  ];

  return (
    <PlatformPageLayout
      title="Production Estimator"
      subtitle="Estimate fabric need by class, then create a production batch."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> New Estimation
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-navy">
            How it works
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-5">
            {WIZARD_STEPS.map((label, i) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-navy">{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <ListFilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setSelected(new Set());
          }}
          searchPlaceholder="Search batches…"
        />

        <PlatformDataTable
          variant="soft"
          showRowNumbers
          className="[&_table]:min-w-[800px]"
          columns={columns}
          data={pageRows}
          rowKey={(o) => o.id}
          loading={loading}
          emptyMessage="No batches yet — run the estimator"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> New Estimation
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
            if (pageRows.length > 0 && selected.size === pageRows.length)
              setSelected(new Set());
            else setSelected(new Set(pageRows.map((o) => o.id)));
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
          toolbar={
            <ListToolbar
              resultLabel={`${filtered.length} batch${filtered.length === 1 ? "" : "es"} found`}
              pageSize={pageSize}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setSelected(new Set());
              }}
            />
          }
        />
      </div>

      <ProductionEstimatorWizard
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => void load()}
      />
    </PlatformPageLayout>
  );
}
