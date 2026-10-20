"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { ListFilterBar, ListToolbar, timeAgo } from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { uniformApi } from "@/services/uniform-api";
import type { Fabric, FabricIssue, Tailor } from "@/types";

export function FabricIssuesView() {
  const [rows, setRows] = useState<FabricIssue[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fabricId: "",
    tailorId: "",
    meters: "",
    expectedPieces: "",
  });

  async function load() {
    try {
      const [issues, f, t] = await Promise.all([
        uniformApi.fabricIssues.list(),
        uniformApi.fabrics.list(),
        uniformApi.tailors.list(),
      ]);
      setRows(issues);
      setFabrics(f);
      setTailors(t);
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
      await uniformApi.fabricIssues.create({
        fabricId: form.fabricId,
        tailorId: form.tailorId || undefined,
        meters: Number(form.meters),
        expectedPieces: form.expectedPieces
          ? Number(form.expectedPieces)
          : undefined,
      });
      toast.success("Fabric issued");
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
    if (!term) return rows;
    return rows.filter((r) => {
      const fabric = r.fabric?.name ?? "";
      const tailor = r.tailor?.name ?? "";
      return `${fabric} ${tailor}`.toLowerCase().includes(term);
    });
  }, [rows, search]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<FabricIssue>[] = [
    {
      key: "fabric",
      header: "Fabric",
      render: (r) => (
        <span className="font-semibold text-navy">{r.fabric?.name ?? ""}</span>
      ),
    },
    {
      key: "tailor",
      header: "Tailor",
      render: (r) => <span className="text-muted">{r.tailor?.name ?? ""}</span>,
    },
    {
      key: "meters",
      header: "Meters",
      render: (r) => (
        <span className="tabular-nums font-semibold text-navy">
          {Number(r.meters)} m
        </span>
      ),
    },
    {
      key: "expected",
      header: "Expected pieces",
      render: (r) => (
        <span className="tabular-nums text-muted">
          {r.expectedPieces ?? ""}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-muted">{timeAgo(r.issuedAt)}</span>,
    },
  ];

  return (
    <PlatformPageLayout
      title="Fabric Issues"
      subtitle="Issue fabric meters to tailors for production."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> Issue fabric
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search fabric or tailor…"
          onReset={() => setSearch("")}
        />

        <PlatformDataTable
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          loading={loading}
          emptyMessage="No fabric issues"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> Issue fabric
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
              resultLabel={`${filtered.length} issue${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="hr-card w-full max-w-md space-y-3 p-6">
            <h2 className="text-lg font-semibold text-navy">Issue fabric</h2>
            <select
              className="input"
              value={form.fabricId}
              onChange={(e) => setForm({ ...form, fabricId: e.target.value })}
            >
              <option value="">Fabric</option>
              {fabrics.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({Number(f.metersRemaining)} m)
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.tailorId}
              onChange={(e) => setForm({ ...form, tailorId: e.target.value })}
            >
              <option value="">Tailor (optional)</option>
              {tailors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Meters"
              value={form.meters}
              onChange={(e) => setForm({ ...form, meters: e.target.value })}
            />
            <input
              className="input"
              placeholder="Expected pieces"
              value={form.expectedPieces}
              onChange={(e) =>
                setForm({ ...form, expectedPieces: e.target.value })
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
