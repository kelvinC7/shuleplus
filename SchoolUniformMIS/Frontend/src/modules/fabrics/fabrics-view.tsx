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
import { uniformApi } from "@/services/uniform-api";
import type { Fabric } from "@/types";

export function FabricsView() {
  const [rows, setRows] = useState<Fabric[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    metersTotal: "",
    cost: "",
    color: "",
    rollNumber: "",
  });

  async function load() {
    try {
      setRows(await uniformApi.fabrics.list());
    } catch {
      toast.error("Failed to load fabrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      await uniformApi.fabrics.create({
        name: form.name,
        metersTotal: Number(form.metersTotal),
        metersRemaining: Number(form.metersTotal),
        cost: Number(form.cost) || 0,
        color: form.color || undefined,
        rollNumber: form.rollNumber || undefined,
      });
      toast.success("Fabric added");
      setOpen(false);
      void load();
    } catch {
      toast.error("Create failed");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.name} ${r.color ?? ""}`.toLowerCase().includes(term),
    );
  }, [rows, search]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<Fabric>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => <span className="font-semibold text-navy">{r.name}</span>,
    },
    {
      key: "color",
      header: "Color",
      render: (r) =>
        r.color ? (
          <StatusBadge tone="sky">{r.color}</StatusBadge>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
    {
      key: "remaining",
      header: "Remaining",
      render: (r) => (
        <span className="tabular-nums font-semibold text-navy">
          {Number(r.metersRemaining)} m
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (r) => (
        <span className="tabular-nums text-muted">
          {Number(r.metersTotal)} m
        </span>
      ),
    },
    {
      key: "used",
      header: "Used",
      render: (r) => {
        const total = Number(r.metersTotal);
        const rem = Number(r.metersRemaining);
        const usedPct =
          total > 0 ? Math.round(((total - rem) / total) * 100) : 0;
        return (
          <div>
            <div className="h-2 w-28 rounded-md bg-slate-100">
              <div
                className="h-2 rounded-md bg-primary"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <span className="text-xs text-muted">{usedPct}% used</span>
          </div>
        );
      },
    },
  ];

  return (
    <PlatformPageLayout
      title="Fabrics"
      subtitle="Track fabric rolls, remaining meters, and usage."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> Add fabric
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or color…"
          onReset={() => setSearch("")}
        />

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No fabric rolls"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> Add fabric
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
              resultLabel={`${filtered.length} fabric${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="hr-card w-full max-w-md space-y-3 p-6">
            <h2 className="text-lg font-semibold text-navy">Add fabric</h2>
            <input
              className="input"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Meters"
              value={form.metersTotal}
              onChange={(e) =>
                setForm({ ...form, metersTotal: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Cost (RWF)"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
            <input
              className="input"
              placeholder="Color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
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
