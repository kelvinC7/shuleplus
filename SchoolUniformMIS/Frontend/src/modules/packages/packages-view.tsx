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
import type { UniformPackage, UniformProduct } from "@/types";

export function PackagesView() {
  const [rows, setRows] = useState<UniformPackage[]>([]);
  const [products, setProducts] = useState<UniformProduct[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lines, setLines] = useState<{ productId: string; quantity: number }[]>(
    [{ productId: "", quantity: 1 }],
  );

  async function load() {
    try {
      const [p, pkgs] = await Promise.all([
        uniformApi.products.list(),
        uniformApi.packages.list(),
      ]);
      setProducts(p);
      setRows(pkgs);
    } catch {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      await uniformApi.packages.create({
        name,
        lines: lines.filter((l) => l.productId),
      });
      toast.success("Package created");
      setOpen(false);
      setName("");
      void load();
    } catch {
      toast.error("Create failed");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      if (term && !r.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  const { page, pageSize, totalPages, pageRows, setPage, setPageSize } =
    usePagedRows(filtered);

  const columns: PlatformTableColumn<UniformPackage>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => <span className="font-semibold text-navy">{r.name}</span>,
    },
    {
      key: "items",
      header: "Items",
      render: (r) => (
        <span className="tabular-nums text-muted">{r.lines?.length ?? 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={r.isActive ? "success" : "neutral"}>
          {r.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => <span className="text-muted">{timeAgo(r.updatedAt)}</span>,
    },
  ];

  return (
    <PlatformPageLayout
      title="Packages"
      subtitle="Bundle uniform products into ready-to-sell packages."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> New Package
        </button>
      }
    >
      <div className="space-y-4">
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search packages…"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
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
          emptyMessage="No packages yet"
          emptyAction={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={15} /> New Package
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
              resultLabel={`${filtered.length} package${filtered.length === 1 ? "" : "s"} found`}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="hr-card w-full max-w-lg space-y-4 p-6">
            <h2 className="text-lg font-semibold text-navy">New package</h2>
            <input
              className="input"
              placeholder="Package name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className="input flex-1"
                  value={line.productId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...next[i], productId: e.target.value };
                    setLines(next);
                  }}
                >
                  <option value="">Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="input w-20"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = {
                      ...next[i],
                      quantity: Number(e.target.value) || 1,
                    };
                    setLines(next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setLines([...lines, { productId: "", quantity: 1 }])
              }
            >
              Add line
            </button>
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
